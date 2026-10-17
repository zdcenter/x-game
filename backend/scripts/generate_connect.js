const fs = require('fs');
const path = require('path');

function generatePartition(w, h, k, minDist = 2, minLen = 3) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

  for (let attempt = 0; attempt < 100; attempt++) {
    let paths = [];
    let cellPath = Array.from({ length: h }, () => Array(w).fill(-1));
    let pathCount = 0;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        let id = pathCount++;
        paths[id] = [[r, c]];
        cellPath[r][c] = id;
      }
    }

    let activePaths = new Set(paths.keys());
    let mergeStuck = false;

    function creates2x2(pA_id, pB_id) {
      for (let pt of paths[pB_id]) {
        let r = pt[0], c = pt[1];
        for (let dr of [-1, 0]) {
          for (let dc of [-1, 0]) {
            let r0 = r + dr, c0 = c + dc;
            if (r0 >= 0 && r0 + 1 < h && c0 >= 0 && c0 + 1 < w) {
              let c00 = cellPath[r0][c0], c01 = cellPath[r0][c0+1];
              let c10 = cellPath[r0+1][c0], c11 = cellPath[r0+1][c0+1];
              let match00 = c00 === pA_id || c00 === pB_id;
              let match01 = c01 === pA_id || c01 === pB_id;
              let match10 = c10 === pA_id || c10 === pB_id;
              let match11 = c11 === pA_id || c11 === pB_id;
              if (match00 && match01 && match10 && match11) return true;
            }
          }
        }
      }
      return false;
    }

    while (activePaths.size > k) {
      let allCandidates = [];
      for (let id of activePaths) {
        let p = paths[id];
        let e1 = p[0], e2 = p[p.length - 1];
        for (let [dr, dc] of dirs) {
          let nr = e1[0] + dr, nc = e1[1] + dc;
          if (nr >= 0 && nr < h && nc >= 0 && nc < w) {
            let nid = cellPath[nr][nc];
            if (nid !== id && activePaths.has(nid)) {
              let np = paths[nid];
              if (nr === np[0][0] && nc === np[0][1]) allCandidates.push({ pA: id, endA: 0, pB: nid, endB: 0 });
              else if (nr === np[np.length - 1][0] && nc === np[np.length - 1][1]) allCandidates.push({ pA: id, endA: 0, pB: nid, endB: 1 });
            }
          }
        }
        if (p.length > 1) {
          for (let [dr, dc] of dirs) {
            let nr = e2[0] + dr, nc = e2[1] + dc;
            if (nr >= 0 && nr < h && nc >= 0 && nc < w) {
              let nid = cellPath[nr][nc];
              if (nid !== id && activePaths.has(nid)) {
                let np = paths[nid];
                if (nr === np[0][0] && nc === np[0][1]) allCandidates.push({ pA: id, endA: 1, pB: nid, endB: 0 });
                else if (nr === np[np.length - 1][0] && nc === np[np.length - 1][1]) allCandidates.push({ pA: id, endA: 1, pB: nid, endB: 1 });
              }
            }
          }
        }
      }

      if (allCandidates.length === 0) {
        mergeStuck = true;
        break;
      }

      // Filter out candidates that create 2x2
      let safeCandidates = allCandidates.filter(c => !creates2x2(c.pA, c.pB));
      let pool = safeCandidates.length > 0 ? safeCandidates : allCandidates;

      let currentMin = Infinity;
      for (let id of activePaths) {
        if (paths[id].length < currentMin) currentMin = paths[id].length;
      }

      let preferred = pool.filter(c => paths[c.pA].length <= currentMin + 1 || paths[c.pB].length <= currentMin + 1);
      if (preferred.length === 0) preferred = pool;

      if (activePaths.size <= k + 2) {
        let nonLoop = preferred.filter(c => {
          let pA = paths[c.pA], pB = paths[c.pB];
          let freeEndA = c.endA === 0 ? pA[pA.length - 1] : pA[0];
          let freeEndB = c.endB === 0 ? pB[pB.length - 1] : pB[0];
          let d = Math.abs(freeEndA[0] - freeEndB[0]) + Math.abs(freeEndA[1] - freeEndB[1]);
          return d >= minDist;
        });
        if (nonLoop.length > 0) preferred = nonLoop;
      }

      let cand = preferred[Math.floor(Math.random() * preferred.length)];
      let pA = paths[cand.pA], pB = paths[cand.pB];
      let cellsA = cand.endA === 0 ? [...pA].reverse() : [...pA];
      let cellsB = cand.endB === 1 ? [...pB].reverse() : [...pB];
      let merged = cellsA.concat(cellsB);
      paths[cand.pA] = merged;
      for (let pt of cellsB) cellPath[pt[0]][pt[1]] = cand.pA;
      activePaths.delete(cand.pB);
    }

    if (mergeStuck || activePaths.size !== k) continue;
    let finalPaths = [...activePaths].map(id => paths[id]);
    if (finalPaths.some(p => p.length < minLen)) continue;
    if (finalPaths.some(p => (Math.abs(p[0][0] - p[p.length - 1][0]) + Math.abs(p[0][1] - p[p.length - 1][1])) < minDist)) continue;

    // Shuffle colors
    finalPaths.sort(() => Math.random() - 0.5);

    let endpoints = finalPaths.map((p, idx) => ({
      color: idx + 1,
      p1: [p[0][1], p[0][0]], // [col, row]
      p2: [p[p.length - 1][1], p[p.length - 1][0]]
    }));

    return { endpoints, width: w, height: h };
  }

  return null;
}

