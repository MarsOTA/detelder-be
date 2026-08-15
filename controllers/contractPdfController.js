const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const operatoreServices = require('../services/operatoreServices');
const { put } = require('@vercel/blob');

function calcolaEta(dataNascita) {
    if (!dataNascita) return null;

    const oggi = new Date();
    const nascita = dataNascita instanceof Date ? dataNascita : new Date(dataNascita);

    if (Number.isNaN(nascita.getTime())) return null;

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
    return eta !== null && eta > 55 ? '_X_' : '___';
}

function under24(dataNascita) {
    const eta = calcolaEta(dataNascita);
    return eta !== null && eta < 24 ? '_X_' : '___';
}

async function generaPdfBuffer(fileName, data) {
    const templatePath = path.join(__dirname, '..', 'templates', fileName);

    console.log('PDF template:', templatePath);

    const html = await ejs.renderFile(templatePath, data, { async: true });

    // IMPORTANTE: Puppeteer/Chromium vengono caricati SOLO quando serve
    // generare un PDF. In questo modo un eventuale problema Chromium non
    // può impedire l'avvio del backend o rompere login/CORS.
    const puppeteer = require('puppeteer-core');
    const chromium = require('@sparticuz/chromium');

    console.log('Avvio Chromium serverless...');

    const executablePath = await chromium.executablePath();

    console.log('Chromium executablePath:', executablePath);

    const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath,
        headless: 'shell',
        defaultViewport: {
            width: 1200,
            height: 800
        }
    });

    try {
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: 'networkidle0'
        });

        return await page.pdf({
            format: 'A4',
            printBackground: true
        });
    } finally {
        await browser.close();
    }
}

const creaContratto = async (req, res) => {
    try {
        console.log('creaContratto Vercel isolato');
        console.log('BODY:', req.body);

        const contratto = req.body;

        const idContratto = await operatoreServices.creaContratto(contratto);
        const datiContratto = await operatoreServices.getDatiContratto(idContratto);

        let data;
        let fileName;

        const logoBase64 = fs.readFileSync(
            path.resolve(__dirname, '../templates/reportImg/detelder-logo.png'),
            'base64'
        );

        const datiComuni = {
            logoBase64,
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

        if (contratto.tipologia === 'CHIAMATA') {
            data = {
                ...datiComuni,
                over_55: over55(datiContratto.data_nascita),
                under_24: under24(datiContratto.data_nascita),
                data_inizio_contratto: new Date(datiContratto.data_inizio).toLocaleDateString('it-IT'),
                data_fine_contratto: new Date(datiContratto.data_fine).toLocaleDateString('it-IT'),
                data_firma_documento: new Date(datiContratto.data_firma_contratto).toLocaleDateString('it-IT'),
                citta_predefinita: datiContratto.citta_predefinita || 'Milano',
                indirizzo_predefinito: datiContratto.indirizzo_predefinito || 'VIA A. RIZZOLI 4',
                citta_alternativa: datiContratto.citta_alternativa,
                indirizzo_alternativo: datiContratto.indirizzo_alternativo
            };

            fileName = 'Contratto-chiamata.ejs';
        } else if (contratto.tipologia === 'OCCASIONALE') {
            data = {
                ...datiComuni,
                data_inizio_contratto: new Date(datiContratto.data_inizio).toLocaleDateString('it-IT'),
                data_fine_contratto: new Date(datiContratto.data_fine).toLocaleDateString('it-IT'),
                compenso_totale_lordo: '100',
                anno_riferimento_previdenziale: new Date().getFullYear().toString(),
                data_firma_documento: new Date(datiContratto.data_firma_contratto).toLocaleDateString('it-IT')
            };

            fileName = 'ContrattoOccasionale.ejs';
        } else if (contratto.tipologia === 'CONSGNA_BENI_FORMAZIONE') {
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
                data_firma_documento: new Date().toLocaleDateString('it-IT')
            };

            fileName = 'Consegna_beni_formazione.ejs';
        } else {
            throw new Error('Tipo contratto non valido');
        }

        const pdfBuffer = await generaPdfBuffer(fileName, data);

        const pathname = `operatori/${contratto.idOperatore}/contratti/${idContratto}/originale.pdf`;

        const blob = await put(pathname, pdfBuffer, {
            access: 'private',
            contentType: 'application/pdf',
            allowOverwrite: true
        });

        await operatoreServices.aggiornaPathContratto(blob.pathname, idContratto);

        return res.status(201).send({
            message: 'Contratto creato'
        });
    } catch (err) {
        console.error('ERRORE GENERAZIONE CONTRATTO ISOLATA:', err);

        return res.status(500).send('Errore durante la generazione del PDF');
    }
};

module.exports = {
    creaContratto
};
