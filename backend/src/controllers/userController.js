const userModel = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

async function login(req, res) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Harap isi username dan password' });
        }

        const user = await userModel.verifyPassword(username, password);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }

        if (!user.is_active) {
            return res.status(403).json({ success: false, message: 'Akun tidak aktif' });
        }

        await userModel.updateLastLogin(user.user_id);

        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, role: user.role, fullname: user.fullname },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                token,
                user: {
                    user_id: user.user_id,
                    username: user.username,
                    email: user.email,
                    fullname: user.fullname,
                    phone: user.phone,
                    role: user.role
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function register(req, res) {
    try {
        const { username, password, email, fullname, phone } = req.body;
        if (!username || !password || !fullname) {
            return res.status(400).json({ success: false, message: 'Username, password, dan nama lengkap wajib diisi' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
        }

        const existingUser = await userModel.getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Username sudah terdaftar' });
        }

        if (email) {
            const existingEmail = await userModel.getUserByEmail(email);
            if (existingEmail) {
                return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
            }
        }

        const user = await userModel.createUser({ username, password, email, fullname, phone, role: 'customer' });
        res.status(201).json({ success: true, message: 'Registrasi berhasil', data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getProfile(req, res) {
    try {
        const user = await userModel.getUserById(req.user.user_id);
        if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function changePassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.user_id;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter' });
        }

        const user = await userModel.getUserByUsername(req.user.username);
        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid) return res.status(401).json({ success: false, message: 'Password lama salah' });

        await userModel.updatePassword(userId, newPassword);
        res.json({ success: true, message: 'Password berhasil diubah' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { login, register, getProfile, changePassword };