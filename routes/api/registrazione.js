const express = require('express');
const router = express.Router();
const registrazioneController = require('../../controllers/registrazioneController');
   
router.route('/login').post(registrazioneController.login); 
router.route('/logout').post(registrazioneController.logout); 
router.route('/checkAuth').get(registrazioneController.checkAuth);  

module.exports = router;