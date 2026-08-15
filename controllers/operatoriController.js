const operatoreServices = require('../services/operatoreServices')
const turniOperatoreServices = require('../services/turniOperatoreServices')
const allegatiOpeartoreServices = require('../services/allegatiOpeartoreServices')
const bcrypt = require('bcrypt');
const { sendWhatsApp } = require('../client/twilioClient');

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const ejs = require("ejs");

const getOperatori = async (req, res) => {
    const employees = await operatoreServices.ottieniListaDipendenti();
    res.send(employees);
}

// --- funzione privata, visibile solo in questo file ---
function formatMySQLDate(date) {
    if (!date) return "";

    // Se è una stringa, la converto in Date
    const d = (date instanceof Date) ? date : new Date(date);

    // Se non è valida, ritorno stringa vuota
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}



const ricercaDipendenti = async (req, res) => {

    console.log('Apertura finestra per ricerca dipendenti');

    const datiDipendenti = await operatoreServices.ricercaDipendenti(req.query);
    const dipendenti = datiDipendenti.map(op => ({
        nomeOperatore: op.nome,
        cognomeOperatore: op.cognome,
        nicknameOperatore: op.nickname,
        disponibilita: op.idTurno ? "NON DISPONIBILE" : "DISPONIBILE",
        turno: op.idTurno
            ? `${formatMySQLDate(op.dataTurno)} ${op.oraInizio} - ${op.oraFine}`
            : "",
        nomeEvento: op.nomeEvento,
        indirizzoEvento: op.indirizzo,
        idOperatore: String(op.id)
    }));

    res.send(dipendenti);
}


// Funzione per generare password
function generaPassword(lunghezza = 6) {
    //const caratteri = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    const caratteri = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < lunghezza; i++) {
        const randIndex = Math.floor(Math.random() * caratteri.length);
        password += caratteri[randIndex];
    }
    return password;
}

const creaNuovoOperatore = async (req, res) => {
    const dipendente = await operatoreServices.ottieniDipendenteByUsername(req.body.telefono);
    if (dipendente == undefined) {
        const password = generaPassword();
        const hashedPwd = await bcrypt.hash(password, 10);
        const operatore = req.body;
        console.log("Inizio creazione nuovo operatore: ", operatore);
        await operatoreServices.creaOpertore(operatore, hashedPwd);
        console.log("Creazione nuovo operatore avvenuta con successo");

        const contentSid = process.env.TWILIO_CONTENT_SID_INVIO_CREDENZIALI;
        const contentVariables = JSON.stringify({
            "1": req.body.telefono,
            "2": password,
        });

        try {
            await sendWhatsApp(contentSid, contentVariables, operatore.prefisso, operatore.telefono);
            //res.status(200).json({ success: true, sid: response.sid });
            res.status(201).send({ success: true, message: "Credenziali inviate correttamente" });
        } catch (err) {
            console.error("Errore durante l'invio del messaggio:", err);
            res.status(500).json({ success: false, message: "Non è stato possibile inviare le credenziali tramite Whatsapp", error: err.message });
        }

    } else {
        res.status(201).send({ 'message': `operatore con telefono ${req.body.telefono} già esistente` })
    }
}

const reinviaPassword = async (req, res) => {

    console.log('req.params.idOperatore:', req.params.idOperatore);

    const dipendente = await operatoreServices.ottieniDipendenteById(req.params.idOperatore);
    if (dipendente) {
        const password = generaPassword();
        const hashedPwd = await bcrypt.hash(password, 10);

        const contentSid = process.env.TWILIO_CONTENT_SID_INVIO_CREDENZIALI;
        const contentVariables = JSON.stringify({
            "1": dipendente.telefono,
            "2": password,
        });

        console.log("password: ", password);

        try {
            await sendWhatsApp(contentSid, contentVariables, dipendente.prefisso, dipendente.telefono);
            await operatoreServices.aggiornaPassword(hashedPwd, dipendente.id);
            res.status(201).send({ success: true, message: "Credenziali inviate correttamente" });
        } catch (err) {
            console.error("Errore durante l'invio del messaggio:", err);
            res.status(500).json({ success: false, message: "Non è stato possibile inviare le credenziali tramite Whatsapp", error: err.message });
        }

    }

}

const aggiornaStatoOperatore = async (req, res) => {
    const affectedRows = await operatoreServices.aggiornaStatoOperatore(req.body.stato, req.params.id)
    if (affectedRows == 0) {
        res.status(404).json('no record with given id : ' + req.params.id)
    } else {
        res.send({ 'message': 'updated successfully.' })
    }
}

