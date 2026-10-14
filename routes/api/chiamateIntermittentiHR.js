const express = require('express');
const db = require('../../db');
const router = express.Router();

// Archivio separato per le comunicazioni figlie: nessuna modifica alla tabella contratto.
// Si inizializza esclusivamente nel database Aiven collegato al backend di test.
let ready;
async function ensureTable() {
  if (!/(?:^|\\.)aivencloud\\.com$/i.test(process.env.DB_HOST || '')) {
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
const valido = n => Number.isSafeInteger(Number(n)) && Number(n) > 0;
async function trovaPadre(idContratto, idOperatore) {
  const [rows] = await db.query(
    "SELECT idContratto,idOperatore,tipologia,DATE_FORMAT(data_inizio,'%Y-%m-%d') AS dataInizio,DATE_FORMAT(data_fine,'%Y-%m-%d') AS dataFine FROM contratto WHERE idContratto=? AND idOperatore=? LIMIT 1",
    [idContratto,idOperatore]
  );
  return rows[0];
}
function validDate(date) { return typeof date === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(date) && !Number.isNaN(Date.parse(date+'T12:00:00Z')); }
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
    res.json(rows);
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
