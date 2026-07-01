const fs = require('fs');

const files = [
  'frontend/src/app/features/games/sudoku/sudoku.component.html',
  'frontend/src/app/features/games/math24/math24.component.html'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('onHeaderBack()')) {
    content = content.replace(/onHeaderBack\(\)/g, 'goBack()');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed:', file);
  }
});
