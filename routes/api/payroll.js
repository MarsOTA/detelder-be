const express = require('express');
const router = express.Router();

const payrollController = require('../../controllers/payrollController')

router.route('/')
    .post(payrollController.salvaPayroll)
    .get(payrollController.getPayroll);
    
router.route('/:idTurno')
    .patch(payrollController.modificaPayroll)
    .delete(payrollController.eliminaPayroll);

router.route('/rendicontazione/:idOperatore')
    .get(payrollController.getRendicontazione);

router.route('/aggiornaRendicontazione/:idPayroll')
    .patch(payrollController.aggiornaRendicontazione);

module.exports = router;

