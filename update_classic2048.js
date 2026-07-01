const fs = require('fs');

const tsFile = 'frontend/src/app/features/games/classic2048/classic2048.component.ts';
let ts = fs.readFileSync(tsFile, 'utf8');

if (!ts.includes('GameSpectatingOverlayComponent')) {
  ts = ts.replace(/import\s*\{[^}]*\}\s*from\s*'@angular\/core';/, match => match.replace('computed', 'computed').includes('computed') ? match : match.replace('{', '{ computed,'));
  if (!ts.includes('computed')) {
     ts = ts.replace("import { Component", "import { Component, computed");
  }
  ts = "import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';\n" + ts;
  
  // add to imports array
  ts = ts.replace(/imports:\s*\[/, "imports: [GameSpectatingOverlayComponent, ");
  
  // add computed property
  ts = ts.replace(/export class Classic2048Component\s*\{/, `export class Classic2048Component {
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
  fs.writeFileSync(tsFile, ts);
}

const htmlFile = 'frontend/src/app/features/games/classic2048/classic2048.component.html';
let html = fs.readFileSync(htmlFile, 'utf8');

// replace the big spectating block
html = html.replace(/@if\s*\(store\.currentRoomMode\(\)\s*!==\s*GameMode\.Single\s*&&\s*store\.status\(\)\s*===\s*GameStatus\.Playing\s*&&\s*store\.localStatus\(\)\s*===\s*GameStatus\.Finished\)\s*\{[\s\S]*?\}\s*<!-- AD BANNER -->[\s\S]*?\}\s*<\/div>\s*<\/div>\s*\}/, 
`@if (store.currentRoomMode() !== GameMode.Single && store.status() === GameStatus.Playing && store.localStatus() === GameStatus.Finished) {
          <app-game-spectating-overlay
            [players]="spectatingPlayers()"
            [currentUserId]="playerId"
          ></app-game-spectating-overlay>
        }`);

fs.writeFileSync(htmlFile, html);
