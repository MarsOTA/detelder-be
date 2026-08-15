const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { put, get, del } = require("@vercel/blob");
const { Readable } = require("node:stream");

const operatoreServices = require("../services/operatoreServices");
const allegatiOpeartoreServices = require("../services/allegatiOpeartoreServices");


// ======================================================
// CONTRATTI
// PER ORA RESTANO SU FILESYSTEM
// ======================================================

const creaUploadContratti = () => {

    const storage = multer.diskStorage({

        destination: async (req, file, cb) => {

            try {

                const { idContratto } = req.params;

                console.log(
                    "idContratto destination:",
                    idContratto
                );

                const idOperatore =
                    await operatoreServices.getIdOpetarore(
                        idContratto
                    );

                const baseDir = path.join(
                    process.env.HOME_CONTRATTI,
                    "output"
                );

                const operatoreDir = path.join(
                    baseDir,
                    `operatore_${idOperatore}`
                );

                if (!fs.existsSync(operatoreDir)) {

                    fs.mkdirSync(
                        operatoreDir,
                        {
                            recursive: true
                        }
                    );

                }

                cb(null, operatoreDir);

            } catch (error) {

                console.error(
                    "Errore destination contratto:",
                    error
                );

                cb(error);

            }

        },


        filename: async (req, file, cb) => {

            try {

                const { idContratto } = req.params;
                const { tipoContratto } = req.body;

                console.log(
                    "idContratto filename:",
                    idContratto
                );

                const pathContratto =
                    await operatoreServices.getPathContratto(
                        idContratto
                    );

                const fileName =
                    path.basename(pathContratto);

                const parsed =
                    path.parse(fileName);


                let suffix = "";

                console.log(
                    "tipoContratto filename:",
                    tipoContratto
                );


                if (
                    tipoContratto ===
                    "contrattoFirmato"
                ) {

                    suffix = "_firmato";

                } else if (
                    tipoContratto ===
                    "contrattoUnilav"
                ) {

                    suffix = "_unilav";

                }


                const newFileName =
                    `${parsed.name}${suffix}${parsed.ext}`;


                cb(
                    null,
                    newFileName
                );

            } catch (error) {

                console.error(
                    "Errore filename contratto:",
                    error
                );

                cb(error);

            }

        }

    });


    return multer({

        storage,

        limits: {
            fileSize:
                10 * 1024 * 1024
        }

    });

};


const uploadContrattoMiddleware =
    creaUploadContratti()
        .single("file");


const uploadContratto =
    async (req, res) => {

        try {

            const { idContratto } =
                req.params;

            const { tipoContratto } =
                req.body;


            if (!req.file) {

                return res
                    .status(400)
                    .json({
                        message:
                            "File mancante"
                    });

            }


            console.log(
                "req.file.filename uploadContratto:",
                req.file.filename
            );

            console.log(
                "req.file.path uploadContratto:",
                req.file.path
            );

            console.log(
                "req.body.tipoContratto:",
                tipoContratto
            );


            await operatoreServices
                .aggiornaPathContrattoFirmato(
                    req.file.path,
                    idContratto,
                    tipoContratto
                );


            return res
                .status(200)
                .json({

                    message:
                        "Upload completato",

                    idContratto,

                    fileName:
                        req.file.filename,

                    path:
                        req.file.path

                });


        } catch (error) {

            console.error(
                "Errore upload contratto:",
                error
            );


            return res
                .status(500)
                .json({
                    message:
                        "Errore upload contratto"
                });

        }

    };


// ======================================================
// IMMAGINI PROFILO
// VERCEL BLOB PRIVATE
// ======================================================

