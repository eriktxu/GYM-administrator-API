const express = require('express');
const router = express.Router();
const superadminController = require('../../controllers/superadmin/superadmin.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/verifyToken');

router.post('/registerGimnasio', verifyToken, superadminController.registerGimnasio);
router.post('/login', superadminController.login);
router.get('/gimnasios', superadminController.getGimnasios);



module.exports = router;