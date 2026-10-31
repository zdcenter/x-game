const fs = require('fs');
const path = require('path');

const domain = 'https://www.puzzlepk.com';
const allLangs = ['en', 'zh', 'es', 'ja', 'ko', 'pt', 'fr', 'de'];
const defaultLang = 'en';
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// ──────────────────────────────────────────────────────────────────────
// Active languages for sitemap.xml & Angular SSG prerender routes.txt
// AdSense Review Compliance: locked to ['en', 'zh'] to eliminate thin/duplicate content penalties.
// Post-approval: change this back to `allLangs` to immediately re-enable all 8 languages.
// ──────────────────────────────────────────────────────────────────────
const activeLangs = ['en', 'zh'];

// Auto-discover games
const gamesDir = path.join(__dirname, '../src/app/features/games');
const games = fs.existsSync(gamesDir)
  ? fs.readdirSync(gamesDir).filter(f => fs.statSync(path.join(gamesDir, f)).isDirectory())
  : [];

// Auto-discover blog posts — prefer public/ folder which is the canonical source
const blogIndexPath = path.join(__dirname, '../public/assets/blog/index.json');
const blogIndexPathFallback = path.join(__dirname, '../src/assets/blog/index.json');
const blogPosts = fs.existsSync(blogIndexPath)
  ? JSON.parse(fs.readFileSync(blogIndexPath, 'utf-8'))
  : fs.existsSync(blogIndexPathFallback)
    ? JSON.parse(fs.readFileSync(blogIndexPathFallback, 'utf-8'))
    : [];

// Route config: [path, changefreq, priority, lastmod]
const staticPaths = [
  ['lobby',        'daily',  '1.0', today],
  ['leaderboard',  'hourly', '0.9', today],
  ['daily',        'daily',  '0.9', today],
  ['blog',         'weekly', '0.8', today],
  ['docs',         'monthly','0.7', today],
  ['legal/privacy','monthly','0.3', today],
  ['legal/terms',  'monthly','0.3', today],
  ['legal/about',  'monthly','0.4', today],
  ['legal/contact','monthly','0.4', today],
  ...games.map(g => [`games/${g}`, 'weekly', '0.9', today]),
  ...games.map(g => [`docs/${g}`,  'monthly','0.7', today]),
];

// Blog post entries with their own publish date
const blogPostPaths = blogPosts.map(post => [
  `blog/${post.id}`,
  'monthly',
  '0.8',
  post.date || today
]);

const allPaths = [...staticPaths, ...blogPostPaths];

// ──────────────────────────────────────────────────────────────────────
// Sitemap: exclude low-value dynamic pages that hurt AdSense review.
// These pages have little indexable text (pure dynamic data).
// After AdSense approval, remove this filter to include all routes.
// ──────────────────────────────────────────────────────────────────────
const sitemapExclude = new Set(['leaderboard', 'daily']);
const sitemapPaths = allPaths.filter(([p]) => !sitemapExclude.has(p));

// Routes that Angular SSG should prerender at build time.
// Blog content is now static JSON, so all routes including blog can be prerendered.
const prerenderPaths = [...staticPaths, ...blogPostPaths];

function urlEntry(p, changefreq, priority, lastmod, lang) {
  let xml = `  <url>\n`;
  xml += `    <loc>${domain}/${lang}/${p}</loc>\n`;
  xml += `    <lastmod>${lastmod}</lastmod>\n`;
  // hreflang alternates always point to all available active languages
  for (const altLang of activeLangs) {
    xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${domain}/${altLang}/${p}"/>\n`;
  }
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${domain}/${defaultLang}/${p}"/>\n`;
  xml += `    <changefreq>${changefreq}</changefreq>\n`;
  xml += `    <priority>${priority}</priority>\n`;
  xml += `  </url>\n`;
  return xml;
}

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

for (const [p, changefreq, priority, lastmod] of sitemapPaths) {
  for (const lang of activeLangs) {
    xml += urlEntry(p, changefreq, priority, lastmod, lang);
  }
}

xml += `</urlset>`;

const outDir = path.join(__dirname, '../public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf-8');
console.log(`sitemap.xml generated — ${sitemapPaths.length * activeLangs.length} URLs (${activeLangs.join(',')} only)`);

// Routes for Angular SSG prerender — strictly aligned with activeLangs
const routesContent = prerenderPaths
  .flatMap(([p]) => activeLangs.map(lang => `/${lang}/${p}`))
  .join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, '../routes.txt'), routesContent, 'utf-8');
console.log(`routes.txt generated — ${prerenderPaths.length * activeLangs.length} prerender routes`);