function generateLevel(w, h, k, minDist, minLen) {
  for (let i = 0; i < 50; i++) {
    let res = generatePartition(w, h, k, minDist, minLen);
    if (res) return res;
  }
  return generatePartition(w, h, k, Math.max(2, minDist - 1), Math.max(3, minLen - 1));
}

async function main() {
  console.log('Generating 100% full-board Connect puzzles...');
  const puzzles = [];

  // 1. Easy: 100 levels (50x 5x5, 50x 6x6)
  console.log('Generating Easy (100 levels)...');
  for (let i = 1; i <= 100; i++) {
    let w = i <= 50 ? 5 : 6;
    let h = w;
    let k = i <= 50 ? (i % 2 === 0 ? 5 : 4) : 5;
    let lvl = generateLevel(w, h, k, 2, 3);
    puzzles.push({
      id: `CONNECT-EASY-${String(i).padStart(3, '0')}`,
      difficulty: 'easy',
      width: lvl.width,
      height: lvl.height,
      endpoints: JSON.stringify(lvl.endpoints),
      blocks: '[]',
      created_at: new Date().toISOString()
    });
  }

  // 2. Medium: 100 levels (50x 6x6, 50x 7x7)
  console.log('Generating Medium (100 levels)...');
  for (let i = 1; i <= 100; i++) {
    let w = i <= 50 ? 6 : 7;
    let h = w;
    let k = i <= 50 ? (i % 2 === 0 ? 6 : 5) : 6;
    let lvl = generateLevel(w, h, k, 2, 3);
    puzzles.push({
      id: `CONNECT-MEDIUM-${String(i).padStart(3, '0')}`,
      difficulty: 'medium',
      width: lvl.width,
      height: lvl.height,
      endpoints: JSON.stringify(lvl.endpoints),
      blocks: '[]',
      created_at: new Date().toISOString()
    });
  }

  // 3. Hard: 100 levels (8x8, 6-7 colors)
  console.log('Generating Hard (100 levels)...');
  for (let i = 1; i <= 100; i++) {
    let w = 8, h = 8;
    let k = i % 2 === 0 ? 7 : 6;
    let lvl = generateLevel(w, h, k, 2, 4);
    puzzles.push({
      id: `CONNECT-HARD-${String(i).padStart(3, '0')}`,
      difficulty: 'hard',
      width: lvl.width,
      height: lvl.height,
      endpoints: JSON.stringify(lvl.endpoints),
      blocks: '[]',
      created_at: new Date().toISOString()
    });
  }

  // 4. Expert: 100 levels (9x9, 7-8 colors)
  console.log('Generating Expert (100 levels)...');
  for (let i = 1; i <= 100; i++) {
    let w = 9, h = 9;
    let k = i % 2 === 0 ? 8 : 7;
    let lvl = generateLevel(w, h, k, 2, 4);
    puzzles.push({
      id: `CONNECT-EXPERT-${String(i).padStart(3, '0')}`,
      difficulty: 'expert',
      width: lvl.width,
      height: lvl.height,
      endpoints: JSON.stringify(lvl.endpoints),
      blocks: '[]',
      created_at: new Date().toISOString()
    });
  }

  const outputPath = path.resolve(__dirname, '../pkg/db/connect_seeds.json');
  fs.writeFileSync(outputPath, JSON.stringify(puzzles, null, 2), 'utf-8');
  console.log(`Generated ${puzzles.length} puzzles successfully! Saved to: ${outputPath}`);
}

main();
