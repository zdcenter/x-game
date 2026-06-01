const fs = require('fs');

const files = [
  'frontend/src/app/features/games/sliding/sliding.component.ts',
  'frontend/src/app/features/games/hexa/hexa.component.ts',
  'frontend/src/app/features/games/codebreaker/codebreaker.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-room/sudoku-room.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-lobby/sudoku-lobby.component.ts',
  'frontend/src/app/features/games/minesweeper/minesweeper.component.ts',
  'frontend/src/app/features/games/tetris/tetris.component.ts',
  'frontend/src/app/features/games/gomoku/gomoku.component.ts'
];

for (let path of files) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    // Replace all incorrect import paths for GameHeaderComponent
    content = content.replace(/import \{ GameHeaderComponent \} from '.*';/g, "import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';");
    
    // For sudoku components, they are one level deeper: sudoku/components/sudoku-room/sudoku-room.component.ts
    // so it should be ../../../../shared...
    if (path.includes('sudoku/components')) {
      content = content.replace(/import \{ GameHeaderComponent \} from '.*';/g, "import { GameHeaderComponent } from '../../../../shared/components/game-header/game-header.component';");
    }
    
    fs.writeFileSync(path, content);
  }
}
console.log("Fixed imports");
