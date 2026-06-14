const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const gamesDir = path.join(__dirname, '../frontend/src/app/features/games');
const files = execSync(`find ${gamesDir} -type f -name '*.ts' -o -name '*.html'`).toString().trim().split('\n');

let updatedFiles = 0;
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('store.currentMode()')) {
    content = content.replace(/store\.currentMode\(\)/g, 'store.currentRoomMode()');
    changed = true;
  }
  if (content.includes('this.store.currentMode()')) {
    content = content.replace(/this\.store\.currentMode\(\)/g, 'this.store.currentRoomMode()');
    changed = true;
  }
  
  if (content.includes('store.host()')) {
    content = content.replace(/store\.host\(\)/g, 'store.hostId()');
    changed = true;
  }
  if (content.includes('this.store.host()')) {
    content = content.replace(/this\.store\.host\(\)/g, 'this.store.hostId()');
    changed = true;
  }

  // Handle GameStoreInterface if imported anywhere
  if (content.includes('GameStoreInterface')) {
    // skip base-game.store.ts and game-store.interface.ts
    if (!file.includes('base-game.store.ts') && !file.includes('game-store.interface.ts') && !file.endsWith('.store.ts')) {
        // Maybe in components? Some components might refer to it? Usually BaseGameComponent does.
        // I won't change this blindly unless it errors.
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    updatedFiles++;
  }
}
console.log(`Updated ${updatedFiles} files`);
