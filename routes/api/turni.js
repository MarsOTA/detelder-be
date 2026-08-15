const express = require('express');
const router = express.Router();
const turniOperatoreController = require('../../controllers/turniOperatoreController');

router.route('/')
    .post(turniOperatoreController.creaTurnoOperatore)
    .get(turniOperatoreController.getListaTurni);

router.route('/copiaTurni')
    .post(turniOperatoreController.copiaTurniSelezionati)


router.route('/turniOperatore/:idOperatore')
    .get(turniOperatoreController.getListaTurniOperatore);

router.route('/turniEvento/:idEvento')
    .get(turniOperatoreController.getEventoETurni);

router.route('/turniGiornalieri/:idOperatore')
    .get(turniOperatoreController.getTurniCombinati);

router.route('/turniFuturi/:idOperatore')
    .get(turniOperatoreController.getTurniFuturiOperatore);

router.route('/:idTurno')
    .delete(turniOperatoreController.concellaTurno)
//  .patch(turniOperatoreController.reinviaNotificaTurno);

router.route('/aggiornaNota/:idTurno')
    .put(turniOperatoreController.aggiornaNotaTurno);

router.route('/aggiornaTurniPerData/batch')
    .patch(turniOperatoreController.aggiornaTurniPerData);

router.route('/notificaTurno/invio')
    .patch(turniOperatoreController.reinviaNotificaTurno);

router.route('/duplicaRiga/:idTurno')
    .patch(turniOperatoreController.duplicaRiga);

module.exports = router;