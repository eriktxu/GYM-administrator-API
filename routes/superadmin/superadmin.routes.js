const express = require('express');
const router = express.Router();
const superadminController = require('../../controllers/superadmin/superadmin.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/verifyToken');

router.post('/registerGimnasio', superadminController.registerGimnasio);
router.post('/login', superadminController.login);


module.exports = router;