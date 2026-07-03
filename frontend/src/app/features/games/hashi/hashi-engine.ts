export interface Island {
  r: number;
  c: number;
  value: number;
  currentBridges: number;
}

export interface Bridge {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  count: number; // 1 or 2
  // Helper to know orientation
  isHorizontal: boolean;
}

export class HashiEngine {
  width: number = 0;
  height: number = 0;
  grid: number[][] = []; // 0 = empty, >0 = island requirement
  
  islands: Island[] = [];
  bridges: Bridge[] = [];
  potentialBridges: Bridge[] = [];
  solutionBridges: Bridge[] | null = null;

  initGame(grid: number[][]) {
    this.height = grid.length;
    this.width = grid[0].length;
    this.grid = grid;
    this.islands = [];
    this.bridges = [];

    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.grid[r][c] > 0) {
          this.islands.push({
            r,
            c,
            value: this.grid[r][c],
            currentBridges: 0
          });
        }
      }
    }
    
    this.calculatePotentialBridges();
    this.calculateSolution();
  }

  private calculateSolution(): boolean {
    const origBridges = [...this.bridges];
    this.bridges = [];
    this.recalculateIslandBridges();

    const success = this.solveBacktrack(0);

    if (success) {
        this.solutionBridges = [...this.bridges].map(b => ({...b}));
    }

    this.bridges = origBridges;
    this.recalculateIslandBridges();

    return success;
  }

  private solveBacktrack(pbIndex: number): boolean {
    for (const island of this.islands) {
       if (island.currentBridges > island.value) return false;
       
       // Pruning: check if it's still possible to satisfy this island
       let possibleMore = 0;
       for (let i = pbIndex; i < this.potentialBridges.length; i++) {
           const p = this.potentialBridges[i];
           if ((p.r1 === island.r && p.c1 === island.c) || (p.r2 === island.r && p.c2 === island.c)) {
               possibleMore += 2;
           }
       }
       if (island.currentBridges + possibleMore < island.value) return false;
    }

    if (pbIndex === this.potentialBridges.length) {
       return this.isSolved();
    }

    const pb = this.potentialBridges[pbIndex];
    let maxCount = 2;

    if (!this.canConnect(pb.r1, pb.c1, pb.r2, pb.c2)) {
        maxCount = 0;
    } else {
        const i1 = this.getIslandAt(pb.r1, pb.c1)!;
        const i2 = this.getIslandAt(pb.r2, pb.c2)!;
        maxCount = Math.min(2, i1.value - i1.currentBridges, i2.value - i2.currentBridges);
    }

    for (let count = maxCount; count >= 0; count--) {
        if (count > 0) {
            this.bridges.push({
               r1: pb.r1, c1: pb.c1, r2: pb.r2, c2: pb.c2,
               count: count,
               isHorizontal: pb.r1 === pb.r2
            });
            this.recalculateIslandBridges();
        }

        if (this.solveBacktrack(pbIndex + 1)) {
            return true;
        }

        if (count > 0) {
            this.bridges.pop();
            this.recalculateIslandBridges();
        }
    }
    return false;
  }

  private calculatePotentialBridges() {
    this.potentialBridges = [];
    for (let i = 0; i < this.islands.length; i++) {
      for (let j = i + 1; j < this.islands.length; j++) {
        const i1 = this.islands[i];
        const i2 = this.islands[j];
        if (i1.r === i2.r || i1.c === i2.c) {
          // Check if there are any islands in between
          let hasIslandInBetween = false;
          if (i1.r === i2.r) {
            const minC = Math.min(i1.c, i2.c);
            const maxC = Math.max(i1.c, i2.c);
            for (let c = minC + 1; c < maxC; c++) {
              if (this.getIslandAt(i1.r, c)) {
                hasIslandInBetween = true;
                break;
              }
            }
          } else {
            const minR = Math.min(i1.r, i2.r);
            const maxR = Math.max(i1.r, i2.r);
            for (let r = minR + 1; r < maxR; r++) {
              if (this.getIslandAt(r, i1.c)) {
                hasIslandInBetween = true;
                break;
              }
            }
          }
          if (!hasIslandInBetween) {
            this.potentialBridges.push({
              r1: Math.min(i1.r, i2.r),
              c1: Math.min(i1.c, i2.c),
              r2: Math.max(i1.r, i2.r),
              c2: Math.max(i1.c, i2.c),
              count: 0,
              isHorizontal: i1.r === i2.r
            });
          }
        }
      }
    }
  }

  // Find island at r, c
  getIslandAt(r: number, c: number): Island | undefined {
    return this.islands.find(i => i.r === r && i.c === c);
  }

  // Normalize bridge coordinates so r1<=r2 and c1<=c2
  private normalizeCoords(r1: number, c1: number, r2: number, c2: number) {
    if (r1 > r2 || c1 > c2) {
      return { r1: r2, c1: c2, r2: r1, c2: c1 };
    }
    return { r1, c1, r2, c2 };
  }

  // Check if a line between two points crosses any island or existing bridge
  canConnect(r1: number, c1: number, r2: number, c2: number): boolean {
    const norm = this.normalizeCoords(r1, c1, r2, c2);
    const isHorizontal = norm.r1 === norm.r2;
    const isVertical = norm.c1 === norm.c2;

    if (!isHorizontal && !isVertical) return false;
    if (norm.r1 === norm.r2 && norm.c1 === norm.c2) return false;

    // Check crossing islands
    if (isHorizontal) {
      for (let c = norm.c1 + 1; c < norm.c2; c++) {
        if (this.getIslandAt(norm.r1, c)) return false;
      }
    } else {
      for (let r = norm.r1 + 1; r < norm.r2; r++) {
        if (this.getIslandAt(r, norm.c1)) return false;
      }
    }

    // Check crossing other bridges
    for (const b of this.bridges) {
      // If it's the exact same bridge, that's fine (we are upgrading it)
      if (b.r1 === norm.r1 && b.c1 === norm.c1 && b.r2 === norm.r2 && b.c2 === norm.c2) continue;

      if (isHorizontal) {
        // If the other bridge is vertical, check for intersection
        if (!b.isHorizontal) {
          if (b.c1 > norm.c1 && b.c1 < norm.c2 && norm.r1 > b.r1 && norm.r1 < b.r2) {
            return false;
          }
        } else {
          // Both horizontal, check if they overlap
          if (b.r1 === norm.r1 && !(norm.c2 <= b.c1 || norm.c1 >= b.c2)) {
             return false;
          }
        }
      } else {
        // We are vertical
        // If the other bridge is horizontal, check intersection
        if (b.isHorizontal) {
          if (b.r1 > norm.r1 && b.r1 < norm.r2 && norm.c1 > b.c1 && norm.c1 < b.c2) {
            return false;
          }
        } else {
          // Both vertical, check overlap
          if (b.c1 === norm.c1 && !(norm.r2 <= b.r1 || norm.r1 >= b.r2)) {
             return false;
          }
        }
      }
    }

    return true;
  }

  // Toggle bridge between two islands
  // 0 -> 1 -> 2 -> 0
  toggleBridge(r1: number, c1: number, r2: number, c2: number) {
    if (!this.canConnect(r1, c1, r2, c2)) return;

    const norm = this.normalizeCoords(r1, c1, r2, c2);
    const existingIdx = this.bridges.findIndex(b => b.r1 === norm.r1 && b.c1 === norm.c1 && b.r2 === norm.r2 && b.c2 === norm.c2);

    if (existingIdx >= 0) {
      const b = this.bridges[existingIdx];
      if (b.count === 1) {
        b.count = 2;
      } else {
        this.bridges.splice(existingIdx, 1);
      }
    } else {
      this.bridges.push({
        r1: norm.r1,
        c1: norm.c1,
        r2: norm.r2,
        c2: norm.c2,
        count: 1,
        isHorizontal: norm.r1 === norm.r2
      });
    }

    this.recalculateIslandBridges();
  }

  private recalculateIslandBridges() {
    for (const i of this.islands) {
      i.currentBridges = 0;
    }

    for (const b of this.bridges) {
      const i1 = this.getIslandAt(b.r1, b.c1);
      const i2 = this.getIslandAt(b.r2, b.c2);
      if (i1) i1.currentBridges += b.count;
      if (i2) i2.currentBridges += b.count;
    }
  }

  isSolved(): boolean {
    if (this.islands.length === 0) return false;

    // 1. Check all island requirements
    for (const i of this.islands) {
      if (i.currentBridges !== i.value) return false;
    }

    // 2. Check if all islands form a single connected component
    const visited = new Set<string>();
    const queue: Island[] = [this.islands[0]];
    visited.add(`${this.islands[0].r},${this.islands[0].c}`);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      // Find all connected islands
      for (const b of this.bridges) {
        let neighbor: Island | undefined;
        if (b.r1 === curr.r && b.c1 === curr.c) {
          neighbor = this.getIslandAt(b.r2, b.c2);
        } else if (b.r2 === curr.r && b.c2 === curr.c) {
          neighbor = this.getIslandAt(b.r1, b.c1);
        }

        if (neighbor) {
          const key = `${neighbor.r},${neighbor.c}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push(neighbor);
          }
        }
      }
    }

    return visited.size === this.islands.length;
  }

  getHintMove(): { r1: number, c1: number, r2: number, c2: number, targetCount: number, currentCount: number } | null {
     if (!this.solutionBridges) return null;

     for (const b of this.bridges) {
         const sb = this.solutionBridges.find(x => x.r1 === b.r1 && x.c1 === b.c1 && x.r2 === b.r2 && x.c2 === b.c2);
         if (!sb) {
             return { r1: b.r1, c1: b.c1, r2: b.r2, c2: b.c2, targetCount: 0, currentCount: b.count };
         } else if (sb.count < b.count) {
             return { r1: b.r1, c1: b.c1, r2: b.r2, c2: b.c2, targetCount: sb.count, currentCount: b.count };
         }
     }

     for (const sb of this.solutionBridges) {
         const b = this.bridges.find(x => x.r1 === sb.r1 && x.c1 === sb.c1 && x.r2 === sb.r2 && x.c2 === sb.c2);
         const current = b ? b.count : 0;
         if (current < sb.count) {
             return { r1: sb.r1, c1: sb.c1, r2: sb.r2, c2: sb.c2, targetCount: sb.count, currentCount: current };
         }
     }

     return null;
  }
}
