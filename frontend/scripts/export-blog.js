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
    const postData = {
      id: detail.id_slug,
      date: detail.date,
      published: detail.published,
      en: {
        title: detail.en.title,
        description: detail.en.description,
        keywords: detail.en.keywords,
        readTime: detail.en.readTime,
        author: detail.en.author,
        tags: detail.en.tags ?? [],
        content: detail.en.content ?? '',
      },
      zh: {
        title: detail.zh.title,
        description: detail.zh.description,
        keywords: detail.zh.keywords,
        readTime: detail.zh.readTime,
        author: detail.zh.author,
        tags: detail.zh.tags ?? [],
        content: detail.zh.content ?? '',
      },
      es: {
        title: detail.es?.title || '',
        description: detail.es?.description || '',
        keywords: detail.es?.keywords || '',
        readTime: detail.es?.readTime || '',
        author: detail.es?.author || '',
        tags: detail.es?.tags ?? [],
        content: detail.es?.content ?? '',
      },
      ja: {
        title: detail.ja?.title || '',
        description: detail.ja?.description || '',
        keywords: detail.ja?.keywords || '',
        readTime: detail.ja?.readTime || '',
        author: detail.ja?.author || '',
        tags: detail.ja?.tags ?? [],
        content: detail.ja?.content ?? '',
      },
      ko: {
        title: detail.ko?.title || '',
        description: detail.ko?.description || '',
        keywords: detail.ko?.keywords || '',
        readTime: detail.ko?.readTime || '',
        author: detail.ko?.author || '',
        tags: detail.ko?.tags ?? [],
        content: detail.ko?.content ?? '',
      },
      pt: {
        title: detail.pt?.title || '',
        description: detail.pt?.description || '',
        keywords: detail.pt?.keywords || '',
        readTime: detail.pt?.readTime || '',
        author: detail.pt?.author || '',
        tags: detail.pt?.tags ?? [],
        content: detail.pt?.content ?? '',
      },
      fr: {
        title: detail.fr?.title || '',
        description: detail.fr?.description || '',
        keywords: detail.fr?.keywords || '',
        readTime: detail.fr?.readTime || '',
        author: detail.fr?.author || '',
        tags: detail.fr?.tags ?? [],
        content: detail.fr?.content ?? '',
      },
      de: {
        title: detail.de?.title || '',
        description: detail.de?.description || '',
        keywords: detail.de?.keywords || '',
        readTime: detail.de?.readTime || '',
        author: detail.de?.author || '',
        tags: detail.de?.tags ?? [],
        content: detail.de?.content ?? '',
      },
    };
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(postData, null, 2), 'utf-8');

    // Index entry (no content)
    const { 
      en: { content: _ec, ...enMeta }, 
      zh: { content: _zc, ...zhMeta },
      es: { content: _sc, ...esMeta },
      ja: { content: _jc, ...jaMeta },
      ko: { content: _kc, ...koMeta },
      pt: { content: _pc, ...ptMeta },
      fr: { content: _fc, ...frMeta },
      de: { content: _dc, ...deMeta }
    } = postData;
    index.push({ id: slug, date: postData.date, en: enMeta, zh: zhMeta, es: esMeta, ja: jaMeta, ko: koMeta, pt: ptMeta, fr: frMeta, de: deMeta });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');
  console.log(`\nDone: ${posts.length} posts exported to ${OUT_DIR}`);
}

main().catch(e => {
  console.warn(`[export-blog] WARNING: ${e.message}`);
  console.warn('[export-blog] Using cached files from last successful export.');
});
