const fs = require('fs');
const path = require('path');

function generateConnect(width, height, targetColors) {
    let grid = Array.from({ length: height }, () => Array(width).fill(0));
    
    function getNeighbors(r, c) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        let neighbors = [];
        for (let [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < height && nc >= 0 && nc < width && grid[nr][nc] === 0) {
                neighbors.push([nr, nc]);
            }
        }
        return neighbors;
    }
    
    let color = 1;
    let paths = [];
    
    // 1. Fill grid greedily
    while (true) {
        let emptyCells = [];
        for (let r=0; r<height; r++) {
            for (let c=0; c<width; c++) {
                if (grid[r][c] === 0) {
                    emptyCells.push([r, c]);
                }
            }
        }
        
        if (emptyCells.length === 0) break;
        
        let start = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        grid[start[0]][start[1]] = color;
        let current = start;
        let pathCells = [start];
        
        while (true) {
            let n = getNeighbors(current[0], current[1]);
            if (n.length === 0) break;
            
            let next = n[Math.floor(Math.random() * n.length)];
            grid[next[0]][next[1]] = color;
            current = next;
            pathCells.push(current);
            
            if (pathCells.length >= 2 && Math.random() < 0.3) {
                break;
            }
        }
        
        paths.push({ id: color, cells: pathCells });
        color++;
    }
    
    // 2. Merge paths to reduce to targetColors
    while (paths.length > targetColors) {
        let mergeCandidates = [];
        
        for (let i = 0; i < paths.length; i++) {
            for (let j = i + 1; j < paths.length; j++) {
                let p1 = paths[i];
                let p2 = paths[j];
                
                let p1_e1 = p1.cells[0];
                let p1_e2 = p1.cells[p1.cells.length - 1];
                let p2_e1 = p2.cells[0];
                let p2_e2 = p2.cells[p2.cells.length - 1];
                
                function isAdj(c1, c2) {
                    return Math.abs(c1[0] - c2[0]) + Math.abs(c1[1] - c2[1]) === 1;
                }
                
                if (isAdj(p1_e2, p2_e1)) mergeCandidates.push({ i, j, reverse1: false, reverse2: false });
                else if (isAdj(p1_e2, p2_e2)) mergeCandidates.push({ i, j, reverse1: false, reverse2: true });
                else if (isAdj(p1_e1, p2_e1)) mergeCandidates.push({ i, j, reverse1: true, reverse2: false });
                else if (isAdj(p1_e1, p2_e2)) mergeCandidates.push({ i, j, reverse1: true, reverse2: true });
            }
        }
        
        if (mergeCandidates.length === 0) {
            break;
        }
        
        let cand = mergeCandidates[Math.floor(Math.random() * mergeCandidates.length)];
        let p1 = paths[cand.i];
        let p2 = paths[cand.j];
        
        let newCells = [];
        if (cand.reverse1) newCells = newCells.concat([...p1.cells].reverse());
        else newCells = newCells.concat(p1.cells);
        
        if (cand.reverse2) newCells = newCells.concat([...p2.cells].reverse());
        else newCells = newCells.concat(p2.cells);
        
        let nextPaths = [];
        for (let idx = 0; idx < paths.length; idx++) {
            if (idx === cand.i) {
                nextPaths.push({ id: p1.id, cells: newCells });
            } else if (idx !== cand.j) {
                nextPaths.push(paths[idx]);
            }
        }
        paths = nextPaths;
    }
    
    // Strict match: if not exactly targetColors, fail
    if (paths.length !== targetColors) return null;
    
    // Validate length >= 2
    for (let p of paths) {
        if (p.cells.length < 2) return null;
    }
    
    // Randomize colors
    paths.sort(() => Math.random() - 0.5);
    paths.forEach((p, i) => p.color = i + 1);
    
    let endpoints = paths.map(p => {
        return {
            color: p.color,
            p1: [p.cells[0][1], p.cells[0][0]], // x, y (col, row)
            p2: [p.cells[p.cells.length-1][1], p.cells[p.cells.length-1][0]]
        };
    });
    
    return endpoints;
}

function tryGenerate(width, height, targetColors) {
    for (let i = 0; i < 5000; i++) {
        let ep = generateConnect(width, height, targetColors);
        if (ep) return ep;
    }
    throw new Error("Failed to generate connect puzzle for " + width + "x" + height + " with " + targetColors + " colors");
}

let puzzles = [];

function addPuzzles(diff, w, h, colors, count) {
    for (let i = 0; i < count; i++) {
        let endpoints = tryGenerate(w, h, colors);
        puzzles.push({
            id: `CONNECT-${diff.toUpperCase()}-${String(puzzles.length+1).padStart(3, '0')}`,
            difficulty: diff,
            width: w,
            height: h,
            endpoints: JSON.stringify(endpoints),
            blocks: "[]",
            created_at: new Date().toISOString()
        });
    }
}

// User requested: Easy ~5, Hard ~8

// 200 easy
addPuzzles('easy', 5, 5, 5, 100);
addPuzzles('easy', 6, 6, 5, 100);
console.log("Easy done");

// 200 medium
addPuzzles('medium', 6, 6, 6, 100);
addPuzzles('medium', 7, 7, 6, 100);
console.log("Medium done");

// 200 hard
addPuzzles('hard', 8, 8, 7, 100);
addPuzzles('hard', 8, 10, 7, 100);
console.log("Hard done");

// 200 expert
addPuzzles('expert', 9, 9, 8, 100);
addPuzzles('expert', 10, 10, 8, 100);
console.log("Expert done");

const p = path.resolve(__dirname, '../pkg/db/connect_seeds.json');
fs.writeFileSync(p, JSON.stringify(puzzles, null, 2));
console.log("connect_seeds.json updated! Count:", puzzles.length);
