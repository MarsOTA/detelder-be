const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

require('dotenv-flow').config();

const verifyJWT = require('./middleware/verifyJWT');
const db = require('./db');

const MySQLStore = require('express-mysql-session')(session);

const app = express();


// =====================================================
// CONFIGURAZIONE AMBIENTE
// =====================================================

const PORT = Number(process.env.PORT || 3000);

const isVercel = process.env.VERCEL === '1';

// Il frontend e backend TEST sono su due domini *.vercel.app
// differenti, quindi per il cookie di sessione serve
// SameSite=None + Secure.
const isTestDeployment = process.env.DEPLOYMENT_ENV === 'test';


// =====================================================
// LOG CON TIMESTAMP
// =====================================================

const originalLog = console.log;

console.log = (...args) => {
    const timestamp = new Date().toLocaleString();
    originalLog(`[${timestamp}]`, ...args);
};


// =====================================================
// TRUST PROXY
// =====================================================

// Necessario quando Express gira dietro Vercel / Nginx / proxy HTTPS
app.set('trust proxy', 1);


// =====================================================
// LOG DELLE RICHIESTE
// =====================================================

app.use((req, res, next) => {
    console.log(
        `req.method: ${req.method} ` +
        `- origin: ${req.headers.origin || 'none'} ` +
        `- url: ${req.url}`
    );

    next();
});


// =====================================================
// CORS
// =====================================================

if (!process.env.CORS_ORIGIN) {
    console.warn('ATTENZIONE: CORS_ORIGIN non configurato');
}

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));


// =====================================================
// SESSION STORE MYSQL
// =====================================================

const sessionStore = new MySQLStore({}, db);

const sessionSecret =
    process.env.SESSION_SECRET ||
    '720731877b6d3828978de8e050e63b533be1af31b09a805ad072236cd9afa7e7';

app.use(session({
    secret: sessionSecret,

    resave: false,

    saveUninitialized: false,

    store: sessionStore,

    cookie: {
        httpOnly: true,

        /*
         * TEST VERCEL:
         * detelder-fe-ruby.vercel.app
         *        ↓
         * detelder-be.vercel.app
         *
         * Sono cross-site, quindi:
         * Secure = true
         * SameSite = none
         *
         * Produzione futura:
         * app.detelder.com
         * api.detelder.com
         *
         * può continuare con SameSite=lax.
         */
        secure: isTestDeployment
            ? true
            : process.env.COOKIE_SECURE === 'true',

        sameSite: isTestDeployment
            ? 'none'
            : 'lax',

        maxAge: 24 * 60 * 60 * 1000
    }
}));


// =====================================================
// COOKIE PARSER
// =====================================================

app.use(cookieParser());


// =====================================================
// BODY PARSER API
// =====================================================

const apiParser = [
    express.json(),
    express.urlencoded({ extended: false })
];

app.use('/auth', ...apiParser);
app.use('/turni', ...apiParser);
app.use('/clienti', ...apiParser);
app.use('/eventi', ...apiParser);
app.use('/operatori', ...apiParser);
app.use('/payroll', ...apiParser);


// =====================================================
// ROUTE PUBBLICHE
// =====================================================

app.use(
    '/auth',
    require('./routes/api/registrazione')
);


// =====================================================
// ROUTE PROTETTE
// =====================================================

app.use(
    '/operatori',
    verifyJWT,
    require('./routes/api/operatori')
);

app.use(
    '/turni',
    verifyJWT,
    require('./routes/api/turni')
);

app.use(
    '/clienti',
    verifyJWT,
    require('./routes/api/clienti')
);

app.use(
    '/eventi',
    verifyJWT,
    require('./routes/api/eventi')
);

app.use(
    '/payroll',
    verifyJWT,
    require('./routes/api/payroll')
);

app.use(
    '/upload',
    verifyJWT,
    require('./routes/api/upload')
);


// =====================================================
// FRONTEND STATICO
// SOLO SERVER TRADIZIONALE
// =====================================================

// Sul BE Vercel non dobbiamo cercare /dist.
// Il frontend Vercel è un progetto separato.

if (!isVercel) {

    app.use(
        express.static(
            path.join(__dirname, 'dist')
        )
    );

    app.get(
        /^\/(?!auth|operatori|turni|clienti|eventi|payroll|upload).*/,
        (req, res) => {

            res.sendFile(
                path.join(
                    __dirname,
                    'dist',
                    'index.html'
                )
            );

        }
    );

}


// =====================================================
// GESTIONE ERRORI
// =====================================================

app.use((err, req, res, next) => {

    console.error('Errore Express:', err);

    if (res.headersSent) {
        return next(err);
    }

    return res.status(
        err.status || 500
    ).json({
        success: false,
        message: 'Errore interno del server'
    });

});


// =====================================================
// AVVIO SERVER LOCALE / VPS
// =====================================================

// Su Vercel NON bisogna chiamare app.listen().
// Vercel gestisce autonomamente il server HTTP.
//
// Su VPS / locale continuiamo invece a verificare il DB
// e successivamente avviamo Express.

if (!isVercel) {

    db.query('SELECT 1')

        .then(() => {

            console.log('db connection succeeded');

            app.listen(PORT, () => {
                console.log(
                    `Server listening on port ${PORT}`
                );
            });

        })

        .catch((err) => {

            console.error(
                'db connection failed:',
                err
            );

            process.exit(1);

        });

}


// =====================================================
// EXPORT PER VERCEL
// =====================================================

module.exports = app;
