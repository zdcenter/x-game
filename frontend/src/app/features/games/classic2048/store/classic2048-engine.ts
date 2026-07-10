export class Classic2048Engine {
  cells: number[][] = [];
  score: number = 0;
  moves: number = 0;
  history: { cells: number[][], score: number, moves: number }[] = [];
  status: string = 'waiting';
  boardSize: number = 4;
  winTarget: number = 2048;
  particles: any[] = [];
  config: { onSound?: (s: string) => void, onHaptic?: (type: 'light'|'medium'|'heavy'|'success'|'error') => void, onReviveShake?: () => void } = {};

  initGame(options: any) {
    this.boardSize = 4;
    this.winTarget = 2048;
    if (options?.difficulty === 'easy') this.boardSize = 5;
    if (options?.difficulty === 'hard') this.boardSize = 3;
    
    this.cells = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
    this.score = 0;
    this.moves = 0;
    this.history = [];
    this.particles = [];
    this.status = 'playing';
    
    if (options?.onSound) this.config.onSound = options.onSound;
    if (options?.onHaptic) this.config.onHaptic = options.onHaptic;
    if (options?.onReviveShake) this.config.onReviveShake = options.onReviveShake;
    
    this.spawnTile();
    this.spawnTile();
  }

  handleAction(action: any): boolean {
    if (action.action === 'undo') {
      if (this.history.length > 0) {
        const lastState = this.history.pop()!;
        this.cells = lastState.cells;
        this.score = lastState.score;
        this.moves = lastState.moves;
        this.status = 'playing'; // Revert game over if it was finished
        return true;
      }
      return false;
    }

    if (action.action === 'move') {
      // Save state before move
      const prevCells = this.cells.map(row => [...row]);
      const prevScore = this.score;
      const prevMoves = this.moves;

      const changed = this.move(action.dir);
      if (changed) {
        this.history.push({ cells: prevCells, score: prevScore, moves: prevMoves });
        this.moves++;
        
        if (this.checkWin(this.winTarget)) {
          this.status = 'finished';
        } else if (this.checkGameOver()) {
          this.status = 'finished';
        }
      }
      return changed;
    }
    return false;
  }

  private spawnTile() {
    const emptyCoords = [];
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (this.cells[r][c] === 0) {
          emptyCoords.push({ r, c });
        }
      }
    }
    if (emptyCoords.length === 0) return;
    const idx = Math.floor(Math.random() * emptyCoords.length);
    const { r, c } = emptyCoords[idx];
    this.cells[r][c] = Math.random() < 0.1 ? 4 : 2;
  }

  private move(dir: string): boolean {
    let changed = false;
    let rotations = 0;
    switch (dir) {
      case 'up': rotations = 3; break;
      case 'right': rotations = 2; break;
      case 'down': rotations = 1; break;
      case 'left': rotations = 0; break;
      default: return false;
    }

    for (let i = 0; i < rotations; i++) this.rotateRight();

    for (let r = 0; r < this.boardSize; r++) {
      // Compress
      const newRow = this.cells[r].filter(val => val !== 0);
      while (newRow.length < this.boardSize) newRow.push(0);

      // Merge
      for (let c = 0; c < this.boardSize - 1; c++) {
        if (newRow[c] !== 0 && newRow[c] === newRow[c + 1]) {
          newRow[c] *= 2;
          this.score += newRow[c];
          newRow[c + 1] = 0;
          changed = true;
        }
      }

      // Compress again
      const finalRow = newRow.filter(val => val !== 0);
      while (finalRow.length < this.boardSize) finalRow.push(0);

      for (let c = 0; c < this.boardSize; c++) {
        if (this.cells[r][c] !== finalRow[c]) changed = true;
        this.cells[r][c] = finalRow[c];
      }
    }

    for (let i = 0; i < (4 - rotations) % 4; i++) this.rotateRight();

    if (changed) {
      this.spawnTile();
    }
    return changed;
  }

  private rotateRight() {
    const newCells = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        newCells[c][this.boardSize - 1 - r] = this.cells[r][c];
      }
    }
    this.cells = newCells;
  }

  private checkWin(target: number): boolean {
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (this.cells[r][c] >= target) return true;
      }
    }
    return false;
  }

  checkGameOver(): boolean {
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (this.cells[r][c] === 0) return false;
        if (r > 0 && this.cells[r - 1][c] === this.cells[r][c]) return false;
        if (r < this.boardSize - 1 && this.cells[r + 1][c] === this.cells[r][c]) return false;
        if (c > 0 && this.cells[r][c - 1] === this.cells[r][c]) return false;
        if (c < this.boardSize - 1 && this.cells[r][c + 1] === this.cells[r][c]) return false;
      }
    }
    return true;
  }

  generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  getColorForValue(val: number): string {
    switch (val) {
      case 2:    return '#eee4da';
      case 4:    return '#ede0c8';
      case 8:    return '#f2b179';
      case 16:   return '#f59563';
      case 32:   return '#f67c5f';
      case 64:   return '#f65e3b';
      case 128:  return '#edcf72';
      case 256:  return '#edcc61';
      case 512:  return '#edc850';
      case 1024: return '#edc53f';
      case 2048: return '#edc22e';
      default:   return '#3c3a32';
    }
  }

  revive() {
    if (this.status !== 'finished') return;

    // Collect all blocks
    const blocks: {r: number, c: number, val: number}[] = [];
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (this.cells[r][c] > 0) {
          blocks.push({r, c, val: this.cells[r][c]});
        }
      }
    }

    if (blocks.length === 0) return;

    // Find unique values
    const uniqueValues = Array.from(new Set(blocks.map(b => b.val))).sort((a, b) => a - b);
    
    // Destroy up to 40% of unique values
    let cutoffIndex = Math.max(1, Math.floor(uniqueValues.length * 0.4));
    let cutoffValue = Math.max(16, uniqueValues[cutoffIndex] || 16);

    const blocksToDestroy = blocks.filter(b => b.val <= cutoffValue);
    
    // Sort randomly
    blocksToDestroy.sort(() => Math.random() - 0.5);

    this.status = 'playing';

    let delay = 0;
    const intervalTime = 80;

    blocksToDestroy.forEach((block) => {
      setTimeout(() => {
        if (this.cells[block.r][block.c] !== block.val) return; // double check

        // Spawn particles — 360° radial burst
        const newParticles: any[] = [];
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
          const speed = 40 + Math.random() * 120;
          newParticles.push({
            id: this.generateId(),
            c: block.c,
            r: block.r,
            color: this.getColorForValue(block.val),
            size: Math.round(6 + Math.random() * 16),
            tx: Math.cos(angle) * speed,
            ty: Math.sin(angle) * speed
          });
        }
        this.particles = [...this.particles, ...newParticles];

        // Remove block
        this.cells[block.r][block.c] = 0;

        // Effects
        if (this.config.onHaptic) this.config.onHaptic('medium');
        if (this.config?.onSound) this.config.onSound('drop');
        if (this.config?.onReviveShake) this.config.onReviveShake();

        // Clear particles after animation completes
        setTimeout(() => {
          const pIds = new Set(newParticles.map(p => p.id));
          this.particles = this.particles.filter(x => !pIds.has(x.id));
        }, 1200);

      }, delay);
      delay += intervalTime;
    });
  }
}
