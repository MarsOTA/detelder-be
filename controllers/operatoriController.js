const operatoreServices = require('../services/operatoreServices')
const turniOperatoreServices = require('../services/turniOperatoreServices')
const allegatiOpeartoreServices = require('../services/allegatiOpeartoreServices')
const bcrypt = require('bcrypt');
const { sendWhatsApp } = require('../client/twilioClient');

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const ejs = require("ejs");

const { put, get, del } = require("@vercel/blob");
const { Readable } = require("node:stream");

const getOperatori = async (req, res) => {
    const employees = await operatoreServices.ottieniListaDipendenti();
    return res.send(employees);
}

function formatMySQLDate(date) {
    if (!date) return "";

    const d = (date instanceof Date) ? date : new Date(date);

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

    return res.send(dipendenti);
}

function generaPassword(lunghezza = 6) {

    const caratteri = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let password = '';

    for (let i = 0; i < lunghezza; i++) {
        const randIndex = Math.floor(Math.random() * caratteri.length);
        password += caratteri[randIndex];
    }

    return password;
}

const creaNuovoOperatore = async (req, res) => {

    const dipendente =
        await operatoreServices.ottieniDipendenteByUsername(
            req.body.telefono
        );

    if (dipendente == undefined) {

        const password = generaPassword();
        const hashedPwd = await bcrypt.hash(password, 10);
        const operatore = req.body;

        console.log("Inizio creazione nuovo operatore: ", operatore);

        await operatoreServices.creaOpertore(
            operatore,
            hashedPwd
        );

        console.log(
            "Creazione nuovo operatore avvenuta con successo"
        );

        const contentSid =
            process.env.TWILIO_CONTENT_SID_INVIO_CREDENZIALI;

        const contentVariables = JSON.stringify({
            "1": req.body.telefono,
            "2": password,
        });

        try {

            await sendWhatsApp(
                contentSid,
                contentVariables,
                operatore.prefisso,
                operatore.telefono
            );

            return res.status(201).send({
                success: true,
                message: "Credenziali inviate correttamente"
            });

        } catch (err) {

            console.error(
                "Errore durante l'invio del messaggio:",
                err
            );

            return res.status(500).json({
                success: false,
                message: "Non è stato possibile inviare le credenziali tramite Whatsapp",
                error: err.message
            });
        }

    } else {

        return res.status(201).send({
            message:
                `operatore con telefono ${req.body.telefono} già esistente`
        });
    }
}

const reinviaPassword = async (req, res) => {

    console.log(
        'req.params.idOperatore:',
        req.params.idOperatore
    );

    const dipendente =
        await operatoreServices.ottieniDipendenteById(
            req.params.idOperatore
        );

    if (!dipendente) {
        return res.status(404).json({
            message: "Operatore non trovato"
        });
    }

    const password = generaPassword();
    const hashedPwd = await bcrypt.hash(password, 10);

    const contentSid =
        process.env.TWILIO_CONTENT_SID_INVIO_CREDENZIALI;

    const contentVariables = JSON.stringify({
        "1": dipendente.telefono,
        "2": password,
    });

    console.log("password: ", password);

    try {

        await sendWhatsApp(
            contentSid,
            contentVariables,
            dipendente.prefisso,
            dipendente.telefono
        );

        await operatoreServices.aggiornaPassword(
            hashedPwd,
            dipendente.id
        );

        return res.status(201).send({
            success: true,
            message: "Credenziali inviate correttamente"
        });

    } catch (err) {

        console.error(
            "Errore durante l'invio del messaggio:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Non è stato possibile inviare le credenziali tramite Whatsapp",
            error: err.message
        });
    }
}

const aggiornaStatoOperatore = async (req, res) => {

    const affectedRows =
        await operatoreServices.aggiornaStatoOperatore(
            req.body.stato,
            req.params.id
        );

    if (affectedRows == 0) {
        return res.status(404).json(
            'no record with given id : ' + req.params.id
        );
    }

    return res.send({
        message: 'updated successfully.'
    });
}

