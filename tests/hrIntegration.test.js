'use strict';
// Real Express router + temporary MySQL, with fake users only.
// Guardrails prevent accidental connection to Aiven / production.
const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');

if(process.env.CI!=='true'||process.env.DB_NAME!=='detelder_hr_ci'
    ||!['127.0.0.1','localhost'].includes(process.env.DB_HOST)){
  throw new Error('HR integration tests require the isolated local CI MySQL service.');
}
const db=require('../db');
const router=require('../routes/api/hrWorkflow');
const app=express();
app.use(express.json());
app.use('/hr-workflow',router);
app.use((err,req,res,next)=>{void next;res.status(500).json({error:err.code||err.message});});

test('real HR endpoints: ADMIN, HR, ADMIN_HR, unauthorized and expired contract reassignment',async()=>{
  // Only test fixtures, generated inside the one-use GitHub Actions MySQL service.
  await db.query('CREATE TABLE dipendenti (id BIGINT PRIMARY KEY,ruolo VARCHAR(40),nome VARCHAR(60),cognome VARCHAR(60),email VARCHAR(80),username VARCHAR(80),telefono VARCHAR(30))');
  await db.query('CREATE TABLE sessione (sessione VARCHAR(120) PRIMARY KEY,idDipendente BIGINT)');
  await db.query('CREATE TABLE contratto (idContratto BIGINT AUTO_INCREMENT PRIMARY KEY,idOperatore BIGINT,tipologia VARCHAR(50),data_inizio DATE,path_contratto_unilav VARCHAR(250))');
  // Emulate the pre-refactoring Aiven schema: the middleware must migrate it.
  await db.query("CREATE TABLE hr_ruoli_assegnati (idOperatore BIGINT NOT NULL PRIMARY KEY,ruolo ENUM('ADMIN','HR') NOT NULL,assegnatoDa BIGINT NULL,aggiornatoIl TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
  const fixtures=[
    [1,'ADMIN','Amministratore','Fittizio'],
    [2,'OPERATORE','Addetto','Fittizio'],
    [3,'ADMIN','Responsabile','Fittizio'],
    [4,'OPERATORE','Lavoratore','Fittizio'],
    [5,'OPERATORE','SenzaRuolo','Fittizio']
  ];
  for(const [id,role,name,surname] of fixtures){
    await db.query('INSERT INTO dipendenti (id,ruolo,nome,cognome,email,username,telefono) VALUES(?,?,?,?,?,?,?)',
      [id,role,name,surname,'user-'+id+'@example.invalid','test-'+id,'000'+id]);
    await db.query('INSERT INTO sessione (sessione,idDipendente) VALUES(?,?)',['ci-session-'+id,id]);
  }
  const srv=app.listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>{srv.once('listening',resolve);srv.once('error',reject);});
  const url='http://127.0.0.1:'+srv.address().port;
  const request=async (id,method,path,body)=>{
    const res=await fetch(url+path,{
      method,
      headers:{
        ...(id?{Authorization:'Bearer ci-session-'+id}:{}),
        'Content-Type':'application/json'
      },
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    return {status:res.status,data:await res.json()};
  };
  try{
    assert.equal((await request(null,'GET','/hr-workflow/me')).status,401,'anonymous must be rejected');
    assert.equal((await request(5,'GET','/hr-workflow/me')).status,403,'operator without HR role must be rejected');
    assert.deepEqual((await request(1,'GET','/hr-workflow/me')).data,{id:1,role:'ADMIN'});
    const [roleDefinition]=await db.query("SHOW COLUMNS FROM hr_ruoli_assegnati LIKE 'ruolo'");
    assert.ok(String(roleDefinition[0]?.Type||'').includes("'ADMIN_HR'"),'existing Aiven role column must migrate without data loss');

    // HR user and combined Admin-HR come from the verified server-side role table.
    await db.query("INSERT INTO hr_ruoli_assegnati(idOperatore,ruolo,assegnatoDa) VALUES (2,'HR',1),(3,'HR',1)");
    assert.equal((await request(2,'GET','/hr-workflow/me')).data.role,'HR');
    assert.equal((await request(3,'GET','/hr-workflow/me')).data.role,'ADMIN_HR');

    const old={idOperatore:4,tipologia:'OCCASIONALE',datore:'DETELDER',
      dataInizio:'2026-10-01',dataFine:'2026-10-15',note:'Contratto storico di test'};
    assert.equal((await request(2,'POST','/hr-workflow/pratiche',old)).status,403,'HR-only cannot assign contracts');
    const oldResponse=await request(1,'POST','/hr-workflow/pratiche',old);
    assert.equal(oldResponse.status,201,JSON.stringify(oldResponse));
    const previousId=oldResponse.data.id;

    const next={idOperatore:4,tipologia:'CHIAMATA',datore:'DETELDER',
      dataInizio:'2026-11-25',dataFine:'2026-12-20',note:'Nuovo contratto dopo occasionale'};
    const created=await request(3,'POST','/hr-workflow/pratiche',next);
    assert.equal(created.status,201,JSON.stringify(created));
    assert.notEqual(created.data.id,previousId);
    assert.equal((await request(3,'POST','/hr-workflow/pratiche',next)).status,409,'same type/date must not duplicate');
    assert.equal((await request(1,'POST','/hr-workflow/pratiche/'+created.data.id+'/prendi-in-carico')).status,403,
      'ADMIN cannot perform HR-only processing');
    assert.equal((await request(2,'POST','/hr-workflow/pratiche/'+created.data.id+'/prendi-in-carico')).status,200,
      'HR can process an assigned practice');
    assert.equal((await request(3,'POST','/hr-workflow/pratiche/'+created.data.id+'/prendi-in-carico')).status,200,
      'ADMIN_HR can perform HR-only processing');

    const current=(await request(2,'GET','/hr-workflow/pratiche')).data;
    assert.ok(current.some(p=>p.id===previousId&&p.tipologia==='OCCASIONALE'),'historical occasional must remain');
    assert.ok(current.some(p=>p.id===created.data.id&&p.tipologia==='CHIAMATA'),'new call practice must exist');

    assert.equal((await request(2,'PUT','/hr-workflow/utenti/5/ruolo',{role:'ADMIN_HR'})).status,403,
      'HR cannot grant administrator privileges');
    assert.equal((await request(3,'PUT','/hr-workflow/utenti/5/ruolo',{role:'ADMIN_HR'})).status,200,
      'ADMIN_HR can assign HR privileges');
    assert.equal((await request(5,'GET','/hr-workflow/me')).data.role,'ADMIN_HR');

  } finally {
    await new Promise((resolve,reject)=>srv.close(err=>err?reject(err):resolve()));
    await db.end();
  }
});
