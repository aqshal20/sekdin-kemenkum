const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER || "user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "sekdin_kemenkum",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});
async function update() {
  try {
    await pool.query("UPDATE users SET role = REPLACE(role, 'admin_informasi', 'operator_informasi');");
    await pool.query("UPDATE users SET role = REPLACE(role, 'admin_pengaduan', 'operator_pengaduan');");
    
    // Create activity_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_name VARCHAR(255),
        action VARCHAR(255),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Roles updated and activity_logs table created.");
  } catch (e) { console.error(e); }
  process.exit(0);
}
update();
