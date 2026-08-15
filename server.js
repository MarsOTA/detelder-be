const express = require('express');
const session = require('express-session');
const app = express();
const verifyJWT = require('./middleware/verifyJWT');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv-flow').config();

const MySQLStore = require('express-mysql-session')(session);
const db = require('./db')

//console.log('DB_HOST:', process.env.DB_HOST);
//console.log('DB_PASS:', process.env.DB_PASS);

const PORT = process.env.PORT;

const originalLog = console.log;

console.log = (...args) => {
  //const timestamp = new Date().toISOString();
  const timestamp = new Date().toLocaleString();
  originalLog(`[${timestamp}]`, ...args);
}

//serve static files
app.use(express.static(path.join(__dirname, '/dist')));

db.query("SELECT 1")
    .then(() => {
        console.log('db connection succeded')
        app.listen(PORT, () => {
            console.log(`Example app listening on port ${PORT}`)
        })
    })
    .catch(err => console.log('db connection failed. \n' + err))


//log delle chiamate
app.use((req, res, next) => {
    console.log(`req.method: ${req.method} -req.headers.origin-  ${req.headers.origin} -req.url- ${req.url}`)
    console.log(`req.method: ${req.method} -req.path-  ${req.path}`)
    next();
})

    
//app.use(express.urlencoded({ extended: false })); 
//app.use(express.json());


// CORS: permette al frontend di inviare cookie e Authorization header
app.use(cors({
  origin: process.env.CORS_ORIGIN, // frontend Vite
  credentials: true
}));

const sessionStore = new MySQLStore({}, db);
// Sessione
app.set('trust proxy', 1);  // se sei dietro proxy
app.use(session({
  secret: '720731877b6d3828978de8e050e63b533be1af31b09a805ad072236cd9afa7e7',
  resave: false,
  store: sessionStore,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',   // true solo in HTTPS
    sameSite: 'lax',
    maxAge: 24 * 1000 * 60 * 60  // 1 giorno
   // maxAge: 1000 * 1 * 30  // 30 secondi
  }
}));

/*
app.use((req, res, next) => {
  console.time('req-duration');
  res.on('finish', () => {
    console.timeEnd('req-duration'); // stampa tempo totale per risposta
  });
  next();
});
*/


//middleware for cookies
app.use(cookieParser());


/* =======================
   BODY PARSER SOLO JSON API
======================= */
app.use('/auth', express.json(), express.urlencoded({ extended: false }));
app.use('/turni', express.json(), express.urlencoded({ extended: false }));
app.use('/clienti', express.json(), express.urlencoded({ extended: false }));
app.use('/eventi', express.json(), express.urlencoded({ extended: false }));
app.use('/operatori', express.json(), express.urlencoded({ extended: false }));
app.use('/payroll', express.json(), express.urlencoded({ extended: false }));


app.use('/auth', require('./routes/api/registrazione'));

app.use('/operatori', verifyJWT , require('./routes/api/operatori'));
app.use('/turni', verifyJWT , require('./routes/api/turni'));
app.use('/clienti', verifyJWT , require('./routes/api/clienti'));
app.use('/eventi', verifyJWT , require('./routes/api/eventi'));
app.use('/payroll', verifyJWT , require('./routes/api/payroll'));

app.use('/upload', verifyJWT , require('./routes/api/upload'));


// Catch-all per supportare React Router in modalità SPA

 app.get(/^\/(?!api|auth|operatori|clienti|eventi).*/, (req, res) => {
   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
 });


//Gestione globale degli errori 
app.use((err, req, res, next) => {
    console.log(err);
  //  res.status(err.status || 500).send('Something went wrong!')
  next();
})



/*
app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})
    */