const concellaOperatore = async (req, res) => {
    const affectedRows = await operatoreServices.cancellaDipendente(req.params.id);
    console.log(affectedRows);
    if (affectedRows == 0) {
        res.status(404).json('no record with given id : ' + req.params.id)
    }
    else {
        res.send({ 'message': 'deleted successfully.' })
    }
}

const concellaTimbratura = async (req, res) => {
    const affectedRows = await operatoreServices.cancellaTimbratura(req.params.idTimbratura);
    console.log(affectedRows);
    if (affectedRows == 0) {
        res.status(404).json('no record with given id : ' + req.params.idTimbratura)
    }
    else {
        res.send({ 'message': 'deleted successfully.' })
    }
}

const ottieniOperatore = async (req, res) => {

    console.log("req.params.id: " + req.params.id);
    const employee = await operatoreServices.ottieniDipendenteById(req.params.id);
    if (employee == undefined) {
        res.status(404).json('no record with given id : ' + req.params.id)
    } else {
        res.send(employee)
    }
}

const richiediMotivazioneTimbratura = async (req, res) => {

    let risultato = false;

    const statoCheck = await operatoreServices.ottieniStatoCheck(req.params.idOperatore);

    console.log("statoCheck:", statoCheck);

    if (statoCheck) {
        risultato = await operatoreServices.verificaMotivazioneTimbratura(
            req.params.idOperatore
        );
    }

    return res.json(risultato);
};

const creaCheckInCheckOut = async (req, res) => {

    if (!req.body.checkIn) {
        // sono in ceckout
        const statoCheck = await operatoreServices.ottieniStatoCheck(req.params.idOperatore);

        console.log("statoCheck: se sto facendo un ceckOut " + statoCheck);

        if (statoCheck) {
            const checkIn = await operatoreServices.ottieniIDCheckIn(req.params.idOperatore);

            const { idCheckInCheckOut, idTurno } = checkIn;

            if (req.body.motivazione) {
                console.log("req.body.motivazione: ", req.body.motivazione);
                await turniOperatoreServices.aggiornaMotivazioneRitardoTurno(req.body.motivazione, idTurno);
            }

            //se ceckin è false (quindi ceckout) prima di creare un nuovo record bisognerebbe controllare che
            //l'ultimo record inserito o per dataInserimento o per id piu grande sia a true.
            //se invece è a false allora non va inserito uno nuovo, ma va aggiornato l'ultimo inserito
            const dataInserimento = new Date();
            await operatoreServices.creaCheckInCheckOut(req.body, dataInserimento, null, idCheckInCheckOut);
        } else {
            //In questo caso va fatto update del ceckIn perchè significa che qualcosa è anadato storto
            //oppure anche solo fare il log e si tiene per buono l'ultimo fatto
            console.log(`[${new Date().toISOString()}]` + " Ho un'anomalia per operatore " + req.params.idOperatore + " con statoCheck: " + statoCheck);
        }
    } else {
        // sono in ceckin
        //Gestire bene i log con le date e i valori inviati
        const statoCheck = await operatoreServices.ottieniStatoCheck(req.params.idOperatore);

        console.log("statoCheck: se sto facendo un ceckIn " + statoCheck);
        if (statoCheck) {
            //In questo caso va fatto update del ceckIn perchè significa che qualcosa è anadato storto
            //oppure anche solo fare il log e si tiene per buono l'ultimo fatto  
            console.log(`[${new Date().toISOString()}]` + " Ho un'anomalia per operatore " + req.params.idOperatore + " con statoCheck: " + statoCheck);
        } else {

            try {
                await agganciaTurnoCheckIn_opertaore(req.body, req.body.idOperatore);
            } catch (err) {
                console.error(err.message);
                return res.status(400).json({
                    message: "La timbratura è consentita da 30 minuti prima del turno!"
                });

            }

            // AGGANCIO TURNO FINE *************************

        }
        //se ceckin è true prima di creare un nuovo record bisognerebbe controllare che
        //l'ultimo record inserito o per dataInserimento o per id piu grande sia a false.
        //se invece è a true allora non va inserito uno nuovo, ma va aggiornato l'ultimo inserito

    }

    return res.status(201).send({ 'message': 'created successfully.' });
}


