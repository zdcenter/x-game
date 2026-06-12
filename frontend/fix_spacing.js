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
  content = content.replace(/pb-4 mb-4 lg:mb-6/g, 'pb-2 mb-2 lg:mb-3');
  content = content.replace(/mb-4 lg:mb-6 pb-2/g, 'mb-2 lg:mb-3 pb-1');
  
  // Players / Opponents replacements
  content = content.replace(/pt-2 pb-4 mb-2 border-b/g, 'pt-1 pb-2 mb-1 border-b');
  content = content.replace(/pt-2 pb-4 mb-2 border-b/g, 'pt-1 pb-2 mb-1 border-b');

  // The Grid Area / Board container padding
  // Be careful with replacing 'py-4', we only want it for the grid area wrapper if possible.
  // Actually, let's just do the first two since they save the most space!
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