const concellaOperatore = async (req, res) => {

    const affectedRows =
        await operatoreServices.cancellaDipendente(
            req.params.id
        );

    console.log(affectedRows);

    if (affectedRows == 0) {
        return res.status(404).json(
            'no record with given id : ' + req.params.id
        );
    }

    return res.send({
        message: 'deleted successfully.'
    });
}

const concellaTimbratura = async (req, res) => {

    const affectedRows =
        await operatoreServices.cancellaTimbratura(
            req.params.idTimbratura
        );

    console.log(affectedRows);

    if (affectedRows == 0) {
        return res.status(404).json(
            'no record with given id : ' +
            req.params.idTimbratura
        );
    }

    return res.send({
        message: 'deleted successfully.'
    });
}

const ottieniOperatore = async (req, res) => {

    console.log("req.params.id: " + req.params.id);

    const employee =
        await operatoreServices.ottieniDipendenteById(
            req.params.id
        );

    if (employee == undefined) {
        return res.status(404).json(
            'no record with given id : ' +
            req.params.id
        );
    }

    return res.send(employee);
}

const richiediMotivazioneTimbratura =
    async (req, res) => {

        let risultato = false;

        const statoCheck =
            await operatoreServices.ottieniStatoCheck(
                req.params.idOperatore
            );

        console.log("statoCheck:", statoCheck);

        if (statoCheck) {

            risultato =
                await operatoreServices
                    .verificaMotivazioneTimbratura(
                        req.params.idOperatore
                    );
        }

        return res.json(risultato);
    };

const creaCheckInCheckOut =
    async (req, res) => {

        if (!req.body.checkIn) {

            const statoCheck =
                await operatoreServices.ottieniStatoCheck(
                    req.params.idOperatore
                );

            console.log(
                "statoCheck: se sto facendo un ceckOut " +
                statoCheck
            );

            if (statoCheck) {

                const checkIn =
                    await operatoreServices.ottieniIDCheckIn(
                        req.params.idOperatore
                    );

                const {
                    idCheckInCheckOut,
                    idTurno
                } = checkIn;

                if (req.body.motivazione) {

                    console.log(
                        "req.body.motivazione: ",
                        req.body.motivazione
                    );

                    await turniOperatoreServices
                        .aggiornaMotivazioneRitardoTurno(
                            req.body.motivazione,
                            idTurno
                        );
                }

                const dataInserimento = new Date();

                await operatoreServices
                    .creaCheckInCheckOut(
                        req.body,
                        dataInserimento,
                        null,
                        idCheckInCheckOut
                    );

            } else {

                console.log(
                    `[${new Date().toISOString()}]` +
                    " Ho un'anomalia per operatore " +
                    req.params.idOperatore +
                    " con statoCheck: " +
                    statoCheck
                );
            }

        } else {

            const statoCheck =
                await operatoreServices.ottieniStatoCheck(
                    req.params.idOperatore
                );

            console.log(
                "statoCheck: se sto facendo un ceckIn " +
                statoCheck
            );

            if (statoCheck) {

                console.log(
                    `[${new Date().toISOString()}]` +
                    " Ho un'anomalia per operatore " +
                    req.params.idOperatore +
                    " con statoCheck: " +
                    statoCheck
                );

            } else {

                try {

                    await agganciaTurnoCheckIn_opertaore(
                        req.body,
                        req.body.idOperatore
                    );

                } catch (err) {

                    console.error(err.message);

                    return res.status(400).json({
                        message:
                            "La timbratura è consentita da 30 minuti prima del turno!"
                    });
                }
            }
        }

        return res.status(201).send({
            message: 'created successfully.'
        });
    }

