const { Pool } = require("pg");
require("dotenv").config();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
async function alter() {
  try {
    await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;");
    console.log("Success adding is_internal to messages");
  } catch (e) {
    console.log("Error:", e);
  } finally {
    pool.end();
  }
}
alter();
