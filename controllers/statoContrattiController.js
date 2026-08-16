const db = require('../db');

const TIPOLOGIE_CONTRATTO_LAVORO = [
    'CHIAMATA',
    'OCCASIONALE',
    'TEMPO_DETERMINATO',
    'TEMPO_INDETERMINATO'
];

const getStatoContrattiOperatori = async (req, res) => {
    try {
        const placeholders = TIPOLOGIE_CONTRATTO_LAVORO.map(() => '?').join(', ');

        const query = `
            SELECT
                d.id AS idOperatore,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM contratto c
                        WHERE c.idOperatore = d.id
                          AND c.tipologia IN (${placeholders})
                          AND c.data_inizio IS NOT NULL
                          AND c.data_fine IS NOT NULL
                          AND CURDATE() BETWEEN DATE(c.data_inizio) AND DATE(c.data_fine)
                    ) THEN 'REGOLARE'
                    WHEN EXISTS (
                        SELECT 1
                        FROM contratto c
                        WHERE c.idOperatore = d.id
                          AND c.tipologia IN (${placeholders})
                    ) THEN 'SCADUTO'
                    ELSE 'ASSENTE'
                END AS statoContratto
            FROM dipendenti d
            WHERE d.ruolo = 'OPERATORE'
            ORDER BY d.cognome ASC
        `;

        const params = [
            ...TIPOLOGIE_CONTRATTO_LAVORO,
            ...TIPOLOGIE_CONTRATTO_LAVORO
        ];

        const [rows] = await db.query(query, params);
        res.send(rows);
    } catch (error) {
        console.error('Errore caricamento stato contratti operatori:', error);
        res.status(500).json({
            message: 'Errore nel caricamento dello stato contrattuale degli operatori'
        });
    }
};

module.exports = {
    getStatoContrattiOperatori
};
