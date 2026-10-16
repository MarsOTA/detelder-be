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
 stato:r.stato,note:r.note,assegnatoDa:r.assegnatoDa,presoInCaricoDa:r.presoInCaricoDa,assegnatoDaNome:r.assegnatoDaNome,assegnatoDaCognome:r.assegnatoDaCognome,presoInCaricoDaNome:r.presoInCaricoDaNome,presoInCaricoDaCognome:r.presoInCaricoDaCognome,creatoIl:r.creatoIl,aggiornatoIl:r.aggiornatoIl});
const query=`SELECT p.*,d.nome,d.cognome,assegnatore.nome AS assegnatoDaNome,assegnatore.cognome AS assegnatoDaCognome,incaricato.nome AS presoInCaricoDaNome,incaricato.cognome AS presoInCaricoDaCognome FROM hr_pratiche p LEFT JOIN dipendenti d ON d.id=p.idOperatore LEFT JOIN dipendenti assegnatore ON assegnatore.id=p.assegnatoDa LEFT JOIN dipendenti incaricato ON incaricato.id=p.presoInCaricoDa`;
router.get('/me',(req,res)=>res.json({id:req.hrIdentity.id,role:req.hrIdentity.role}));
router.get('/pratiche',async(req,res,next)=>{try{
 const [rows]=await db.query(query+' ORDER BY CASE p.stato WHEN \'DA_ELABORARE\' THEN 0 WHEN \'IN_LAVORAZIONE\' THEN 1 WHEN \'DOCUMENTI_MANCANTI\' THEN 2 ELSE 3 END,p.creatoIl DESC');
 res.json(rows.map(shape));
}catch(e){next(e)}});
router.get('/pratiche/:id/log',async(req,res,next)=>{try{
 const [[pratica]]=await db.query('SELECT id FROM hr_pratiche WHERE id=?',[req.params.id]);
 if(!pratica)return res.status(404).json({message:'Pratica non trovata'});
 const [rows]=await db.query(`SELECT l.*,d.nome AS attoreNome,d.cognome AS attoreCognome FROM hr_pratiche_log l
 LEFT JOIN dipendenti d ON d.id=l.attoreId WHERE l.praticaId=? ORDER BY l.id DESC`,[pratica.id]);
 res.json(rows);
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
router.post('/pratiche/:id/attivita',allow('HR'),async(req,res,next)=>{try{
 const azione=String(req.body?.azione||''),contrattoId=Number(req.body?.contrattoId);
 const descrizioni={CONTRATTO_CREATO:'Contratto registrato',CONTRATTO_FIRMATO_CARICATO:'Contratto firmato caricato',UNILAV_CARICATO:'UNILAV caricata'};
 if(!Object.prototype.hasOwnProperty.call(descrizioni,azione)||!Number.isSafeInteger(contrattoId)||contrattoId<=0)
  return res.status(400).json({message:'Attività o identificativo documento non validi'});
 const [[p]]=await db.query('SELECT id,idOperatore,stato FROM hr_pratiche WHERE id=? LIMIT 1',[req.params.id]);
 if(!p)return res.status(404).json({message:'Pratica non trovata'});
 const [[c]]=await db.query('SELECT idContratto,idOperatore,tipologia,pathContrattoFirmato,pathContrattoUnilav FROM contratto WHERE idContratto=? AND idOperatore=? LIMIT 1',[contrattoId,p.idOperatore]);
 if(!c)return res.status(404).json({message:'Contratto non trovato per questo operatore'});
 if(azione==='CONTRATTO_FIRMATO_CARICATO'&&!c.pathContrattoFirmato)return res.status(409).json({message:'Contratto firmato non rilevato nel database'});
 if(azione==='UNILAV_CARICATO'&&!c.pathContrattoUnilav)return res.status(409).json({message:'Documento UNILAV non rilevato nel database'});
 await db.query('INSERT INTO hr_pratiche_log (praticaId,attoreId,statoPrima,statoDopo,dettaglio) VALUES (?,?,?,?,?)',
 [p.id,req.hrIdentity.id,p.stato,p.stato,descrizioni[azione]+' · Contratto #'+contrattoId]);
 res.status(201).json({registrato:true});
}catch(e){next(e)}});
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
 if(stato==='DOCUMENTI_MANCANTI'&&note.trim().length<5)return res.status(400).json({message:'Indica quali documenti o dati mancano prima di impostare Documenti mancanti'});
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