const creaUploadImmagineProfilo = () => {

    return multer({

        storage:
            multer.memoryStorage(),

        limits: {
            fileSize:
                4 * 1024 * 1024
        },

        fileFilter:
            (req, file, cb) => {

                const allowedTypes = [

                    "image/jpeg",
                    "image/png",
                    "image/webp"

                ];


                if (
                    !allowedTypes.includes(
                        file.mimetype
                    )
                ) {

                    return cb(
                        new Error(
                            "Formato immagine non supportato"
                        )
                    );

                }


                cb(
                    null,
                    true
                );

            }

    });

};


const uploadImmagineProfiloMiddleware =
    creaUploadImmagineProfilo()
        .single("file");


const uploadImmagineProfilo =
    async (req, res) => {

        try {

            const { idOperatore } =
                req.params;

            const { tipoImmagine } =
                req.body;


            if (!req.file) {

                return res
                    .status(400)
                    .json({
                        message:
                            "File mancante"
                    });

            }


            const tipiConsentiti = [

                "primoPiano",
                "mezzoBusto",
                "figuraIntera"

            ];


            if (
                !tipiConsentiti.includes(
                    tipoImmagine
                )
            ) {

                return res
                    .status(400)
                    .json({
                        message:
                            "Tipo immagine non valido"
                    });

            }


            let extension =
                path.extname(
                    req.file.originalname
                ).toLowerCase();


            if (!extension) {

                switch (
                    req.file.mimetype
                ) {

                    case "image/png":

                        extension = ".png";
                        break;


                    case "image/webp":

                        extension = ".webp";
                        break;


                    default:

                        extension = ".jpg";

                }

            }


            const pathname =
                `operatori/${idOperatore}/profilo/${tipoImmagine}${extension}`;


            console.log(
                "Upload Blob immagine profilo:",
                pathname
            );


            const blob =
                await put(

                    pathname,

                    req.file.buffer,

                    {

                        access:
                            "private",

                        contentType:
                            req.file.mimetype,

                        allowOverwrite:
                            true

                    }

                );


            console.log(
                "Blob immagine creato:",
                blob.pathname
            );


            await operatoreServices
                .aggiornaImmagineProfiloOperatore(

                    tipoImmagine,

                    blob.pathname,

                    idOperatore

                );


            return res
                .status(200)
                .json({

                    message:
                        "Upload completato",

                    idOperatore,

                    tipoImmagine,

                    pathname:
                        blob.pathname

                });


        } catch (error) {

            console.error(
                "Errore upload immagine profilo:",
                error
            );


            return res
                .status(500)
                .json({
                    message:
                        "Errore upload immagine profilo"
                });

        }

    };


// ======================================================
// MOSTRA IMMAGINE PROFILO
// ======================================================

const mostraImmagineProfilo =
    async (req, res) => {

        try {

            const { idOperatore } =
                req.params;

            const { tipoImmagine } =
                req.query;


            if (!tipoImmagine) {

                return res
                    .status(400)
                    .json({
                        message:
                            "tipoImmagine mancante"
                    });

            }


            const pathname =
                await operatoreServices
                    .getImmagineProfiloOperatore(

                        idOperatore,

                        tipoImmagine

                    );


            console.log(
                "Blob immagine profilo:",
                pathname
            );


            if (!pathname) {

                return res
                    .status(204)
                    .end();

            }


            const result =
                await get(

                    pathname,

                    {

                        access:
                            "private",

                        ifNoneMatch:
                            req.headers[
                                "if-none-match"
                            ] || undefined

                    }

                );


            if (!result) {

                return res
                    .status(404)
                    .json({
                        message:
                            "Immagine non trovata"
                    });

            }


            if (
                result.statusCode ===
                304
            ) {

                if (
                    result.blob &&
                    result.blob.etag
                ) {

                    res.setHeader(
                        "ETag",
                        result.blob.etag
                    );

                }


                res.setHeader(
                    "Cache-Control",
                    "private, no-cache"
                );


                return res
                    .status(304)
                    .end();

            }


            if (
                result.statusCode !==
                200
            ) {

                return res
                    .status(404)
                    .json({
                        message:
                            "Immagine non trovata"
                    });

            }


            res.setHeader(

                "Content-Type",

                result.blob.contentType ||
                    "application/octet-stream"

            );


            res.setHeader(
                "X-Content-Type-Options",
                "nosniff"
            );


            res.setHeader(
                "Cache-Control",
                "private, no-cache"
            );


            if (
                result.blob.etag
            ) {

                res.setHeader(
                    "ETag",
                    result.blob.etag
                );

            }


            const nodeStream =
                Readable.fromWeb(
                    result.stream
                );


            nodeStream.on(

                "error",

                (error) => {

                    console.error(
                        "Errore stream Blob immagine:",
                        error
                    );


                    if (
                        !res.headersSent
                    ) {

                        res
                            .status(500)
                            .end();

                    } else {

                        res.end();

                    }

                }

            );


            return nodeStream.pipe(
                res
            );


        } catch (error) {

            console.error(
                "Errore lettura immagine profilo:",
                error
            );


            return res
                .status(500)
                .json({
                    message:
                        "Errore lettura immagine profilo"
                });

        }

    };


