const fs = require('fs');

const radius = 4;
const cells = new Map();
function coordToString(q, r, s) { return `${q},${r},${s}`; }

for (let q = -radius; q <= radius; q++) {
  for (let r = -radius; r <= radius; r++) {
    const s = -q - r;
    if (Math.abs(s) <= radius) {
      cells.set(coordToString(q, r, s), { q, r, s, filled: true });
    }
  }
}

function setEmpty(q, r, s) {
  cells.get(coordToString(q, r, s)).filled = false;
}

// Top row: 3 empty on left
setEmpty(0, -4, 4);
setEmpty(1, -4, 3);
setEmpty(2, -4, 2);

// 2nd row: 3rd empty
setEmpty(1, -3, 2);

// Right edge: 3 empty
setEmpty(4, -3, -1);
setEmpty(4, -2, -2);
setEmpty(4, -1, -3);

// Let's add all empty cells we found:
setEmpty(4, 0, -4); // wait, let's just make all right edge empty
setEmpty(3, 1, -4);
setEmpty(2, 2, -4);
setEmpty(-2, 4, -2);
setEmpty(-1, 4, -3);
setEmpty(0, 4, -4);
setEmpty(-1, -1, 2); // isolated
setEmpty(0, -3, 3); // maybe this is empty too?

const piece = [{ q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: -1, r: 1, s: 0 }, { q: 0, r: -1, s: 1 }];

let canFit = false;
for (const cell of cells.values()) {
  let fit = true;
  for (const offset of piece) {
    const tq = cell.q + offset.q;
    const tr = cell.r + offset.r;
    const ts = cell.s + offset.s;
    const target = cells.get(coordToString(tq, tr, ts));
    if (!target || target.filled) {
      fit = false;
      break;
    }
  }
  if (fit) {
    console.log(`Fits at ${cell.q}, ${cell.r}, ${cell.s}!`);
    canFit = true;
  }
}

if (!canFit) console.log("Cannot fit anywhere!");
