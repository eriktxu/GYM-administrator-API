const express = require('express');
const router = express.Router();
const gimnasioController = require('../../controllers/gimnasio/gimnasio.controller');
const verifyToken = require('../../middleware/verifyToken');

module.exports = router;