// ======================================================
// ALLEGATI OPERATORE
// VERCEL BLOB PRIVATE
// ======================================================

const creaUploadAllegati = () => {

    return multer({

        storage:
            multer.memoryStorage(),

        limits: {
            fileSize:
                4 * 1024 * 1024
        }

    });

};


const uploadAllegatiMiddleware =
    creaUploadAllegati()
        .single("file");


// ======================================================
// UPLOAD ALLEGATO
// ======================================================

const uploadAllegati =
    async (req, res) => {

        try {

            const { idOperatore } =
                req.params;

            const { nomeFileAllegato } =
                req.body;


            if (!req.file) {

                return res
                    .status(400)
                    .json({
                        message:
                            "File mancante"
                    });

            }


            if (!nomeFileAllegato) {

                return res
                    .status(400)
                    .json({
                        message:
                            "Tipo allegato mancante"
                    });

            }


            let extension =
                path.extname(
                    req.file.originalname
                ).toLowerCase();


            /*
             * Se manca l'estensione,
             * la ricaviamo dal MIME.
             */

            if (!extension) {

                switch (
                    req.file.mimetype
                ) {

                    case "image/jpeg":

                        extension = ".jpg";
                        break;


                    case "image/png":

                        extension = ".png";
                        break;


                    case "image/webp":

                        extension = ".webp";
                        break;


                    case "application/pdf":

                        extension = ".pdf";
                        break;


                    default:

                        extension = "";

                }

            }


            const fileName =
                `${nomeFileAllegato}${extension}`;


            const pathname =
                `operatori/${idOperatore}/allegati/${fileName}`;


            console.log(
                "Upload allegato Blob:",
                pathname
            );


            const blob =
                await put(

                    pathname,

                    req.file.buffer,

                    {

                        access:
                            "private",

                        contentType:
                            req.file.mimetype,

                        allowOverwrite:
                            true

                    }

                );


            console.log(
                "Allegato Blob creato:",
                blob.pathname
            );


            /*
             * Manteniamo il database compatibile
             * con il frontend e i service attuali.
             *
             * Nel DB continuiamo a salvare:
             *
             * carta_identita_img_fronte.jpg
             *
             * Il pathname Blob viene ricostruito
             * quando serve.
             */


            const esiste =
                await allegatiOpeartoreServices
                    .verificaPresenzaDatiAllegati(
                        idOperatore
                    );


            if (esiste) {

                await allegatiOpeartoreServices
                    .aggiornaFileAllegati(

                        nomeFileAllegato,

                        extension,

                        idOperatore

                    );

            } else {

                await allegatiOpeartoreServices
                    .inserisciFileAllegati(

                        nomeFileAllegato,

                        extension,

                        idOperatore

                    );

            }


            return res
                .status(200)
                .json({

                    message:
                        "Upload completato",

                    idOperatore,

                    fileName,

                    pathname:
                        blob.pathname

                });


        } catch (error) {

            console.error(
                "Errore upload allegato:",
                error
            );


            return res
                .status(500)
                .json({
                    message:
                        "Errore upload allegato"
                });

        }

    };


