import { Pool } from 'pg';
import { generate } from 'bridges-generator';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'x_game_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
});

// Define levels
const LEVELS = [
  { difficulty: 'easy',   size: 7,  islands: 12, count: 10 },
  { difficulty: 'medium', size: 10, islands: 20, count: 10 },
  { difficulty: 'hard',   size: 15, islands: 40, count: 10 },
  { difficulty: 'expert', size: 20, islands: 60, count: 10 },
];

async function main() {
  console.log('Starting Hashi puzzle generation...');
  
  // Clear old hashi puzzles
  await pool.query("DELETE FROM gm_hashi_puzzles");
  console.log('Cleared old puzzles.');

  for (const level of LEVELS) {
    for (let i = 1; i <= level.count; i++) {
      const id = `hashi_${level.difficulty}_${i}`;
      let puzzleObj;
      let attempts = 0;
      
      // Generation might fail or timeout for complex setups, so we retry
      while (!puzzleObj && attempts < 10) {
        try {
           puzzleObj = generate(level.size, level.size, level.islands, 0.2);
        } catch (e) {
           attempts++;
        }
      }
      
      if (!puzzleObj) {
         console.error(`Failed to generate puzzle ${id} after 10 attempts.`);
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
