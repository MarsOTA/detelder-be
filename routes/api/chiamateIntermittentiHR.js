const express = require('express');
const db = require('../../db');
const {resolve,allow}=require('../../middleware/hrAccess');
const router = express.Router();

// Archivio separato per le comunicazioni figlie: nessuna modifica alla tabella contratto.
// Si inizializza esclusivamente nel database Aiven collegato al backend di test.
let ready;
async function ensureTable() {
  if (!(process.env.DB_HOST || '').toLowerCase().endsWith('.aivencloud.com')) {
    throw new Error('Archivio chiamate abilitato soltanto sul database Aiven di test.');
  }
  if (!ready) {
    ready = db.query(`
      CREATE TABLE IF NOT EXISTS chiamata_intermit_hr (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        idContratto BIGINT NOT NULL,
        idOperatore BIGINT NOT NULL,
        dataInizio DATE NOT NULL,
        dataFine DATE NOT NULL,
        xml LONGTEXT NULL,
        stato ENUM('BOZZA','PEC_PREPARATA','INVIATA') NOT NULL DEFAULT 'BOZZA',
        inviataIl DATETIME NULL,
        esitoInvio VARCHAR(200) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_contratto (idContratto),
        INDEX idx_operatore (idOperatore)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch(error => {ready = null; throw error;});
  }
  await ready;
}

async function ensureCancellations(){
 await ensureTable();
 await db.query(`CREATE TABLE IF NOT EXISTS chiamata_intermit_hr_annullamenti_test (
  idChiamata BIGINT UNSIGNED PRIMARY KEY,
  xml LONGTEXT NOT NULL,
  esito VARCHAR(200) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
async function ensureEmployerTable() {
  if (!(process.env.DB_HOST || '').toLowerCase().endsWith('.aivencloud.com')) throw new Error('Configurazione datore disponibile solo su Aiven');
  await db.query(`CREATE TABLE IF NOT EXISTS configurazione_datore_intermit_hr (
    id TINYINT UNSIGNED PRIMARY KEY,
    codiceFiscale VARCHAR(16) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    aggiornatoIl TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
router.get('/config/datore',async(req,res,next)=>{
 try {
   await ensureEmployerTable();
   // Dati DETELDER forniti dall'amministratore: inizializza solo se nessuna configurazione esiste.
   await db.query("INSERT IGNORE INTO configurazione_datore_intermit_hr (id,codiceFiscale,email) VALUES (1,?,?)",["13066390967","info@detelder.com"]);
   const [rows]=await db.query("SELECT codiceFiscale,email FROM configurazione_datore_intermit_hr WHERE id=1");
   res.json(rows[0]||{codiceFiscale:"13066390967",email:"info@detelder.com"});
 }catch(e){next(e);}
});
router.put('/config/datore',async(req,res,next)=>{
 try{
  const cf=String(req.body?.codiceFiscale||"").trim().toUpperCase();
  const email=String(req.body?.email||"").trim();
  if(!/^[A-Z0-9]{11,16}$/.test(cf)|| !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({message:'Inserisci codice fiscale/P.IVA ed email validi'});
  await ensureEmployerTable();
  await db.query("INSERT INTO configurazione_datore_intermit_hr (id,codiceFiscale,email) VALUES (1,?,?) ON DUPLICATE KEY UPDATE codiceFiscale=VALUES(codiceFiscale),email=VALUES(email)",[cf,email]);
  res.json({codiceFiscale:cf,email});
 }catch(e){next(e);}
});
const valido = n => Number.isSafeInteger(Number(n)) && Number(n) > 0;
async function trovaPadre(idContratto, idOperatore) {
  const [rows] = await db.query(
    "SELECT idContratto,idOperatore,tipologia,DATE_FORMAT(data_inizio,'%Y-%m-%d') AS dataInizio,DATE_FORMAT(data_fine,'%Y-%m-%d') AS dataFine FROM contratto WHERE idContratto=? AND idOperatore=? LIMIT 1",
    [idContratto,idOperatore]
  );
  return rows[0];
}
function validDate(date) { return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date+'T12:00:00Z')); }
const list = async(req,res,next) => {
  try {
    const {idContratto,idOperatore}=req.params;
    if(!valido(idContratto)||!valido(idOperatore)) return res.status(400).json({message:'Identificativi non validi'});
    await ensureTable();
    const padre=await trovaPadre(idContratto,idOperatore);
    if(!padre||padre.tipologia!=='CHIAMATA')return res.status(404).json({message:'Contratto a chiamata non trovato'});
    const [rows]=await db.query(`SELECT id,DATE_FORMAT(dataInizio,'%Y-%m-%d') AS dataInizio,DATE_FORMAT(dataFine,'%Y-%m-%d') AS dataFine,
       stato,xml AS xmlArchiviato,DATE_FORMAT(inviataIl,'%Y-%m-%dT%H:%i:%s') AS dataOraInvio,esitoInvio
       FROM chiamata_intermit_hr WHERE idContratto=? AND idOperatore=? ORDER BY dataInizio DESC,id DESC`,[idContratto,idOperatore]);
    await ensureCancellations();
    const [annullate]=await db.query('SELECT idChiamata,xml,esito FROM chiamata_intermit_hr_annullamenti_test WHERE idChiamata IN (SELECT id FROM chiamata_intermit_hr WHERE idContratto=? AND idOperatore=?)',[idContratto,idOperatore]);
    const byId=new Map(annullate.map(a=>[Number(a.idChiamata),a]));
    res.json(rows.map(row=>({...row,annullamentoTest:!!byId.get(Number(row.id)),xmlAnnullamento:byId.get(Number(row.id))?.xml||null,esitoAnnullamento:byId.get(Number(row.id))?.esito||null})));
  } catch(e){next(e);}
};
router.get('/:idOperatore/:idContratto',list);
router.post('/:idOperatore/:idContratto',async(req,res,next)=>{
  try {
    const {idOperatore,idContratto}=req.params;
    const {dataInizio,dataFine,xml}=req.body;
    if(!valido(idOperatore)||!valido(idContratto)||!validDate(dataInizio)||!validDate(dataFine)||
      typeof xml!=='string'||xml.length<20||xml.length>100000||!xml.includes('<'))return res.status(400).json({message:'Chiamata o XML non validi'});
    await ensureTable();
    const padre=await trovaPadre(idContratto,idOperatore);
    if(!padre||padre.tipologia!=='CHIAMATA')return res.status(404).json({message:'Contratto a chiamata non trovato'});
    if(dataInizio>dataFine||dataInizio<padre.dataInizio||(padre.dataFine&&dataFine>padre.dataFine))return res.status(400).json({message:'Date esterne al periodo del contratto padre'});
    const [record]=await db.query('INSERT INTO chiamata_intermit_hr (idContratto,idOperatore,dataInizio,dataFine,xml,stato) VALUES(?,?,?,?,?,?)',[idContratto,idOperatore,dataInizio,dataFine,xml,'BOZZA']);
    res.status(201).json({id:record.insertId,message:'Chiamata salvata come bozza su Aiven'});
  }catch(e){next(e);}
});
// Test only: record an explicit simulated email outcome, never a certified PEC delivery.
router.post('/:idOperatore/:idContratto/:idChiamata/simula-invio',async(req,res,next)=>{
 try{
  const {idOperatore,idContratto,idChiamata}=req.params;
  if(![idOperatore,idContratto,idChiamata].every(valido))return res.status(400).json({message:'Identificativi non validi'});
  if(!(process.env.DB_HOST||'').toLowerCase().endsWith('.aivencloud.com'))return res.status(403).json({message:'Simulazione disponibile solo sul test Aiven'});
  await ensureTable();
  const [rows]=await db.query('SELECT id,stato,xml,esitoInvio FROM chiamata_intermit_hr WHERE id=? AND idOperatore=? AND idContratto=?',[idChiamata,idOperatore,idContratto]);
  if(!rows.length)return res.status(404).json({message:'Chiamata non trovata'});
  if(rows[0].stato==='INVIATA'&&!(rows[0].esitoInvio||'').startsWith('SIMULAZIONE TEST'))return res.status(409).json({message:'Invio reale già registrato'});
  const report='SIMULAZIONE TEST - FACSIMILE RICEVUTA DI CONSEGNA NON VALIDA - NESSUNA EMAIL SPEDITA - ID '+idChiamata+' - '+new Date().toISOString();
  await db.query("UPDATE chiamata_intermit_hr SET stato='INVIATA',esitoInvio=?,inviataIl=NOW() WHERE id=? AND idOperatore=? AND idContratto=?",[report,idChiamata,idOperatore,idContratto]);
  res.json({ok:true,simulata:true,ricevuta:report});
 }catch(e){next(e)}
});
// Annullamento simulato: conserva la chiamata e il file di annullamento, ma non spedisce PEC.
router.post('/:idOperatore/:idContratto/:idChiamata/simula-annullamento',resolve,allow('HR'),async(req,res,next)=>{
 try{
  const {idOperatore,idContratto,idChiamata}=req.params;
  if(![idOperatore,idContratto,idChiamata].every(valido))return res.status(400).json({message:'Identificativi non validi'});
  await ensureCancellations();
  const [[original]]=await db.query('SELECT id,stato,esitoInvio,dataInizio,dataFine FROM chiamata_intermit_hr WHERE id=? AND idOperatore=? AND idContratto=?',[idChiamata,idOperatore,idContratto]);
  if(!original)return res.status(404).json({message:'Chiamata non trovata'});
  if(original.stato!=='INVIATA'||!String(original.esitoInvio||'').startsWith('SIMULAZIONE TEST'))return res.status(409).json({message:'È possibile simulare l’annullamento soltanto di chiamate simulate. Per le comunicazioni reali serve il servizio email configurato.'});
  const xml=String(req.body?.xml||'');
  if(xml.length<100||xml.length>100000||!xml.includes('<ANannullamento>1</ANannullamento>'))return res.status(400).json({message:'XML di annullamento non valido'});
  const esito='SIMULAZIONE TEST - ANNULLAMENTO NON INVIATO - '+new Date().toISOString();
  const [record]=await db.query('INSERT IGNORE INTO chiamata_intermit_hr_annullamenti_test (idChiamata,xml,esito) VALUES(?,?,?)',[idChiamata,xml,esito]);
  if(!record.affectedRows)return res.status(409).json({message:'Annullamento test già registrato'});
  res.json({ok:true,simulata:true,esito});
 }catch(e){next(e)}
});
// Pulizia mirata dei due vecchi record preparati il 18/10/2026.
// Non può cancellare invii (veri o simulati), altri giorni o altri contratti.
router.delete('/:idOperatore/:idContratto/legacy-2026-10-18',resolve,allow('HR','ADMIN'),async(req,res,next)=>{
 const {idOperatore,idContratto}=req.params;
 if(![idOperatore,idContratto].every(valido))return res.status(400).json({message:'Identificativi non validi'});
 if(!(process.env.DB_HOST||'').toLowerCase().endsWith('.aivencloud.com'))return res.status(403).json({message:'Pulizia ammessa solo nel database Aiven test'});
 let connection;
 try{
  await ensureTable();
  connection=await db.getConnection();await connection.beginTransaction();
  const [rows]=await connection.query(`SELECT id FROM chiamata_intermit_hr
    WHERE idOperatore=? AND idContratto=? AND dataInizio='2026-10-18'
      AND stato='PEC_PREPARATA' AND (esitoInvio IS NULL OR esitoInvio='')
    FOR UPDATE`,[idOperatore,idContratto]);
  if(rows.length!==2){await connection.rollback();return res.status(409).json({message:'Attese esattamente 2 chiamate preparate il 18/10/2026 per questo contratto; trovate '+rows.length+'. Nessun record eliminato.'})}
  const ids=rows.map(r=>r.id);
  const [result]=await connection.query('DELETE FROM chiamata_intermit_hr WHERE id IN (?,?) AND idOperatore=? AND idContratto=? AND stato=\'PEC_PREPARATA\' AND (esitoInvio IS NULL OR esitoInvio=\'\')',[ids[0],ids[1],idOperatore,idContratto]);
  if(result.affectedRows!==2)throw new Error('Controllo cancellazione record fallito');
  await connection.commit();
  res.json({ok:true,eliminate:2,ids});
 }catch(e){if(connection)await connection.rollback();next(e)}
 finally{if(connection)connection.release()}
});
// Pulizia rigorosamente limitata alle simulazioni del contratto selezionato.
// Non rimuove comunicazioni reali o contratti.
router.delete('/:idOperatore/:idContratto/simulazioni',resolve,allow('HR','ADMIN'),async(req,res,next)=>{
 const {idOperatore,idContratto}=req.params;
 if(![idOperatore,idContratto].every(valido))return res.status(400).json({message:'Identificativi non validi'});
 if(!(process.env.DB_HOST||'').toLowerCase().endsWith('.aivencloud.com'))return res.status(403).json({message:'Reset ammesso solo su Aiven test'});
 let connection;
 try{
  await ensureCancellations();
  connection=await db.getConnection();await connection.beginTransaction();
  const [ids]=await connection.query("SELECT id FROM chiamata_intermit_hr WHERE idOperatore=? AND idContratto=? AND esitoInvio LIKE 'SIMULAZIONE TEST%'",[idOperatore,idContratto]);
  await connection.query("DELETE a FROM chiamata_intermit_hr_annullamenti_test a INNER JOIN chiamata_intermit_hr c ON c.id=a.idChiamata WHERE c.idOperatore=? AND c.idContratto=? AND c.esitoInvio LIKE 'SIMULAZIONE TEST%'",[idOperatore,idContratto]);
  await connection.query("DELETE FROM chiamata_intermit_hr WHERE idOperatore=? AND idContratto=? AND esitoInvio LIKE 'SIMULAZIONE TEST%'",[idOperatore,idContratto]);
  await connection.commit();
  res.json({ok:true,eliminate:ids.length});
 }catch(e){if(connection)await connection.rollback();next(e)}
 finally{if(connection)connection.release()}
});
router.patch('/:idOperatore/:idContratto/:idChiamata',async(req,res,next)=>{
  try{
    const {idOperatore,idContratto,idChiamata}=req.params;
    if(![idOperatore,idContratto,idChiamata].every(valido))return res.status(400).json({message:'Identificativi non validi'});
    const {stato,esitoInvio}=req.body;
    if(!['PEC_PREPARATA','INVIATA'].includes(stato))return res.status(400).json({message:'Stato non valido'});
    if(stato==='INVIATA'&&(!esitoInvio||typeof esitoInvio!=='string'||!esitoInvio.trim()))return res.status(400).json({message:'Per segnare inviata inserisci esito e riferimenti verificabili della PEC'});
    await ensureTable();
    const [result]=await db.query(`UPDATE chiamata_intermit_hr SET stato=?,esitoInvio=?,inviataIl=IF(?='INVIATA',NOW(),NULL)
      WHERE id=? AND idContratto=? AND idOperatore=?`,[stato,esitoInvio?String(esitoInvio).slice(0,200):null,stato,idChiamata,idContratto,idOperatore]);
    if(!result.affectedRows)return res.status(404).json({message:'Chiamata non trovata'});
    res.json({ok:true});
  }catch(e){next(e);}
});
module.exports=router;
