const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");
const { put, get } = require("@vercel/blob");
const { Readable } = require("node:stream");

const operatoreServices = require('../services/operatoreServices');
const allegatiOpeartoreServices = require('../services/allegatiOpeartoreServices');


// ======================================================
// CONTRATTI
// ======================================================

const creaUploadContratti = () => {

    const storage = multer.diskStorage({

        destination: async (req, file, cb) => {

            const { idContratto } = req.params;

            console.log(
                "idContratto destination: " + idContratto
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

            cb(null, operatoreDir);
        },

        filename: async (req, file, cb) => {

            const { idContratto } = req.params;
            const { tipoContratto } = req.body;

            console.log(
                "idContratto filename: " + idContratto
            );

            const pathContratto =
                await operatoreServices.getPathContratto(
                    idContratto
                );

            const fileName = path.basename(
                pathContratto
            );

            const parsed = path.parse(fileName);

            let suffix = "";

            console.log(
                "tipoContratto filename: " +
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

            cb(null, newFileName);
        }

    });

    return multer({
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024
        }
    });

};


const uploadContrattoMiddleware =
    creaUploadContratti().single("file");


const uploadContratto = async (req, res) => {

    const { idContratto } = req.params;
    const { tipoContratto } = req.body;

    if (!req.file) {

        return res.status(400).json({
            message: "File mancante"
        });

    }

    console.log(
        "req.file.filename uploadContratto: " +
        req.file.filename
    );

    console.log(
        "req.file.path uploadContratto: " +
        req.file.path
    );

    console.log(
        "req.body.tipoContratto: " +
        tipoContratto
    );

    await operatoreServices
        .aggiornaPathContrattoFirmato(
            req.file.path,
            idContratto,
            tipoContratto
        );

    try {

        return res.status(200).json({
            message: "Upload completato",
            idContratto,
            fileName: req.file.filename,
            path: req.file.path
        });

    } catch (error) {

        return res.status(500).json({
            message: "Errore upload contratto"
        });

    }

};


// ======================================================
// IMMAGINI PROFILO
// VERCEL BLOB PRIVATE
// ======================================================

const creaUploadImmagineProfilo = () => {

    return multer({

        storage: multer.memoryStorage(),

        limits: {
            fileSize: 4 * 1024 * 1024
        },

        fileFilter: (req, file, cb) => {

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

            cb(null, true);
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


            /*
             * Se il browser invia un file
             * senza estensione valida,
             * la ricaviamo dal MIME type.
             */

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


            const blob = await put(
                pathname,
                req.file.buffer,
                {
                    access: "private",

                    contentType:
                        req.file.mimetype,

                    allowOverwrite: true
                }
            );


            console.log(
                "Blob creato:",
                blob.pathname
            );


            /*
             * Nel DB salviamo il pathname
             * del Blob.
             *
             * Esempio:
             *
             * operatori/12/profilo/primoPiano.jpg
             */

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


            const result = await get(
                pathname,
                {
                    access: "private",

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


            /*
             * Browser cache
             */

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


            if (result.blob.etag) {

                res.setHeader(
                    "ETag",
                    result.blob.etag
                );

            }


            /*
             * Vercel Blob restituisce
             * una Web ReadableStream.
             *
             * Express utilizza invece
             * una Node Readable stream.
             */

            const nodeStream =
                Readable.fromWeb(
                    result.stream
                );


            nodeStream.on(
                "error",
                (error) => {

                    console.error(
                        "Errore stream Blob:",
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
// ALLEGATI
// PER ORA RESTANO SU FILESYSTEM
// ======================================================

const creaUploadAllegati = () => {

    const storage =
        multer.diskStorage({

            destination:
                async (
                    req,
                    file,
                    cb
                ) => {

                    const {
                        idOperatore
                    } = req.params;


                    const baseDir =
                        path.join(
                            process.env
                                .HOME_CONTRATTI,
                            "output",
                            "allegati"
                        );


                    const operatoreDir =
                        path.join(
                            baseDir,
                            `operatore_${idOperatore}`
                        );


                    if (
                        !fs.existsSync(
                            operatoreDir
                        )
                    ) {

                        fs.mkdirSync(
                            operatoreDir,
                            {
                                recursive:
                                    true
                            }
                        );

                    }


                    cb(
                        null,
                        operatoreDir
                    );

                },


            filename:
                async (
                    req,
                    file,
                    cb
                ) => {

                    const originalName =
                        file.originalname;

                    const extension =
                        path.extname(
                            originalName
                        );

                    console.log(
                        "extension: " +
                        extension
                    );


                    const newFileName =
                        `allegato${extension}`;


                    cb(
                        null,
                        newFileName
                    );

                }

        });


    return multer({

        storage,

        limits: {
            fileSize:
                10 *
                1024 *
                1024
        }

    });

};


const uploadAllegatiMiddleware =
    creaUploadAllegati()
        .single("file");


const uploadAllegati =
    async (req, res) => {

        const {
            idOperatore
        } = req.params;

        const {
            nomeFileAllegato
        } = req.body;


        if (!req.file) {

            return res
                .status(400)
                .json({
                    message:
                        "File mancante"
                });

        }


        console.log(
            "req.file.filename uploadContratto: " +
            req.file.filename
        );

        console.log(
            "req.file.path uploadContratto: " +
            req.file.path
        );


        const oldPath =
            req.file.path;

        const extension =
            path.extname(
                req.file.originalname
            );

        const newFileName =
            `${nomeFileAllegato}${extension}`;

        const newPath =
            path.join(
                path.dirname(
                    oldPath
                ),
                newFileName
            );


        fs.renameSync(
            oldPath,
            newPath
        );


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


        try {

            return res
                .status(200)
                .json({

                    message:
                        "Upload completato",

                    idOperatore,

                    fileName:
                        req.file.filename,

                    path:
                        req.file.path

                });

        } catch (error) {

            return res
                .status(500)
                .json({
                    message:
                        "Errore upload contratto"
                });

        }

    };


// ======================================================
// DOWNLOAD ALLEGATO
// ======================================================

const downloadAllegato =
    async (req, res) => {

        try {

            const {
                idOperatore
            } = req.params;

            const {
                tipoAllegato
            } = req.query;


            console.log(
                "downloadAllegato - idOperatore:",
                idOperatore
            );

            console.log(
                "tipoAllegato: " +
                tipoAllegato
            );


            const nomeFile =
                await allegatiOpeartoreServices
                    .ottieniNomeFileAllegato(
                        idOperatore,
                        tipoAllegato
                    );


            const baseDir =
                path.join(
                    process.env
                        .HOME_CONTRATTI,
                    "output",
                    "allegati"
                );


            const operatoreDir =
                path.join(
                    baseDir,
                    `operatore_${idOperatore}`
                );


            console.log(
                "operatoreDir: " +
                operatoreDir
            );


            const filePathCompleto =
                path.join(
                    operatoreDir,
                    nomeFile
                );


            console.log(
                "filePathCompleto: " +
                filePathCompleto
            );


            return downloadFile(
                res,
                filePathCompleto,
                nomeFile
            );


        } catch (error) {

            console.error(
                "Errore download contratto firmato:",
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


// ======================================================
// ELIMINA ALLEGATO
// ======================================================

const eliminaAllegato =
    async (req, res) => {

        try {

            const {
                idOperatore
            } = req.params;

            const {
                tipoAllegato
            } = req.query;


            console.log(
                "eliminaAllegato - idOperatore:",
                idOperatore
            );

            console.log(
                "tipoAllegato: " +
                tipoAllegato
            );


            const nomeFile =
                await allegatiOpeartoreServices
                    .ottieniNomeFileAllegato(
                        idOperatore,
                        tipoAllegato
                    );


            const baseDir =
                path.join(
                    process.env
                        .HOME_CONTRATTI,
                    "output",
                    "allegati"
                );


            const operatoreDir =
                path.join(
                    baseDir,
                    `operatore_${idOperatore}`
                );


            console.log(
                "operatoreDir: " +
                operatoreDir
            );


            const filePathCompleto =
                path.join(
                    operatoreDir,
                    nomeFile
                );


            console.log(
                "filePathCompleto: " +
                filePathCompleto
            );


            try {

                await fsPromises.access(
                    filePathCompleto
                );

            } catch {

                return res
                    .status(404)
                    .json({
                        message:
                            "File non esistente"
                    });

            }


            await fsPromises.unlink(
                filePathCompleto
            );


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
                "Errore eliminazione documento:",
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
// DOWNLOAD FILE LOCALE
// ======================================================

const downloadFile =
    async (
        res,
        filePath,
        nomeFile
    ) => {

        if (!filePath) {

            return res
                .status(404)
                .json({
                    message:
                        "File non trovato"
                });

        }


        const resolvedPath =
            path.resolve(
                filePath
            );


        console.log(
            "REAL PATH:",
            resolvedPath
        );


        if (
            !fs.existsSync(
                resolvedPath
            )
        ) {

            return res
                .status(404)
                .json({
                    message:
                        "File non trovato"
                });

        }


        return res.download(
            resolvedPath,
            nomeFile,
            (err) => {

                if (err) {

                    console.error(
                        "Errore durante il download:",
                        err
                    );


                    if (
                        !res.headersSent
                    ) {

                        return res
                            .status(500)
                            .json({
                                message:
                                    "Errore durante il download del file"
                            });

                    }

                }

            }
        );

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
