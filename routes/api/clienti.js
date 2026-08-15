const express = require('express');
const router = express.Router();

const clientiController = require('../../controllers/clientiController');

router.route('/')
    .get(clientiController.getClienti)
    .post(clientiController.creaNuovoUtente);

router.route('/:idCliente')
    .put(clientiController.aggiornaCliente);

router.route('/disabilita/:selectedClientId')
    .patch(clientiController.disabilitaCliente);

router.route('/referente')
    .post(clientiController.creaReferente);

router.route('/referenti/:selectedClientId')
    .get(clientiController.getReferentiCliente)

router.route('/referente/:idReferente')
    .put(clientiController.aggiornaReferente)

router.route('/referente/disabilita/:idReferente')
    .patch(clientiController.disabilitaReferente);

router.route('/brand')
    .post(clientiController.creaBrand);

router.route('/brands/:selectedClientId')
    .get(clientiController.getBrandsCliente)

router.route('/brand/disabilita/:idBrand')
    .patch(clientiController.disabilitaBrand);

router.route('/brand/:idBrand')
    .put(clientiController.aggiornaBrand)

router.route('/brand/indirizzo')
    .post(clientiController.creaIndirizzoBrand);

router.route('/brand/indirizzo/disabilita/:idIndirizzo')
    .patch(clientiController.disabilitaIndirizzo);

module.exports = router;    