const recuperoTimbratura =
    async (req, res) => {

        const timbratura = req.body;

        console.log(
            "timbratura: " +
            JSON.stringify(timbratura)
        );

        const timbraturaCheckIn = {
            idOperatore:
                parseInt(
                    timbratura.idOperatore
                ),
            checkIn: true,
            latitudine: 45.505382372771,
            longitudine: 9.251343180052,
            dataOraCheckInOut:
                new Date(
                    `${timbratura.dataCheckIn}T${timbratura.oraCheckIn}:00`
                )
        };

        console.log(
            "timbraturaCheckIn: " +
            JSON.stringify(timbraturaCheckIn)
        );

        const idNuovoCheckIn =
            await operatoreServices.recuperoTimbratura(
                timbraturaCheckIn
            );

        console.log(
            "Nuovo ID Check-In/Out:",
            idNuovoCheckIn
        );

        await agganciaTurnoCheckIn(
            timbraturaCheckIn.idOperatore,
            timbraturaCheckIn.dataOraCheckInOut,
            idNuovoCheckIn
        );

        if (timbratura.dataCheckOut) {

            console.log(
                "Inserisci anche il ceckout"
            );

            const timbraturaCheckOut = {
                idOperatore:
                    parseInt(
                        timbratura.idOperatore
                    ),
                checkIn: false,
                latitudine: 45.505382372771,
                longitudine: 9.251343180052,
                dataOraCheckInOut:
                    new Date(
                        `${timbratura.dataCheckOut}T${timbratura.oraCheckOut}:00`
                    )
            };

            console.log(
                "timbraturaCheckOut: " +
                JSON.stringify(
                    timbraturaCheckOut
                )
            );

            await operatoreServices.recuperoTimbratura(
                timbraturaCheckOut,
                idNuovoCheckIn
            );

        } else {

            console.log("solo ceckin");
        }

        return res.status(201).send({
            message: 'creata timbratura'
        });
    }

const agganciaTurnoCheckIn =
    async (
        idOperatore,
        dataOraCheckInOut,
        idNuovoCheckIn
    ) => {

        let turno =
            await turniOperatoreServices
                .ottieniTurnoConTimbraturaInRitardo(
                    idOperatore,
                    dataOraCheckInOut
                );

        if (!turno) {

            turno =
                await turniOperatoreServices
                    .ottieniTurnoConTimbraturaInAnticipo(
                        idOperatore,
                        dataOraCheckInOut
                    );
        }

        if (!turno) {

            console.log(
                `Per idCheckInCheckOut ${idNuovoCheckIn} nessun turno trovato`
            );

        } else {

            console.log(
                "L'operatore ha effettuato checkin al turno:",
                turno.idTurno
            );

            await turniOperatoreServices
                .timbraturaTurno(
                    idNuovoCheckIn,
                    turno.idTurno
                );

            await operatoreServices
                .agganciaTurnoAllaTimbratura(
                    turno.idTurno,
                    idNuovoCheckIn
                );
        }
    };

const agganciaTurnoCheckIn_opertaore =
    async (
        posizioneOperatore,
        idOperatore
    ) => {

        const dataInserimento =
            new Date();

        let turno =
            await turniOperatoreServices
                .ottieniTurnoConTimbraturaInRitardo(
                    idOperatore,
                    dataInserimento
                );

        if (!turno) {

            turno =
                await turniOperatoreServices
                    .ottieniTurnoConTimbraturaInAnticipo(
                        idOperatore,
                        dataInserimento
                    );
        }

        if (!turno) {

            console.log(
                `Per idOperatore ${idOperatore} e dataOraCheckInOut ${dataInserimento} nessun turno trovato`
            );

            throw new Error(
                `Per idOperatore ${idOperatore} e dataOraCheckInOut ${dataInserimento} nessun turno trovato`
            );
        }

        console.log(
            "L'operatore ha effettuato checkin al turno:",
            turno.idTurno
        );

        const idCheckInCheckOut =
            await operatoreServices
                .creaCheckInCheckOut(
                    posizioneOperatore,
                    dataInserimento,
                    turno.idTurno,
                    null
                );

        console.log(
            "Nuovo ID Check-In/Out:",
            idCheckInCheckOut
        );

        await turniOperatoreServices
            .timbraturaTurno(
                idCheckInCheckOut,
                turno.idTurno
            );
    };

