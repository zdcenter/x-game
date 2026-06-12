const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.html')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/app/features/games');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // headerBgClass replacements
  content = content.replace(/mb-4 lg:mb-6/g, 'mb-2 lg:mb-3');
  
  // Grid wrapper padding
  content = content.replace(/min-h-0 overflow-hidden py-4 relative/g, 'min-h-0 overflow-hidden py-2 relative');
  content = content.replace(/py-4 mb-2/g, 'py-2 mb-1');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
