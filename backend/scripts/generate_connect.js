const fs = require('fs');
const path = require('path');

function generateConnect(width, height) {
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
    
    while (true) {
        let start = null;
        // Randomize the empty cell search a bit
        let emptyCells = [];
        for (let r=0; r<height; r++) {
            for (let c=0; c<width; c++) {
                if (grid[r][c] === 0) {
                    emptyCells.push([r, c]);
                }
            }
        }
        
        if (emptyCells.length === 0) break;
        
        start = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        
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
            
            // Randomly stop growing this path (e.g., 20% chance) 
            if (pathCells.length >= 3 && Math.random() < 0.2) {
                break;
            }
        }
        
        paths.push({ color, cells: pathCells });
        color++;
    }
    
    // Validate
    for (let p of paths) {
        if (p.cells.length < 2) return null;
    }
    
    let maxColors = Math.floor((width * height) / 3);
    if (paths.length > maxColors) return null;
    
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

function tryGenerate(width, height) {
    for (let i = 0; i < 5000; i++) {
        let ep = generateConnect(width, height);
        if (ep) return ep;
    }
    throw new Error("Failed to generate connect puzzle for " + width + "x" + height);
}

let puzzles = [];

function addPuzzles(diff, w, h, count) {
    for (let i = 0; i < count; i++) {
        let endpoints = tryGenerate(w, h);
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

// 200 easy
addPuzzles('easy', 5, 5, 100);
addPuzzles('easy', 6, 6, 100);
console.log("Easy done");

// 200 medium
addPuzzles('medium', 6, 6, 100);
addPuzzles('medium', 7, 7, 100);
console.log("Medium done");

// 200 hard
addPuzzles('hard', 8, 8, 100);
addPuzzles('hard', 8, 10, 100);
console.log("Hard done");

// 200 expert
addPuzzles('expert', 9, 9, 100);
addPuzzles('expert', 10, 10, 100);
console.log("Expert done");

const p = path.resolve(__dirname, '../pkg/db/connect_seeds.json');
fs.writeFileSync(p, JSON.stringify(puzzles, null, 2));
console.log("connect_seeds.json updated! Count:", puzzles.length);
