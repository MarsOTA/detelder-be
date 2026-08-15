
const service = require('../services/eventiServices')

const clientiServices = require('../services/clientiServices')

const path = require("path");
const puppeteer = require("puppeteer");
const ejs = require("ejs");
const fs = require("fs");

const creaNuovoEvento = async (req, res) => {

    console.log("req.body: ", req.body);

    if (req.body.isAltroSelected) {
        const indirizzoId = await clientiServices.creaInidirizzoBrand(
            req.body.idBrand,
            req.body.indirizzo
        );
        console.log("indirizzoId creato:", indirizzoId);

        // sostituisco idIndirizzo con quello appena creato
        req.body.idIndirizzo = indirizzoId;
    }

    let idEvento = await service.creaEvento(req.body);
    res.status(201).send({ 'idEvento': idEvento });
}

const aggiornaEvento = async (req, res) => {
    await service.aggiornaEvento(req.body, req.params.idEvento);
    res.status(201).send({ 'message': 'evento Aggiornato.' });
}

const modificaNomeEvento = async (req, res) => {
    await service.modificaNomeEvento(req.body, req.params.idEvento);
    res.status(201).send({ 'message': 'evento Aggiornato.' });
}

const getEventi = async (req, res) => {
    const eventi = await service.ottieniListaEventi();
    res.send(eventi);
}

const getTurniEventi = async (req, res) => {
    const { dataInizio, dataFine, keyword } = req.query;

    const eventi = await service.ottieniListaTurniEventi(dataInizio, dataFine, keyword);

    const eventiMappati = [];
    for (const evento of eventi) {

        const existingEvento = eventiMappati.find(e => e.idEvento === evento.idEvento);

        const turno = {
            dataTurno: evento.dataTurno,
            oraInizio: evento.oraInizio,
            oraFine: evento.oraFine,
            tipologiaTurno: evento.tipologiaTurno,
            tipoMansione: evento.tipoMansione,
            orePausa: evento.orePausa,
            operatore: evento.idDipendente
                ? (
                    evento.nickname ||
                    `${evento.nome} ${evento.cognome}`
                )
                : "",
        };

        if (existingEvento) {
            existingEvento.turni.push(turno);
        } else {
            eventiMappati.push({
                idEvento: evento.idEvento,
                nomeEvento: evento.nomeEvento
                    ? evento.nomeEvento
                    : `${evento.ragioneSociale} ${evento.nomeBrand}`,
                dataIniziale: evento.dataIniziale,
                dataFinale: evento.dataFinale,
                ragioneSociale: evento.ragioneSociale,
                nomeBrand: evento.nomeBrand,
                turni: [turno],
            });
        }


    }

    res.send(eventiMappati);
}

async function generaPdfBuffer(fileName, data) {
    // Percorso del template EJS
    const templatePath = path.join(__dirname, "..", "templates", fileName);

    console.log("templatePath: " + templatePath);

    // Compila il template EJS in HTML
    const html = await ejs.renderFile(templatePath, data, { async: true });

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

// funzione per trasformare i dati SQL in array giorni
function creaGiorni(datiReport) {
    const giorniMap = {}; // oggetto per raggruppare i turni per giorno

    // nomi dei mesi e dei giorni in italiano
    const mesi = [
        "GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO",
        "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"
    ];
    const weekdays = [
        "Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"
    ];

    datiReport.forEach(function (row) {
        const date = new Date(row.dataTurno);
        const key = row.dataTurno; // chiave unica per il giorno

        if (!giorniMap[key]) {
            giorniMap[key] = {
                data: {
                    day: ("0" + date.getDate()).slice(-2), // giorno con 2 cifre
                    month: mesi[date.getMonth()],           // nome del mese in italiano
                    year: date.getFullYear().toString(),   // anno
                    weekday: weekdays[date.getDay()]       // giorno della settimana
                },
                turni: []
            };
        }

        // aggiungi il turno del giorno
        giorniMap[key].turni.push({
            da: row.DA,
            a: row.A,
            cliente: row.Cliente,
            brand: row.Brand,
            indirizzo: row.indirizzo,
            attivita: row.Attivita,
            operatore: row.operatore,
            telefono: row.Cell
        });
    });

    // trasforma l'oggetto in array e ordina per data
    const giorniArray = Object.values(giorniMap).sort(function (a, b) {
        return new Date(a.data.year, a.data.month ? mesi.indexOf(a.data.month) : 0, a.data.day)
            - new Date(b.data.year, b.data.month ? mesi.indexOf(b.data.month) : 0, b.data.day);
    });

    return giorniArray;
}


const creaReportTurni = async (req, res) => {
    try {

        const logoBase64 = fs.readFileSync(
            path.resolve(__dirname, '../templates/reportImg/detelder-logo.png'),
            'base64'
        );

        const { dataInizio, dataFine, keyword } = req.query;

        const datiReport = await service.ottieniDatiReport(dataInizio, dataFine, keyword);

        const giorni = creaGiorni(datiReport);

        // Oggetto padre
        const datiPdf = {
            logoBase64,
            giorni

        };

        console.log("giorni: ", giorni);

        // Genera il PDF
        const pdfBuffer = await generaPdfBuffer("reportTurni.ejs", { data: datiPdf });


        console.log("PDF generato");

        // Invia il PDF come file scaricabile
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=document.pdf"
        );
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Errore generando PDF:", error);
        res.status(500).send("Errore generando PDF");
    }
}

module.exports = {
    creaNuovoEvento,
    getEventi,
    getTurniEventi,
    aggiornaEvento,
    modificaNomeEvento,
    creaReportTurni
}