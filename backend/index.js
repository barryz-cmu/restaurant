const {
    Pool
} = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Simple test function
async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Connected to Postgres at:", res.rows[0].now);
  } catch (err) {
    console.error("DB connection error:", err);
  }
}

testConnection();

module.exports = pool;

module.exports = {
  query: (text, params) => pool.query(text, params),
};