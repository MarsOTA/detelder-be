const jwt = require('jsonwebtoken');
require('dotenv-flow').config();
const sessioneService = require('../services/sessioniServices')

const verifyJWT = async (req, res, next) => {

    if (req.url === '/login') {
        return next(); // bypassa il middleware per /login
    }
    const authHeader = req.headers.authorization || req.headers.Authorization;

    let token = null;

    // Controlla che l'header esista e inizi con "Bearer "
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        // console.log(authHeader); // Bearer token
        token = authHeader.split(' ')[1];
    }
    if (!token) {
        //console.log("token interno if: " + token);
        token = req.session.token;
    } else {
        // console.log("token interno else1: " + token);
        if (!req.session.token || req.session.token !== token) {
            console.log("Sessione di request scaduta!");
            return res.sendStatus(401);
        }
    }

    //if (!token) return res.sendStatus(401);
    if (!token) {
        console.log("token mancante o scaduto");

        // Se è una chiamata API → manda 401
        if (req.originalUrl.startsWith('/api')) {
            return res.sendStatus(401);
        }

        // Se è una richiesta di pagina (es. /admin/eventi) → redirect a login
        return res.redirect('/login');
    }

    const sessione = await sessioneService.ottieniSessioneByAccessToken(token);

    // Rinnova la sessione (sliding expiration)
    req.session._garbage = Date();
    req.session.touch();

    if (sessione == undefined) {
        console.log("Nessuna sessione trovata nel DB!");
        return res.sendStatus(401);
    } else {

        // console.log(sessione);
        // console.log(sessione.dataInserimento);
        // console.log(sessione.dataAggiornamento);



        console.log("INIZIO aggiornaScadenza", new Date().toISOString());
        await sessioneService.aggiornaScadenzaSessione(sessione.idSessione);
        console.log("FINE aggiornaScadenza", new Date().toISOString());

        jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET,
            (err, decoded) => {
                if (err) return res.sendStatus(403); //invalid token
                req.user = decoded.username;
                next();
            }
        );

    }
}

module.exports = verifyJWT