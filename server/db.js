require('dotenv').config(); // Load env variables

const mysql = require("mysql2/promise");

if (
  !process.env.DB_HOST ||
  !process.env.DB_USER ||
  !process.env.DB_NAME
) {
  throw new Error("❌ Missing required database environment variables");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log("✅ Database pool created");

module.exports = pool;
