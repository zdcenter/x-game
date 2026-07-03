const { Pool } = require('pg');
const { generate } = require('bridges-generator');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'x_game_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
});

const LEVELS = [
  { difficulty: 'easy',   size: 7,  islands: 10, count: 50 },
  { difficulty: 'medium', size: 10, islands: 18, count: 50 },
  { difficulty: 'hard',   size: 15, islands: 30, count: 50 },
  { difficulty: 'expert', size: 20, islands: 40, count: 50 },
];

async function main() {
  console.log('Starting Hashi puzzle generation...');
  
  await pool.query("DELETE FROM gm_hashi_puzzles");
  console.log('Cleared old puzzles.');

  for (const level of LEVELS) {
    for (let i = 1; i <= level.count; i++) {
      const id = `hashi_${level.difficulty}_${i}`;
      let puzzleObj;
      let attempts = 0;
      
      while (!puzzleObj && attempts < 20) {
        try {
           const result = await Promise.race([
             new Promise(resolve => resolve(generate(level.size, level.size, level.islands, 0.2))),
             new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
           ]);
           puzzleObj = result;
        } catch (e) {
           attempts++;
        }
      }
      
      if (!puzzleObj) {
         console.error(`Failed to generate puzzle ${id} after 20 attempts.`);
         continue;
      }
      
      const content = JSON.stringify({ grid: puzzleObj.puzzle });
      
      await pool.query(
        `INSERT INTO gm_hashi_puzzles (id, difficulty, content) VALUES ($1, $2, $3)`,
        [id, level.difficulty, content]
      );
      console.log(`Generated and saved: ${id}`);
    }
  }

  console.log('Generation complete.');
  process.exit(0);
}

main().catch(console.error);
