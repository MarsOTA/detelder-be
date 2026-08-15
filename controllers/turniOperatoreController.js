const turniOperatoreServices = require('../services/turniOperatoreServices')
const operatoreServices = require('../services/operatoreServices')
const { format } = require('date-fns');
const { sendWhatsApp } = require('../client/twilioClient');


const creaTurnoOperatore = async (req, res) => {

    const turni = req.body;
    console.log("turni: " + JSON.stringify(turni));

    const inizio = new Date(turni.dataTurnoInizo);
    const fine = new Date(turni.dataTurnoFine);

    try {
        for (
            let d = new Date(inizio);
            d <= fine;
            d.setDate(d.getDate() + 1)
        ) {
            const dataTurno = d.toISOString().split('T')[0];
            for (let i = 0; i < turni.numeroTurni; i++) {
                await turniOperatoreServices.creaTurnoOperatore(turni, dataTurno);
            }
        }
        res.status(201).send({ 'message': 'Turni creati' });
    } catch (error) {
        console.error('Errore nella creazione dei turni:', error);
        res.status(500).send({ 'error': 'Errore nella creazione dei turni' });
    }

}

const copiaTurniSelezionati = async (req, res) => {

    const filtriCopia = req.body;
    console.log("filtriCopia: " + JSON.stringify(filtriCopia));

    const { dataCopiaInizio, dataCopiaFine, filtroData, idEvento } = req.body;

    const turniDaCopiare = await turniOperatoreServices.ottieniTurniDaCopiare(filtroData, idEvento);

    if (!turniDaCopiare.length) {
        return res.status(404).send({ message: 'Nessun turno trovato per i filtri' });
    }

    console.log('turniDaCopiare.length: ' + turniDaCopiare.length)

    const start = new Date(dataCopiaInizio);
    const end = new Date(dataCopiaFine);

    console.log('start: ', start);
    console.log('end: ', end);

    // Genera array di date
    const dateArray = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dateArray.push(new Date(d));
    }

    console.log('dateArray: ', dateArray);

    // Loop sui turni e sulle date
    for (const turno of turniDaCopiare) {
        for (const data of dateArray) {
            await turniOperatoreServices.inserisciTurnoCopiato(turno, data);
        }
    }

    res.status(201).send({ 'message': 'Turni creati' });

}

const getEventoETurni = async (req, res) => {

    const { dataInizio } = req.query;

    try {
        const idEvento = req.params.idEvento;
        const ottieniDatiEvento = await turniOperatoreServices.ottieniDatiEvento(idEvento);
        const turniOperatorePerEvento = await turniOperatoreServices.ottieniListaTurniPerEvento(idEvento, dataInizio);
        const ottieniListaIndirizzi = await turniOperatoreServices.ottieniListaIndirizzi(idEvento);

        const eventoETurni = {
            ottieniDatiEvento, // oggetto singolo
            turniOperatorePerEvento,   // array di oggetti
            ottieniListaIndirizzi
        };

        res.status(200).json(eventoETurni);
    } catch (error) {
        console.error('Errore nel recupero dei turni per evento:', error);
        res.status(500).json({ errore: 'Errore nel recupero dei dati' });
    }

}

function formatDateToString(dataTurno) {
    if (!dataTurno) return undefined;

    const date = new Date(dataTurno);

    const day = String(date.getDate()).padStart(2, '0');       // Aggiunge zero iniziale se necessario
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mese parte da 0, quindi aggiungiamo 1
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
}

