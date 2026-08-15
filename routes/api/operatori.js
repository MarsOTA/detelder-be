const express = require('express');
const router = express.Router();
const operatoriController = require('../../controllers/operatoriController');
const contractPdfController = require('../../controllers/contractPdfController');

router.route('/')
    .get(operatoriController.getOperatori)
    .post(operatoriController.creaNuovoOperatore);

router.route('/ricercaDipendenti')
    .get(operatoriController.ricercaDipendenti);

router.route('/checkInCheckOut/:idOperatore')
    .post(operatoriController.creaCheckInCheckOut)
    .get(operatoriController.getCheckInCheckOut);

router.route('/richiediMotivazioneTimbratura/:idOperatore')
    .get(operatoriController.richiediMotivazioneTimbratura);    

router.route('/reinviaPassword/:idOperatore')
    .patch(operatoriController.reinviaPassword);    

router.route('/ottieniPresenzeGenerale')
    .get(operatoriController.getPresenzeTuttiOperatori);

router.route('/recuperoTimbratura')
    .post(operatoriController.recuperoTimbratura)
    .patch(operatoriController.aggiornaTimbratura);

router.route('/eliminaTimbratura/:idTimbratura')
    .delete(operatoriController.concellaTimbratura);


router.route('/statoCheck/:idOperatore')
    .get(operatoriController.getStatoCheck);

router.route('/:id')
    .get(operatoriController.ottieniOperatore)
    .delete(operatoriController.concellaOperatore);

router.route('/ottieniOperatore/:id')
    .get(operatoriController.ottieniOperatore);

router.route('/modificaOperatore/:id')
    .patch(operatoriController.aggiornaOperatore);

router.route('/modificaNascitaResidenzaOperatore/:id')
    .patch(operatoriController.aggiornaNascitaResidenzaOperatore);

router.route('/aggiornaDatiGenerici/:id')
    .patch(operatoriController.aggiornaDatiGenericiOperatore);

router.route('/aggiornaHeaderOperatore/:id')
    .patch(operatoriController.aggiornaHeaderOperatore);

router.route('/aggiornaAllegatiOperatore/:id')
    .patch(operatoriController.aggiornaAllegatiOperatore);

router.route('/allegatiOperatore/:id')
    .get(operatoriController.ottieniAllegatiOperatore);

router.route('/stato/:id')
    .patch(operatoriController.aggiornaStatoOperatore);

router.route('/generate-pdf')
    .post(operatoriController.generaPdf);

router.route('/creaContratto')
    .post(contractPdfController.creaContratto);

router.route('/listaContrattiOperatore/:idOperatore')
    .get(operatoriController.listaContrattiOperatore);

router.route('/cancellaTuttiContratti/:idContratto')
    .delete(operatoriController.concellaTuttiContratti);

router.route('/cancellaSingoloContratto/:idContratto')
    .delete(operatoriController.cancellaSingoloContratto);

router.route('/downloadContratto/:idContratto')
    .get(operatoriController.downloadContratto);


module.exports = router;