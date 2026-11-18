const express = require('express');
const router = express.Router();
const controller = require('../controllers/vehicleController');

router.get('/', controller.getAllVehicles);

module.exports = router;