const fs = require('fs');

const files = [
  'frontend/src/app/features/games/tetris/tetris.component.ts',
  'frontend/src/app/features/games/block/block.component.ts',
  'frontend/src/app/features/games/drop2048/drop2048.component.ts',
  'frontend/src/app/features/games/sokoban/sokoban.component.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('AdsenseComponent')) {
    // Add import statement at the top
    content = "import { AdsenseComponent } from '../../../shared/components/adsense/adsense.component';\n" + content;
    
    // Add to imports array. Look for "imports: ["
    content = content.replace(/(imports:\s*\[[\s\S]*?)(?=,\s*templateUrl:)/, (match) => {
      // Find the last closing bracket of imports
      let idx = match.lastIndexOf(']');
      if (idx !== -1) {
        return match.substring(0, idx) + ',\n    AdsenseComponent\n  ]';
      }
      return match;
    });
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Added AdsenseComponent to', file);
  }
});
