const bookingModel = require('../models/bookingModel');

async function getAllBookings(req, res) {
    try {
        const data = await bookingModel.getAllBookings();
        res.json({ success: true, data, total: data.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getBookingById(req, res) {
    try {
        const data = await bookingModel.getBookingById(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function createBooking(req, res) {
    try {
        const data = req.body;

        if (!data.fullname || !data.phone || !data.vehicle_id || !data.start_date || !data.rental_days) {
            return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
        }

        const startDate = new Date(data.start_date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Number(data.rental_days));
        data.end_date = endDate.toISOString().split('T')[0];

        const vehicle = await bookingModel.getVehicleById(data.vehicle_id);
        if (vehicle) {
            data.vehicle_name = vehicle.vehicle_name;
            data.vehicle_price_per_day = vehicle.price_per_day;
            
            // Jika Rentuner, gunakan Harga Manual & Auto Confirm
            if (data.is_rentuner && data.manual_price) {
                data.estimated_total = Number(data.manual_price);
                data.status = 'confirmed';
            } else {
                data.estimated_total = Number(vehicle.price_per_day) * Number(data.rental_days);
            }
        }

        const allAvailability = await bookingModel.checkAvailability(data.vehicle_id, data.start_date, data.end_date);
        const confirmedBookings = allAvailability.filter(b => b.status === 'confirmed' || b.status === 'completed');
        const stock = vehicle ? vehicle.stock : 5;

        if (confirmedBookings.length >= stock) {
            return res.status(409).json({ success: false, message: `Kendaraan sudah penuh (${stock} unit habis)` });
        }

        const result = await bookingModel.createBooking(data);
        res.status(201).json({ success: true, message: 'Booking berhasil', data: result });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

async function updateBookingStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatus = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ success: false, message: 'Status tidak valid' });
        }
        const data = await bookingModel.updateBookingStatus(id, status);
        if (!data) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
        res.json({ success: true, message: 'Status diubah', data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function updateBookingDetail(req, res) {
    try {
        const { id } = req.params;
        const { unit_number, driver_name, driver_phone } = req.body;
        const data = await bookingModel.updateBookingDetail(id, { unit_number, driver_name, driver_phone });
        if (!data) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
        res.json({ success: true, message: 'Data berhasil diperbarui', data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function deleteBooking(req, res) {
    try {
        const { id } = req.params;
        await bookingModel.deleteBookingHistory(id);
        const data = await bookingModel.deleteBooking(id);
        if (!data) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
        res.json({ success: true, message: 'Booking dihapus', data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getBookingsByPhone(req, res) {
    try {
        const data = await bookingModel.getBookingsByPhone(req.params.phone);
        res.json({ success: true, data, total: data.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getMonthlyStats(req, res) {
    try {
        const data = await bookingModel.getMonthlyStats();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getRentunerBookings(req, res) {
    try {
        const data = await bookingModel.getRentunerBookings();
        res.json({ success: true, data, total: data.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getDPBookings(req, res) {
    try {
        const data = await bookingModel.getDPBookings();
        res.json({ success: true, data, total: data.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    getAllBookings,
    getBookingById,
    createBooking,
    updateBookingStatus,
    updateBookingDetail,
    deleteBooking,
    getBookingsByPhone,
    getMonthlyStats,
    getRentunerBookings,
    getDPBookings
};
