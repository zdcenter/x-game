const fs = require('fs');

const tsPath = '/home/zd/x-game/frontend/src/app/features/games/math24/components/math24-pk-steal/math24-pk-steal.component.ts';
if (fs.existsSync(tsPath)) {
  let ts = fs.readFileSync(tsPath, 'utf8');

  // Add frozenRemaining signal if not already there
  if (!ts.includes('frozenRemaining = signal(0);')) {
    ts = ts.replace("store = inject(Math24Store);", 
    `store = inject(Math24Store);
      frozenRemaining = signal(0);`);

    // Replace constructor
    const effectCode = `  constructor() {
    effect(() => {
      // Whenever round changes, load the new puzzle
      const puzzle = this.store.currentPuzzle();
      if (puzzle && puzzle.cards) {
        this.store.loadPuzzle(puzzle.cards);
      }
    });

    effect((onCleanup) => {
      const p = this.store.players()[this.playerId];
      const until = p?.freezeUntil || 0;
      const now = Date.now();
      let interval: any;
      if (until > now) {
        this.frozenRemaining.set(Math.ceil((until - now) / 1000));
        interval = setInterval(() => {
          const rem = Math.ceil((until - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(interval);
            this.frozenRemaining.set(0);
          } else {
            this.frozenRemaining.set(rem);
          }
        }, 200);
      } else {
        this.frozenRemaining.set(0);
      }
      onCleanup(() => {
        if (interval) clearInterval(interval);
      });
    });
  }`;

    ts = ts.replace(/  constructor\(\) \{\s*effect\(\(\) => \{\s*\/\/ Whenever round changes, load the new puzzle\s*const puzzle = this\.store\.currentPuzzle\(\);\s*if \(puzzle && puzzle\.cards\) \{\s*this\.store\.loadPuzzle\(puzzle\.cards\);\s*\}\s*\}\);\s*\}/, effectCode);

    // Replace isMyPlayerFrozen
    ts = ts.replace(/  isMyPlayerFrozen\(\): boolean \{\s*const p = this\.store\.players\(\)\[this\.playerId\];\s*return this\.isFrozen\(p\);\s*\}/, 
    `  isMyPlayerFrozen(): boolean {
        return this.frozenRemaining() > 0;
      }`);

    html = ts.replace(`<span class="text-6xl mb-4 animate-bounce">🥶</span>`, `<span class="text-6xl mb-4 animate-bounce">🥶</span>\n          <div class="text-4xl text-white font-black mb-2">{{ frozenRemaining() }}</div>`);
    
    fs.writeFileSync(tsPath, html);
    console.log('Fixed math24-pk-steal.component.ts');
  }
}