function calcolaEta(dataNascita) {

    if (!dataNascita)
        return null;

    const oggi = new Date();
    const nascita =
        new Date(dataNascita);

    let eta =
        oggi.getFullYear() -
        nascita.getFullYear();

    const meseDiff =
        oggi.getMonth() -
        nascita.getMonth();

    const giornoDiff =
        oggi.getDate() -
        nascita.getDate();

    if (
        meseDiff < 0 ||
        (
            meseDiff === 0 &&
            giornoDiff < 0
        )
    ) {

        eta--;
    }

    return eta;
}

function over55(dataNascita) {

    const eta =
        calcolaEta(dataNascita);

    return (
        eta !== null &&
        eta > 55
    )
        ? "_X_"
        : "___";
}

function under24(dataNascita) {

    const eta =
        calcolaEta(dataNascita);

    return (
        eta !== null &&
        eta < 24
    )
        ? "_X_"
        : "___";
}


// ======================================================
// CREA CONTRATTO
// ======================================================

const creaContratto =
    async (req, res) => {

        try {

            console.log("creaContratto test");
            console.log("BODY:", req.body);

            const contratto = req.body;

            const idContratto =
                await operatoreServices
                    .creaContratto(
                        contratto
                    );

            console.log(
                "ID contratto creato:",
                idContratto
            );

            const datiContratto =
                await operatoreServices
                    .getDatiContratto(
                        idContratto
                    );

            console.log(
                "datiContratto.data_nascita:",
                datiContratto.data_nascita
            );

            let data;
            let fileName;

            const logoBase64 =
                fs.readFileSync(
                    path.resolve(
                        __dirname,
                        '../templates/reportImg/detelder-logo.png'
                    ),
                    'base64'
                );

            const datiComuni = {
                logoBase64,
                operatore_nome_cognome:
                    `${datiContratto.nome} ${datiContratto.cognome}`,
                operatore_luogo_nascita:
                    datiContratto.luogo_nascita,
                operatore_provincia_nascita:
                    datiContratto.provincia_nascita
                        ? `(${datiContratto.provincia_nascita})`
                        : '',
                operatore_data_nascita:
                    new Date(
                        datiContratto.data_nascita
                    ).toLocaleDateString(
                        'it-IT'
                    ),
                operatore_citta_residenza:
                    datiContratto.comune_residenza,
                operatore_nazione_nascita:
                    datiContratto.stato_nascita,
                operatore_provincia_residenza:
                    datiContratto.provincia_residenza,
                operatore_indirizzo_residenza:
                    datiContratto.indirizzo_residenza,
                operatore_civico_residenza:
                    datiContratto.numero_civico_residenza,
                operatore_codice_fiscale:
                    datiContratto.codice_fiscale
            };

            if (
                contratto.tipologia ===
                "CHIAMATA"
            ) {

                const dataInizio =
                    new Date(
                        datiContratto.data_inizio
                    ).toLocaleDateString(
                        'it-IT'
                    );

                const dataFine =
                    new Date(
                        datiContratto.data_fine
                    ).toLocaleDateString(
                        'it-IT'
                    );

                const dataFirmaContratto =
                    new Date(
                        datiContratto.data_firma_contratto
                    ).toLocaleDateString(
                        'it-IT'
                    );

                data = {
                    ...datiComuni,
                    over_55:
                        over55(
                            datiContratto.data_nascita
                        ),
                    under_24:
                        under24(
                            datiContratto.data_nascita
                        ),
                    data_inizio_contratto:
                        dataInizio,
                    data_fine_contratto:
                        dataFine,
                    data_firma_documento:
                        dataFirmaContratto,
                    citta_predefinita:
                        datiContratto.citta_predefinita ||
                        "Milano",
                    indirizzo_predefinito:
                        datiContratto.indirizzo_predefinito ||
                        "VIA A. RIZZOLI 4",
                    citta_alternativa:
                        datiContratto.citta_alternativa,
                    indirizzo_alternativo:
                        datiContratto.indirizzo_alternativo
                };

                fileName =
                    "Contratto-chiamata.ejs";

            } else if (
                contratto.tipologia ===
                "OCCASIONALE"
            ) {

                const dataInizio =
                    new Date(
                        datiContratto.data_inizio
                    ).toLocaleDateString(
                        'it-IT'
                    );

                const dataFine =
                    new Date(
                        datiContratto.data_fine
                    ).toLocaleDateString(
                        'it-IT'
                    );

                const dataFirmaContratto =
                    new Date(
                        datiContratto.data_firma_contratto
                    ).toLocaleDateString(
                        'it-IT'
                    );

                data = {
                    ...datiComuni,
                    data_inizio_contratto:
                        dataInizio,
                    data_fine_contratto:
                        dataFine,
                    compenso_totale_lordo:
                        "100",
                    anno_riferimento_previdenziale:
                        new Date()
                            .getFullYear()
                            .toString(),
                    data_firma_documento:
                        dataFirmaContratto
                };

                fileName =
                    "ContrattoOccasionale.ejs";

            } else if (
                contratto.tipologia ===
                "CONSGNA_BENI_FORMAZIONE"
            ) {

                data = {
                    ...datiComuni,

                    operatore_indirizzo_domicilio:
                        !datiContratto.residenza_uguale_domicilio
                            ? datiContratto.indirizzo_residenza
                            : datiContratto.indirizzo_domicilio,

                    operatore_civico_domicilio:
                        !datiContratto.residenza_uguale_domicilio
                            ? datiContratto.numero_civico_residenza
                            : datiContratto.numero_civico_domicilio,

                    operatore_citta_domicilio:
                        !datiContratto.residenza_uguale_domicilio
                            ? datiContratto.comune_residenza
                            : datiContratto.comune_domicilio,

                    operatore_provincia_domicilio:
                        !datiContratto.residenza_uguale_domicilio
                            ? datiContratto.provincia_residenza
                            : datiContratto.provincia_domicilio,

                    elenco_beni_consegnati:
                        datiContratto.beni_strumentali,

                    elenco_abbigliamento_consegnato:
                        datiContratto.contenuti_formazione,

                    data_firma_documento:
                        new Date()
                            .toLocaleDateString(
                                'it-IT'
                            )
                };

                fileName =
                    "Consegna_beni_formazione.ejs";

            } else {

                throw new Error(
                    "Tipo contratto non valido"
                );
            }

            console.log(
                "generaPDF: inizio generazione PDF"
            );

            console.log(
                "File richiesto:",
                fileName
            );

            const pdfBuffer =
                await generaPdfBuffer(
                    fileName,
                    data
                );

            const idOperatore =
                contratto.idOperatore;

            const pathname =
                `operatori/${idOperatore}/contratti/${idContratto}/originale.pdf`;

            console.log(
                "Salvataggio contratto Blob:",
                pathname
            );

            const blob =
                await put(
                    pathname,
                    pdfBuffer,
                    {
                        access: "private",
                        contentType:
                            "application/pdf",
                        allowOverwrite: true
                    }
                );

            await operatoreServices
                .aggiornaPathContratto(
                    blob.pathname,
                    idContratto
                );

            console.log(
                "Contratto salvato su Blob:",
                blob.pathname
            );

            return res
                .status(201)
                .send({
                    message:
                        "Contratto creato"
                });

        } catch (err) {

            console.error(
                "ERRORE REALE GENERAZIONE CONTRATTO:",
                err
            );

            return res
                .status(500)
                .send(
                    "Errore durante la generazione del PDF"
                );
        }
    };


