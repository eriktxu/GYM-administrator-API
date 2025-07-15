const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/cliente/client.controller');
const verifyToken = require('../../middleware/verifyToken');

router.get('/conClientes', clienteController.getCliente);
router.get('/conSuscripciones', clienteController.getSuscripciones);
router.post('/regisCliente', clienteController.registrarCliente);

module.exports = router;

