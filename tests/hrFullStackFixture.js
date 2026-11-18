'use strict';
// Ephemeral integrated frontend/backend fixture. NEVER connects to Vercel, Aiven or OVH.
// Start only from GitHub Actions with CI=true and dedicated localhost MySQL.
if(process.env.CI!=='true'||process.env.DB_NAME!=='detelder_hr_ci'||
   !['localhost','127.0.0.1'].includes(process.env.DB_HOST)){
 throw new Error('Full-stack fixture requires disposable local CI database');
}
const db=require('../db');
const express=require('express');
const cors=require('cors');
const {init}=require('../middleware/hrAccess');
const app=express();
app.use(express.json());
app.use(cors({origin:'http://127.0.0.1:4173',credentials:true}));
const iso=val=>val instanceof Date?val.toISOString().slice(0,10):String(val||'').slice(0,10);
function afterDays(days){
 const d=new Date();d.setUTCDate(d.getUTCDate()+days);
 return d.toISOString().slice(0,10);
}
const shift=afterDays(7);
const fixtureWorker={
 id:4,ruolo:'OPERATORE',nome:'Luca',cognome:'Fittizio',
 codiceFiscale:'FZZLCU00A01F205Z',codice_fiscale:'FZZLCU00A01F205Z',
 dataNascita:'2000-01-01',luogoNascita:'Milano',
 indirizzoResidenza:'Via Esempio',numeroCivicoResidenza:'1',
 comuneResidenza:'Milano',provinciaResidenza:'MI',capResidenza:'20100'
};
async function seed(){
 await db.query('CREATE TABLE dipendenti (id BIGINT PRIMARY KEY,ruolo VARCHAR(40),nome VARCHAR(60),cognome VARCHAR(60),email VARCHAR(80),username VARCHAR(80),telefono VARCHAR(30))');
 await db.query('CREATE TABLE sessione (sessione VARCHAR(120) PRIMARY KEY,idDipendente BIGINT)');
 await db.query('CREATE TABLE contratto (idContratto BIGINT AUTO_INCREMENT PRIMARY KEY,idOperatore BIGINT,tipologia VARCHAR(50),data_inizio DATE,data_fine DATE,path_contratto_unilav VARCHAR(250))');
 for(const [id,role,name,surname] of [
   [1,'ADMIN','Admin','Fittizio'],[2,'OPERATORE','Addetto','Fittizio'],
   [3,'ADMIN','Responsabile','Misto'],[4,'OPERATORE','Luca','Fittizio'],
   [5,'OPERATORE','Senza','Ruolo']
 ]){
   await db.query('INSERT INTO dipendenti(id,ruolo,nome,cognome,email,username,telefono) VALUES(?,?,?,?,?,?,?)',[id,role,name,surname,'test'+id+'@example.invalid','test'+id,'0000'+id]);
   await db.query('INSERT INTO sessione(sessione,idDipendente) VALUES(?,?)',['ci-session-'+id,id]);
 }
 await init();
 await db.query("INSERT INTO hr_ruoli_assegnati(idOperatore,ruolo,assegnatoDa) VALUES (2,'HR',1),(3,'HR',1)");
 await db.query("INSERT INTO contratto(idOperatore,tipologia,data_inizio,data_fine) VALUES (4,'OCCASIONALE','2026-10-01','2026-10-15')");
}
app.get('/auth/checkAuth',(req,res)=>{
 // CI fixture only: the verified HR API still authenticates on real session rows.
 // The frontend normally relies on an httpOnly login cookie for this endpoint.
 res.json({ok:true});
});
app.get('/operatori',(_req,res)=>res.json([fixtureWorker]));
app.get('/turni',(_req,res)=>res.json([{
 idTurno:444,idOperatore:4,dataTurno:shift,oraInizio:'09:00',oraFine:'17:00',
 nomeEvento:'Evento fittizio',via:'Via Test 1'
}]));
app.get('/operatori/ottieniOperatore/4',(_req,res)=>res.json(fixtureWorker));
app.get('/operatori/listaContrattiOperatore/4',async(req,res,next)=>{
 try{
 const [rows]=await db.query("SELECT idContratto,tipologia,DATE_FORMAT(data_inizio,'%Y-%m-%d') AS dataInizio,DATE_FORMAT(data_fine,'%Y-%m-%d') AS dataFine,path_contratto_unilav AS pathContrattoUnilav FROM contratto WHERE idOperatore=4");
 res.json(rows);
 }catch(e){next(e)}
});
app.use('/hr-workflow',require('../routes/api/hrWorkflow'));
app.use((err,req,res,next)=>{void req;void next;console.error('CI backend error:',err.code||err.message);res.status(500).json({message:'CI fixture error',code:err.code||'UNKNOWN'})});
seed().then(()=>{
 app.listen(4181,'127.0.0.1',()=>console.log('HR FULLSTACK FIXTURE READY localhost:4181 shift='+shift));
}).catch(e=>{console.error('CI fixture setup failed:',e);process.exitCode=1;void db.end()});
