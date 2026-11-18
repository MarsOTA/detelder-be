import assert from "node:assert/strict";
import {chromium} from "playwright";
const fe="http://127.0.0.1:4173";
const be="http://127.0.0.1:4181";
const browser=await chromium.launch({headless:true});
const tomorrow=(n)=>{
 const d=new Date();d.setUTCDate(d.getUTCDate()+n);
 return d.toISOString().slice(0,10);
};
async function pageFor(id,primaryRole){
 const context=await browser.newContext({serviceWorkers:"block"});
 const page=await context.newPage();
 await page.addInitScript(args=>{
   localStorage.setItem("token","ci-session-"+args.id);
   localStorage.setItem("ruolo",args.role);
   localStorage.setItem("idOperatore",String(args.id));
 },{id,role:primaryRole});
 return {context,page};
}
async function api(token,method,path,body){
 const r=await fetch(be+path,{
  method,headers:{Authorization:"Bearer ci-session-"+token,"Content-Type":"application/json"},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 return {status:r.status,data:await r.json()};
}
try{
 // Real app -> real HTTP API -> disposable MySQL.
 const admin=await pageFor(1,"ADMIN");
 const row=admin.page.getByRole("row").filter({hasText:"Fittizio Luca"});
 await admin.page.goto(fe+"/admin/modulo-hr");
 await row.waitFor({timeout:25000});
 await row.getByRole("combobox",{name:"Inquadramento"}).selectOption("CHIAMATA");
 await row.getByLabel("Data inizio contratto di Fittizio").fill(tomorrow(2));
 await row.getByLabel("Data fine contratto di Fittizio").fill(tomorrow(40));
 await row.getByRole("button",{name:"Assegna ad HR"}).click();
 await row.getByRole("button",{name:"Assegna nuovo contratto"}).waitFor({timeout:25000});
 const rows=(await api(1,"GET","/hr-workflow/pratiche")).data;
 assert.ok(rows.some(p=>p.idOperatore===4&&p.tipologia==="CHIAMATA"),"New call practice persisted");
 console.log("OK FULL STACK: Admin assigned CHIAMATA contract via actual frontend/API/database");
 await admin.context.close();
 
 const combined=await pageFor(3,"ADMIN");
 await combined.page.goto(fe+"/hr");
 const combinedRow=combined.page.getByRole("row").filter({hasText:"Fittizio Luca"});
 await combinedRow.waitFor({timeout:25000});
 await combinedRow.getByRole("button",{name:"Dettagli turni di Fittizio Luca"}).click();
 await combined.page.getByText("Evento fittizio").waitFor({timeout:10000});
 assert.ok(await combined.page.getByText("Torna ad Admin").isVisible());
 await combined.page.goto(fe+"/admin/hr-ruoli");
 await combined.page.getByText("Abilitazioni ADMIN / HR").waitFor();
 console.log("OK FULL STACK: Admin-HR can open HR queue and manage users");
 await combined.context.close();
 
 const hr=await pageFor(2,"OPERATORE");
 await hr.page.goto(fe+"/admin/modulo-hr");
 await hr.page.getByText("Accesso Negato").waitFor({timeout:15000});
 const unauthorized=await api(2,"POST","/hr-workflow/pratiche",{
  idOperatore:4,tipologia:"TEMPO_DETERMINATO",datore:"DETELDER",dataInizio:tomorrow(3),dataFine:tomorrow(20)
 });
 assert.equal(unauthorized.status,403,"Real backend must deny HR assignment");
 console.log("OK FULL STACK: HR cannot assign or open Admin pages");
 await hr.context.close();
}finally{
 await browser.close();
}
