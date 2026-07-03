const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'xgame',
  user: process.env.DB_USER || 'xgame',
  password: process.env.DB_PASSWORD || 'xgame'
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT config FROM gm_game_configs WHERE id = 'hashi';`);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
main();
