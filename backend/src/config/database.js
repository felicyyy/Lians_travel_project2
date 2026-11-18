const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.connect((err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
    console.log('✅ Connected to PostgreSQL');
});

async function query(text, params) {
    try {
        const res = await pool.query(text, params);
        return res;
    } catch (error) {
        console.error('❌ Query error:', error);
        throw error;
    }
}

module.exports = { pool, query };