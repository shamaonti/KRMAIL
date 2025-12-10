// server/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',        // XAMPP default user
  password: '',        // XAMPP default password (empty string)
  database: 'mailskrap_db'
});

module.exports = pool;
