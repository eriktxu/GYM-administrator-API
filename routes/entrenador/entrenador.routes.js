const express = require('express');
const router = express.Router();
const entrenadorController = require('../../controllers/entrenador/entrenador.controller');

router.post('/registerEntrenador', entrenadorController.registerEntrenador);

module.exports = router;