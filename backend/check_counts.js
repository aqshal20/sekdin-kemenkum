const { Pool } = require('pg');
const pool = new Pool({
  user: "user",
  host: "localhost",
  database: "sekdin_kemenkum",
  password: "password",
  port: 5432,
});
async function check() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM pengaduan');
  console.log(`Jumlah aduan: ${rows[0].count}`);
  const msgs = await pool.query('SELECT COUNT(*) FROM messages');
  console.log(`Jumlah pesan: ${msgs.rows[0].count}`);
  process.exit();
}
check().catch(console.error);