const listaContrattiOperatore =
    async (req, res) => {

        console.log(
            "req.params.id: " +
            req.params.idOperatore
        );

        const listaContratti =
            await operatoreServices
                .listaContrattiOperatore(
                    req.params.idOperatore
                );

        return res.send(
            listaContratti
        );
    };


const downloadContratto =
    async (req, res) => {

        try {

            const { idContratto } =
                req.params;

            const tipoContratto =
                req.query.tipoContratto ||
                "downloadContratto";

            console.log(
                "downloadContratto:",
                idContratto,
                tipoContratto
            );

            const pathname =
                await operatoreServices
                    .ottieniPdfContratto(
                        idContratto,
                        tipoContratto
                    );

            if (!pathname) {

                return res
                    .status(404)
                    .json({
                        message:
                            "File non trovato"
                    });
            }

            const result =
                await get(
                    pathname,
                    {
                        access:
                            "private"
                    }
                );

            if (
                !result ||
                result.statusCode !== 200
            ) {

                return res
                    .status(404)
                    .json({
                        message:
                            "File non trovato"
                    });
            }

            let nomeFile =
                "contratto.pdf";

            if (
                tipoContratto ===
                "contrattoFirmato"
            ) {

                nomeFile =
                    "contratto_firmato.pdf";

            } else if (
                tipoContratto ===
                "contrattoUnilav"
            ) {

                nomeFile =
                    "unilav.pdf";
            }

            res.setHeader(
                "Content-Type",
                result.blob.contentType ||
                    "application/pdf"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${nomeFile}"`
            );

            res.setHeader(
                "Cache-Control",
                "private, no-store"
            );

            const nodeStream =
                Readable.fromWeb(
                    result.stream
                );

            nodeStream.on(
                "error",
                error => {

                    console.error(
                        "Errore stream contratto:",
                        error
                    );

                    if (!res.headersSent) {

                        res
                            .status(500)
                            .end();

                    } else {

                        res.end();
                    }
                }
            );

            return nodeStream.pipe(res);

        } catch (error) {

            console.error(
                "Errore download contratto:",
                error
            );

            return res
                .status(500)
                .json({
                    message:
                        "Errore download PDF"
                });
        }
    };


