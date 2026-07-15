const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER || "user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "sekdin_kemenkum",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});
async function alter() {
  await pool.query("ALTER TABLE pengaduan ADD COLUMN ip_address VARCHAR(50);");
  console.log("Column added");
  process.exit(0);
}
alter();
