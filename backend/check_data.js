const { Pool } = require('pg');
const pool = new Pool({
  user: "user",
  host: "localhost",
  database: "sekdin_kemenkum",
  password: "password",
  port: 5432,
});
async function check() {
  const { rows } = await pool.query('SELECT p.id, p.ticket_id, p.participant_id FROM pengaduan p');
  console.log(rows);
  process.exit();
}
check().catch(console.error);
