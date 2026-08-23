const db = require('../db');

const getAttestatiOperatori = async (req, res) => {
    try {
        const query = `
            SELECT
                idOperatore,
                MAX(CASE
                    WHEN COALESCE(antincendio_doc_fronte, '') <> ''
                      OR COALESCE(antincendio_doc_retro, '') <> ''
                    THEN 1 ELSE 0
                END) AS antincendioPresente,
                DATE_FORMAT(MAX(antincendio_data_conseguimento), '%Y-%m-%d') AS antincendioDataScadenza,

                MAX(CASE
                    WHEN COALESCE(primo_soccorso_attestato_fronte, '') <> ''
                      OR COALESCE(primo_soccorso_attestato_retro, '') <> ''
                    THEN 1 ELSE 0
                END) AS primoSoccorsoPresente,
                DATE_FORMAT(MAX(primo_soccorso_data_conseguimento), '%Y-%m-%d') AS primoSoccorsoDataScadenza,

                MAX(CASE
                    WHEN COALESCE(formazione_sicurezza_lavoro_attestato_fronte, '') <> ''
                      OR COALESCE(formazione_sicurezza_lavoro_attestato_retro, '') <> ''
                    THEN 1 ELSE 0
                END) AS sicurezzaLavoroPresente,
                DATE_FORMAT(MAX(formazione_sicurezza_lavoro_data_conseguimento), '%Y-%m-%d') AS sicurezzaLavoroDataScadenza,

                MAX(CASE
                    WHEN COALESCE(blsd_attestato_fronte, '') <> ''
                      OR COALESCE(blsd_attestato_retro, '') <> ''
                    THEN 1 ELSE 0
                END) AS blsdPresente,
                DATE_FORMAT(MAX(blsd_data_conseguimento), '%Y-%m-%d') AS blsdDataScadenza
            FROM allegati
            GROUP BY idOperatore
        `;

        const [records] = await db.query(query);
        return res.send(records);
    } catch (error) {
        console.error('Errore caricamento attestati operatori:', error);
        return res.status(500).json({
            message: 'Errore durante il caricamento degli attestati operatori'
        });
    }
};

module.exports = {
    getAttestatiOperatori,
};
