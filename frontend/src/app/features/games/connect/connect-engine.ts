export interface Position {
  r: number;
  c: number;
}

export interface Endpoint {
  color: number;
  p1: Position;
  p2: Position;
  path?: Position[];
}

export interface ConnectPuzzleDef {
  id?: string;
  width: number;
  height: number;
  endpoints: Endpoint[];
  blocks?: Position[];
}

export function normalizePosition(pos: any): Position {
  if (Array.isArray(pos)) {
    // Array format is [col, row] / [x, y]
    return { c: Number(pos[0]) || 0, r: Number(pos[1]) || 0 };
  }
  if (pos && typeof pos === 'object') {
    if ('r' in pos && 'c' in pos) {
      return { r: Number(pos.r) || 0, c: Number(pos.c) || 0 };
    }
    if ('y' in pos && 'x' in pos) {
      return { r: Number(pos.y) || 0, c: Number(pos.x) || 0 };
    }
    if ('row' in pos && 'col' in pos) {
      return { r: Number(pos.row) || 0, c: Number(pos.col) || 0 };
    }
  }
  return { r: 0, c: 0 };
}

export function normalizeConnectPuzzle(input: any): ConnectPuzzleDef {
  let raw = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = {};
    }
  }
  if (!raw || typeof raw !== 'object') {
    raw = {};
  }

  const id = typeof raw.id === 'string' ? raw.id : undefined;
  const width = Math.max(1, Number(raw.width) || 5);
  const height = Math.max(1, Number(raw.height) || 5);

  let rawEndpoints = raw.endpoints;
  if (typeof rawEndpoints === 'string') {
    try {
      rawEndpoints = JSON.parse(rawEndpoints);
    } catch {
      rawEndpoints = [];
    }
  }
  if (!Array.isArray(rawEndpoints)) {
    rawEndpoints = [];
  }

  const endpoints: Endpoint[] = [];
  if (rawEndpoints.length > 0) {
    if (rawEndpoints[0].r !== undefined && rawEndpoints[0].c !== undefined) {
      // Flat format [{"r": r, "c": c, "color": color}, ...]
      const colorMap = new Map<number, Position[]>();
      for (const ep of rawEndpoints) {
        const color = Number(ep.color) || 0;
        if (!colorMap.has(color)) colorMap.set(color, []);
        colorMap.get(color)!.push({ r: Number(ep.r) || 0, c: Number(ep.c) || 0 });
      }
      for (const [color, pts] of colorMap.entries()) {
        if (pts.length >= 2) {
          endpoints.push({ color, p1: pts[0], p2: pts[1] });
        }
      }
    } else {
      for (const ep of rawEndpoints) {
        if (!ep) continue;
        const color = Number(ep.color) || 0;
        const p1 = normalizePosition(ep.p1);
        const p2 = normalizePosition(ep.p2);
        let path: Position[] | undefined;
        if (Array.isArray(ep.path)) {
          path = ep.path.map((pt: any) => normalizePosition(pt));
        }
        endpoints.push({ color, p1, p2, path });
      }
    }
  }

  let rawBlocks = raw.blocks;
  if (typeof rawBlocks === 'string') {
    try {
      rawBlocks = JSON.parse(rawBlocks);
    } catch {
      rawBlocks = [];
    }
  }
  const blocks: Position[] = [];
  if (Array.isArray(rawBlocks)) {
    for (const b of rawBlocks) {
      if (b) blocks.push(normalizePosition(b));
    }
  }

  return {
    id,
    width,
    height,
    endpoints,
    blocks
  };
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
    const normalized = normalizeConnectPuzzle(puzzle);
    this.width = normalized.width;
    this.height = normalized.height;
    this.endpoints = normalized.endpoints;
    this.blocks = normalized.blocks || [];
    this.paths = new Map();
    this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(0));

    // Place endpoints
    for (const ep of this.endpoints) {
      if (this.grid[ep.p1.r] && this.grid[ep.p1.r][ep.p1.c] !== undefined) {
        this.grid[ep.p1.r][ep.p1.c] = ep.color;
      }
      if (this.grid[ep.p2.r] && this.grid[ep.p2.r][ep.p2.c] !== undefined) {
        this.grid[ep.p2.r][ep.p2.c] = ep.color;
      }
      this.paths.set(ep.color, [ep.p1]); // initialize path starting at p1
    }

    // Place blocks
    for (const b of this.blocks) {
      if (this.grid[b.r] && this.grid[b.r][b.c] !== undefined) {
        this.grid[b.r][b.c] = -1;
      }
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
    // 1. All cells must be filled (no 0s)
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.grid[r][c] === 0) {
          return false;
        }
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

  getConnectedFlowsCount(): number {
    let count = 0;
    for (const ep of this.endpoints) {
      const path = this.paths.get(ep.color);
      if (path && path.length >= 2) {
        const head = path[path.length - 1];
        if (this.isEndpointOfColor(head.r, head.c, ep.color)) {
          count++;
        }
      }
    }
    return count;
  }

  getTotalFlowsCount(): number {
    return this.endpoints.length;
  }

  getFilledCellsCount(): number {
    let filled = 0;
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.grid[r][c] !== 0) filled++;
      }
    }
    return filled;
  }

  getTotalCellsCount(): number {
    return this.width * this.height;
  }

  // Find which color path a position belongs to
  getColorAt(r: number, c: number): number {
    return this.grid[r][c];
  }

  // Clear any drawn path for a given color
  clearColor(color: number) {
    const path = this.paths.get(color);
    if (path) {
      for (const pos of path) {
        if (!this.isEndpoint(pos.r, pos.c)) {
          this.grid[pos.r][pos.c] = 0;
        }
      }
    }
    const ep = this.endpoints.find(e => e.color === color);
    if (ep) {
      this.paths.set(color, [ep.p1]);
    }
  }

  hasPath(color: number): boolean {
    const path = this.paths.get(color);
    return !!(path && path.length > 1);
  }

  // Reset entire board to starting state (clear all lines)
  resetAll() {
    for (const ep of this.endpoints) {
      this.clearColor(ep.color);
    }
  }

  // Provide a hint by correctly connecting one unsolved color
  applyHint(): boolean {
    for (const ep of this.endpoints) {
      if (!ep.path || ep.path.length === 0) continue;
      const currentPath = this.paths.get(ep.color);
      const isConnected = currentPath && currentPath.length > 1 &&
        this.isEndpointOfColor(currentPath[currentPath.length - 1].r, currentPath[currentPath.length - 1].c, ep.color);

      let matches = isConnected && currentPath?.length === ep.path.length;
      if (matches && currentPath) {
        for (let i = 0; i < currentPath.length; i++) {
          if (currentPath[i].r !== ep.path[i].r || currentPath[i].c !== ep.path[i].c) {
            matches = false;
            break;
          }
        }
      }

      if (!matches) {
        // Clear this color first
        this.clearColor(ep.color);

        // Clear any conflicting paths crossing this color's solution
        for (const pt of ep.path) {
          const occColor = this.grid[pt.r][pt.c];
          if (occColor !== 0 && occColor !== -1 && occColor !== ep.color) {
            this.clearColor(occColor);
          }
        }

        // Apply authentic solution path
        this.paths.set(ep.color, ep.path.map(p => ({ r: p.r, c: p.c })));
        for (const pt of ep.path) {
          this.grid[pt.r][pt.c] = ep.color;
        }
        return true;
      }
    }
    return false;
  }

  // Allows starting a drag from ANY part of an existing pipe or either endpoint
  startDragFrom(r: number, c: number): number | null {
    const color = this.grid[r][c];
    if (color === 0 || color === -1) return null;

    const path = this.paths.get(color);
    if (path) {
      // If clicking either endpoint (p1 or p2):
      // Clear old line segments and start from this endpoint
      if (this.isEndpointOfColor(r, c, color)) {
        for (const pos of path) {
          if (!this.isEndpoint(pos.r, pos.c)) {
            this.grid[pos.r][pos.c] = 0;
          }
        }
        this.paths.set(color, [{ r, c }]);
      } else {
        const index = path.findIndex(p => p.r === r && p.c === c);
        if (index !== -1) {
          // Break after this point
          const removed = path.splice(index + 1);
          for (const pos of removed) {
            if (!this.isEndpoint(pos.r, pos.c)) {
              this.grid[pos.r][pos.c] = 0;
            }
          }
        }
      }
    }
    return color;
  }

  exportPaths(): Record<number, Position[]> {
    const res: Record<number, Position[]> = {};
    for (const [color, path] of this.paths.entries()) {
      if (path && path.length > 0) {
        res[color] = path.map(p => ({ r: p.r, c: p.c }));
      }
    }
    return res;
  }

  loadPaths(pathsData: any) {
    let parsed = pathsData;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return;
      }
    }
    if (!parsed || typeof parsed !== 'object') return;

    // Reset grid cells back to 0 except blocks and endpoints
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (!this.isBlock(r, c) && !this.isEndpoint(r, c)) {
          this.grid[r][c] = 0;
        }
      }
    }
    this.paths.clear();
    for (const ep of this.endpoints) {
      this.paths.set(ep.color, [ep.p1]);
    }

    // Apply paths
    for (const [colorStr, pts] of Object.entries(parsed)) {
      const color = Number(colorStr);
      if (!Array.isArray(pts) || pts.length === 0) continue;
      const normalizedPath: Position[] = [];
      for (const pt of pts) {
        const pos = normalizePosition(pt);
        normalizedPath.push(pos);
        if (!this.isEndpoint(pos.r, pos.c) && this.grid[pos.r] && this.grid[pos.r][pos.c] !== undefined) {
          this.grid[pos.r][pos.c] = color;
        }
      }
      this.paths.set(color, normalizedPath);
    }
  }
}
