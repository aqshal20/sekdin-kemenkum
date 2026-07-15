const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER || "user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "sekdin_kemenkum",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});
async function check() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';");
    console.log(res.rows);
  } catch (e) { console.error(e); }
  process.exit(0);
}
check();
