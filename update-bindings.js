const fs = require('fs');
const glob = require('glob');

const files = glob.sync('frontend/src/app/features/games/**/*.component.html');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('<app-game-waiting-room')) {
    if (!content.includes('[readyPlayers]=')) {
      content = content.replace(
        /(<app-game-waiting-room[^>]*?)(>)/,
        `$1\n        [readyPlayers]="store.gameState()?.readyPlayers || {}"\n        (kick)="store.kickPlayer($event)"\n        (ready)="store.ready()"\n        (cancelReady)="store.cancelReady()"\n      $2`
      );
      fs.writeFileSync(file, content);
      console.log('Updated ' + file);
    }
  }
}
