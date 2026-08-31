const operatoreServices = require('../services/operatoreServices');
const sessioneService = require('../services/sessioniServices');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const login = async (req, res) => {
    const { username, password } = req.body;
    console.log("Login per username: ", username);

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username e password sono obbligatori.' });
    }

    try {
        const dipendente = await operatoreServices.ottieniDipendenteByUsername(username);
        console.log(dipendente);

        if (!dipendente) {
            console.error(`Utente ${username} non trovato`);
            return res.status(404).json({ success: false, message: `Utente ${username} non trovato` });
        }

        console.log("Trovato operatore con username: ", username);

        const match = await bcrypt.compare(password, dipendente.password);
        if (!match) {
            console.error(`Password errata`);
            return res.status(401).json({ success: false, message: 'Password errata' });
        }

        req.session.user = {
            idOperatore: dipendente.id,
            ruolo: dipendente.ruolo
        };

        console.log("req.session.token***********: ", req.session.token);

        const accessToken = jwt.sign(
            { username: username },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '5d' }
        );

        req.session.token = accessToken;

        console.log("Salvataggio sessione per: " + username);
        await sessioneService.saveOrUpdateSessione(dipendente.id, accessToken);
        console.log("Sessione salvata con successo per: " + username);

        res.json({ success: true, token: accessToken, dipendente });
    } catch (error) {
        console.error("Errore durante il login:", error);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
};


const logout = async (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out' });
    });
}

const checkAuth = async (req, res) => {
    console.log("controllo checkAuth");

    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    }

    if (!token) {
        token = req.session?.token;
    }

    console.log("token presente: ", !!token);

    if (!token) {
        return res.status(401).json({ ok: false, message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const sessione = await sessioneService.ottieniSessioneByAccessToken(token);

        if (!sessione) {
            console.log("Nessuna sessione trovata nel DB!");
            return res.status(401).json({ ok: false, message: 'Session expired' });
        }

        await sessioneService.aggiornaScadenzaSessione(sessione.idSessione);

        if (req.session?.token) {
            req.session._garbage = Date();
            req.session.touch();
        }

        return res.status(200).json({
            ok: true,
            username: decoded.username
        });
    } catch (error) {
        console.error("Token non valido in checkAuth:", error.message);
        return res.status(401).json({ ok: false, message: 'Invalid token' });
    }
}

module.exports = {
    login,
    logout,
    checkAuth
}