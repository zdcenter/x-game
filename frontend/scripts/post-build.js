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

// 3. Automatically copy all root static files from public/ to the root of browser/ 
// so Cloudflare Pages can serve them directly without redirect loops.
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  const filesToCopy = fs.readdirSync(publicDir);
  filesToCopy.forEach(file => {
    const src = path.join(publicDir, file);
    // Only copy files (not directories)
    if (fs.statSync(src).isFile()) {
      const dest = path.join(browserDir, file);
      fs.copyFileSync(src, dest);
      console.log(`Copied ${file} to root from public/.`);
    }
  });
}

// 4. Rename index.csr.html to index.html for SPA fallback
['en', 'zh'].forEach(lang => {
  const csrPath = path.join(browserDir, lang, 'index.csr.html');
  const idxPath = path.join(browserDir, lang, 'index.html');
  if (fs.existsSync(csrPath) && !fs.existsSync(idxPath)) {
    fs.renameSync(csrPath, idxPath);
    console.log(`Renamed index.csr.html to index.html for ${lang}`);
  }
});

// 5. Flatten SSG directory structure to .html files for Cloudflare Pages
// Cloudflare Pages SPA routing intercepts /zh/lobby/ and serves zh/index.html.
// But if we provide zh/lobby.html, it serves it correctly as a static file, overriding SPA fallback.
function flattenHtmlFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      flattenHtmlFiles(fullPath);
      const dirContents = fs.readdirSync(fullPath);
      if (dirContents.length === 1 && dirContents[0] === 'index.html') {
        const indexPath = path.join(fullPath, 'index.html');
        const newHtmlPath = fullPath + '.html';
        fs.renameSync(indexPath, newHtmlPath);
        fs.rmdirSync(fullPath);
        console.log(`Flattened ${fullPath}/index.html to ${newHtmlPath}`);
      } else if (dirContents.includes('index.html')) {
        const indexPath = path.join(fullPath, 'index.html');
        const newHtmlPath = fullPath + '.html';
        fs.renameSync(indexPath, newHtmlPath);
        console.log(`Flattened ${fullPath}/index.html to ${newHtmlPath}`);
      }
    }
  }
}

['en', 'zh'].forEach(lang => {
  const langDir = path.join(browserDir, lang);
  if (fs.existsSync(langDir)) {
    flattenHtmlFiles(langDir);
  }
});
