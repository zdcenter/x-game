const fs = require('fs');
const htmlPath = '/home/zd/x-game/frontend/src/app/features/games/math24/math24.component.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const oldContentArea = `        <ng-container *ngIf="store.currentMode() === 'single'">
          <app-math24-board></app-math24-board>
        </ng-container>
      </div>`;

const newContentArea = `        <ng-container *ngIf="store.currentMode() === 'single'">
          <app-math24-board></app-math24-board>
        </ng-container>

        <!-- Starting Overlay -->
        @if (store.gameStatus() === 'starting') {
          <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-2xl">
            <div class="flex flex-col items-center animate-pulse">
              <span class="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">
                {{ startingCountdown() }}
              </span>
              <span class="text-2xl text-white mt-4 font-bold">{{ i18n.t('game.starting')() || 'Get Ready!' }}</span>
            </div>
          </div>
        }
      </div>`;

html = html.replace(oldContentArea, newContentArea);
fs.writeFileSync(htmlPath, html);
