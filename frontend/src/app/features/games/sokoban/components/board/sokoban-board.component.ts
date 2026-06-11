import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SokobanStore } from '../../store/sokoban.store';

@Component({
  selector: 'app-sokoban-board',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .player-wrapper {
      transition: transform 0.2s ease;
    }
    .player-wrapper.facing-left {
      transform: scaleX(-1);
    }
    
    @keyframes walk-leg-l {
      0% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
      100% { transform: translateY(0); }
    }
    @keyframes walk-leg-r {
      0% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
      100% { transform: translateY(0); }
    }
    @keyframes push-arm-l {
      0% { transform: translateY(0); }
      50% { transform: translateY(-4px) scaleY(1.1); }
      100% { transform: translateY(0); }
    }
    @keyframes push-arm-r {
      0% { transform: translateY(0); }
      50% { transform: translateY(-4px) scaleY(1.1); }
      100% { transform: translateY(0); }
    }

    .action-walk .leg-l {
      animation: walk-leg-l 0.25s ease-in-out;
    }
    .action-walk .leg-r {
      animation: walk-leg-r 0.25s ease-in-out 0.12s;
    }
    
    .action-push .leg-l {
      animation: walk-leg-l 0.25s ease-in-out;
    }
    .action-push .leg-r {
      animation: walk-leg-r 0.25s ease-in-out 0.12s;
    }
    .action-push .arm-l {
      animation: push-arm-l 0.25s ease-in-out;
      transform-origin: center top;
    }
    .action-push .arm-r {
      animation: push-arm-r 0.25s ease-in-out;
      transform-origin: center top;
    }
`],
  template: `
    <div class="relative w-full h-full bg-sky-200 rounded-xl border-[4px] border-slate-700 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] overflow-hidden flex items-center justify-center touch-none select-none"
         (touchstart)="onTouchStart($event)"
         (touchend)="onTouchEnd($event)">
      
      <div class="grid relative bg-[#3b82f6]"
           style="box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 4px 4px 10px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.2); background-image: url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\' width=\'60\' height=\'60\'%3E%3Cline x1=\'0\' y1=\'25\' x2=\'100\' y2=\'25\' stroke=\'%231e3a8a\' stroke-width=\'3\'/%3E%3Cline x1=\'0\' y1=\'50\' x2=\'100\' y2=\'50\' stroke=\'%231e3a8a\' stroke-width=\'3\'/%3E%3Cline x1=\'0\' y1=\'75\' x2=\'100\' y2=\'75\' stroke=\'%231e3a8a\' stroke-width=\'3\'/%3E%3Cline x1=\'50\' y1=\'0\' x2=\'50\' y2=\'25\' stroke=\'%231e3a8a\' stroke-width=\'3\'/%3E%3Cline x1=\'25\' y1=\'25\' x2=\'25\' y2=\'50\' stroke=\'%231e3a8a\' stroke-width=\'3\'/%3E%3Cline x1=\'75\' y1=\'25\' x2=\'75\' y2=\'50\' stroke=\'%231e3a8a\' stroke-width=\'3\'/%3E%3Cline x1=\'50\' y1=\'50\' x2=\'50\' y2=\'75\' stroke=\'%231e3a8a\' stroke-width=\'3\'/%3E%3Cline x1=\'25\' y1=\'75\' x2=\'25\' y2=\'100\' stroke=\'%231e3a8a\' stroke-width=\'3\'/%3E%3Cline x1=\'75\' y1=\'75\' x2=\'75\' y2=\'100\' stroke=\'%231e3a8a\' stroke-width=\'3\'/%3E%3C/svg%3E');"
           [style.grid-template-columns]="'repeat(' + cols() + ', minmax(0, 1fr))'"
           [style.grid-template-rows]="'repeat(' + rows() + ', minmax(0, 1fr))'"
           [style.width]="boardWidth()"
           [style.height]="boardHeight()">
        
        @for (row of store.myBoard(); track $index; let r = $index) {
          @for (cell of row; track $index; let c = $index) {
            <div class="flex items-center justify-center w-full h-full relative"
                 [ngClass]="getFloorClass(r, c)">
              
              @if (cell === '#') {
                <!-- Grey/White Brick Wall -->
                <div class="absolute inset-0 bg-[#cbd5e1] z-10"
                     [ngStyle]="getWallStyle(r, c)">
                  <svg class="w-full h-full opacity-40 absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#334155" stroke-width="3"/>
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" stroke-width="3"/>
                    <line x1="0" y1="75" x2="100" y2="75" stroke="#334155" stroke-width="3"/>
                    
                    <line x1="50" y1="0" x2="50" y2="25" stroke="#334155" stroke-width="3"/>
                    <line x1="25" y1="25" x2="25" y2="50" stroke="#334155" stroke-width="3"/>
                    <line x1="75" y1="25" x2="75" y2="50" stroke="#334155" stroke-width="3"/>
                    <line x1="50" y1="50" x2="50" y2="75" stroke="#334155" stroke-width="3"/>
                    <line x1="25" y1="75" x2="25" y2="100" stroke="#334155" stroke-width="3"/>
                    <line x1="75" y1="75" x2="75" y2="100" stroke="#334155" stroke-width="3"/>
                  </svg>
                </div>
              }

              @if (cell === '.' || cell === '*' || cell === '+') {
                <!-- Target Orb -->
                <div class="absolute inset-0 flex items-center justify-center z-10">
                  <div class="w-[35%] h-[35%] rounded-full bg-gradient-to-br from-[#fef08a] to-[#eab308] shadow-[0_0_15px_rgba(250,204,21,1)] border border-[#ca8a04]"></div>
                </div>
              }

              @if (cell === '$' || cell === '*') {
                <!-- Box -->
                <div class="w-[85%] h-[85%] relative flex items-center justify-center z-20 transition-all duration-300"
                     [ngStyle]="getBoxStyle(cell)">
                  <!-- Inner Border and X -->
                  <div class="absolute inset-0 m-[3px] border-[3px] flex items-center justify-center transition-colors duration-300"
                       [ngClass]="cell === '*' ? 'border-white' : 'border-[#166534]'">
                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                      <line x1="0" y1="0" x2="100" y2="100" stroke-width="15" [attr.stroke]="cell === '*' ? 'white' : '#166534'" class="transition-colors duration-300"/>
                      <line x1="100" y1="0" x2="0" y2="100" stroke-width="15" [attr.stroke]="cell === '*' ? 'white' : '#166534'" class="transition-colors duration-300"/>
                    </svg>
                  </div>
                  <!-- Corner Dots -->
                  <div class="absolute top-[2px] left-[2px] w-[18%] h-[18%] rounded-full transition-colors duration-300" [ngClass]="cell === '*' ? 'bg-yellow-300' : 'bg-red-600'"></div>
                  <div class="absolute top-[2px] right-[2px] w-[18%] h-[18%] rounded-full transition-colors duration-300" [ngClass]="cell === '*' ? 'bg-yellow-300' : 'bg-red-600'"></div>
                  <div class="absolute bottom-[2px] left-[2px] w-[18%] h-[18%] rounded-full transition-colors duration-300" [ngClass]="cell === '*' ? 'bg-yellow-300' : 'bg-red-600'"></div>
                  <div class="absolute bottom-[2px] right-[2px] w-[18%] h-[18%] rounded-full transition-colors duration-300" [ngClass]="cell === '*' ? 'bg-yellow-300' : 'bg-red-600'"></div>
                </div>
              }

              @if (cell === '@' || cell === '+') {
                <!-- Player -->
                <div class="w-[90%] h-[90%] z-30 relative flex items-center justify-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] player-wrapper"
                     [ngClass]="[playerDir() === 'left' ? 'facing-left' : 'facing-right', 'action-' + playerAction()]">
                  <svg viewBox="0 0 100 100" class="w-full h-full">
                    <!-- Head & Body Group -->
                    <g class="body-head">
                      <!-- Hair -->
                      <path d="M 20 30 Q 50 -5 80 30 L 80 40 L 20 40 Z" fill="#111827" />
                      <!-- Face -->
                      <rect x="30" y="30" width="40" height="25" rx="5" fill="#fcd34d" />
                      <!-- Glasses/Mask -->
                      <rect x="25" y="35" width="50" height="12" rx="3" fill="#e5e7eb" stroke="#4b5563" stroke-width="2"/>
                      <circle cx="40" cy="41" r="3" fill="#000" />
                      <circle cx="60" cy="41" r="3" fill="#000" />
                      <!-- Body (Red shirt) -->
                      <path d="M 35 55 L 65 55 L 70 85 L 30 85 Z" fill="#ef4444" />
                      <!-- White shirt collar -->
                      <polygon points="45,55 55,55 50,65" fill="#fff" />
                    </g>
                    <!-- Left Arm & Hand -->
                    <g class="arm-l">
                      <path d="M 35 60 L 20 70" stroke="#ef4444" stroke-width="10" stroke-linecap="round" />
                      <circle cx="17" cy="72" r="6" fill="#fff" />
                    </g>
                    <!-- Right Arm & Hand -->
                    <g class="arm-r">
                      <path d="M 65 60 L 80 70" stroke="#ef4444" stroke-width="10" stroke-linecap="round" />
                      <circle cx="83" cy="72" r="6" fill="#fff" />
                    </g>
                    <!-- Left Leg & Shoe -->
                    <g class="leg-l">
                      <rect x="40" y="80" width="8" height="10" fill="#1f2937" />
                      <ellipse cx="44" cy="94" rx="8" ry="4" fill="#fff" />
                    </g>
                    <!-- Right Leg & Shoe -->
                    <g class="leg-r">
                      <rect x="52" y="80" width="8" height="10" fill="#1f2937" />
                      <ellipse cx="56" cy="94" rx="8" ry="4" fill="#fff" />
                    </g>
                  </svg>
                </div>
              }
            </div>
          }
        }

      </div>
    </div>
  `
})
export class SokobanBoardComponent {
  playerDir = signal<'up' | 'down' | 'left' | 'right'>('right');
  playerAction = signal<'idle' | 'walk' | 'push'>('idle');
  private actionTimeout: any;

  triggerMove(dir: 'up' | 'down' | 'left' | 'right') {
    if (dir === 'left' || dir === 'right') {
      this.playerDir.set(dir);
    }
    
    const board = this.store.myBoard();
    let pr = -1, pc = -1;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c] === '@' || board[r][c] === '+') { pr = r; pc = c; break; }
      }
      if (pr !== -1) break;
    }
    
    let nextCell = '';
    if (pr !== -1) {
      if (dir === 'up' && pr > 0) nextCell = board[pr-1][pc];
      if (dir === 'down' && pr < board.length-1) nextCell = board[pr+1][pc];
      if (dir === 'left' && pc > 0) nextCell = board[pr][pc-1];
      if (dir === 'right' && pc < board[pr].length-1) nextCell = board[pr][pc+1];
    }

    const isBox = nextCell === '$' || nextCell === '*';
    const state = this.store.myPlayerState();
    const preMoves = state ? state.moves : 0;
    
    this.store.move(dir);
    
    // Check if move was successful by observing state again (synchronous execution assumed for local store)
    const newState = this.store.myPlayerState();
    const postMoves = newState ? newState.moves : 0;
    
    if (postMoves > preMoves) {
      this.playerAction.set(isBox ? 'push' : 'walk');
      if (this.actionTimeout) clearTimeout(this.actionTimeout);
      this.actionTimeout = setTimeout(() => {
        this.playerAction.set('idle');
      }, 250);
    }
  }

  store = inject(SokobanStore);

  rows = computed(() => this.store.myBoard().length || 1);
  cols = computed(() => {
    const b = this.store.myBoard();
    return b.length > 0 ? b[0].length : 1;
  });

  boardRatio = computed(() => this.cols() / this.rows());

  boardWidth = computed(() => {
    if (this.boardRatio() > 1) return '100%';
    return `calc(100% * ${this.boardRatio()})`;
  });

  boardHeight = computed(() => {
    if (this.boardRatio() <= 1) return '100%';
    return `calc(100% / ${this.boardRatio()})`;
  });

  private touchStartX = 0;
  private touchStartY = 0;

  getFloorClass(r: number, c: number): string {
    return (r + c) % 2 === 0 ? 'bg-white/5' : 'bg-black/10';
  }

  getWallStyle(r: number, c: number) {
    const board = this.store.myBoard();
    const rowStr = board[r] || '';
    const topStr = board[r - 1] || '';
    const bottomStr = board[r + 1] || '';

    const isTopOuter = r === 0 || topStr[c] !== '#';
    const isBottomOuter = r === board.length - 1 || bottomStr[c] !== '#';
    const isLeftOuter = c === 0 || rowStr[c - 1] !== '#';
    const isRightOuter = c === rowStr.length - 1 || rowStr[c + 1] !== '#';
    
    const shadows = [];
    
    if (isTopOuter) shadows.push('inset 0 4px 0px rgba(255,255,255,0.9)');
    if (isLeftOuter) shadows.push('inset 4px 0 0px rgba(255,255,255,0.9)');
    if (isBottomOuter) shadows.push('inset 0 -4px 0px rgba(71,85,105,0.9)');
    if (isRightOuter) shadows.push('inset -4px 0 0px rgba(71,85,105,0.9)');
    
    if (isBottomOuter || isRightOuter) {
      shadows.push('4px 4px 6px rgba(0,0,0,0.6)');
    }

    return {
      'box-shadow': shadows.join(', ')
    };
  }

  getBoxStyle(cell: string) {
    if (cell === '*') {
      // Box on target: Bright Green box, intense green glow
      return {
        'background-color': '#22c55e', // green-500
        'box-shadow': 'inset 3px 3px 0px rgba(255,255,255,0.8), inset -3px -3px 0px rgba(20,83,45,0.8), 0 0 20px 5px rgba(34,197,94,0.9)'
      };
    } else {
      // Normal box: Yellow box, normal drop shadow
      return {
        'background-color': '#fef08a', // yellow-200
        'box-shadow': 'inset 3px 3px 0px rgba(255,255,255,0.9), inset -3px -3px 0px rgba(202,138,4,0.9), 3px 3px 6px rgba(0,0,0,0.6)'
      };
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.store.status() !== 'playing' || this.store.isDead()) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.triggerMove('up');
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.triggerMove('down');
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.triggerMove('left');
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.triggerMove('right');
        event.preventDefault();
        break;
      case 'z':
      case 'Z':
        if (event.ctrlKey || event.metaKey) {
          this.store.undo();
          event.preventDefault();
        }
        break;
    }
  }

  onTouchStart(event: TouchEvent) {
    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (event.changedTouches.length > 0) {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      
      const dx = touchEndX - this.touchStartX;
      const dy = touchEndY - this.touchStartY;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) {
          this.triggerMove(dx > 0 ? 'right' : 'left');
          event.preventDefault();
        }
      } else {
        if (Math.abs(dy) > 30) {
          this.triggerMove(dy > 0 ? 'down' : 'up');
          event.preventDefault();
        }
      }
    }
  }
}
