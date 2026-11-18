// ============================================================
// server.js — Lians Travel Project
// Frontend dipisah ke ../frontend (di root proyek)
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- PATH HELPER ----------
// Frontend sekarang ada di root proyek: ../frontend
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- STATIC FRONTEND ----------
// Semua asset (CSS, JS, gambar) dilayani dari ../frontend
app.use(express.static(FRONTEND_DIR));

// ============================================================
// ROUTES API (TIDAK BERUBAH — sama persis seperti sebelumnya)
// ============================================================
app.use('/api/bookings', require('./src/routes/bookingRoutes'));
app.use('/api/vehicles', require('./src/routes/vehicleRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));

// Health check (opsional, untuk memastikan server hidup)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================================
// HALAMAN (HTML)
// ============================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'register.html'));
});

// ============================================================
// 404 HANDLER
// ============================================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`📁 Frontend dilayani dari: ${FRONTEND_DIR}`);
  console.log(`📱 Customer: http://localhost:${PORT}/`);
  console.log(`🔐 Login:    http://localhost:${PORT}/login`);
  console.log(`📝 Register: http://localhost:${PORT}/register`);
  console.log(`📊 Admin:    http://localhost:${PORT}/admin`);
});