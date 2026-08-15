const db = require('../db');

const TIPOLOGIE_AMMESSE = new Set([
    'TEMPO_INDETERMINATO',
    'TEMPO_DETERMINATO'
]);

const creaContrattoManuale = async (req, res) => {
    try {
        const { idOperatore, tipologia, dataInizio, dataFine } = req.body;

        if (!idOperatore || !TIPOLOGIE_AMMESSE.has(tipologia)) {
            return res.status(400).json({ message: 'Tipologia contratto non valida.' });
        }

        if (!dataInizio || !dataFine) {
            return res.status(400).json({ message: 'Data inizio e data fine sono obbligatorie.' });
        }

        if (new Date(dataFine) < new Date(dataInizio)) {
            return res.status(400).json({ message: 'La data fine non può precedere la data inizio.' });
        }

        const [result] = await db.query(
            `INSERT INTO contratto (idOperatore, tipologia, data_inizio, data_fine)
             VALUES (?, ?, ?, ?)`,
            [idOperatore, tipologia, dataInizio, dataFine]
        );

        return res.status(201).json({
            idContratto: result.insertId,
            message: 'Contratto creato. Ora è possibile caricare il contratto firmato.'
        });
    } catch (error) {
        console.error('Errore creazione contratto manuale:', error);
        return res.status(500).json({ message: 'Errore durante la creazione del contratto.' });
    }
};

module.exports = { creaContrattoManuale };