const reinviaNotificaTurno = async (req, res) => {

    /*
    console.log("Inzio modifica o assegnazione turno operatore");
    await turniOperatoreServices.modificaTurnoOperatore(req.body, req.params.idTurno);
    console.log("Modifica o assegnazione turno avvenuta correttamente");
    */

    //if (req.body.invioNotifica) {
    console.log("Invia notifica modifica o assegnazione turno operatore");
    const operatore = req.body;
    const dipendente = await operatoreServices.ottieniDipendenteById(operatore.idOperatore);

    console.log("Invio Whatsapp modifica o assegnazione turno a: ", dipendente.nome, dipendente.cognome);
    const contentSid = process.env.TWILIO_CONTENT_SID_NOTIFICA_ASSEGNAZIONE_TURNO;

    /*
    const contentVariables = JSON.stringify({
        "1": operatore.infoEvento.titoloEvento,
        "2": operatore.infoEvento.indirizzoEvento,
        "3": formatDateToString(operatore.dataTurno),
        "4": operatore.oraInizio,
        "5": operatore.oraFine,
        "6": operatore.tipologiaTurno,
        "7": operatore.tipoMansione,
        "8": 'app.detelder.com',
    });
    */

    const contentVariables = JSON.stringify({
        "1": operatore.infoEvento.indirizzoEvento,
        "2": formatDateToString(operatore.dataTurno),
        "3": operatore.oraInizio,
        "4": operatore.oraFine,
        "5": operatore.tipoMansione,
    });

    console.log("contentVariables: ", contentVariables);

    try {
        const response = await sendWhatsApp(contentSid, contentVariables, dipendente.prefisso, dipendente.telefono);
        res.status(201).send({ success: true, message: "Invio modifica o assegnazione turno avvenuto correttamente" });
    } catch (err) {
        console.error("Errore durante l'invio del messaggio:", err);
        res.status(500).json({ success: false, message: "Non è stato possibile inviare Whatsapp di modifica o assegnazione turno", error: err.message });
    }

    /*
} else {
    console.log("Nessuna notifica di modifica o assegnazione turno operatore inviata")
    res.status(201).send({ success: true, message: `Il turno è stato mdoficato senza invio notifica Whatsapp` });
}
    */

}


const getListaTurniOperatore = async (req, res) => {
    const turniOperatorePerEvento = await turniOperatoreServices.ottieniListaTurniOperatore(req.params.idOperatore);
    res.send(turniOperatorePerEvento);
}

const getListaTurni = async (req, res) => {
    const { dataInizio, dataFine, keyword } = req.query;

    const turniOperatorePerEvento = await turniOperatoreServices.ottieniListaTurni(dataInizio, dataFine, keyword);
    res.send(turniOperatorePerEvento);
}

function getTitoloEvento(turnoGiornaliero) {
    const { nomeEvento, ragioneSociale, nomeBrand } = turnoGiornaliero;

    if (nomeEvento && nomeEvento.trim() !== '') {
        return nomeEvento;
    }

    return `${ragioneSociale} - ${nomeBrand}`;
}