const concellaTuttiContratti =
    async (req, res) => {

        try {

            const {
                idContratto
            } = req.params;

            const tipi = [
                "contrattoFirmato",
                "contrattoUnilav",
                "downloadContratto"
            ];

            for (
                const tipoContratto
                of tipi
            ) {

                const pathname =
                    await operatoreServices
                        .ottieniPdfContratto(
                            idContratto,
                            tipoContratto
                        );

                if (pathname) {

                    try {

                        await del(
                            pathname
                        );

                    } catch (error) {

                        console.error(
                            "Errore cancellazione Blob:",
                            pathname,
                            error
                        );
                    }
                }
            }

            const affectedRows =
                await operatoreServices
                    .cancellaContratto(
                        idContratto
                    );

            console.log(
                affectedRows
            );

            return res.send({
                message:
                    "Contratto cancellato."
            });

        } catch (error) {

            console.error(
                "Errore cancellazione contratto:",
                error
            );

            return res
                .status(500)
                .json({
                    message:
                        "Errore cancellazione contratto"
                });
        }
    };


const cancellaSingoloContratto =
    async (req, res) => {

        try {

            const {
                idContratto
            } = req.params;

            const {
                tipoContratto
            } = req.query;

            if (
                ![
                    "contrattoFirmato",
                    "contrattoUnilav"
                ].includes(
                    tipoContratto
                )
            ) {

                return res
                    .status(400)
                    .json({
                        message:
                            "Tipo contratto non valido"
                    });
            }

            const pathname =
                await operatoreServices
                    .ottieniPdfContratto(
                        idContratto,
                        tipoContratto
                    );

            if (pathname) {

                try {
                    await del(
                        pathname
                    );
                } catch (error) {
                    console.error(
                        "Errore eliminazione Blob:",
                        error
                    );
                }
            }

            const affectedRows =
                await operatoreServices
                    .cancellaContrattoFirmato(
                        idContratto,
                        tipoContratto
                    );

            console.log(
                affectedRows
            );

            return res.send({
                message:
                    "Contratto cancellato."
            });

        } catch (error) {

            console.error(
                "Errore cancellazione contratto:",
                error
            );

            return res
                .status(500)
                .json({
                    message:
                        "Errore cancellazione contratto"
                });
        }
    };