const recuperoTimbratura = async (req, res) => {

    const timbratura = req.body;

    console.log("timbratura: " + JSON.stringify(timbratura));

    const timbraturaCheckIn = {
        idOperatore: parseInt(timbratura.idOperatore),
        checkIn: true,
        latitudine: 45.505382372771,
        longitudine: 9.251343180052,
        dataOraCheckInOut: new Date(`${timbratura.dataCheckIn}T${timbratura.oraCheckIn}:00`)
    };

    console.log("timbraturaCheckIn: " + JSON.stringify(timbraturaCheckIn));

    const idNuovoCheckIn = await operatoreServices.recuperoTimbratura(timbraturaCheckIn);

    console.log("Nuovo ID Check-In/Out:", idNuovoCheckIn);

    // AGGANCIO TURNO INIZIO *************************

    await agganciaTurnoCheckIn(
        timbraturaCheckIn.idOperatore,
        timbraturaCheckIn.dataOraCheckInOut,
        idNuovoCheckIn
    );

    // AGGANCIO TURNO FINE *************************    


    if (timbratura.dataCheckOut) {
        console.log("Inserisci anche il ceckout");
        const timbraturaCheckOut = {
            idOperatore: parseInt(timbratura.idOperatore),
            checkIn: false,
            latitudine: 45.505382372771,
            longitudine: 9.251343180052,
            dataOraCheckInOut: new Date(`${timbratura.dataCheckOut}T${timbratura.oraCheckOut}:00`)
        };
        console.log("timbraturaCheckOut: " + JSON.stringify(timbraturaCheckOut));
        await operatoreServices.recuperoTimbratura(timbraturaCheckOut, idNuovoCheckIn);
    } else {
        console.log("solo ceckin");
    }

    res.status(201).send({ 'message': 'creata timbratura' });

}

const agganciaTurnoCheckIn = async (idOperatore, dataOraCheckInOut, idNuovoCheckIn) => {

    let turno =
        await turniOperatoreServices.ottieniTurnoConTimbraturaInRitardo(
            idOperatore,
            dataOraCheckInOut
        );

    if (!turno) {
        turno = await turniOperatoreServices.ottieniTurnoConTimbraturaInAnticipo(
            idOperatore,
            dataOraCheckInOut
        );
    }

    if (!turno) {
        console.log(`Per idCheckInCheckOut ${idNuovoCheckIn} nessun turno trovato`);
    } else {
        console.log("L'operatore ha effettuato checkin al turno:", turno.idTurno);

        await turniOperatoreServices.timbraturaTurno(idNuovoCheckIn, turno.idTurno);
        await operatoreServices.agganciaTurnoAllaTimbratura(turno.idTurno, idNuovoCheckIn);
    }

};


const agganciaTurnoCheckIn_opertaore = async (posizioneOperatore, idOperatore) => {
    const dataInserimento = new Date();
    let turno =
        await turniOperatoreServices.ottieniTurnoConTimbraturaInRitardo(
            idOperatore,
            dataInserimento
        );

    if (!turno) {
        turno = await turniOperatoreServices.ottieniTurnoConTimbraturaInAnticipo(
            idOperatore,
            dataInserimento
        );
    }

    if (!turno) {
        console.log(`Per idOperatore ${idOperatore} e dataOraCheckInOut ${dataInserimento} nessun turno trovato`);
        throw new Error(`Per idOperatore ${idOperatore} e dataOraCheckInOut ${dataInserimento} nessun turno trovato`);
    }

    console.log("L'operatore ha effettuato checkin al turno:", turno.idTurno);
    //const idCheckInCheckOut = await operatoreServices.recuperoTimbratura(timbraturaCheckIn);

    const idCheckInCheckOut = await operatoreServices.creaCheckInCheckOut(posizioneOperatore, dataInserimento, turno.idTurno, null);

    console.log("Nuovo ID Check-In/Out:", idCheckInCheckOut);
    await turniOperatoreServices.timbraturaTurno(idCheckInCheckOut, turno.idTurno);
    //    await operatoreServices.agganciaTurnoAllaTimbratura(turno.idTurno, idCheckInCheckOut);

    //  return idCheckInCheckOut;

};

function formatDate() {
    const now = new Date();

    const pad = (n) => String(n).padStart(2, "0");

    return [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds()),
        pad(now.getMilliseconds()),
    ].join("_");
}


function calcolaEta(dataNascita) {
    if (!dataNascita) return null;

    const oggi = new Date();
    const nascita = new Date(dataNascita);

    let eta = oggi.getFullYear() - nascita.getFullYear();

    const meseDiff = oggi.getMonth() - nascita.getMonth();
    const giornoDiff = oggi.getDate() - nascita.getDate();

    if (meseDiff < 0 || (meseDiff === 0 && giornoDiff < 0)) {
        eta--;
    }

    return eta;
}

