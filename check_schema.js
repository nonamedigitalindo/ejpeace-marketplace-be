require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'peacetifal_db'
    });

    const [rows] = await pool.execute('DESCRIBE products');
    console.log('Products table schema:');
    console.table(rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();