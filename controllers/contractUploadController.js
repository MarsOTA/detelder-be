const multer = require("multer");
const path = require("path");
const { put } = require("@vercel/blob");
const operatoreServices = require("../services/operatoreServices");

const uploadContrattoMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 4 * 1024 * 1024
    }
}).single("file");

const uploadContratto = async (req, res) => {
    try {
        const { idContratto } = req.params;
        const { tipoContratto } = req.body;

        if (!req.file) {
            return res.status(400).json({
                message: "File mancante"
            });
        }

        if (!["contrattoFirmato", "contrattoUnilav"].includes(tipoContratto)) {
            return res.status(400).json({
                message: "Tipo contratto non valido"
            });
        }

        const idOperatore = await operatoreServices.getIdOpetarore(idContratto);

        if (!idOperatore) {
            return res.status(404).json({
                message: "Operatore del contratto non trovato"
            });
        }

        let extension = path.extname(req.file.originalname || "").toLowerCase();
        if (!extension) {
            extension = req.file.mimetype === "application/pdf" ? ".pdf" : ".bin";
        }

        const nomeLogico = tipoContratto === "contrattoFirmato"
            ? "firmato"
            : "unilav";

        const pathname = `operatori/${idOperatore}/contratti/${idContratto}/${nomeLogico}${extension}`;

        console.log("Upload contratto Blob:", pathname);

        const blob = await put(
            pathname,
            req.file.buffer,
            {
                access: "private",
                contentType: req.file.mimetype || "application/octet-stream",
                allowOverwrite: true
            }
        );

        await operatoreServices.aggiornaPathContrattoFirmato(
            blob.pathname,
            idContratto,
            tipoContratto
        );

        return res.status(200).json({
            message: "Upload completato",
            idContratto,
            tipoContratto,
            pathname: blob.pathname
        });

    } catch (error) {
        console.error("Errore upload contratto Blob:", error);

        return res.status(500).json({
            message: "Errore upload contratto"
        });
    }
};

module.exports = {
    uploadContrattoMiddleware,
    uploadContratto
};
