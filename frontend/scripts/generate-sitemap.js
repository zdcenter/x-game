const fs = require('fs');
const path = require('path');

const domain = 'https://www.puzzlepk.com';
const langs = ['en', 'zh'];
const defaultLang = 'en';

// Auto-discover games from the filesystem
const gamesDir = path.join(__dirname, '../src/app/features/games');
const games = fs.existsSync(gamesDir) 
  ? fs.readdirSync(gamesDir).filter(file => fs.statSync(path.join(gamesDir, file)).isDirectory())
  : [];

const paths = [
  'lobby',
  'login',
  'register',
  'profile',
  'blog',
  ...games.map(g => `games/${g}`),
  ...games.map(g => `docs/${g}`)
];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

for (const p of paths) {
  for (const lang of langs) {
    xml += `  <url>\n`;
    xml += `    <loc>${domain}/${lang}/${p}</loc>\n`;
    
    // Add alternate links for all languages (including itself)
    for (const altLang of langs) {
      xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${domain}/${altLang}/${p}"/>\n`;
    }
    
    // x-default is recommended by Google to point to the default language or language selector
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${domain}/${defaultLang}/${p}"/>\n`;
    
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>${p === 'lobby' ? '1.0' : '0.8'}</priority>\n`;
    xml += `  </url>\n`;
  }
}

xml += `</urlset>`;

const outDir = path.join(__dirname, 'public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf-8');
console.log('sitemap.xml generated successfully in public/');
