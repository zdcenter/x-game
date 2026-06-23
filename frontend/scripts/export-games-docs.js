/**
 * Export game docs (overview + rules) from the production API to a static JSON file.
 * Run after editing game rules in the admin panel:
 *   node scripts/export-games-docs.js
 *
 * Writes:
 *   public/assets/games-docs.json  — all active games with overview + rules content
 *
 * The static file is loaded by DocsComponent during SSG so pages prerender with
 * full content (ssrNoopInterceptor allows /assets/ requests, blocks API calls).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_BASE = process.env.GAMES_API || 'https://api.puzzlepk.com:8443/api/v1';
const OUT_FILE = path.join(__dirname, '../public/assets/games-docs.json');

function get(url) {
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    lib.get(url, { rejectUnauthorized: false }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log(`Fetching games from ${API_BASE}/games?page=1&limit=100 ...`);
  const page = await get(`${API_BASE}/games?page=1&limit=100`);
  const games = page.games || [];
  if (!games.length) throw new Error('No games returned from API');

  const docs = games
    .filter(g => g.isActive !== false)
    .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999))
    .map(g => ({
      id: g.id,
      name: g.name,
      overview: g.overview || '',
      rules: g.rules || '',
      isActive: g.isActive ?? true,
      sortOrder: g.sortOrder ?? 999,
    }));

  const outDir = path.dirname(OUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  console.log(`Done: ${docs.length} games exported to ${OUT_FILE}`);
  docs.forEach(g => {
    const rulesLen = (g.rules || '').length;
    console.log(`  ${g.id}: rules=${rulesLen} chars`);
  });
}

main().catch(e => {
  console.warn(`[export-games-docs] WARNING: ${e.message}`);
  console.warn('[export-games-docs] Using cached file from last successful export.');
});
