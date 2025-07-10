const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/cliente/client.controller');
const verifyToken = require('../../middleware/verifyToken');

router.get('/conClientes', verifyToken, clienteController.getCliente);
router.get('/conSuscripciones', verifyToken, clienteController.getSuscripciones);

module.exports = router;

