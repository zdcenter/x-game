const fs = require('fs');
const path = require('path');

const browserDir = path.join(__dirname, '../dist/frontend/browser');

if (!fs.existsSync(browserDir)) {
  console.log('Browser directory does not exist, skipping post-build.');
  process.exit(0);
}

// 1. (Removed _redirects copying, now using Cloudflare Functions)

// 2. Generate root index.html for language redirection
const rootHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Puzzle PK</title>
  <script>
    var lang = navigator.language || navigator.userLanguage;
    var path = window.location.pathname;
    if (path === '/' || path === '/index.html') {
      path = '/lobby';
    }
    // Remove trailing slash if any
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    if (path.startsWith('/zh/') || path.startsWith('/en/')) {
      // Already has a language prefix, do not redirect
    } else if (lang && lang.toLowerCase().startsWith('zh')) {
      window.location.replace('/zh' + path + window.location.search);
    } else {
      window.location.replace('/en' + path + window.location.search);
    }
  </script>
</head>
<body>
</body>
</html>`;

fs.writeFileSync(path.join(browserDir, 'index.html'), rootHtml);
console.log('Generated root index.html for language sniffing.');

// 3. Copy root static files from public/ (or en/) to the root of browser/ so Cloudflare Pages can serve them
const filesToCopy = ['ads.txt', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'favicon.svg', 'manifest.webmanifest'];
filesToCopy.forEach(file => {
  const src = path.join(browserDir, 'en', file);
  const dest = path.join(browserDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to root.`);
  }
});
