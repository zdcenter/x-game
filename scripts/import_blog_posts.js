#!/usr/bin/env node
/**
 * import_blog_posts.js — Import new blog posts into the production database
 * via the admin API. The article files (content/blog_new/{slug}.json) are
 * produced by the content pipeline in the exact snake_case format the API
 * expects (see blogPostInput in backend/internal/handlers/rest/blog.go).
 *
 * Usage:
 *   ADMIN_TOKEN=<your-admin-jwt> node scripts/import_blog_posts.js [slug...]
 *
 *   - ADMIN_TOKEN (required): a JWT for an account with role == "admin".
 *     Get it by logging in via the site (POST /api/v1/auth/login) and
 *     copying the token, or mint one with the backend secret.
 *   - Optional slug args: import only those slugs (default: all files in
 *     content/blog_new/). Use --dry-run to validate without posting.
 *
 * After import, run `cd frontend && node scripts/export-blog.js` to sync the
 * new posts into public/assets/blog/, then rebuild + redeploy the frontend.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_BASE = process.env.BLOG_API || 'https://api.puzzlepk.com:8443/api/v1';
const SRC_DIR = path.join(__dirname, '..', 'content', 'blog_new');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

const onlySlugs = process.argv
  .slice(2)
  .filter(a => !a.startsWith('--') && !a.startsWith('-'))
  .map(s => s.replace(/\.json$/, ''));

if (!ADMIN_TOKEN && !DRY_RUN) {
  console.error('ERROR: ADMIN_TOKEN env var is required (unless --dry-run).');
  process.exit(1);
}

function post(urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'api.puzzlepk.com',
        port: 8443,
        path: urlPath,
        method: 'POST',
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      },
      res => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch (e) { /* not json */ }
          resolve({ status: res.statusCode, body: json || raw.slice(0, 300) });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`No directory ${SRC_DIR}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();
  const targets = onlySlugs.length
    ? files.filter(f => onlySlugs.includes(f.replace(/\.json$/, '')))
    : files;

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Importing ${targets.length} post(s)...`);
  let ok = 0;
  for (const fn of targets) {
    const p = JSON.parse(fs.readFileSync(path.join(SRC_DIR, fn), 'utf-8'));
    // Basic validation
    const required = ['slug', 'title_en', 'content_en', 'title_zh', 'content_zh'];
    const missing = required.filter(k => !p[k]);
    if (missing.length) {
      console.log(`  SKIP ${p.slug || fn}: missing ${missing.join(', ')}`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`  OK (dry-run) ${p.slug}: en ${p.content_en.length} chars, zh ${p.content_zh.length} chars`);
      ok++;
      continue;
    }
    const res = await post('/api/v1/admin/blog/posts', p);
    if (res.status === 201) {
      console.log(`  IMPORTED ${p.slug} (id ${res.body?.id ?? '?'})`);
      ok++;
    } else {
      console.log(`  FAIL ${p.slug}: HTTP ${res.status} — ${JSON.stringify(res.body).slice(0, 200)}`);
    }
  }
  console.log(`\nDone: ${ok}/${targets.length} imported.`);
  if (!DRY_RUN) {
    console.log('\nNext: cd frontend && node scripts/export-blog.js && npm run build, then deploy.');
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
