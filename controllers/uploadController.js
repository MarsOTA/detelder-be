const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");

const operatoreServices = require('../services/operatoreServices')
const allegatiOpeartoreServices = require('../services/allegatiOpeartoreServices')

const creaUploadContratti = () => {

    const storage = multer.diskStorage({
        destination: async (req, file, cb) => {
            const { idContratto } = req.params;
            console.log("idContratto destination: " + idContratto);
            //  const uploadDir = path.join(__dirname, "../uploads/contratti");
            const idOperatore = await operatoreServices.getIdOpetarore(idContratto);
            // cartella base
            const baseDir = path.join(process.env.HOME_CONTRATTI, "output");
            // cartella operatore
            const operatoreDir = path.join(baseDir, `operatore_${idOperatore}`);

            cb(null, operatoreDir);
        },
        filename: async (req, file, cb) => {
            const { idContratto } = req.params;
            const { tipoContratto } = req.body;
            console.log("idContratto filename: " + idContratto);

            //Prendo il nome del contratto da path_contratto generato precedentemente
            const pathContratto = await operatoreServices.getPathContratto(idContratto);
            const fileName = path.basename(pathContratto);
            const parsed = path.parse(fileName);
            //e ci aggiungo _firmato - cosi nella cartella sappiamo a quale file
            //non firmato si riferisce

            //const newFileName = `${parsed.name}_firmato${parsed.ext}`;

            let suffix = "";
            console.log("tipoContratto filename: " + tipoContratto);
            if (tipoContratto === "contrattoFirmato") {
              suffix = "_firmato";
            } else if (tipoContratto === "contrattoUnilav") {
              suffix = "_unilav";
            }
            
            const newFileName = `${parsed.name}${suffix}${parsed.ext}`;            

            cb(null, newFileName);
        },
    });

    return multer({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    });
};

const uploadContrattoMiddleware = creaUploadContratti().single("file");

const uploadContratto = async (req, res) => {
    const { idContratto } = req.params;
    const { tipoContratto } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "File mancante" });
    }

    console.log("req.file.filename uploadContratto: " + req.file.filename);
    console.log("req.file.path uploadContratto: " + req.file.path);
    console.log("req.body.tipoContratto: " + tipoContratto);
    
    

    await operatoreServices.aggiornaPathContrattoFirmato(req.file.path, idContratto, tipoContratto);

    try {
        res.status(200).json({
            message: "Upload completato",
            idContratto,
            fileName: req.file.filename,
            path: req.file.path,
        });
    } catch (error) {
        res.status(500).json({ message: "Errore upload contratto" });
    }
}



const creaUploadImmagineProfilo = () => {

    const storage = multer.diskStorage({
        destination: async (req, file, cb) => {
            const { idOperatore } = req.params;
            console.log("idContratto destination: " + idOperatore);
            //  const uploadDir = path.join(__dirname, "../uploads/contratti");
            //const idOperatore = await operatoreServices.getIdOpetarore(idContratto);
            // cartella base
            const baseDir = path.join(process.env.HOME_CONTRATTI, "output");
            // cartella operatore
            const operatoreDir = path.join(baseDir, `operatore_${idOperatore}`);

            // crea la cartella se non esiste
            if (!fs.existsSync(operatoreDir)) {
                fs.mkdirSync(operatoreDir, { recursive: true });
            }

            cb(null, operatoreDir);
        },
        filename: async (req, file, cb) => {
            const { idOperatore } = req.params;

            const originalName = file.originalname;
            const extension = path.extname(originalName);

            console.log('extension: ' + extension);

            //TODO da capire come mostrare la corretta estensione
            const newFileName = `immagineProfilo${extension}`;

            cb(null, newFileName);
        },
    });

    return multer({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    });
};

const uploadImmagineProfiloMiddleware = creaUploadImmagineProfilo().single("file");