// ======================================================
// DOWNLOAD ALLEGATO
// VERCEL BLOB PRIVATE
// ======================================================

const downloadAllegato =
    async (req, res) => {

        try {

            const { idOperatore } =
                req.params;

            const { tipoAllegato } =
                req.query;


            console.log(
                "Download allegato:",
                idOperatore,
                tipoAllegato
            );


            if (!tipoAllegato) {

                return res
                    .status(400)
                    .json({
                        message:
                            "tipoAllegato mancante"
                    });

            }


            const nomeFile =
                await allegatiOpeartoreServices
                    .ottieniNomeFileAllegato(

                        idOperatore,

                        tipoAllegato

                    );


            if (!nomeFile) {

                return res
                    .status(404)
                    .json({
                        message:
                            "File non trovato"
                    });

            }


            const pathname =
                `operatori/${idOperatore}/allegati/${nomeFile}`;


            console.log(
                "Download allegato Blob:",
                pathname
            );


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
                result.statusCode !==
                    200
            ) {

                return res
                    .status(404)
                    .json({
                        message:
                            "File non trovato"
                    });

            }


            res.setHeader(

                "Content-Type",

                result.blob.contentType ||
                    "application/octet-stream"

            );


            /*
             * Manteniamo attachment perché
             * il frontend attuale usa questa
             * route per scaricare il documento.
             */

            res.setHeader(

                "Content-Disposition",

                `attachment; filename="${nomeFile}"`

            );


            res.setHeader(
                "X-Content-Type-Options",
                "nosniff"
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

                (error) => {

                    console.error(
                        "Errore stream allegato:",
                        error
                    );


                    if (
                        !res.headersSent
                    ) {

                        res
                            .status(500)
                            .end();

                    } else {

                        res.end();

                    }

                }

            );


            return nodeStream.pipe(
                res
            );


        } catch (error) {

            console.error(
                "Errore download allegato:",
                error
            );


            return res
                .status(500)
                .json({
                    message:
                        "Errore download allegato"
                });

        }

    };


// ======================================================
// ELIMINA ALLEGATO
// VERCEL BLOB PRIVATE
// ======================================================

const eliminaAllegato =
    async (req, res) => {

        try {

            const { idOperatore } =
                req.params;

            const { tipoAllegato } =
                req.query;


            console.log(
                "Elimina allegato:",
                idOperatore,
                tipoAllegato
            );


            if (!tipoAllegato) {

                return res
                    .status(400)
                    .json({
                        message:
                            "tipoAllegato mancante"
                    });

            }


            const nomeFile =
                await allegatiOpeartoreServices
                    .ottieniNomeFileAllegato(

                        idOperatore,

                        tipoAllegato

                    );


            if (!nomeFile) {

                return res
                    .status(404)
                    .json({
                        message:
                            "File non trovato"
                    });

            }


            const pathname =
                `operatori/${idOperatore}/allegati/${nomeFile}`;


            console.log(
                "Eliminazione Blob:",
                pathname
            );


            /*
             * Prima eliminiamo il file
             * dallo storage.
             */

            await del(
                pathname
            );


            /*
             * Poi azzeriamo la relativa
             * colonna nel DB.
             */

            await allegatiOpeartoreServices
                .eliminaFileAllegato(

                    idOperatore,

                    tipoAllegato

                );


            return res
                .status(200)
                .json({
                    message:
                        "File eliminato con successo"
                });


        } catch (error) {

            console.error(
                "Errore eliminazione allegato:",
                error
            );


            return res
                .status(500)
                .json({
                    message:
                        "Errore eliminazione file"
                });

        }

    };


// ======================================================
// EXPORT
// ======================================================

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

};
