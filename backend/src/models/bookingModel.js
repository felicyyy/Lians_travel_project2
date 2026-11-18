const { query } = require('../config/database');

async function getAllBookings() {
    const sql = `
        SELECT 
            booking_id, booking_code, fullname, email, phone,
            vehicle_name, vehicle_price_per_day, start_date, end_date,
            rental_days, estimated_total, pickup_location, destination,
            is_outside_city, additional_charge, status, booking_time,
            confirmed_time, completed_time, notes, unit_number,
            driver_name, driver_phone,
            is_rentuner, partner_company, manual_price,
            dp_amount, dp_date, additional_units, additional_unit_date, admin_notes
        FROM tb_bookings
        ORDER BY booking_time DESC
    `;
    const result = await query(sql);
    return result.rows;
}

async function getBookingById(id) {
    const sql = `SELECT * FROM tb_bookings WHERE booking_id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0];
}

async function getVehicleById(id) {
    const sql = `SELECT * FROM tb_vehicles WHERE vehicle_id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0];
}

async function createBooking(data) {
    const sql = `
        INSERT INTO tb_bookings (
            fullname, email, phone, vehicle_id, vehicle_name,
            vehicle_price_per_day, start_date, end_date, rental_days,
            estimated_total, pickup_location, destination,
            is_outside_city, additional_charge, notes, status, booking_time,
            is_rentuner, partner_company, manual_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, $17, $18, $19)
        RETURNING *
    `;
    const values = [
        data.fullname, data.email || null, data.phone,
        data.vehicle_id, data.vehicle_name, data.vehicle_price_per_day,
        data.start_date, data.end_date, data.rental_days,
        data.estimated_total, data.pickup_location || '-', data.destination || '-',
        data.is_outside_city || false, data.additional_charge || 0,
        data.notes || null, data.status || 'pending',
        data.is_rentuner || false, data.partner_company || null, data.manual_price || null
    ];
    const result = await query(sql, values);
    return result.rows[0];
}

async function updateBookingStatus(id, status) {
    const sql = `UPDATE tb_bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *`;
    const result = await query(sql, [status, id]);
    return result.rows[0];
}

// ===== UPDATE DETAIL (UNIT, DRIVER, RENTUNER, DP) =====
async function updateBookingDetail(id, data) {
    const sql = `
        UPDATE tb_bookings 
        SET 
            unit_number = $1, 
            driver_name = $2, 
            driver_phone = $3,
            is_rentuner = $4,
            partner_company = $5,
            manual_price = $6,
            dp_amount = $7,
            dp_date = $8,
            additional_units = $9,
            additional_unit_date = $10,
            admin_notes = $11,
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $12
        RETURNING *
    `;
    const values = [
        data.unit_number || null,
        data.driver_name || null,
        data.driver_phone || null,
        data.is_rentuner || false,
        data.partner_company || null,
        data.manual_price || null,
        data.dp_amount || 0,
        data.dp_date || null,
        data.additional_units || 0,
        data.additional_unit_date || null,
        data.admin_notes || null,
        id
    ];
    const result = await query(sql, values);
    return result.rows[0];
}

async function deleteBookingHistory(bookingId) {
    const sql = `DELETE FROM tb_booking_history WHERE booking_id = $1`;
    const result = await query(sql, [bookingId]);
    return result.rows;
}

async function deleteBooking(id) {
    const sql = `DELETE FROM tb_bookings WHERE booking_id = $1 RETURNING *`;
    const result = await query(sql, [id]);
    return result.rows[0];
}

async function getBookingsByPhone(phone) {
    const sql = `SELECT * FROM tb_bookings WHERE phone = $1 ORDER BY booking_time DESC`;
    const result = await query(sql, [phone]);
    return result.rows;
}

async function getMonthlyStats() {
    const sql = `SELECT * FROM vw_monthly_stats`;
    const result = await query(sql);
    return result.rows;
}

async function checkAvailability(vehicleId, startDate, endDate) {
    const sql = `
        SELECT * FROM tb_bookings 
        WHERE vehicle_id = $1 
        AND status NOT IN ('cancelled')
        AND start_date <= $3 AND end_date >= $2
    `;
    const result = await query(sql, [vehicleId, startDate, endDate]);
    return result.rows;
}

// ===== GET RENTUNER BOOKINGS =====
async function getRentunerBookings() {
    const sql = `
        SELECT * FROM tb_bookings 
        WHERE is_rentuner = TRUE
        ORDER BY booking_time DESC
    `;
    const result = await query(sql);
    return result.rows;
}

// ===== GET DP BOOKINGS (untuk notifikasi) =====
async function getDPBookings() {
    const sql = `
        SELECT * FROM tb_bookings 
        WHERE dp_amount > 0 
        AND status NOT IN ('cancelled', 'completed')
        ORDER BY dp_date DESC
    `;
    const result = await query(sql);
    return result.rows;
}

module.exports = {
    getAllBookings,
    getBookingById,
    getVehicleById,
    createBooking,
    updateBookingStatus,
    updateBookingDetail,
    deleteBookingHistory,
    deleteBooking,
    getBookingsByPhone,
    getMonthlyStats,
    checkAvailability,
    getRentunerBookings,
    getDPBookings
};