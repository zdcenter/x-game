const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Not available? We can write a simple recursive function

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('frontend/src/app/features/games', (filePath) => {
  if (filePath.endsWith('.html')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    if (content.includes('returnToLobby()')) {
      content = content.replace(/returnToLobby\(\)/g, 'goBack()');
      changed = true;
    }
    if (content.includes('onLeaveClick()')) {
      content = content.replace(/onLeaveClick\(\)/g, 'goBack()');
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed HTML:', filePath);
    }
  }
});