function over55(dataNascita) {
    const eta = calcolaEta(dataNascita);
    return eta !== null && eta > 55 ? "_X_" : "___";
}

function under24(dataNascita) {
    const eta = calcolaEta(dataNascita);
    return eta !== null && eta < 24 ? "_X_" : "___";
}

const creaContratto = async (req, res) => {
    console.log("creaContratto test");
    console.log("BODY:", req.body);
    const contratto = req.body;
    //contratto.idOperatore
    const idContratto = await operatoreServices.creaContratto(contratto);
    console.log("ID contratto creato:", idContratto);

    const datiContratto = await operatoreServices.getDatiContratto(idContratto);
    // const oggi = new Date().toISOString().slice(0, 10);

    // console.log("oggi: ", oggi);
    console.log("datiContratto.data_nascita: ", datiContratto.data_nascita);

    const tipoContratto = req.query.tipoContratto;

    console.log("Tipo contratto ricevuto:", tipoContratto);

    // supponendo che contratto.tipologia sia una stringa "CHIAMATA" o "OCCASIONALE"
    let data;
    let fileName;

    const logoBase64 = fs.readFileSync(
        path.resolve(__dirname, '../templates/reportImg/detelder-logo.png'),
        'base64'
    );


    const datiComuni = {
        logoBase64: logoBase64,
        operatore_nome_cognome: `${datiContratto.nome} ${datiContratto.cognome}`,
        operatore_luogo_nascita: datiContratto.luogo_nascita,
        operatore_provincia_nascita: datiContratto.provincia_nascita
            ? `(${datiContratto.provincia_nascita})`
            : '',
        operatore_data_nascita: new Date(datiContratto.data_nascita).toLocaleDateString('it-IT'),
        operatore_citta_residenza: datiContratto.comune_residenza,
        operatore_nazione_nascita: datiContratto.stato_nascita,
        operatore_provincia_residenza: datiContratto.provincia_residenza,
        operatore_indirizzo_residenza: datiContratto.indirizzo_residenza,
        operatore_civico_residenza: datiContratto.numero_civico_residenza,
        operatore_codice_fiscale: datiContratto.codice_fiscale
    };

    if (contratto.tipologia === "CHIAMATA") {
        //const dataInizio = datiContratto.data_inizio.toISOString().slice(0, 10);
        //const dataFine = datiContratto.data_fine.toISOString().slice(0, 10);

        const dataInizio = new Date(datiContratto.data_inizio).toLocaleDateString('it-IT');
        const dataFine = new Date(datiContratto.data_fine).toLocaleDateString('it-IT');
        const dataFirmaContratto = new Date(datiContratto.data_firma_contratto).toLocaleDateString('it-IT');

        console.log("dataInizio: ", dataInizio);
        console.log("dataFine: ", dataFine);


        console.log("datiContratto.citta_alternativa:", datiContratto.citta_alternativa);
        console.log("datiContratto.indirizzo_alternativo:", datiContratto.indirizzo_alternativo);

        data = {
            ...datiComuni,
            //nome_ccnl: "CCNL Pulizia multiservizi - Conflavoro PMI",
            over_55: over55(datiContratto.data_nascita),
            under_24: under24(datiContratto.data_nascita),
            data_inizio_contratto: dataInizio,
            data_fine_contratto: dataFine,
            data_firma_documento: dataFirmaContratto,
            citta_predefinita: datiContratto.citta_predefinita || "Milano",
            indirizzo_predefinito: datiContratto.indirizzo_predefinito || "VIA A. RIZZOLI 4",
            citta_alternativa: datiContratto.citta_alternativa,
            indirizzo_alternativo: datiContratto.indirizzo_alternativo,
            //   livello_inquadramento: datiContratto.livello_inquadramento,
            //  tipo_qualifica: datiContratto.qualifica,
            //  lista_mansioni: datiContratto.lista_mansioni,
            //  stipendio_mensile_lordo: datiContratto.compenso_totale_lordo,
            //  giorni_periodo_prova: datiContratto.giorni_periodo_prova,
        };
        fileName = "Contratto-chiamata.ejs";
    } else if (contratto.tipologia === "OCCASIONALE") {
        // const dataInizio = datiContratto.data_inizio.toISOString().slice(0, 10);
        const dataInizio = new Date(datiContratto.data_inizio).toLocaleDateString('it-IT');
        const dataFine = new Date(datiContratto.data_fine).toLocaleDateString('it-IT');
        const dataFirmaContratto = new Date(datiContratto.data_firma_contratto).toLocaleDateString('it-IT');

        console.log("dataInizio: ", dataInizio);
        console.log("dataFine: ", dataFine);
        data = {
            ...datiComuni,
            data_inizio_contratto: dataInizio,
            data_fine_contratto: dataFine,
            /*
            lista_mansioni: datiContratto.lista_mansioni,
            compenso_totale_lordo: datiContratto.compenso_totale_lordo,
            */
            // lista_mansioni: "Assistenza al cliente - Servizi di Doorman",
            compenso_totale_lordo: "100",
            anno_riferimento_previdenziale: new Date().getFullYear().toString(),
            data_firma_documento: dataFirmaContratto
        };
        fileName = "ContrattoOccasionale.ejs";
    } else if (contratto.tipologia === "CONSGNA_BENI_FORMAZIONE") {
        data = {
            ...datiComuni,
            operatore_indirizzo_domicilio: !datiContratto.residenza_uguale_domicilio
                ? datiContratto.indirizzo_residenza
                : datiContratto.indirizzo_domicilio,
            operatore_civico_domicilio: !datiContratto.residenza_uguale_domicilio
                ? datiContratto.numero_civico_residenza
                : datiContratto.numero_civico_domicilio,
            operatore_citta_domicilio: !datiContratto.residenza_uguale_domicilio
                ? datiContratto.comune_residenza
                : datiContratto.comune_domicilio,
            operatore_provincia_domicilio: !datiContratto.residenza_uguale_domicilio
                ? datiContratto.provincia_residenza
                : datiContratto.provincia_domicilio,

            elenco_beni_consegnati: datiContratto.beni_strumentali,
            elenco_abbigliamento_consegnato: datiContratto.contenuti_formazione,
            data_firma_documento: new Date().toLocaleDateString('it-IT'),

        };
        fileName = "Consegna_beni_formazione.ejs";
    } else {
        throw new Error("Tipo contratto non valido");
    }

    // Ora puoi usare `data` ovunque, indipendentemente dal tipo


    //const fileName = "Contratto-chiamata.ejs";

    console.log("generaPDF: inizio generazione PDF");
    console.log("File richiesto:", fileName);

    try {
        // Chiama la funzione separata
        const pdfBuffer = await generaPdfBuffer(fileName, data);

        // (Facoltativo) salva una copia sul server
        // const outputPath = "/mnt/c/Users/luca.carletti/webTest/nodeJs/test/ezystaff-BE" + Date.now() + ".pdf";
        // const outputPath = path.join(process.env.HOME_CONTRATTI, "output", `documento_${Date.now()}.pdf`);

        // id operatore
        const idOperatore = contratto.idOperatore;

        // cartella base
        const baseDir = path.join(process.env.HOME_CONTRATTI, "output");

        // cartella operatore
        const operatoreDir = path.join(baseDir, `operatore_${idOperatore}`);

        // crea la cartella se non esiste
        if (!fs.existsSync(operatoreDir)) {
            fs.mkdirSync(operatoreDir, { recursive: true });
        }

        // path finale del file
        const outputPath = path.join(operatoreDir, `documento_${formatDate()}.pdf`);

        fs.writeFileSync(outputPath, pdfBuffer);

        console.log("PDF creato correttamente su:", outputPath);

        await operatoreServices.aggiornaPathContratto(outputPath, idContratto);

    } catch (err) {
        console.error("Errore durante la generazione del PDF:", err);
        res.status(500).send("Errore durante la generazione del PDF");
    }


    res.status(201).send({ 'message': 'Contratto creato' });
};


