const express = require('express');
const router = express.Router();

const payrollController = require('../../controllers/payrollController')
const payrollServices = require('../../services/payrollServices')

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

router.route('/approvaRendicontazione/:idPayroll')
    .patch(async (req, res, next) => {
        try {
            const affectedRows = await payrollServices.aggiornaStatoPayroll('APPROVATO', req.params.idPayroll);

            if (!affectedRows) {
                return res.status(404).send({ message: 'Rendicontazione non trovata.' });
            }

            return res.status(200).send({ message: 'Rendicontazione approvata.' });
        } catch (error) {
            return next(error);
        }
    });

module.exports = router;
