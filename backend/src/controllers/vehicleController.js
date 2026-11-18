const vehicleModel = require('../models/vehicleModel');

async function getAllVehicles(req, res) {
    try {
        const data = await vehicleModel.getAllVehicles();
        res.json({ success: true, data, total: data.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { getAllVehicles };