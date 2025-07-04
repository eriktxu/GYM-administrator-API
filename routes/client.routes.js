const express = require('express');
const router = express.Router();
const clienController = require('../controllers/client.controller');

router.post('/', clienController.createClient);
router.delete('/:id', clienController.deleteClient);

module.exports = router;

