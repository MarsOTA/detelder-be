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



        // create JWTs
        //5 giorni prima che scade, ma comunque viene gestita dalla sessione di durata di 30 minuti che si rinnova 
        //ad ogni navigazione. Si ipotizza che un client navighi meno di 5 giorni consecutivi.
        
        const accessToken = jwt.sign(
            { username: username },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '5d' }
        );
        

        //const accessToken = req.session.token;
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

    //Qui si controlla se il token di sessione non è scaduto(durata 30 minuti)
    const token = req.session.token;
    console.log("token****: " + token);
    if (!token) return res.status(401).json({ message: 'Not authenticated' });


    //Qui si controlla che l'access token creato in fase di login sia ancora valido (durata 5 giorni)
    // e sia proprio dell'utente che si logga decoded.username
    /*
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) return res.sendStatus(403); //invalid token
            req.user = decoded.username;
            next();
        }
    );
    console.log("req.user: " + req.user);
    */


    //Se il token di sessione è valido allora si riazzera la scadenza (30 minuti)
    const isTokenTrue = !!req.session.token;
    console.log("token di sessione è ancora valido: ", isTokenTrue);
    if (isTokenTrue) {
        req.session._garbage = Date();
        req.session.touch();
    }

    return res.status(201).json({
        ok: isTokenTrue,
        // role: req.user.role, // 'user' o 'admin'
        role: 'ADMIN', // 'user' o 'admin'
    });

}

module.exports = {
    login,
    logout,
    checkAuth
}