const fs = require('fs');

const tsPath = '/home/zd/x-game/frontend/src/app/features/games/math24/components/math24-pk-steal/math24-pk-steal.component.ts';
let ts = fs.readFileSync(tsPath, 'utf8');

// Replace the constructor and add roundWinner
const newConstructor = `  roundWinner = signal<{name: string, isMe: boolean} | null>(null);

  constructor() {
    let lastRound = 0;
    let lastScores: Record<string, any> = {};

    effect(() => {
      const state = this.store.rawState() as any;
      const currentRound = state.round || 0;
      const currentScores = state.players || {};
      const puzzle = state.puzzle;

      if (currentRound > lastRound && lastRound > 0) {
        // Someone won the round!
        let winner = '';
        for (const pid in currentScores) {
           if (currentScores[pid].score > (lastScores[pid]?.score || 0)) {
               winner = pid;
           }
        }
        
        untracked(() => {
           this.roundWinner.set({ name: winner, isMe: winner === this.playerId });
           setTimeout(() => {
              this.roundWinner.set(null);
              if (puzzle && puzzle.cards) {
                 this.store.loadPuzzle(puzzle.cards);
              }
           }, 2000);
        });
      } else {
        // Initial load or normal update
        if (puzzle && puzzle.cards && !this.roundWinner()) {
           untracked(() => this.store.loadPuzzle(puzzle.cards));
        }
      }

      lastRound = currentRound;
      lastScores = JSON.parse(JSON.stringify(currentScores));
    });
  }`;

ts = ts.replace(/  constructor\(\) \{\s*effect\(\(\) => \{\s*const puzzle = this\.store\.currentPuzzle\(\);\s*if \(puzzle && puzzle\.cards\) \{\s*this\.store\.loadPuzzle\(puzzle\.cards\);\s*\}\s*\}\);\s*\}/, newConstructor);

const newOverlay = `        <!-- Round Winner Overlay -->
        <div *ngIf="roundWinner()" 
             class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-[60] animate-in fade-in duration-300">
          <span class="text-8xl mb-6 animate-bounce">{{ roundWinner()?.isMe ? '🎉' : '👏' }}</span>
          <h2 class="text-5xl font-black mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
              [ngClass]="roundWinner()?.isMe ? 'text-green-400' : 'text-blue-400'">
            {{ roundWinner()?.isMe ? 'You' : roundWinner()?.name }} Solved It!
          </h2>
          <div class="text-3xl font-bold text-yellow-400 bg-yellow-400/20 px-6 py-3 rounded-full border border-yellow-400/50">
            +10 Points
          </div>
          <p class="text-white/70 mt-6 text-xl font-medium animate-pulse">Get ready for next round...</p>
        </div>`;

ts = ts.replace(/<!-- Main Board Area -->/, `<!-- Main Board Area -->\n${newOverlay}`);

fs.writeFileSync(tsPath, ts);
console.log('Updated math24-pk-steal with round winner overlay');
