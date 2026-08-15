const express = require('express');
const router = express.Router({ mergeParams: true });
const uploadController = require('../../controllers/uploadController');

router.post(
  '/contrattoFirmato/:idContratto',
  (req, res, next) => {
    console.log('CONTENT-TYPE:', req.headers['content-type']);
    next();
  },
  uploadController.uploadContrattoMiddleware,
  uploadController.uploadContratto
);

router.post(
  '/immagineProfilo/:idOperatore',
  (req, res, next) => {
    //console.log('ROUTER operatori - params:', req.params);
    console.log('CONTENT-TYPE:', req.headers['content-type']);
    next();
  },
  uploadController.uploadImmagineProfiloMiddleware,
  uploadController.uploadImmagineProfilo
);


router.post(
  '/caricaDocumentoPersonale/:idOperatore',
  (req, res, next) => {
    //console.log('ROUTER operatori - params:', req.params);
    console.log('CONTENT-TYPE:', req.headers['content-type']);
    next();
  },
  uploadController.uploadAllegatiMiddleware,
  uploadController.uploadAllegati
);


router.route('/mostraImmagineProfilo/:idOperatore')
  .get(uploadController.mostraImmagineProfilo)

router.route('/scaricaAllegato/:idOperatore')
  .get(uploadController.downloadAllegato)

router.route('/eliminaAllegato/:idOperatore')
  .delete(uploadController.eliminaAllegato)

module.exports = router;