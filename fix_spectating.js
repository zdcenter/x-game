const fs = require('fs');

const tsFiles = [
  'frontend/src/app/features/games/classic2048/classic2048.component.ts',
  'frontend/src/app/features/games/tetris/tetris.component.ts',
  'frontend/src/app/features/games/block/block.component.ts',
  'frontend/src/app/features/games/drop2048/drop2048.component.ts',
  'frontend/src/app/features/games/sokoban/sokoban.component.ts'
];

tsFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Remove AdsenseComponent import and usage
  content = content.replace(/import\s*{\s*AdsenseComponent\s*}\s*from\s*'[^']+';\s*/g, '');
  content = content.replace(/AdsenseComponent\s*,?\s*/g, '');

  // 2. Add GameSpectatingOverlayComponent import if not present
  if (!content.includes('GameSpectatingOverlayComponent')) {
    content = "import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';\n" + content;
    
    // add to imports array
    content = content.replace(/imports:\s*\[/, "imports: [GameSpectatingOverlayComponent, ");
  }

  // Ensure computed is imported
  if (!content.includes('computed,') && !content.includes(', computed')) {
     content = content.replace(/import\s*{/, 'import { computed,');
  }

  // 3. Add spectatingPlayers computed property
  if (!content.includes('spectatingPlayers = computed')) {
    if (file.includes('classic2048')) {
      content = content.replace(/(export class \w+.*?implements.*\{)/, `$1
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => {
    return this.store.playersList().map(p => {
      const board = this.store.pkBoards()[p.id];
      return {
        id: p.id,
        score: board?.score || 0,
        status: board?.status || 'playing'
      };
    });
  });`);
    } else if (file.includes('tetris') || file.includes('block') || file.includes('drop2048')) {
      content = content.replace(/(export class \w+.*?implements.*\{)/, `$1
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => {
    const opps = this.store.opponents().map(opp => ({
      id: opp.id,
      score: opp.score || 0,
      status: opp.finished ? 'finished' : 'playing'
    }));
    const me = {
      id: this.playerId,
      score: this.store.score(),
      status: this.store.status() === GameStatus.Finished ? 'finished' : 'playing'
    };
    return [me, ...opps];
  });`);
    } else if (file.includes('sokoban')) {
      content = content.replace(/(export class \w+.*?implements.*\{)/, `$1
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => []);`);
    }
  }

  fs.writeFileSync(file, content, 'utf8');
});

// Update HTML templates for tetris, block, drop2048
const htmlFiles = [
  'frontend/src/app/features/games/tetris/tetris.component.html',
  'frontend/src/app/features/games/block/block.component.html',
  'frontend/src/app/features/games/drop2048/drop2048.component.html'
];

htmlFiles.forEach(file => {
  let html = fs.readFileSync(file, 'utf8');
  
  html = html.replace(/@if\s*\(store\.currentRoomMode\(\)\s*!==\s*GameMode\.Single\s*&&\s*store\.status\(\)\s*===\s*GameStatus\.Playing\s*&&\s*store\.localStatus\(\)\s*===\s*GameStatus\.Finished\)\s*\{[\s\S]*?\}\s*<\/div>\s*\}/g,
`@if (store.currentRoomMode() !== GameMode.Single && store.status() === GameStatus.Playing && store.localStatus() === GameStatus.Finished) {
          <app-game-spectating-overlay
            [players]="spectatingPlayers()"
            [currentUserId]="playerId"
          ></app-game-spectating-overlay>
        }`);

  // In case the ad banner block was different and regex missed it
  html = html.replace(/@if\s*\(store\.currentRoomMode\(\)\s*!==\s*GameMode\.Single\s*&&\s*store\.status\(\)\s*===\s*GameStatus\.Playing\s*&&\s*store\.localStatus\(\)\s*===\s*GameStatus\.Finished\)\s*\{[\s\S]*?\}\s*<!-- AD BANNER -->[\s\S]*?\}\s*<\/div>\s*<\/div>\s*\}/g,
`@if (store.currentRoomMode() !== GameMode.Single && store.status() === GameStatus.Playing && store.localStatus() === GameStatus.Finished) {
          <app-game-spectating-overlay
            [players]="spectatingPlayers()"
            [currentUserId]="playerId"
          ></app-game-spectating-overlay>
        }`);

  fs.writeFileSync(file, html, 'utf8');
});

// Update sokoban inline template
let sokobanTs = fs.readFileSync('frontend/src/app/features/games/sokoban/sokoban.component.ts', 'utf8');
sokobanTs = sokobanTs.replace(/@if\s*\(store\.currentRoomMode\(\)\s*!==\s*GameMode\.Single\s*&&\s*store\.status\(\)\s*===\s*GameStatus\.Playing\s*&&\s*store\.localStatus\(\)\s*===\s*GameStatus\.Finished\)\s*\{[\s\S]*?\}\s*<\/div>\s*\}/g,
`@if (store.currentRoomMode() !== GameMode.Single && store.status() === GameStatus.Playing && store.localStatus() === GameStatus.Finished) {
          <app-game-spectating-overlay
            [players]="spectatingPlayers()"
            [currentUserId]="playerId"
          ></app-game-spectating-overlay>
        }`);
fs.writeFileSync('frontend/src/app/features/games/sokoban/sokoban.component.ts', sokobanTs, 'utf8');

