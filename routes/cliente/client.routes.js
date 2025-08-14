const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/cliente/client.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/verifyToken');

router.get('/conClientes',verifyToken, authorizeRoles(2),  clienteController.getCliente);
router.get('/conSuscripciones', verifyToken, authorizeRoles(2), clienteController.getSuscripciones);
router.post('/regisCliente', verifyToken, authorizeRoles(2), clienteController.registrarCliente);
router.post('/guardar',verifyToken, authorizeRoles(1), clienteController.datosCliente);
router.delete('/eliminar/:id',verifyToken, authorizeRoles(2),  clienteController.eliminarCliente);
router.put('/actualizar/:id', verifyToken, authorizeRoles(2), clienteController.actualizarCliente);
router.put('/renovar/:id', verifyToken, authorizeRoles(2),  clienteController.renovarSuscripcion);
router.get('/completos', verifyToken, authorizeRoles(1), clienteController.getCompletos);
router.get('/generarPlan/:id', verifyToken, authorizeRoles(1),clienteController.generarPlan);
router.post('/generarPlanIA/:id', verifyToken, authorizeRoles(1),clienteController.generarPlanIA);
router.get('/getProgresoCliente', verifyToken, authorizeRoles(1),clienteController.getProgresoCliente);
router.get('/getEstadoActual', verifyToken, authorizeRoles(1),clienteController.getEstadoActual);

module.exports = router;

