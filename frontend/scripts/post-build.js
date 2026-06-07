const fs = require('fs');
const path = require('path');

const browserDir = path.join(__dirname, '../dist/frontend/browser');

if (!fs.existsSync(browserDir)) {
  console.log('Browser directory does not exist, skipping post-build.');
  process.exit(0);
}

// 1. Copy _redirects to root
const redirectsSrc = path.join(__dirname, '../public/_redirects');
const redirectsDest = path.join(browserDir, '_redirects');
if (fs.existsSync(redirectsSrc)) {
  fs.copyFileSync(redirectsSrc, redirectsDest);
  console.log('Copied _redirects to root of browser directory.');
}

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
