const fs = require('fs');

const files = [
  {
    path: 'frontend/src/app/features/games/sudoku/components/sudoku-lobby/sudoku-lobby.component.ts',
    depth: 4 // src/app/features/games/sudoku/components/sudoku-lobby -> src/app is ../../../..
  },
  {
    path: 'frontend/src/app/features/games/sudoku/components/sudoku-room/sudoku-room.component.ts',
    depth: 4
  },
  {
    path: 'frontend/src/app/features/games/minesweeper/minesweeper.component.ts',
    depth: 2
  },
  {
    path: 'frontend/src/app/features/games/codebreaker/codebreaker.component.ts',
    depth: 2
  },
  {
    path: 'frontend/src/app/features/games/gomoku/gomoku.component.ts',
    depth: 2
  },
  {
    path: 'frontend/src/app/features/games/tetris/tetris.component.ts',
    depth: 2
  },
  {
    path: 'frontend/src/app/features/games/sliding/sliding.component.ts',
    depth: 2
  },
  {
    path: 'frontend/src/app/features/games/hexa/hexa.component.ts',
    depth: 2
  }
];

for (const file of files) {
  let content = fs.readFileSync(file.path, 'utf8');
  
  if (content.includes('GameHeaderComponent')) continue;

  const importPath = '../'.repeat(file.depth) + '../../shared/components/game-header/game-header.component';
  
  // Add import statement at top
  const importStatement = `import { GameHeaderComponent } from '${importPath}';\n`;
  content = importStatement + content;

  // Add to imports array
  content = content.replace(/imports:\s*\[([^\]]*)\]/, (match, p1) => {
    return `imports: [${p1}, GameHeaderComponent]`;
  });

  fs.writeFileSync(file.path, content);
  console.log(`Updated ${file.path}`);
}
