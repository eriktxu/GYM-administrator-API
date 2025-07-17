const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/cliente/client.controller');
const verifyToken = require('../../middleware/verifyToken');

router.get('/conClientes', verifyToken, clienteController.getCliente);
router.get('/conSuscripciones', verifyToken, clienteController.getSuscripciones);
router.post('/regisCliente', verifyToken, clienteController.registrarCliente);
router.post('/guardar', clienteController.datosCliente);
router.delete('/eliminar/:id', verifyToken, clienteController.eliminarCliente);
router.put('/actualizar/:id', verifyToken, clienteController.actualizarCliente);
router.put('/renovar/:id', verifyToken, clienteController.renovarSuscripcion);

module.exports = router;

