const express = require('express');
const router = express.Router();
const db = require('../../db');

const eventiController = require('../../controllers/eventiController');

router.route('/')
    .get(eventiController.getEventi)
    .post(eventiController.creaNuovoEvento);

router.get('/comboEventi', async (req, res, next) => {
    try {
        const [records] = await db.query(`
            SELECT DISTINCT nomeEvento
            FROM evento
            WHERE nomeEvento IS NOT NULL
              AND TRIM(nomeEvento) <> ''
            ORDER BY nomeEvento ASC
        `);

        return res.send(records);
    } catch (error) {
        return next(error);
    }
});

router.route('/turni')
    .get(eventiController.getTurniEventi);

router.route('/dettaglioSingolo/:idEvento')
    .patch(eventiController.aggiornaEvento);


router.route('/modificaNomeEvento/:idEvento')
    .patch(eventiController.modificaNomeEvento);

router.route('/creaReportTurni')
    .get(eventiController.creaReportTurni);

module.exports = router;

