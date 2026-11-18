const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

async function getUserByUsername(username) {
    const sql = `SELECT * FROM tb_users WHERE username = $1`;
    const result = await query(sql, [username]);
    return result.rows[0];
}

async function getUserById(id) {
    const sql = `SELECT user_id, username, email, fullname, phone, role, is_active, created_at, last_login FROM tb_users WHERE user_id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0];
}

async function getUserByEmail(email) {
    const sql = `SELECT * FROM tb_users WHERE email = $1`;
    const result = await query(sql, [email]);
    return result.rows[0];
}

async function createUser(data) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const sql = `
        INSERT INTO tb_users (username, password, email, fullname, phone, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING user_id, username, email, fullname, phone, role
    `;
    const values = [
        data.username, hashedPassword, data.email || null,
        data.fullname, data.phone || null, data.role || 'customer'
    ];
    const result = await query(sql, values);
    return result.rows[0];
}

async function verifyPassword(username, password) {
    const user = await getUserByUsername(username);
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    return user;
}

async function updateLastLogin(userId) {
    const sql = `UPDATE tb_users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1`;
    await query(sql, [userId]);
}

async function updatePassword(userId, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const sql = `UPDATE tb_users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING user_id`;
    const result = await query(sql, [hashedPassword, userId]);
    return result.rows[0];
}

module.exports = {
    getUserByUsername,
    getUserById,
    getUserByEmail,
    createUser,
    verifyPassword,
    updateLastLogin,
    updatePassword
};