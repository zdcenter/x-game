import { Component, HostListener, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SokobanStore } from '../../store/sokoban.store';

@Component({
  selector: 'app-sokoban-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full bg-sky-200 rounded-xl border-[4px] border-slate-700 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] overflow-hidden flex items-center justify-center touch-none select-none"
         (touchstart)="onTouchStart($event)"
         (touchend)="onTouchEnd($event)">
      
      <div class="grid relative shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-sky-200/50"
           [style.grid-template-columns]="'repeat(' + cols() + ', minmax(0, 1fr))'"
           [style.grid-template-rows]="'repeat(' + rows() + ', minmax(0, 1fr))'"
           [style.width]="boardWidth()"
           [style.height]="boardHeight()">
        
        @for (row of store.myBoard(); track $index; let r = $index) {
          @for (cell of row; track $index; let c = $index) {
            <div class="flex items-center justify-center w-full h-full relative" [ngClass]="getCellClass(cell)">
              
              @if (cell === '#') {
                <!-- Grey/White Brick Wall -->
                <div class="absolute inset-0 bg-[#cbd5e1] z-10"
                     style="box-shadow: inset 4px 4px 0px rgba(255,255,255,0.9), inset -4px -4px 0px rgba(71,85,105,0.9), 4px 4px 8px rgba(0,0,0,0.7);">
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
              } @else {
                <!-- Blue Brick Floor -->
                <div class="absolute inset-0 bg-[#3b82f6] z-0"
                     style="box-shadow: inset 4px 4px 10px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.2);">
                  <svg class="w-full h-full opacity-50 absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#1e3a8a" stroke-width="3"/>
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#1e3a8a" stroke-width="3"/>
                    <line x1="0" y1="75" x2="100" y2="75" stroke="#1e3a8a" stroke-width="3"/>
                    
                    <line x1="50" y1="0" x2="50" y2="25" stroke="#1e3a8a" stroke-width="3"/>
                    <line x1="25" y1="25" x2="25" y2="50" stroke="#1e3a8a" stroke-width="3"/>
                    <line x1="75" y1="25" x2="75" y2="50" stroke="#1e3a8a" stroke-width="3"/>
                    <line x1="50" y1="50" x2="50" y2="75" stroke="#1e3a8a" stroke-width="3"/>
                    <line x1="25" y1="75" x2="25" y2="100" stroke="#1e3a8a" stroke-width="3"/>
                    <line x1="75" y1="75" x2="75" y2="100" stroke="#1e3a8a" stroke-width="3"/>
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
                <div class="w-[85%] h-[85%] bg-[#fef08a] relative flex items-center justify-center z-20"
                     [ngClass]="{'shadow-[0_0_20px_rgba(34,197,94,0.8)] bg-[#fde047]': cell === '*'}"
                     style="box-shadow: inset 3px 3px 0px rgba(255,255,255,0.9), inset -3px -3px 0px rgba(202,138,4,0.9), 3px 3px 6px rgba(0,0,0,0.6);">
                  <!-- Green X and border -->
                  <div class="absolute inset-0 m-[3px] border-[3px] border-[#166534] flex items-center justify-center">
                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                      <line x1="0" y1="0" x2="100" y2="100" stroke="#166534" stroke-width="15"/>
                      <line x1="100" y1="0" x2="0" y2="100" stroke="#166534" stroke-width="15"/>
                    </svg>
                  </div>
                  <!-- Red Dots -->
                  <div class="absolute top-[2px] left-[2px] w-[18%] h-[18%] bg-red-600 rounded-full"></div>
                  <div class="absolute top-[2px] right-[2px] w-[18%] h-[18%] bg-red-600 rounded-full"></div>
                  <div class="absolute bottom-[2px] left-[2px] w-[18%] h-[18%] bg-red-600 rounded-full"></div>
                  <div class="absolute bottom-[2px] right-[2px] w-[18%] h-[18%] bg-red-600 rounded-full"></div>
                </div>
              }

              @if (cell === '@' || cell === '+') {
                <!-- Player -->
                <div class="w-[90%] h-[90%] z-30 relative flex items-center justify-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]">
                  <svg viewBox="0 0 100 100" class="w-full h-full">
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
                    <!-- Arms -->
                    <path d="M 35 60 L 20 70" stroke="#ef4444" stroke-width="10" stroke-linecap="round" />
                    <path d="M 65 60 L 80 70" stroke="#ef4444" stroke-width="10" stroke-linecap="round" />
                    <!-- Hands -->
                    <circle cx="17" cy="72" r="6" fill="#fff" />
                    <circle cx="83" cy="72" r="6" fill="#fff" />
                    <!-- Legs -->
                    <rect x="40" y="80" width="8" height="10" fill="#1f2937" />
                    <rect x="52" y="80" width="8" height="10" fill="#1f2937" />
                    <!-- Shoes -->
                    <ellipse cx="44" cy="94" rx="8" ry="4" fill="#fff" />
                    <ellipse cx="56" cy="94" rx="8" ry="4" fill="#fff" />
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

  getCellClass(cell: string): string {
    return 'bg-transparent';
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.store.status() !== 'playing' || this.store.isDead()) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.store.move('up');
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.store.move('down');
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.store.move('left');
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.store.move('right');
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
          this.store.move(dx > 0 ? 'right' : 'left');
          event.preventDefault();
        }
      } else {
        if (Math.abs(dy) > 30) {
          this.store.move(dy > 0 ? 'down' : 'up');
          event.preventDefault();
        }
      }
    }
  }
}
