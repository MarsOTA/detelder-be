const db=require('../db');
let migration=null;
async function init(){
 if(!migration)migration=(async()=>{
  await db.query(`CREATE TABLE IF NOT EXISTS hr_ruoli_assegnati (
    idOperatore BIGINT NOT NULL PRIMARY KEY,
    ruolo ENUM('ADMIN','HR') NOT NULL,
    assegnatoDa BIGINT NULL,
    aggiornatoIl TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await db.query(`CREATE TABLE IF NOT EXISTS hr_pratiche (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    idOperatore BIGINT NOT NULL,
    tipologia VARCHAR(50) NOT NULL,
    datore VARCHAR(40) NOT NULL,
    dataInizio DATE NULL,
    dataFine DATE NULL,
    note TEXT NULL,
    stato ENUM('DA_ELABORARE','IN_LAVORAZIONE','DOCUMENTI_MANCANTI','COMPLETATO') NOT NULL DEFAULT 'DA_ELABORARE',
    assegnatoDa BIGINT NOT NULL,
    presoInCaricoDa BIGINT NULL,
    creatoIl TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aggiornatoIl TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stato(stato),
    INDEX idx_operatore(idOperatore)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await db.query(`CREATE TABLE IF NOT EXISTS hr_pratiche_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    praticaId BIGINT UNSIGNED NOT NULL,
    attoreId BIGINT NOT NULL,
    statoPrima VARCHAR(40) NULL,
    statoDopo VARCHAR(40) NOT NULL,
    dettaglio TEXT NULL,
    creatoIl TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pratica(praticaId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 })().catch(e=>{migration=null;throw e});
 return migration;
}
async function resolve(req,res,next){
 try{
  await init();
  // Authenticated server-side session, never the browser's claimed role.
  const header=req.headers.authorization||'';
  const token=header.startsWith('Bearer ')?header.slice(7):req.session?.token;
  if(!token)return res.status(401).json({message:'Accesso non autenticato'});
  const [[sessione]]=await db.query('SELECT * FROM sessione WHERE sessione=? LIMIT 1',[token]);
  if(!sessione)return res.status(401).json({message:'Sessione scaduta'});
  const id=Number(sessione.idDipendente||sessione.idOperatore);
  if(!Number.isSafeInteger(id)||id<=0)return res.status(403).json({message:'Sessione priva di utente riconoscibile'});
  const [[dip]]=await db.query('SELECT id,ruolo FROM dipendenti WHERE id=? LIMIT 1',[id]);
  if(!dip)return res.status(403).json({message:'Utente non trovato'});
  const [[row]]=await db.query('SELECT ruolo FROM hr_ruoli_assegnati WHERE idOperatore=?',[id]);
  // Preserve existing admin access; explicit HR role overrides only in module HR.
  const role=row?.ruolo || (dip.ruolo==='ADMIN'?'ADMIN':null);
  if(!role)return res.status(403).json({message:'Non abilitato al modulo HR'});
  req.hrIdentity={id,role};
  next();
 }catch(e){next(e)}
}
const allow=(...roles)=>(req,res,next)=>roles.includes(req.hrIdentity?.role)?next():res.status(403).json({message:'Operazione non consentita al ruolo corrente'});
module.exports={init,resolve,allow};
