const jwt = require('jsonwebtoken');
require('dotenv-flow').config();
const sessioneService = require('../services/sessioniServices')

const verifyJWT = async (req, res, next) => {

    if (req.url === '/login') {
        return next();
    }

    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    }

    if (!token) {
        token = req.session?.token;
    }

    if (!token) {
        console.log("token mancante o scaduto");
        return res.sendStatus(401);
    }

    try {
        const sessione = await sessioneService.ottieniSessioneByAccessToken(token);

        if (!sessione) {
            console.log("Nessuna sessione trovata nel DB!");
            return res.sendStatus(401);
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded.username;

        await sessioneService.aggiornaScadenzaSessione(sessione.idSessione);

        if (req.session?.token) {
            req.session._garbage = Date();
            req.session.touch();
        }

        return next();
    } catch (error) {
        console.error("Token non valido:", error.message);
        return res.sendStatus(403);
    }
}

module.exports = verifyJWT