async function generaPdfBuffer(
    fileName,
    data
) {

    const templatePath =
        path.join(
            __dirname,
            "..",
            "templates",
            fileName
        );

    const html =
        await ejs.renderFile(
            templatePath,
            data,
            {
                async: true
            }
        );

    const browser =
        await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ],
            defaultViewport: {
                width: 1200,
                height: 800
            }
        });

    try {

        const page =
            await browser.newPage();

        await page.setContent(
            html,
            {
                waitUntil:
                    "networkidle0"
            }
        );

        const pdfBuffer =
            await page.pdf({
                format: "A4",
                printBackground: true
            });

        return pdfBuffer;

    } finally {

        await browser.close();
    }
}


const generaPdf =
    async (req, res) => {

        const data =
            req.body;

        const fileName =
            req.query.fileName;

        console.log(
            "generaPDF: inizio generazione PDF"
        );

        console.log(
            "File richiesto:",
            fileName
        );

        try {

            const pdfBuffer =
                await generaPdfBuffer(
                    fileName,
                    data
                );

            res.set({
                "Content-Type":
                    "application/pdf",
                "Content-Disposition":
                    `attachment; filename="documento.pdf"`,
                "Content-Length":
                    pdfBuffer.length
            });

            return res.send(
                pdfBuffer
            );

        } catch (err) {

            console.error(
                "Errore durante la generazione del PDF:",
                err
            );

            return res
                .status(500)
                .send(
                    "Errore durante la generazione del PDF"
                );
        }
    };


const aggiornaTimbratura =
    async (req, res) => {

        const timbratura =
            req.body;

        console.log(
            "timbratura: " +
            JSON.stringify(
                timbratura
            )
        );

        const dataOraCheckIn =
            new Date(
                `${timbratura.dataCheckIn}T${timbratura.oraCheckIn}:00`
            );

        await operatoreServices
            .aggiornaCheckInOut(
                dataOraCheckIn,
                timbratura.idCheckIn
            );

        if (
            timbratura.dataCheckOut
        ) {

            console.log(
                "Modifica anche il ceckout"
            );

            if (
                timbratura.idCheckOut
            ) {

                console.log(
                    "Modifica solo la data ceckout"
                );

                const dataOraCheckOut =
                    new Date(
                        `${timbratura.dataCheckOut}T${timbratura.oraCheckOut}:00`
                    );

                await operatoreServices
                    .aggiornaCheckInOut(
                        dataOraCheckOut,
                        timbratura.idCheckOut
                    );

            } else {

                const timbraturaCheckOut = {
                    idOperatore:
                        parseInt(
                            timbratura.idOperatore
                        ),
                    checkIn: false,
                    latitudine:
                        45.505382372771,
                    longitudine:
                        9.251343180052,
                    dataOraCheckInOut:
                        new Date(
                            `${timbratura.dataCheckOut}T${timbratura.oraCheckOut}:00`
                        )
                };

                console.log(
                    "timbraturaCheckOut: " +
                    JSON.stringify(
                        timbraturaCheckOut
                    )
                );

                await operatoreServices
                    .recuperoTimbratura(
                        timbraturaCheckOut,
                        timbratura.idCheckIn
                    );
            }

        } else {

            console.log(
                "Modifica solo ceckin"
            );
        }

        return res.status(201).send({
            message:
                'Timbratura aggiornata'
        });
    }


