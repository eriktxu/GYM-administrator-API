const express = require('express');
const router = express.Router();
const entrenadorController = require('../../controllers/entrenador/entrenador.controller');
const verifyToken = require('../../middleware/verifyToken');

router.post('/registerEntrenador', entrenadorController.registerEntrenador);
router.post('/loginEntrenador', entrenadorController.loginEntrenador);


module.exports = router;