const listaContrattiOperatore = async (req, res) => {
    console.log("req.params.id: " + req.params.idOperatore);
    const listaContratti = await operatoreServices.listaContrattiOperatore(req.params.idOperatore);
    res.send(listaContratti);
};

/*
const downloadContratto_old = async (req, res) => {
    try {
        const { idContratto } = req.params;
        console.log("downloadContratto - idContratto:", idContratto);

        const filePath = await operatoreServices.ottieniPdfContratto(idContratto);
        return downloadFile(res, filePath);

    } catch (error) {
        console.error("Errore download contratto:", error);
        res.status(500).json({ message: "Errore download PDF" });
    }
};
*/


const downloadContratto = async (req, res) => {
    try {
        const { idContratto } = req.params;
        const { tipoContratto } = req.query;
        console.log("downloadContratto - idContratto:", idContratto);
        console.log("downloadContratto - tipoContratto:", tipoContratto);

        const filePath = await operatoreServices.ottieniPdfContratto(idContratto, tipoContratto);
        return downloadFile(res, filePath);

    } catch (error) {
        console.error("Errore download contratto:", error);
        res.status(500).json({ message: "Errore download PDF" });
    }
};


/*
const downloadContrattoFirmato = async (req, res) => {
    try {
        const { idContratto } = req.params;
        console.log("downloadContrattoFirmato - idContratto:", idContratto);

        const filePath = await operatoreServices.ottieniPdfContrattoFirmato(idContratto);
        return downloadFile(res, filePath);

    } catch (error) {
        console.error("Errore download contratto firmato:", error);
        res.status(500).json({ message: "Errore download PDF" });
    }
};
*/

