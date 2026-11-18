require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== ROUTES API =====
app.use('/api/bookings', require('./src/routes/bookingRoutes'));
app.use('/api/vehicles', require('./src/routes/vehicleRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));

// ===== HALAMAN =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// ===== 404 =====
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// ===== START =====
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📱 Customer: http://localhost:${PORT}/`);
    console.log(`🔐 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Register: http://localhost:${PORT}/register`);
    console.log(`📊 Admin: http://localhost:${PORT}/admin`);
});