const uploadImmagineProfilo = async (req, res) => {
    const { idOperatore } = req.params;
    const { tipoImmagine } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "File mancante" });
    }


    console.log("req.file.filename uploadContratto: " + req.file.filename);
    console.log("req.file.path uploadContratto: " + req.file.path);


    const oldPath = req.file.path;
    const extension = path.extname(req.file.originalname);
    const newFileName = `immagineProfilo_${tipoImmagine}${extension}`;
    const newPath = path.join(path.dirname(oldPath), newFileName);

    fs.renameSync(oldPath, newPath);

    await operatoreServices.aggiornaImmagineProfiloOperatore(
        tipoImmagine,
        newFileName,
        idOperatore
    );


    try {
        res.status(200).json({
            message: "Upload completato",
            idOperatore,
            fileName: req.file.filename,
            path: req.file.path,
        });
    } catch (error) {
        res.status(500).json({ message: "Errore upload contratto" });
    }
}


const mostraImmagineProfilo = async (req, res) => {
    const { idOperatore } = req.params;

    const tipoImmagine = req.query.tipoImmagine; // primoPiano

    const immagineProfilo = await operatoreServices.getImmagineProfiloOperatore(idOperatore, tipoImmagine);

    console.log("immagineProfilo: ", immagineProfilo);

    // Nessuna immagine trovata
    if (!immagineProfilo) {
        return res.status(204).json(null);
    }

    const imagePath = path.join(
        process.env.HOME_CONTRATTI,
        "output",
        `operatore_${idOperatore}`,
        `${immagineProfilo}`
    );

    res.sendFile(imagePath);
}


const creaUploadAllegati = () => {

    const storage = multer.diskStorage({
        destination: async (req, file, cb) => {
            const { idOperatore } = req.params;

            const baseDir = path.join(process.env.HOME_CONTRATTI, "output", "allegati");
            // cartella operatore
            const operatoreDir = path.join(baseDir, `operatore_${idOperatore}`);

            // crea la cartella se non esiste
            if (!fs.existsSync(operatoreDir)) {
                fs.mkdirSync(operatoreDir, { recursive: true });
            }

            cb(null, operatoreDir);
        },
        filename: async (req, file, cb) => {

            const originalName = file.originalname;
            const extension = path.extname(originalName);
            console.log('extension: ' + extension);

            const newFileName = `allegato${extension}`;
            cb(null, newFileName);
        },
    });

    return multer({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    });
};

const uploadAllegatiMiddleware = creaUploadAllegati().single("file");


const uploadAllegati = async (req, res) => {
    const { idOperatore } = req.params;
    const { nomeFileAllegato } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "File mancante" });
    }


    console.log("req.file.filename uploadContratto: " + req.file.filename);
    console.log("req.file.path uploadContratto: " + req.file.path);


    const oldPath = req.file.path;
    const extension = path.extname(req.file.originalname);
    const newFileName = `${nomeFileAllegato}${extension}`;
    const newPath = path.join(path.dirname(oldPath), newFileName);

    fs.renameSync(oldPath, newPath);

    const esiste = await allegatiOpeartoreServices.verificaPresenzaDatiAllegati(idOperatore);

    if (esiste) {
        await allegatiOpeartoreServices.aggiornaFileAllegati(nomeFileAllegato, extension, idOperatore);
    } else {
        await allegatiOpeartoreServices.inserisciFileAllegati(nomeFileAllegato, extension, idOperatore);
    }

    try {
        res.status(200).json({
            message: "Upload completato",
            idOperatore,
            fileName: req.file.filename,
            path: req.file.path,
        });
    } catch (error) {
        res.status(500).json({ message: "Errore upload contratto" });
    }
}

