const fs = require('fs');
const tsPath = '/home/zd/x-game/frontend/src/app/features/games/math24/math24.component.ts';
let ts = fs.readFileSync(tsPath, 'utf8');

// Add startingCountdown signal
ts = ts.replace("view = signal<'lobby' | 'room' | 'play'>('lobby');", 
`view = signal<'lobby' | 'room' | 'play'>('lobby');
  startingCountdown = signal(3);
  private countdownInterval: any;`);

// Replace effect
const oldEffect = `    effect(() => {
      const status = this.store.gameStatus();
      if (this.store.currentMode() !== 'single') {
        if (status === 'playing') {
          untracked(() => this.view.set('play'));
        } else if (status === 'waiting') {
          untracked(() => this.view.set('room'));
        }
      }
    });`;

const newEffect = `    effect(() => {
      const status = this.store.gameStatus();
      if (this.store.currentMode() !== 'single') {
        if (status === 'starting') {
          untracked(() => {
            this.view.set('play');
            this.startingCountdown.set(3);
            if (this.countdownInterval) clearInterval(this.countdownInterval);
            this.countdownInterval = setInterval(() => {
              this.startingCountdown.update(v => Math.max(1, v - 1));
            }, 1000);
          });
        } else if (status === 'playing') {
          untracked(() => {
            this.view.set('play');
            if (this.countdownInterval) clearInterval(this.countdownInterval);
          });
        } else if (status === 'waiting') {
          untracked(() => {
            this.view.set('room');
            if (this.countdownInterval) clearInterval(this.countdownInterval);
          });
        }
      }
    });`;

ts = ts.replace(oldEffect, newEffect);

// Also add clear interval in ngOnDestroy
const oldDestroy = `    super.ngOnDestroy();
    this.store.leaveRoom();`;
const newDestroy = `    super.ngOnDestroy();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.store.leaveRoom();`;
ts = ts.replace(oldDestroy, newDestroy);

fs.writeFileSync(tsPath, ts);

const htmlPath = '/home/zd/x-game/frontend/src/app/features/games/math24/math24.component.html';
let html = fs.readFileSync(htmlPath, 'utf8');
const oldContentArea = `        } @else {
          <app-math24-board></app-math24-board>
        }`;
const newContentArea = `        } @else {
          <app-math24-board></app-math24-board>
        }

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
        }`;
html = html.replace(oldContentArea, newContentArea);
fs.writeFileSync(htmlPath, html);
