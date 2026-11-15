/**
 * Export blog posts from the production API to static JSON files.
 * Run after adding/editing blog posts in the admin panel:
 *   node scripts/export-blog.js
 *
 * Writes:
 *   public/assets/blog/index.json   — metadata list (no content)
 *   public/assets/blog/{slug}.json  — full post including content
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_BASE = process.env.BLOG_API || 'https://api.puzzlepk.com:8443/api/v1';
const OUT_DIR = path.join(__dirname, '../public/assets/blog');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, res => {
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
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Load existing index.json to preserve any local static posts not yet in DB
  const indexPath = path.join(OUT_DIR, 'index.json');
  let existingIndex = [];
  if (fs.existsSync(indexPath)) {
    try { existingIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8')); } catch (e) { existingIndex = []; }
  }
  const indexMap = new Map(existingIndex.map(p => [p.id, p]));

  console.log(`Fetching post list from ${API_BASE}/blog/posts ...`);
  const posts = await get(`${API_BASE}/blog/posts`);
  if (!Array.isArray(posts)) throw new Error('Unexpected API response: ' + JSON.stringify(posts));

  for (const p of posts) {
    const slug = p.id_slug;
    console.log(`  Fetching ${slug} ...`);
    const detail = await get(`${API_BASE}/blog/posts/${slug}`);

    const LOCAL_FIELDS = ['title', 'description', 'keywords', 'readTime', 'author', 'tags', 'content'];
    const BLOG_LANGS = ['en', 'zh', 'es', 'ja', 'ko', 'pt', 'fr', 'de'];
    let local = {};
    const localPath = path.join(OUT_DIR, `${slug}.json`);
    if (fs.existsSync(localPath)) {
      try { local = JSON.parse(fs.readFileSync(localPath, 'utf-8')); } catch (e) { local = {}; }
    }
    const postData = { id: detail.id_slug, date: detail.date, published: detail.published };
    for (const lang of BLOG_LANGS) {
      const api = detail[lang] || {};
      const loc = local[lang] || {};
      const obj = {};
      for (const f of LOCAL_FIELDS) {
        const v = api[f];
        // If local has longer/richer content, protect local content from being overwritten by a shorter stub
        if (f === 'content' && loc[f] && typeof loc[f] === 'string' && loc[f].length > (typeof v === 'string' ? v.length : 0)) {
          obj[f] = loc[f];
        } else {
          obj[f] = (v !== undefined && v !== null && v !== '') ? v : (loc[f] ?? '');
        }
      }
      if (!obj.content) continue;
      postData[lang] = obj;
    }
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(postData, null, 2), 'utf-8');

    const langMeta = (obj) => {
      if (!obj || !obj.content) return undefined;
      const { content, ...meta } = obj;
      return meta;
    };

    indexMap.set(slug, {
      id: slug,
      date: postData.date,
      en: langMeta(postData.en),
      zh: langMeta(postData.zh),
      es: langMeta(postData.es),
      ja: langMeta(postData.ja),
      ko: langMeta(postData.ko),
      pt: langMeta(postData.pt),
      fr: langMeta(postData.fr),
      de: langMeta(postData.de),
    });
  }

  // Combine and sort by date descending
  const finalIndex = Array.from(indexMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  fs.writeFileSync(indexPath, JSON.stringify(finalIndex, null, 2), 'utf-8');
  console.log(`\nDone: ${finalIndex.length} posts exported and merged into ${OUT_DIR}`);
}

main().catch(e => {
  console.warn(`[export-blog] WARNING: ${e.message}`);
  console.warn('[export-blog] Using cached files from last successful export.');
});