const downloadFile = async (res, filePath) => {
    if (!filePath) {
        return res.status(404).json({ message: "File non trovato" });
    }

    const resolvedPath = path.resolve(filePath);
    console.log("REAL PATH:", resolvedPath);

    if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ message: "File non trovato" });
    }

    return res.download(resolvedPath, path.basename(resolvedPath));
};

const concellaTuttiContratti = async (req, res) => {

    const filePathFirmato = await operatoreServices.ottieniPdfContratto(req.params.idContratto, "contrattoFirmato");
    cancellaDocuemnto(filePathFirmato);

    const filePathUnilav = await operatoreServices.ottieniPdfContratto(req.params.idContratto, "contrattoUnilav");
    cancellaDocuemnto(filePathUnilav);

    const filePath = await operatoreServices.ottieniPdfContratto(req.params.idContratto, "downloadContratto");
    cancellaDocuemnto(filePath);

    const affectedRows = await operatoreServices.cancellaContratto(req.params.idContratto);
    console.log(affectedRows);
    res.send({ 'message': 'Contratto cancellato.' })
}

function cancellaDocuemnto(filePath) {
    if (filePath) {
        const resolvedPath = path.resolve(filePath);

        if (fs.existsSync(resolvedPath)) {
            fs.unlinkSync(resolvedPath);
            console.log('File cancellato:', resolvedPath);
        } else {
            console.log('File non trovato su disco:', resolvedPath);
        }
    }
}

const cancellaSingoloContratto = async (req, res) => {

    const { tipoContratto } = req.query;

    console.log("tipoContratto:", tipoContratto);

    const filePath = await operatoreServices.ottieniPdfContratto(req.params.idContratto, tipoContratto);
    cancellaDocuemnto(filePath);

    const affectedRows = await operatoreServices.cancellaContrattoFirmato(req.params.idContratto, tipoContratto);
    console.log(affectedRows);
    res.send({ 'message': 'Contratto cancellato.' })
}

async function generaPdfBuffer(fileName, data) {
    // Percorso del template EJS
    const templatePath = path.join(__dirname, "..", "templates", fileName);

    // Compila il template EJS in HTML
    const html = await ejs.renderFile(templatePath, data, { async: true });
    // console.log("HTML generato:", html);

    // Genera il PDF con Puppeteer
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
    });

    await browser.close();

    return pdfBuffer;
}


const generaPdf = async (req, res) => {
    const data = req.body; // dati per il template
    const fileName = req.query.fileName;

    console.log("generaPDF: inizio generazione PDF");
    console.log("File richiesto:", fileName);

    try {
        // Chiama la funzione separata
        const pdfBuffer = await generaPdfBuffer(fileName, data);

        // (Facoltativo) salva una copia sul server
        const outputPath = path.join(__dirname, "..", "output", `documento_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, pdfBuffer);

        // Invia il PDF al client
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="documento.pdf"`,
            "Content-Length": pdfBuffer.length
        });
        res.send(pdfBuffer);

        console.log("PDF inviato correttamente al client:", outputPath);
    } catch (err) {
        console.error("Errore durante la generazione del PDF:", err);
        res.status(500).send("Errore durante la generazione del PDF");
    }
};

