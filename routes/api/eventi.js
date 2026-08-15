const express = require('express');
const router = express.Router();

const eventiController = require('../../controllers/eventiController');

router.route('/')
    .get(eventiController.getEventi)
    .post(eventiController.creaNuovoEvento);

router.route('/turni')
    .get(eventiController.getTurniEventi);

router.route('/dettaglioSingolo/:idEvento')
    .patch(eventiController.aggiornaEvento);


router.route('/modificaNomeEvento/:idEvento')
    .patch(eventiController.modificaNomeEvento);

router.route('/creaReportTurni')
    .get(eventiController.creaReportTurni);

module.exports = router;

