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
    
    if (lang && lang.toLowerCase().startsWith('zh')) {
      // Don't prepend /zh if already there
      if (!path.startsWith('/zh')) {
        window.location.replace('/zh' + path + window.location.search);
      }
    } else {
      // Don't prepend /en if already there
      if (!path.startsWith('/en')) {
        window.location.replace('/en' + path + window.location.search);
      }
    }
  </script>
</head>
<body>
</body>
</html>`;

fs.writeFileSync(path.join(browserDir, 'index.html'), rootHtml);
console.log('Generated root index.html for language sniffing.');