const aggiornaTimbratura = async (req, res) => {

    const timbratura = req.body;

    console.log("timbratura: " + JSON.stringify(timbratura));

    const dataOraCheckIn = new Date(`${timbratura.dataCheckIn}T${timbratura.oraCheckIn}:00`);

    //Check In
    await operatoreServices.aggiornaCheckInOut(dataOraCheckIn, timbratura.idCheckIn);

    if (timbratura.dataCheckOut) {
        console.log("Modifica anche il ceckout");

        if (timbratura.idCheckOut) {
            console.log("Modifica solo la data ceckout");
            const dataOraCheckOut = new Date(`${timbratura.dataCheckOut}T${timbratura.oraCheckOut}:00`);
            await operatoreServices.aggiornaCheckInOut(dataOraCheckOut, timbratura.idCheckOut);
        } else {
            const timbraturaCheckOut = {
                idOperatore: parseInt(timbratura.idOperatore),
                checkIn: false,
                latitudine: 45.505382372771,
                longitudine: 9.251343180052,
                dataOraCheckInOut: new Date(`${timbratura.dataCheckOut}T${timbratura.oraCheckOut}:00`)
            };
            console.log("timbraturaCheckOut: " + JSON.stringify(timbraturaCheckOut));
            await operatoreServices.recuperoTimbratura(timbraturaCheckOut, timbratura.idCheckIn);
        }

    } else {
        console.log("Modifica solo ceckin");
    }

    /*

    const checkInOut = await operatoreServices.checkInOutByid(timbratura.idCheckIn);

    await operatoreServices.checkInOutByid(timbratura.idCheckIn);

    const timbraturaCheckIn = {
        idOperatore: parseInt(timbratura.idOperatore),
        checkIn: true,
        latitudine: checkInOut.latitudine,
        longitudine: checkInOut.longitudine,
        dataOraCheckInOut: new Date(`${timbratura.dataCheckIn}T${timbratura.oraCheckIn}:00`)
    };
    */

    res.status(201).send({ 'message': 'Timbratura aggiornata' });

}

const aggiornaOperatore = async (req, res) => {
    await operatoreServices.aggiornaDipendente(req.body, req.params.id);
    res.status(201).send({ 'message': 'Operatore aggiornato' });
}

const aggiornaNascitaResidenzaOperatore = async (req, res) => {
    await operatoreServices.aggiornaNascitaResidenza(req.body, req.params.id);
    res.status(201).send({ 'message': 'Operatore aggiornato' });
}

const aggiornaDatiGenericiOperatore = async (req, res) => {
    await operatoreServices.aggiornaDatiGenerici(req.body, req.params.id);
    res.status(201).send({ 'message': 'Operatore aggiornato' });
}

const aggiornaHeaderOperatore = async (req, res) => {
    await operatoreServices.aggiornaHeader(req.body, req.params.id);
    res.status(201).send({ 'message': 'Operatore aggiornato' });
}

const aggiornaAllegatiOperatore = async (req, res) => {
    const { id } = req.params;
    const dati = req.body;

    const esiste = await allegatiOpeartoreServices.verificaPresenzaDatiAllegati(id);

    if (esiste) {
        await allegatiOpeartoreServices.aggiornaAllegati(dati, id);
    } else {
        await allegatiOpeartoreServices.creaAllegati(dati, id);
    }

    res.status(201).send({ message: 'Operatore aggiornato' });
};


const ottieniAllegatiOperatore = async (req, res) => {
    console.log("req.params.id: " + req.params.id);
    const datiPerAllegati = await allegatiOpeartoreServices.ottieniAllegatiByOperatore(req.params.id);
    if (datiPerAllegati == undefined) {
        res.status(404).json('no record with given id : ' + req.params.id)
    } else {
        res.send(datiPerAllegati);
    }
}

/*
function ottieniEventoAssociato(turno) {
    const nomeEvento = turno.nomeEvento;

    const start = new Date(turno.dataInizio);
    const end = new Date(turno.dataFine);

    let diffMs = end - start;

    if (diffMs < 0) {
        throw new Error("dataFine non può essere precedente a dataInizio");
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${nomeEvento} (ore: ${diffHours} minuti: ${diffMinutes})`;
}
    */


const getCheckInCheckOut = async (req, res) => {

    const { dataInizio, dataFine } = req.query;

    console.log('Parametri ricevuti:');
    console.log('dataInizio:', dataInizio);
    console.log('dataFine:', dataFine);

    const checkInCheckOutOperatore =
        await operatoreServices.ottieniCheckInCheckOutOperatore(
            req.params.idOperatore,
            dataInizio,
            dataFine
        );

    //const risultatoFinale = await associaEventoAiCheckIn(checkInCheckOutOperatore);

    res.send(checkInCheckOutOperatore);
}

