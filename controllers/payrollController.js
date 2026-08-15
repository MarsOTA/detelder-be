
const payrollServices = require('../services/payrollServices')
const turniOperatoreServices = require('../services/turniOperatoreServices')

const salvaPayroll = async (req, res) => {
    console.log("req.body: ", req.body);
    await payrollServices.creaPayroll(req.body);
    res.status(201).send({ 'message': 'Payroll Salvato.' });
}

const aggiornaRendicontazione = async (req, res) => {

    console.log("Params:", req.params);
    console.log("Body:", req.body);

    console.log("idPayroll:", req.params.idPayroll);
    console.log("motivazione:", req.body.motivazione);
    console.log("idTurno:", req.body.idTurno);

    await turniOperatoreServices.aggiornaMotivazioneContestazioneTurno(req.body.motivazione, req.body.idTurno);

    await payrollServices.aggiornaStatoPayroll('CONTESTATO', req.params.idPayroll);

    res.status(201).send({ 'message': 'Payroll Aggiornato.' });
}

const calcolaStatoTimbratura = (dataInserimentoCheckIn, dataInserimentoCheckOut) => {
    if (!dataInserimentoCheckOut) {
        return "MANCATO_CHECKOUT";
    }

    const checkIn = new Date(dataInserimentoCheckIn);
    const checkOut = new Date(dataInserimentoCheckOut);

    const diffOre = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

    if (diffOre > 24) {
        return "ERRATA_TIMBRATURA";
    }

    return "VALIDA";
};

function calcolaTotaleOre(oraInizio, oraFine, orePausa = 0) {
    if (!oraInizio || !oraFine) {
        return "00:00";
    }

    const [h1, m1] = oraInizio.split(":").map(Number);
    const [h2, m2] = oraFine.split(":").map(Number);

    const inizio = h1 * 60 + m1;
    let fine = h2 * 60 + m2;

    // Turno che termina il giorno successivo
    if (fine < inizio) {
        fine += 24 * 60;
    }

    // Minuti lavorati
    const minutiLavorati = fine - inizio - (orePausa * 60);

    const ore = Math.floor(minutiLavorati / 60);
    const minuti = minutiLavorati % 60;

    return [
        String(ore).padStart(2, "0"),
        String(minuti).padStart(2, "0")
    ].join(":");
}


function calcolaOreLavorateTurno(checkInCheckOut = []) {

    if (!Array.isArray(checkInCheckOut) || checkInCheckOut.length === 0) {
        return "00:00:00";
    }

    let secondiTotali = 0;

    for (const item of checkInCheckOut) {

        if (!item.dataInserimentoCheckIn || !item.dataInserimentoCheckOut) {
            continue;
        }

        const checkIn = new Date(item.dataInserimentoCheckIn);
        let checkOut = new Date(item.dataInserimentoCheckOut);

        // Se il checkout è il giorno successivo
        if (checkOut < checkIn) {
            checkOut.setDate(checkOut.getDate() + 1);
        }

        secondiTotali += Math.floor((checkOut - checkIn) / 1000);
    }

    const ore = Math.floor(secondiTotali / 3600);
    const minuti = Math.floor((secondiTotali % 3600) / 60);
    const secondi = secondiTotali % 60;

    return [
        String(ore).padStart(2, "0"),
        String(minuti).padStart(2, "0"),
        String(secondi).padStart(2, "0")
    ].join(":");
}

function calcolaDeltaOre(oreLavorate, orePreviste) {

    const toSecondsLavorate = (time) => {
        const [h, m, s = 0] = time.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    };

    const toSecondsPreviste = (time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 3600 + m * 60;
    };

    const lavorateSec = toSecondsLavorate(oreLavorate);
    const previsteSec = toSecondsPreviste(orePreviste);

    let delta = lavorateSec - previsteSec;

    const segno = delta < 0 ? "-" : "";
    delta = Math.abs(delta);

    const h = String(Math.floor(delta / 3600)).padStart(2, "0");
    const m = String(Math.floor((delta % 3600) / 60)).padStart(2, "0");
    const s = String(delta % 60).padStart(2, "0");

    return `${segno}${h}:${m}:${s}`;
}

const getPayroll = async (req, res) => {
    const { dataInizio, dataFine, statoElaborazione } = req.query;

    console.log("statoElaborazione:", statoElaborazione);

    const records = await payrollServices.getGestionePayroll(dataInizio, dataFine, statoElaborazione);

    const turniMap = new Map();

    for (const row of records) {

        if (!turniMap.has(row.idTurno)) {
            turniMap.set(row.idTurno, {
                idTurno: row.idTurno,
                dataTurno: row.dataTurno,
                oraInizio: row.oraInizio,
                oraInizioDefinitivo: row.oraInizioDefinitivo,
                oraFine: row.oraFine,
                oraFineDefinitivo: row.oraFineDefinitivo,
                orePausa: row.orePausa,
                orePausaDefinitiva: row.orePausaDefinitiva,
                orePreviste: calcolaTotaleOre(
                    row.oraInizio,
                    row.oraFine,
                    row.orePausa
                ),
                operatore: row.operatore,
                nomeEvento: row.nomeEvento,
                ragioneSociale: row.ragioneSociale,
                nomeBrand: row.nomeBrand,
                via: row.via,
                statoTurno: "VALIDO",
                statoPayroll: row.statoPayroll,
                motivazioneRitardo: row.motivazioneRitardo,
                motivazioneContestazione: row.motivazioneContestazione,
                checkInCheckOut: []
            });
        }

        if (row.dataInserimentoCheckIn) {

            const statoTimbratura = calcolaStatoTimbratura(
                row.dataInserimentoCheckIn,
                row.dataInserimentoCheckOut
            );

            const turno = turniMap.get(row.idTurno);

            turno.checkInCheckOut.push({
                dataInserimentoCheckIn: row.dataInserimentoCheckIn,
                dataInserimentoCheckOut: row.dataInserimentoCheckOut,
                statoTimbratura
            });

            if (statoTimbratura !== "VALIDA") {
                turno.statoTurno = "NON_VALIDO";
            }
        }
    }

    // Calcola le ore lavorate di ciascun turno
    for (const turno of turniMap.values()) {
        turno.oreLavorateTurno = calcolaOreLavorateTurno(
            turno.checkInCheckOut
        );

        turno.delta = calcolaDeltaOre(
            turno.oreLavorateTurno,
            turno.orePreviste
        );
    }

    // const result = [...turniMap.values()];
    // console.log(JSON.stringify(result, null, 2));
    res.send([...turniMap.values()]);
};

const getRendicontazione = async (req, res) => {
    const rendicontazione = await payrollServices.ottieniRendicontazione(req.params.idOperatore);
    res.send(rendicontazione);
}

const modificaPayroll = async (req, res) => {

    console.log("Params:", req.params);
    console.log("Body:", req.body);

    //    console.log("idPayroll:", req.params.idPayroll);
    //    console.log("motivazione:", req.body.motivazione);
    //    console.log("idTurno:", req.body.idTurno);

    const payroll = {
        idTurno: req.params.idTurno,
        ...req.body,
    };

    await payrollServices.modificaPayroll(payroll);

    res.status(201).send({ 'message': 'Payroll Aggiornato.' });
}


const eliminaPayroll = async (req, res) => {

    console.log("Params:", req.params);

    await payrollServices.eliminaPayroll(req.params.idTurno);

    res.status(201).send({ 'message': 'Payroll Eliminato.' });
}

module.exports = {
    salvaPayroll,
    modificaPayroll,
    eliminaPayroll,
    aggiornaRendicontazione,
    getPayroll,
    getRendicontazione
}