/*
const downloadAllegato = async (req, res) => {
    try {
        const { idOperatore } = req.params;
        const { tipoAllegato } = req.query;
        console.log("downloadAllegato - idOperatore:", idOperatore);
        console.log("tipoAllegato: " + tipoAllegato);

        const nomeFile = await allegatiOpeartoreServices.ottieniNomeFileAllegato(idOperatore, tipoAllegato);

        const baseDir = path.join(process.env.HOME_CONTRATTI, "output", "allegati");
        const operatoreDir = path.join(baseDir, `operatore_${idOperatore}`);
        console.log("operatoreDir: " + operatoreDir);
        const filePathCompleto = path.join(operatoreDir, nomeFile);
        console.log("filePathCompleto: " + filePathCompleto);
        return downloadFile(res, filePathCompleto);

    } catch (error) {
        console.error("Errore download contratto firmato:", error);
        res.status(500).json({ message: "Errore download PDF" });
    }
};
*/


const downloadAllegato = async (req, res) => {
    try {
        const { idOperatore } = req.params;
        const { tipoAllegato } = req.query;
        console.log("downloadAllegato - idOperatore:", idOperatore);
        console.log("tipoAllegato: " + tipoAllegato);

        const nomeFile = await allegatiOpeartoreServices.ottieniNomeFileAllegato(idOperatore, tipoAllegato);

        const baseDir = path.join(process.env.HOME_CONTRATTI, "output", "allegati");
        const operatoreDir = path.join(baseDir, `operatore_${idOperatore}`);
        console.log("operatoreDir: " + operatoreDir);
        const filePathCompleto = path.join(operatoreDir, nomeFile);
        console.log("filePathCompleto: " + filePathCompleto);
        return downloadFile(res, filePathCompleto, nomeFile);

    } catch (error) {
        console.error("Errore download contratto firmato:", error);
        res.status(500).json({ message: "Errore download PDF" });
    }
};

const eliminaAllegato = async (req, res) => {
    try {
        const { idOperatore } = req.params;
        const { tipoAllegato } = req.query;
        console.log("eliminaAllegato - idOperatore:", idOperatore);
        console.log("tipoAllegato: " + tipoAllegato);
        const nomeFile = await allegatiOpeartoreServices.ottieniNomeFileAllegato(idOperatore, tipoAllegato);
        const baseDir = path.join(process.env.HOME_CONTRATTI, "output", "allegati");
        const operatoreDir = path.join(baseDir, `operatore_${idOperatore}`);
        console.log("operatoreDir: " + operatoreDir);
        const filePathCompleto = path.join(operatoreDir, nomeFile);
        console.log("filePathCompleto: " + filePathCompleto);    
        
        // Verifica esistenza file
        try {
            await fsPromises.access(filePathCompleto);
        } catch {
            return res.status(404).json({
                message: "File non esistente"
            });
        }

        // Eliminazione file
        await fsPromises.unlink(filePathCompleto);
        
        await allegatiOpeartoreServices.eliminaFileAllegato(idOperatore, tipoAllegato);
        return res.status(200).json({
            message: "File eliminato con successo"
        });        


    } catch (error) {
        console.error("Errore eliminazione documento:", error);
        res.status(500).json({ message: "Errore eliminazione file" });
    }
};        

const downloadFile = async (res, filePath, nomeFile) => {
    if (!filePath) {
        return res.status(404).json({ message: "File non trovato" });
    }

    const resolvedPath = path.resolve(filePath);
    console.log("REAL PATH:", resolvedPath);

    if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ message: "File non trovato" });
    }

    return res.download(resolvedPath, nomeFile, (err) => {
        if (err) {
            console.error("Errore durante il download:", err);

            if (!res.headersSent) {
                return res.status(500).json({
                    message: "Errore durante il download del file",
                });
            }
        }
    });
};



module.exports = {
    uploadContrattoMiddleware,
    uploadContratto,
    uploadImmagineProfiloMiddleware,
    uploadImmagineProfilo,
    mostraImmagineProfilo,
    uploadAllegatiMiddleware,
    uploadAllegati,
    downloadAllegato,
    eliminaAllegato
}
