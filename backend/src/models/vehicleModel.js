const { query } = require('../config/database');

async function getAllVehicles() {
    const sql = `SELECT * FROM tb_vehicles ORDER BY vehicle_id`;
    const result = await query(sql);
    return result.rows;
}

module.exports = { getAllVehicles };