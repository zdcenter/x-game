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
  if (filePath.endsWith('.html') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Pattern: {{ i18n.t('some.key')() }} -> <ng-container i18n="@@some.key">some.key</ng-container>
    content = content.replace(/\{\{\s*i18n\.t\('([^']+)'\)\(\)\s*(?:\|\|\s*'([^']+)')?\s*\}\}/g, (match, key, def) => {
      return `<ng-container i18n="@@${key}">${def || key}</ng-container>`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Updated', filePath);
    }
  }
});