const getPresenzeTuttiOperatori = async (req, res) => {

    const { dataInizio, dataFine, titoloEvento, page, pageSize, sortOrderDataCeckIn, sortOrderNominativo, sortNomeEvento } = req.query;


    console.log("getPresenzeTuttiOperatori dataInizio: " + dataInizio);
    console.log("getPresenzeTuttiOperatori dataFine: " + dataFine);
    console.log("getPresenzeTuttiOperatori titoloEvento: " + titoloEvento);
    console.log("getPresenzeTuttiOperatori page: " + page);
    console.log("getPresenzeTuttiOperatori pageSize: " + pageSize);

    const checkInCheckOutOperatore = await operatoreServices.ottieniCheckInCheckOutGenerica(dataInizio, dataFine, titoloEvento, parseInt(page), parseInt(pageSize), sortOrderDataCeckIn, sortOrderNominativo, sortNomeEvento);

    //  const risultatoFinale = await associaEventoAiCheckIn(checkInCheckOutOperatore.data);

    console.log("total: " + checkInCheckOutOperatore.total);
    console.log("totalPages: " + checkInCheckOutOperatore.totalPages);
    console.log("currentPage: " + checkInCheckOutOperatore.currentPage);

    //    res.send(risultatoFinale);
    res.send({
        data: checkInCheckOutOperatore.data,
        total: checkInCheckOutOperatore.total,
        totalPages: checkInCheckOutOperatore.totalPages,
        currentPage: checkInCheckOutOperatore.currentPage
    });

}
/*
const associaEventoAiCheckIn = async (checkInCheckOutOperatore) => {
    if (!checkInCheckOutOperatore || !Array.isArray(checkInCheckOutOperatore)) {
        console.log("Nessun record trovato.");
        return checkInCheckOutOperatore;
    }

    for (const record of checkInCheckOutOperatore) {
        let eventoAssociato = "nessun evento trovato";

        // console.log(`record: ${JSON.stringify(record)}`);
        console.log(`ID: ${record.idCheckIn}`);
        console.log(`Data/Ora: ${record.dataInserimentoCheckIn}`);
        console.log(`Operatore: ${record.idOperatore}`);
        console.log('-----------------------------');

        const turnoConTimbraturaInRitardo =
            await turniOperatoreServices.ottieniTurnoConTimbraturaInRitardo(
                record.idOperatore,
                record.dataInserimentoCheckIn
            );

        if (turnoConTimbraturaInRitardo) {
          //  console.log("L'operatore ha lavorato all'evento:", turnoConTimbraturaInRitardo);
            eventoAssociato = ottieniEventoAssociato(turnoConTimbraturaInRitardo);
        } else {
            const turnoConTimbraturaInAnticipo =
                await turniOperatoreServices.ottieniTurnoConTimbraturaInAnticipo(
                    record.idOperatore,
                    record.dataInserimentoCheckIn
                );

            if (turnoConTimbraturaInAnticipo) {
             //   console.log("L'operatore ha lavorato all'evento:", turnoConTimbraturaInAnticipo);
                eventoAssociato = ottieniEventoAssociato(turnoConTimbraturaInAnticipo);
            } else {
                console.log("Nessun evento trovato per l'orario indicato.");
            }
        }

        record.eventoAssociato = eventoAssociato;
    }

    return checkInCheckOutOperatore;
};
*/


const getStatoCheck = async (req, res) => {
    const statoCheck = await operatoreServices.ottieniStatoCheck(req.params.idOperatore);
    //console.log()

    //res.send(statoCheck);
    res.send({ 'statoCheck': statoCheck });
}

module.exports = {
    getOperatori,
    creaNuovoOperatore,
    reinviaPassword,
    aggiornaOperatore,
    aggiornaNascitaResidenzaOperatore,
    aggiornaDatiGenericiOperatore,
    aggiornaHeaderOperatore,
    aggiornaAllegatiOperatore,
    ottieniAllegatiOperatore,
    concellaOperatore,
    concellaTimbratura,
    ottieniOperatore,
    aggiornaStatoOperatore,
    richiediMotivazioneTimbratura,
    creaCheckInCheckOut,
    recuperoTimbratura,
    creaContratto,
    listaContrattiOperatore,
    downloadContratto,
    concellaTuttiContratti,
    cancellaSingoloContratto,
    generaPdf,
    aggiornaTimbratura,
    getCheckInCheckOut,
    getPresenzeTuttiOperatori,
    getStatoCheck,
    ricercaDipendenti
}