const getTurniCombinati = async (req, res) => {
    try {

        const turniIeri = await getTurniGiornoPrecedenteOperatore(req);
        const turniOggi = await getTurniGiornalieriOperatore(req);
        const turniCombinati = [...turniIeri, ...turniOggi];



        res.json(turniCombinati);
    } catch (error) {
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

/*
function toLocalISODate(date = new Date()) {
    const pad = num => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getYesterdayLocalISO() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return toLocalISODate(date);
}
    */

function getYesterday() {
    const today = new Date();
    today.setDate(today.getDate() - 1); // sottrae un giorno
    return today.toLocaleDateString("it-IT");
}

function convertToIsoFormat(dateString) {
    const [day, month, year] = dateString.split("/");
    return `${year}-${month}-${day}`;
}


const getTurniGiornoPrecedenteOperatore = async (req) => {
    console.log("sono su: getTurniGiornoPrecedenteOperatore");

    try {
        const yesterdayOnly = convertToIsoFormat(getYesterday());

        console.log("yesterdayOnly: " + yesterdayOnly);

        // Può restituire un solo elemento
        const eventi = await turniOperatoreServices.ottieniEventiGiornoPrecedenteOperatore(
            req.params.idOperatore,
            yesterdayOnly
        );

        // Se non ci sono eventi ritorno array vuoto
        if (!eventi || eventi.length === 0) {
            return [];
        }

        const evento = eventi[0];  // L’unico evento
        console.log("evento.idEvento:", evento.idEvento);

        // Turni dell'operatore
        const turni = await turniOperatoreServices.ottieniTurniGiornoPrecedenteOperatoreEvento(
            evento.idEvento,
            req.params.idOperatore,
            yesterdayOnly
        );

        console.log(turni);

        // Orario dei turni con oraInizio forzata a 00:00
        const orarioTurni = turni.map(turno => ({
            //oraInizio: "00:00",
            oraInizio: turno.oraInizio,
            oraFine: turno.oraFine,
            notaTurno: turno.noteTurno,
            tipologiaTurno: turno.tipologiaTurno,
            tipoMansione: turno.tipoMansione,
            teamLeader: turno.teamLeader
        }));

        // Colleghi
        const colleghi = await turniOperatoreServices.cercaColleghiPerTurnoGiornaliero(
            evento.idEvento,
            req.params.idOperatore,
            yesterdayOnly
        );

        const listaColleghi = colleghi.map(collega => ({
            nome: collega.nome,
            cognome: collega.cognome,
            telefono: collega.telefono,
            oraInizio: collega.oraInizio,
            oraFine: collega.oraFine,
            teamLeader: collega.teamLeader,
            gpg: collega.gpg
        }));

        // Il primo turno contiene i dati principali
        const turnoGiornaliero = turni[0];
        console.log("turnoGiornaliero:", turnoGiornaliero);

        const turnoGiornalieroOperatore = {
            idTurno: turnoGiornaliero.idTurno,
            dataTurno: format(new Date(turnoGiornaliero.dataTurno), "dd/MM/yyyy"),
            titoloEvento: getTitoloEvento(turnoGiornaliero),
            localitaEvento: turnoGiornaliero.indirizzoBrand,
            nomeCognomeReferente: turnoGiornaliero.nomeCognomeReferente,
            telefonoReferente: turnoGiornaliero.telefonoReferente,
            orarioTurni,
            listaColleghi
        };

        console.log("turnoGiornalieroOperatore:", turnoGiornalieroOperatore);

        // Ritorno già l’oggetto dentro un array
        return [turnoGiornalieroOperatore];

    } catch (error) {
        console.error("Errore in getTurniGiornoPrecednteOperatore:", error);
        return [];
    }
};

const getTurniGiornalieriOperatore = async (req, res) => {
    try {
        const toDay = new Date().toISOString();
        const dateOnly2 = toDay.split('T')[0];

        const dateOnly = convertToIsoFormat(new Date().toLocaleDateString("it-IT"));

        console.log("dateOnly: " + dateOnly);
        console.log("dateOnly2: " + dateOnly2);

        const ottieniEventiGiornalieriOperatore = await turniOperatoreServices.ottieniEventiGiornalieriOperatore(req.params.idOperatore, dateOnly);

        const turniGiornalieriArray = [];

        for (const evento of ottieniEventiGiornalieriOperatore) {
            console.log("evento.idEvento: " + evento.idEvento);
            const ottieniTurniGiornalieriOperatoreEvento = await turniOperatoreServices.ottieniTurniGiornalieriOperatoreEvento(
                evento.idEvento,
                req.params.idOperatore,
                dateOnly
            );
            console.log(ottieniTurniGiornalieriOperatoreEvento);

            const orarioTurni = [];
            for (const turno of ottieniTurniGiornalieriOperatoreEvento) {

                orarioTurni.push({
                    oraInizio: turno.oraInizio,
                    oraFine: turno.oraFine,
                    notaTurno: turno.noteTurno,
                    tipologiaTurno: turno.tipologiaTurno,
                    tipoMansione: turno.tipoMansione,
                    teamLeader: turno.teamLeader
                });
            }


            const listaColleghi = [];
            const colleghiPerTurnoGiornaliero = await turniOperatoreServices.cercaColleghiPerTurnoGiornaliero(evento.idEvento, req.params.idOperatore, dateOnly);

            for (const collega of colleghiPerTurnoGiornaliero) {

                listaColleghi.push({
                    nome: collega.nome,
                    cognome: collega.cognome,
                    telefono: collega.telefono,
                    oraInizio: collega.oraInizio,
                    oraFine: collega.oraFine,
                    teamLeader: collega.teamLeader,
                    gpg: collega.gpg
                });

            }

            const turnoGiornaliero = ottieniTurniGiornalieriOperatoreEvento[0];

            console.log('turnoGiornaliero:', turnoGiornaliero);

            const turnoGiornalieroOperatore = {
                idTurno: turnoGiornaliero.idTurno,
                dataTurno: format(new Date(turnoGiornaliero.dataTurno), 'dd/MM/yyyy'),
                titoloEvento: getTitoloEvento(turnoGiornaliero),
                localitaEvento: turnoGiornaliero.indirizzoBrand,
                nomeCognomeReferente: turnoGiornaliero.nomeCognomeReferente,
                telefonoReferente: turnoGiornaliero.telefonoReferente,
                orarioTurni: orarioTurni,
                listaColleghi: listaColleghi
            };

            console.log('turnoGiornalieroOperatore:', turnoGiornalieroOperatore);

            turniGiornalieriArray.push(turnoGiornalieroOperatore);

        }
        //res.json(turniGiornalieriArray);
        return turniGiornalieriArray;

    } catch (error) {
        console.error("Errore in getTurniGiornalieriOperatore:", error);
        res.status(500).json({ error: 'Errore interno del server' });
    }


}

const getTurniFuturiOperatore = async (req, res) => {
    try {
        const dateOnly = new Date().toISOString().split('T')[0];

        const ottieniEventiFuturiOperatore = await turniOperatoreServices.ottieniEventiFuturiOperatore(req.params.idOperatore, dateOnly);

        const turniFuturiArray = [];

        for (const evento of ottieniEventiFuturiOperatore) {
            console.log("evento.idEvento: ", evento.idEvento);
            console.log("evento.dataTurno: ", evento.dataTurno);
            console.log("dateOnly: ", dateOnly);
            //const dateOnlyTurno = evento.dataTurno.toISOString().split('T')[0];

            const ottieniTurniFuturiOperatoreEvento = await turniOperatoreServices.ottieniTurniFuturiOperatoreEvento(
                evento.idEvento,
                req.params.idOperatore,
                evento.dataTurno
            );
            console.log(ottieniTurniFuturiOperatoreEvento);

            const orarioTurni = [];
            for (const turno of ottieniTurniFuturiOperatoreEvento) {

                orarioTurni.push({
                    oraInizio: turno.oraInizio,
                    oraFine: turno.oraFine,
                    notaTurno: turno.noteTurno
                });
            }


            const turnoFuturo = ottieniTurniFuturiOperatoreEvento[0];

            console.log('turnoFuturo:', turnoFuturo);

            const turnoFuturoOperatore = {
                idTurno: turnoFuturo.idTurno,
                dataTurno: format(new Date(turnoFuturo.dataTurno), 'dd/MM/yyyy'),
                titoloEvento: getTitoloEvento(turnoFuturo),
                localitaEvento: turnoFuturo.indirizzoBrand,
                nomeCognomeReferente: turnoFuturo.nomeCognomeReferente,
                telefonoReferente: turnoFuturo.telefonoReferente,
                tipologiaTurno: turnoFuturo.tipologiaTurno,
                tipoMansione: turnoFuturo.tipoMansione,
                orarioTurni: orarioTurni,
            };

            console.log('turnoGiornalieroOperatore:', turnoFuturoOperatore);

            turniFuturiArray.push(turnoFuturoOperatore);
        }
        res.json(turniFuturiArray);

    } catch (error) {
        console.error("Errore in getTurniFuturiOperatore:", error);
        res.status(500).json({ error: 'Errore interno del server' });
    }


}

const concellaTurno = async (req, res) => {

    console.log("Inzio cancellazione turno");
    const affectedRows = await turniOperatoreServices.cancellaTurno(req.params.idTurno);
    console.log("Numero righe eliminate: ", affectedRows);
    if (affectedRows == 0) {
        console.log("Errore nella cancellazione del turno");
        res.status(404).json({ success: false, message: "errore nella cancellazione del turno", error: 'no record with given id : ' + req.params.idTurno });
    } else {
        console.log("Il turno è stato cancellato correttamente");
        const turno = req.body;
        console.log("Invio credenziali per operatore idOperatore: ", turno.idOperatore);

        const contentSid = process.env.TWILIO_CONTENT_SID_NOTIFICA_CANCELLAZIONE_TURNO;
        const contentVariables = JSON.stringify({
            "1": turno.indirizzoEvento,
            "2": formatDateToString(turno.dataTurno),
            "3": turno.oraInizioTurno,
            "4": turno.oraFineTurno
        })
        console.log("Variabili invio WhatsApp cancellazione turno: ", contentVariables);
        const dipendente = await operatoreServices.ottieniDipendenteById(turno.idOperatore);

        if (dipendente?.telefono) {
            console.log("Invio Whatsapp per cancellazione turno a: ", dipendente.nome, dipendente.cognome);
            try {
                const response = await sendWhatsApp(contentSid, contentVariables, dipendente.prefisso, dipendente.telefono);
                res.status(201).send({ success: true, message: "Invio cancellazione turno avvenuto correttamente" });
            } catch (err) {
                console.error("Errore durante l'invio del messaggio:", err);
                res.status(500).json({ success: false, message: "Non è stato possibile inviare Whatsapp di cancellazione turno", error: err.message });
            }

        } else {
            //Caso in cui si cancella un turno al quale non è assegnato nessun operatore
            console.warn(`WhatsApp non inviato: dipendente non trovato o telefono mancante (id: ${req.params.idTurno})`);
            res.status(201).send({ success: true, message: `Il turno è stato cancellato ma WhatsApp non inviato: dipendente non trovato o telefono mancante (id: ${req.params.idTurno})` });
        }
    }
}


const aggiornaNotaTurno = async (req, res) => {
    const affectedRows = await turniOperatoreServices.aggiornaNotaTurno(req.body.nota, req.params.idTurno)
    if (affectedRows == 0) {
        res.status(404).json('no record with given id : ' + req.params.idTurno)
    } else {
        res.send({ 'message': 'updated successfully.' })
    }
}

const duplicaRiga = async (req, res) => {
    await turniOperatoreServices.duplicaRiga(req.params.idTurno)
    res.send({ 'message': 'Riga duplicata.' })

}

const aggiornaTurniPerData = async (req, res) => {

    await turniOperatoreServices.modificaTurniOperatoreBatch(req.body.turni);

    const erroriWhatsApp = [];

    const turni = req.body.turni;
    console.log("req.body.invioNotifica: ", req.body.invioNotifica);
    console.log("req.body: ", req.body);
    if (req.body.invioNotifica) {
        for (const turno of turni) {

            // SKIP se non c'è operatore
            if (!turno.idOperatore) {
                console.log("Skip turno senza operatore:", turno.idTurno);
                continue;
            }

            const dipendente = await operatoreServices.ottieniDipendenteById(turno.idOperatore);

            console.log("Invio Whatsapp modifica o assegnazione turno a: ", dipendente.nome, dipendente.cognome);
            const contentSid = process.env.TWILIO_CONTENT_SID_NOTIFICA_ASSEGNAZIONE_TURNO;

            /*
            const contentVariables = JSON.stringify({
                "1": turno.infoEvento.titoloEvento,
                "2": turno.infoEvento.indirizzoEvento,
                "3": formatDateToString(turno.dataTurnoFormattato),
                "4": turno.oraInizio,
                "5": turno.oraFine,
                "6": turno.tipologiaTurno,
                "7": turno.tipoMansione,
                "8": 'app.detelder.com',
            });
            */

            const contentVariables = JSON.stringify({
                "1": turno.infoEvento.indirizzoEvento,
                "2": formatDateToString(turno.dataTurnoFormattato),
                "3": turno.oraInizio,
                "4": turno.oraFine,
                "5": turno.tipoMansione,
            });

            console.log("contentVariables:", contentVariables);

            try {
                const response = await sendWhatsApp(contentSid, contentVariables, dipendente.prefisso, dipendente.telefono);
            } catch (err) {
                console.error("Errore durante l'invio del messaggio:", err);
                erroriWhatsApp.push({
                    dipendente: `${dipendente.nome} ${dipendente.cognome}`,
                    cellulare: `${dipendente.prefisso}${dipendente.telefono}`,
                    motivo: err.message
                });
            }
        }
    }

    if (erroriWhatsApp.length > 0) {
        res.status(500).send({
            success: false,
            message: "Non è stato possibile inviare Whatsapp di modifica o assegnazione turno",
            erroriWhatsApp
        });
    } else {
        res.status(201).send({ success: true, message: "Turni modificati correttamente" });
    }

}


module.exports = {
    creaTurnoOperatore,
    copiaTurniSelezionati,
    getListaTurniOperatore,
    getListaTurni,
    getEventoETurni,
    getTurniCombinati,
    getTurniFuturiOperatore,
    concellaTurno,
    reinviaNotificaTurno,
    aggiornaTurniPerData,
    aggiornaNotaTurno,
    duplicaRiga,
}