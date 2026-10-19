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
// All role views derive progress from persisted documents and PEC confirmations.
// Recomputed whenever the queue is read; changes and recalculations are audited.
async function reconcilePractice(p,actorId){
 if(p.tipologia==='FATTURA')return p.stato==='DOCUMENTI_MANCANTI'?'DA_ELABORARE':p.stato;
 const [contracts]=await db.query(`SELECT idContratto,path_contratto_unilav FROM contratto
  WHERE idOperatore=? AND REPLACE(tipologia,'CONTRATTO_','')=? AND DATE_FORMAT(data_inizio,'%Y-%m-%d')=DATE_FORMAT(?,'%Y-%m-%d')
  ORDER BY idContratto DESC LIMIT 1`,[p.idOperatore,p.tipologia,p.dataInizio]);
 const contract=contracts[0];
 let complete=!!contract;
 if(complete&&['CHIAMATA','TEMPO_DETERMINATO','TEMPO_INDETERMINATO'].includes(p.tipologia))
   complete=!!contract.path_contratto_unilav;
 if(complete&&p.tipologia==='CHIAMATA'){
  const [shifts]=await db.query(`SELECT DISTINCT DATE_FORMAT(dataTurno,'%Y-%m-%d') AS giorno FROM turnoOperatore
   WHERE idOperatore=? AND dataTurno>=CURDATE() AND dataTurno<=DATE_ADD(CURDATE(),INTERVAL 7 DAY)`,[p.idOperatore]);
  if(shifts.length){
   let calls=[];
   try{[calls]=await db.query(`SELECT DATE_FORMAT(dataInizio,'%Y-%m-%d') AS dal,DATE_FORMAT(dataFine,'%Y-%m-%d') AS al
    FROM chiamata_intermit_hr WHERE idContratto=? AND idOperatore=? AND stato='INVIATA' AND COALESCE(esitoInvio,'') NOT LIKE 'SIMULAZIONE TEST%'`,[contract.idContratto,p.idOperatore]);}
   catch(e){if(e.code!=='ER_NO_SUCH_TABLE')throw e}
   complete=shifts.every(t=>calls.some(c=>c.dal<=t.giorno&&c.al>=t.giorno));
  }
 }
 const target=complete?'COMPLETATO':(contract||p.presoInCaricoDa)?'IN_LAVORAZIONE':'DA_ELABORARE';
 if(p.stato!==target){
  const [result]=await db.query('UPDATE hr_pratiche SET stato=? WHERE id=? AND stato=?',
   [target,p.id,p.stato]);
  if(result.affectedRows)await db.query('INSERT INTO hr_pratiche_log (praticaId,attoreId,statoPrima,statoDopo,dettaglio) VALUES (?,?,?,?,?)',
   [p.id,actorId,p.stato,target,'Stato calcolato automaticamente dai documenti e dalle chiamate PEC']);
 }
 return target;
}
router.get('/me',(req,res)=>res.json({id:req.hrIdentity.id,role:req.hrIdentity.role}));
router.get('/pratiche',async(req,res,next)=>{try{
 const [rows]=await db.query(query+' ORDER BY p.creatoIl DESC');
 for(const p of rows){p.stato=await reconcilePractice(p,req.hrIdentity.id)}
 const order={DA_ELABORARE:0,IN_LAVORAZIONE:1,COMPLETATO:2};
 rows.sort((a,b)=>(order[a.stato]??1)-(order[b.stato]??1));
 res.json(rows.map(shape));
}catch(e){next(e)}});
router.post('/pratiche/:id/prendi-in-carico',allow('HR'),async(req,res,next)=>{
 try{
  const [[p]]=await db.query('SELECT id,stato,presoInCaricoDa FROM hr_pratiche WHERE id=?',[req.params.id]);
  if(!p)return res.status(404).json({message:'Pratica non trovata'});
  if(!p.presoInCaricoDa){
   const [updated]=await db.query('UPDATE hr_pratiche SET presoInCaricoDa=?,stato=IF(stato=\'DA_ELABORARE\',\'IN_LAVORAZIONE\',stato) WHERE id=? AND presoInCaricoDa IS NULL',[req.hrIdentity.id,p.id]);
   if(updated.affectedRows)await db.query('INSERT INTO hr_pratiche_log (praticaId,attoreId,statoPrima,statoDopo,dettaglio) VALUES (?,?,?,?,?)',[p.id,req.hrIdentity.id,p.stato,'IN_LAVORAZIONE','Pratica aperta e presa in carico da HR']);
  }
  res.json({ok:true});
 }catch(e){next(e)}
});
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
 if(!dataInizio){await conn.rollback();return res.status(400).json({message:'Imposta la data di inizio del contratto'});}
 const [[existing]]=await conn.query(`SELECT idContratto FROM contratto WHERE idOperatore=? AND REPLACE(tipologia,'CONTRATTO_','')=? AND DATE(data_inizio)=? LIMIT 1`,[idOperatore,tipologia,dataInizio]);
 if(existing){await conn.rollback();return res.status(409).json({message:'Esiste già un contratto dello stesso tipo con questa data di inizio'});}
 const [[duplicate]]=await conn.query(`SELECT id FROM hr_pratiche WHERE idOperatore=? AND tipologia=? AND DATE(dataInizio)=? LIMIT 1`,[idOperatore,tipologia,dataInizio]);
 if(duplicate){await conn.rollback();return res.status(409).json({message:'Esiste già una pratica per questo tipo di contratto e questa data'});}
 const [record]=await conn.query(`INSERT INTO hr_pratiche (idOperatore,tipologia,datore,dataInizio,dataFine,note,stato,assegnatoDa)
 VALUES (?,?,?,?,?,?,'DA_ELABORARE',?)`,[idOperatore,tipologia,datore,dataInizio||null,dataFine||null,note,req.hrIdentity.id]);
 await conn.query('INSERT INTO hr_pratiche_log (praticaId,attoreId,statoDopo,dettaglio) VALUES (?,?,?,?)',
 [record.insertId,req.hrIdentity.id,'DA_ELABORARE','Assegnata da ADMIN']);
 await conn.commit();res.status(201).json({id:record.insertId,stato:'DA_ELABORARE'});
}catch(e){if(conn)await conn.rollback();next(e)}finally{if(conn)conn.release()}});
// Codice di comunicazione della pratica: un solo valore riutilizzato dalle chiamate.
async function ensureCodici(){
 if(!(process.env.DB_HOST||'').toLowerCase().endsWith('.aivencloud.com'))throw new Error('Codici HR consentiti solo su Aiven test');
 await db.query(`CREATE TABLE IF NOT EXISTS hr_codici_comunicazione (
   praticaId BIGINT NOT NULL PRIMARY KEY,
   codice VARCHAR(80) NOT NULL DEFAULT '',
   aggiornatoDa BIGINT NULL,
   aggiornatoIl TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
router.get('/pratiche/:id/codice-comunicazione',async(req,res,next)=>{try{
 const [[p]]=await db.query('SELECT id FROM hr_pratiche WHERE id=?',[req.params.id]);
 if(!p)return res.status(404).json({message:'Pratica non trovata'});
 await ensureCodici();
 const [[row]]=await db.query('SELECT codice FROM hr_codici_comunicazione WHERE praticaId=?',[p.id]);
 res.json({codice:row?.codice||''});
}catch(e){next(e)}});
router.put('/pratiche/:id/codice-comunicazione',allow('HR'),async(req,res,next)=>{try{
 const codice=String(req.body?.codice||'').trim().toUpperCase();
 if(codice.length>80||! /^[A-Z0-9._\\/-]*$/.test(codice))return res.status(400).json({message:'Codice comunicazione non valido'});
 const [[p]]=await db.query('SELECT id,stato FROM hr_pratiche WHERE id=?',[req.params.id]);
 if(!p)return res.status(404).json({message:'Pratica non trovata'});
 await ensureCodici();
 await db.query('INSERT INTO hr_codici_comunicazione (praticaId,codice,aggiornatoDa) VALUES (?,?,?) ON DUPLICATE KEY UPDATE codice=VALUES(codice),aggiornatoDa=VALUES(aggiornatoDa)',[p.id,codice,req.hrIdentity.id]);
 await db.query('INSERT INTO hr_pratiche_log (praticaId,attoreId,statoPrima,statoDopo,dettaglio) VALUES (?,?,?,?,?)',[p.id,req.hrIdentity.id,p.stato,p.stato,codice?'Codice comunicazione registrato/aggiornato':'Codice comunicazione svuotato']);
 res.json({codice});
}catch(e){next(e)}});
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
 if(stato==='COMPLETATO'){
  const [[contract]]=await conn.query(`SELECT idContratto,tipologia,path_contratto_unilav
    FROM contratto WHERE idOperatore=? AND REPLACE(tipologia,'CONTRATTO_','')=?
      AND DATE_FORMAT(data_inizio,'%Y-%m-%d')=DATE_FORMAT(?,'%Y-%m-%d')
    ORDER BY idContratto DESC LIMIT 1`,[p.idOperatore,p.tipologia,p.dataInizio]);
  const required=['CHIAMATA','TEMPO_DETERMINATO','TEMPO_INDETERMINATO'].includes(p.tipologia);
  if(p.tipologia!=='FATTURA'&&!contract){await conn.rollback();return res.status(409).json({message:'Impossibile completare: contratto non ancora generato'})}
  if(required&&!contract?.path_contratto_unilav){await conn.rollback();return res.status(409).json({message:'Impossibile completare: UNILAV di assunzione non caricata'})}
  if(p.tipologia==='CHIAMATA'){
   const [shifts]=await conn.query(`SELECT DATE_FORMAT(dataTurno,'%Y-%m-%d') AS giorno FROM turnoOperatore
       WHERE idOperatore=? AND dataTurno BETWEEN CURDATE() AND DATE_ADD(CURDATE(),INTERVAL 7 DAY)
       GROUP BY DATE(dataTurno)`,[p.idOperatore]);
   for(const shift of shifts){
    const [calls]=await conn.query(`SELECT id FROM chiamata_intermit_hr WHERE idOperatore=? AND idContratto=? AND stato='INVIATA'
       AND dataInizio<=? AND dataFine>=? LIMIT 1`,[p.idOperatore,contract.idContratto,shift.giorno,shift.giorno]);
    if(!calls.length){await conn.rollback();return res.status(409).json({message:'Impossibile completare: chiamata del '+shift.giorno+' non ancora comunicata'})}
   }
  }
 }
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
