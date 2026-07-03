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
    const query = `
      UPDATE gm_game_configs 
      SET config = jsonb_set(config, '{difficulties}', '[
        {"id": "easy", "desc": "7x7", "descKey": "game.diff_hashi_easy", "labelKey": "game.diff_hashi_easy"}, 
        {"id": "medium", "desc": "10x10", "descKey": "game.diff_hashi_medium", "labelKey": "game.diff_hashi_medium"}, 
        {"id": "hard", "desc": "15x15", "descKey": "game.diff_hashi_hard", "labelKey": "game.diff_hashi_hard"}, 
        {"id": "expert", "desc": "20x20", "descKey": "game.diff_hashi_expert", "labelKey": "game.diff_hashi_expert"}
      ]') 
      WHERE id = 'hashi';
    `;
    await client.query(query);
    console.log("DB updated successfully");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

main();
