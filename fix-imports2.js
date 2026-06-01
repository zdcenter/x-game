const fs = require('fs');

const files = [
  'frontend/src/app/features/games/sudoku/components/sudoku-room/sudoku-room.component.ts',
  'frontend/src/app/features/games/sudoku/components/sudoku-lobby/sudoku-lobby.component.ts',
];

for (let path of files) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    // Change to 5 levels up
    content = content.replace(/import \{ GameHeaderComponent \} from '.*';/g, "import { GameHeaderComponent } from '../../../../../shared/components/game-header/game-header.component';");
    fs.writeFileSync(path, content);
  }
}
console.log("Fixed sudoku imports");
