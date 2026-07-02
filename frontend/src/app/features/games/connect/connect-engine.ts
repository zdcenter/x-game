export interface Position {
  r: number;
  c: number;
}

export interface Endpoint {
  color: number;
  p1: Position;
  p2: Position;
}

export interface ConnectPuzzleDef {
  width: number;
  height: number;
  endpoints: Endpoint[];
  blocks?: Position[];
}

export class ConnectEngine {
  width: number;
  height: number;
  grid: number[][]; // 0 = empty, >0 = color, -1 = block
  endpoints: Endpoint[];
  blocks: Position[];
  
  // Mapping of color -> ordered array of positions
  paths: Map<number, Position[]>;
  
  constructor(puzzle: ConnectPuzzleDef) {
    this.width = puzzle.width;
    this.height = puzzle.height;
    this.endpoints = puzzle.endpoints;
    this.blocks = puzzle.blocks || [];
    this.paths = new Map();
    this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(0));

    // Place endpoints
    for (const ep of this.endpoints) {
      this.grid[ep.p1.r][ep.p1.c] = ep.color;
      this.grid[ep.p2.r][ep.p2.c] = ep.color;
      this.paths.set(ep.color, [ep.p1]); // initialize path starting at p1
    }

    // Place blocks
    for (const b of this.blocks) {
      this.grid[b.r][b.c] = -1;
    }
  }

  isEndpoint(r: number, c: number): boolean {
    return this.endpoints.some(ep => 
      (ep.p1.r === r && ep.p1.c === c) || 
      (ep.p2.r === r && ep.p2.c === c)
    );
  }

  isEndpointOfColor(r: number, c: number, color: number): boolean {
    const ep = this.endpoints.find(e => e.color === color);
    if (!ep) return false;
    return (ep.p1.r === r && ep.p1.c === c) || (ep.p2.r === r && ep.p2.c === c);
  }

  isBlock(r: number, c: number): boolean {
    return this.grid[r][c] === -1;
  }

  // Draw or erase a segment of a pipe
  drawTo(r: number, c: number, color: number) {
    if (r < 0 || r >= this.height || c < 0 || c >= this.width) return;
    if (this.isBlock(r, c)) return; // Cannot enter a block
    
    const path = this.paths.get(color);
    if (!path || path.length === 0) return;

    // The head of the current path
    const head = path[path.length - 1];

    // Same cell, do nothing
    if (head.r === r && head.c === c) return;

    // Must be adjacent to head
    const dr = Math.abs(head.r - r);
    const dc = Math.abs(head.c - c);
    if (dr + dc !== 1) return;

    // Check if we are drawing over the SAME color (going backwards)
    const existingIndex = path.findIndex(p => p.r === r && p.c === c);
    if (existingIndex !== -1) {
      // Erase everything after this index
      const removed = path.splice(existingIndex + 1);
      for (const pos of removed) {
        if (!this.isEndpoint(pos.r, pos.c)) {
          this.grid[pos.r][pos.c] = 0;
        }
      }
      return;
    }

    // Check if path is already completed (head reached the OTHER endpoint)
    if (this.isEndpointOfColor(head.r, head.c, color) && path.length > 1) {
       // It's complete, cannot extend from the target endpoint
       // Unless we clicked on the target endpoint to start erasing
       return;
    }

    // If target cell is another color's endpoint, reject
    if (this.isEndpoint(r, c) && !this.isEndpointOfColor(r, c, color)) {
      return;
    }

    // If target cell is occupied by a DIFFERENT color's pipe, break that pipe!
    const targetColor = this.grid[r][c];
    if (targetColor !== 0 && targetColor !== color) {
      this.breakPathAt(r, c, targetColor);
    }

    // Add to path
    path.push({ r, c });
    this.grid[r][c] = color;
  }

  breakPathAt(r: number, c: number, color: number) {
    const path = this.paths.get(color);
    if (!path) return;
    const index = path.findIndex(p => p.r === r && p.c === c);
    if (index !== -1) {
      // Remove everything from this index onwards
      const removed = path.splice(index);
      for (const pos of removed) {
        if (!this.isEndpoint(pos.r, pos.c)) {
          this.grid[pos.r][pos.c] = 0;
        }
      }
    }
  }

  isSolved(): boolean {
    // 1. All non-block cells must be filled
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.grid[r][c] === 0) return false;
      }
    }

    // 2. All colors must have a path that connects their two endpoints
    for (const ep of this.endpoints) {
      const path = this.paths.get(ep.color);
      if (!path || path.length < 2) return false;
      
      const head = path[path.length - 1];
      
      // If path doesn't end at an endpoint of this color, it's not connected
      if (!this.isEndpointOfColor(head.r, head.c, ep.color)) {
        return false;
      }
    }

    return true;
  }

  // Find which color path a position belongs to
  getColorAt(r: number, c: number): number {
    return this.grid[r][c];
  }

  // Allows starting a drag from ANY part of an existing pipe
  // This effectively truncates the pipe to that point and sets it as active
  startDragFrom(r: number, c: number): number | null {
    const color = this.grid[r][c];
    if (color === 0) return null;

    // Truncate the path to this point
    const path = this.paths.get(color);
    if (path) {
      const index = path.findIndex(p => p.r === r && p.c === c);
      if (index !== -1) {
        // Break after this point
        const removed = path.splice(index + 1);
        for (const pos of removed) {
          if (!this.isEndpoint(pos.r, pos.c)) {
            this.grid[pos.r][pos.c] = 0;
          }
        }
      } else if (this.isEndpointOfColor(r, c, color)) {
        // Clicked on the OTHER endpoint which is not in the path yet.
        // Clear the old path and start from here.
        for (const pos of path) {
          if (!this.isEndpoint(pos.r, pos.c)) {
            this.grid[pos.r][pos.c] = 0;
          }
        }
        this.paths.set(color, [{ r, c }]);
      }
    }
    return color;
  }
}
