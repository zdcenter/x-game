/**
 * Split games-docs.json into:
 *   - public/assets/docs/index.json (lightweight metadata list without large rules, ~10 KB)
 *   - public/assets/docs/{gameId}.json (individual game docs with full rules, ~15-50 KB each)
 * 
 * Also keeps public/assets/games-docs.json intact for backward compatibility.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_FILE = path.join(ROOT_DIR, 'public', 'assets', 'games-docs.json');
const TARGET_DIR = path.join(ROOT_DIR, 'public', 'assets', 'docs');

function generateDocsChunks() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.warn(`[generate-docs-chunks] Source file not found: ${SOURCE_FILE}`);
    return;
  }

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  const raw = fs.readFileSync(SOURCE_FILE, 'utf8');
  const docs = JSON.parse(raw);

  if (!Array.isArray(docs)) {
    console.error('[generate-docs-chunks] Expected array in games-docs.json');
    return;
  }

  // 1. Generate lightweight index (no rules)
  const index = docs.map(g => ({
    id: g.id,
    name: g.name,
    overview: g.overview || '',
    isActive: g.isActive ?? true,
    sortOrder: g.sortOrder ?? 999
  }));

  const indexPath = path.join(TARGET_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  console.log(`[generate-docs-chunks] Generated index.json (${(fs.statSync(indexPath).size / 1024).toFixed(1)} KB, ${index.length} games)`);

  // 2. Generate individual game doc files
  let totalChunksSize = 0;
  docs.forEach(game => {
    const gameDoc = {
      id: game.id,
      name: game.name,
      overview: game.overview || '',
      rules: game.rules || '',
      isActive: game.isActive ?? true,
      sortOrder: game.sortOrder ?? 999
    };
    const chunkPath = path.join(TARGET_DIR, `${game.id}.json`);
    const content = JSON.stringify(gameDoc, null, 2);
    fs.writeFileSync(chunkPath, content, 'utf8');
    const chunkSize = fs.statSync(chunkPath).size;
    totalChunksSize += chunkSize;
    console.log(`  - docs/${game.id}.json: ${(chunkSize / 1024).toFixed(1)} KB`);
  });

  console.log(`[generate-docs-chunks] Generated ${docs.length} chunks (total ${(totalChunksSize / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
  generateDocsChunks();
}

module.exports = { generateDocsChunks };
