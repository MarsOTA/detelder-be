const express=require('express');
const db=require('../../db');
const {resolve,allow}=require('../../middleware/hrAccess');
const router=express.Router();
router.use(resolve);
const types=['CHIAMATA','TEMPO_DETERMINATO','TEMPO_INDETERMINATO','OCCASIONALE','CONSGNA_BENI_FORMAZIONE','FATTURA'];
const employers=['DETELDER','SOCIETA_APPALTO','AUTONOMO_PIVA'];
const states=['DA_ELABORARE','IN_LAVORAZIONE','DOCUMENTI_MANCANTI','COMPLETATO'];
const dateOk=v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z')));
const shape=(r)=>({id:r.id,idOperatore:r.idOperatore,nome:r.nome,cognome:r.cognome,
 tipologia:r.tipologia,datore:r.datore,dataInizio:r.dataInizio,dataFine:r.dataFine,
 stato:r.stato,note:r.note,assegnatoDa:r.assegnatoDa,presoInCaricoDa:r.presoInCaricoDa,creatoIl:r.creatoIl});
const query=`SELECT p.*,d.nome,d.cognome FROM hr_pratiche p LEFT JOIN dipendenti d ON d.id=p.idOperatore`;
router.get('/me',(req,res)=>res.json({id:req.hrIdentity.id,role:req.hrIdentity.role}));
router.get('/pratiche',async(req,res,next)=>{try{
 const [rows]=await db.query(query+' ORDER BY CASE p.stato WHEN \'DA_ELABORARE\' THEN 0 WHEN \'IN_LAVORAZIONE\' THEN 1 WHEN \'DOCUMENTI_MANCANTI\' THEN 2 ELSE 3 END,p.creatoIl DESC');
 res.json(rows.map(shape));
}catch(e){next(e)}});
router.get('/pratiche/:id/log',async(req,res,next)=>{try{
 const [rows]=await db.query('SELECT * FROM hr_pratiche_log WHERE praticaId=? ORDER BY id DESC',[req.params.id]);res.json(rows);
}catch(e){next(e)}});
router.post('/pratiche',allow('ADMIN'),async(req,res,next)=>{let conn;try{
 const {idOperatore,tipologia,datore,dataInizio=null,dataFine=null,note=''}=req.body||{};
 if(!Number.isSafeInteger(Number(idOperatore))||Number(idOperatore)<=0||!types.includes(tipologia)||!employers.includes(datore)||
 !dateOk(dataInizio)||!dateOk(dataFine)||(dataInizio&&dataFine&&dataInizio>dataFine)||String(note).length>2000)
 return res.status(400).json({message:'Dati di assegnazione non validi'});
 const [[dip]]=await db.query('SELECT id FROM dipendenti WHERE id=? AND ruolo=\'OPERATORE\' LIMIT 1',[idOperatore]);
 if(!dip)return res.status(404).json({message:'Operatore non trovato'});
 conn=await db.getConnection();await conn.beginTransaction();
 const [record]=await conn.query(`INSERT INTO hr_pratiche (idOperatore,tipologia,datore,dataInizio,dataFine,note,stato,assegnatoDa)
 VALUES (?,?,?,?,?,?,'DA_ELABORARE',?)`,[idOperatore,tipologia,datore,dataInizio||null,dataFine||null,note,req.hrIdentity.id]);
 await conn.query('INSERT INTO hr_pratiche_log (praticaId,attoreId,statoDopo,dettaglio) VALUES (?,?,?,?)',
 [record.insertId,req.hrIdentity.id,'DA_ELABORARE','Assegnata da ADMIN']);
 await conn.commit();res.status(201).json({id:record.insertId,stato:'DA_ELABORARE'});
}catch(e){if(conn)await conn.rollback();next(e)}finally{if(conn)conn.release()}});
router.patch('/pratiche/:id/periodo',allow('HR'),async(req,res,next)=>{let conn;try{
 const {dataInizio,dataFine}=req.body||{};
 if(typeof dataInizio!=='string'||!dateOk(dataInizio)||!dataInizio||
    !(dataFine===null||(typeof dataFine==='string'&&dateOk(dataFine)))||
    (dataFine&&dataFine<dataInizio))
  return res.status(400).json({message:'Periodo contrattuale non valido'});
 conn=await db.getConnection();await conn.beginTransaction();
 const [[p]]=await conn.query('SELECT id,stato,dataInizio,dataFine FROM hr_pratiche WHERE id=? FOR UPDATE',[req.params.id]);
 if(!p){await conn.rollback();return res.status(404).json({message:'Pratica non trovata'})}
 if(p.stato==='COMPLETATO'){await conn.rollback();return res.status(409).json({message:'Pratica completata: periodo non modificabile'})}
 await conn.query('UPDATE hr_pratiche SET dataInizio=?,dataFine=? WHERE id=?',[dataInizio,dataFine||null,p.id]);
 const before=[p.dataInizio,p.dataFine].map(v=>v instanceof Date?v.toISOString().slice(0,10):v||'—').join(' / ');
 await conn.query('INSERT INTO hr_pratiche_log (praticaId,attoreId,statoPrima,statoDopo,dettaglio) VALUES (?,?,?,?,?)',
 [p.id,req.hrIdentity.id,p.stato,p.stato,'Periodo aggiornato da '+before+' a '+dataInizio+' / '+(dataFine||'—')]);
 await conn.commit();res.json({id:p.id,dataInizio,dataFine:dataFine||null});
}catch(e){if(conn)await conn.rollback();next(e)}finally{if(conn)conn.release()}});
router.patch('/pratiche/:id/stato',allow('HR'),async(req,res,next)=>{let conn;try{
 const stato=req.body?.stato,note=String(req.body?.note||'');
 if(!states.includes(stato)||note.length>2000)return res.status(400).json({message:'Stato o nota non validi'});
 conn=await db.getConnection();await conn.beginTransaction();
 const [[p]]=await conn.query('SELECT * FROM hr_pratiche WHERE id=? FOR UPDATE',[req.params.id]);
 if(!p){await conn.rollback();return res.status(404).json({message:'Pratica non trovata'})}
 const permitted={DA_ELABORARE:['IN_LAVORAZIONE','DOCUMENTI_MANCANTI'],
 IN_LAVORAZIONE:['DOCUMENTI_MANCANTI','COMPLETATO'],DOCUMENTI_MANCANTI:['IN_LAVORAZIONE'],COMPLETATO:[]};
 if(!(permitted[p.stato]||[]).includes(stato)){await conn.rollback();return res.status(409).json({message:'Transizione di stato non consentita'})}
 await conn.query('UPDATE hr_pratiche SET stato=?,note=?,presoInCaricoDa=COALESCE(presoInCaricoDa,?) WHERE id=?',
 [stato,note||p.note,req.hrIdentity.id,p.id]);
 await conn.query('INSERT INTO hr_pratiche_log (praticaId,attoreId,statoPrima,statoDopo,dettaglio) VALUES (?,?,?,?,?)',
 [p.id,req.hrIdentity.id,p.stato,stato,note]);
 await conn.commit();res.json({id:p.id,stato});
}catch(e){if(conn)await conn.rollback();next(e)}finally{if(conn)conn.release()}});
router.get('/utenti',allow('ADMIN'),async(req,res,next)=>{try{
 const [rows]=await db.query(`SELECT d.id,d.nome,d.cognome,d.email,d.ruolo AS ruoloPrincipale,
 COALESCE(h.ruolo,CASE WHEN d.ruolo='ADMIN' THEN 'ADMIN' END) AS ruoloHR
 FROM dipendenti d LEFT JOIN hr_ruoli_assegnati h ON h.idOperatore=d.id ORDER BY d.cognome`);
 res.json(rows);
}catch(e){next(e)}});
router.put('/utenti/:id/ruolo',allow('ADMIN'),async(req,res,next)=>{try{
 const role=req.body?.role;
 if(!['ADMIN','HR',null].includes(role))return res.status(400).json({message:'Ruolo non valido'});
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({message:'ID non valido'});
 const [[target]]=await db.query('SELECT id,ruolo FROM dipendenti WHERE id=?',[id]);if(!target)return res.status(404).json({message:'Utente non trovato'});
 if(role===null){if(target.ruolo==='ADMIN')return res.status(409).json({message:'Il ruolo ADMIN principale non può essere revocato qui'});await db.query('DELETE FROM hr_ruoli_assegnati WHERE idOperatore=?',[id]);}
 else await db.query('INSERT INTO hr_ruoli_assegnati (idOperatore,ruolo,assegnatoDa) VALUES (?,?,?) ON DUPLICATE KEY UPDATE ruolo=VALUES(ruolo),assegnatoDa=VALUES(assegnatoDa)',[id,role,req.hrIdentity.id]);
 res.json({id,role});
}catch(e){next(e)}});
module.exports=router;
