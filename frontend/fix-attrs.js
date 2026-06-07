const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const frontendSrc = path.join(__dirname, 'src/app');

walk(frontendSrc, (filePath) => {
  if (filePath.endsWith('.html')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Pattern: [title]="i18n.t('some.key')()" -> i18n-title="@@some.key" title="some.key"
    content = content.replace(/\[([a-zA-Z0-9-]+)\]\s*=\s*"i18n\.t\('([^']+)'\)\(\)(?:\s*\|\|\s*'([^']+)')?"/g, (match, attr, key, def) => {
      return `i18n-${attr}="@@${key}" ${attr}="${def || key}"`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed simple attrs in', filePath);
    }
  }
});