const aggiornaOperatore =
    async (req, res) => {

        await operatoreServices
            .aggiornaDipendente(
                req.body,
                req.params.id
            );

        return res.status(201).send({
            message:
                'Operatore aggiornato'
        });
    }


const aggiornaNascitaResidenzaOperatore =
    async (req, res) => {

        await operatoreServices
            .aggiornaNascitaResidenza(
                req.body,
                req.params.id
            );

        return res.status(201).send({
            message:
                'Operatore aggiornato'
        });
    }


const aggiornaDatiGenericiOperatore =
    async (req, res) => {

        await operatoreServices
            .aggiornaDatiGenerici(
                req.body,
                req.params.id
            );

        return res.status(201).send({
            message:
                'Operatore aggiornato'
        });
    }


const aggiornaHeaderOperatore =
    async (req, res) => {

        await operatoreServices
            .aggiornaHeader(
                req.body,
                req.params.id
            );

        return res.status(201).send({
            message:
                'Operatore aggiornato'
        });
    }


const aggiornaAllegatiOperatore =
    async (req, res) => {

        const { id } =
            req.params;

        const dati =
            req.body;

        const esiste =
            await allegatiOpeartoreServices
                .verificaPresenzaDatiAllegati(
                    id
                );

        if (esiste) {

            await allegatiOpeartoreServices
                .aggiornaAllegati(
                    dati,
                    id
                );

        } else {

            await allegatiOpeartoreServices
                .creaAllegati(
                    dati,
                    id
                );
        }

        return res.status(201).send({
            message:
                'Operatore aggiornato'
        });
    };


const ottieniAllegatiOperatore =
    async (req, res) => {

        console.log(
            "req.params.id: " +
            req.params.id
        );

        const datiPerAllegati =
            await allegatiOpeartoreServices
                .ottieniAllegatiByOperatore(
                    req.params.id
                );

        if (
            datiPerAllegati ==
            undefined
        ) {

            return res.status(404).json(
                'no record with given id : ' +
                req.params.id
            );
        }

        return res.send(
            datiPerAllegati
        );
    }


const getCheckInCheckOut =
    async (req, res) => {

        const {
            dataInizio,
            dataFine
        } = req.query;

        console.log(
            'Parametri ricevuti:'
        );

        console.log(
            'dataInizio:',
            dataInizio
        );

        console.log(
            'dataFine:',
            dataFine
        );

        const checkInCheckOutOperatore =
            await operatoreServices
                .ottieniCheckInCheckOutOperatore(
                    req.params.idOperatore,
                    dataInizio,
                    dataFine
                );

        return res.send(
            checkInCheckOutOperatore
        );
    }


const getPresenzeTuttiOperatori =
    async (req, res) => {

        const {
            dataInizio,
            dataFine,
            titoloEvento,
            page,
            pageSize,
            sortOrderDataCeckIn,
            sortOrderNominativo,
            sortNomeEvento
        } = req.query;

        const checkInCheckOutOperatore =
            await operatoreServices
                .ottieniCheckInCheckOutGenerica(
                    dataInizio,
                    dataFine,
                    titoloEvento,
                    parseInt(page),
                    parseInt(pageSize),
                    sortOrderDataCeckIn,
                    sortOrderNominativo,
                    sortNomeEvento
                );

        return res.send({
            data:
                checkInCheckOutOperatore.data,
            total:
                checkInCheckOutOperatore.total,
            totalPages:
                checkInCheckOutOperatore.totalPages,
            currentPage:
                checkInCheckOutOperatore.currentPage
        });
    }


const getStatoCheck =
    async (req, res) => {

        const statoCheck =
            await operatoreServices
                .ottieniStatoCheck(
                    req.params.idOperatore
                );

        return res.send({
            statoCheck
        });
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
