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

  console.log(`Fetching post list from ${API_BASE}/blog/posts ...`);
  const posts = await get(`${API_BASE}/blog/posts`);
  if (!Array.isArray(posts)) throw new Error('Unexpected API response: ' + JSON.stringify(posts));

  const index = [];

  for (const p of posts) {
    const slug = p.id_slug;
    console.log(`  Fetching ${slug} ...`);
    const detail = await get(`${API_BASE}/blog/posts/${slug}`);

    // Full post file (with content)
    // Gap-fill protection: the production DB is the source of truth, but the
    // admin panel may not have content for every language yet. Never let an
    // empty DB field wipe an existing local translation — keep the local value
    // until the DB is properly filled (non-empty DB values always win).
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
        obj[f] = (v !== undefined && v !== null && v !== '') ? v : (loc[f] ?? '');
      }
      // Skip languages with no content at all — the frontend then falls back to
      // the English version (`raw[lang] || raw.en`). An object of empty strings
      // would be truthy and render a blank page instead.
      if (!obj.content) continue;
      postData[lang] = obj;
    }
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(postData, null, 2), 'utf-8');

    // Index entry (no content). Languages skipped above (no content) fall back
    // to undefined meta — the blog list renders them from the English version.
    const langMeta = (obj) => {
      if (!obj || !obj.content) return undefined;
      const { content, ...meta } = obj;
      return meta;
    };
    index.push({
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

  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');
  console.log(`\nDone: ${posts.length} posts exported to ${OUT_DIR}`);
}

main().catch(e => {
  console.warn(`[export-blog] WARNING: ${e.message}`);
  console.warn('[export-blog] Using cached files from last successful export.');
});
