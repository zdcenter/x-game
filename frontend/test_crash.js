const endpointsStr = '[{"color": 1, "p1": [5, 2], "p2": [5, 3]}, {"color": 2, "p1": [4, 5], "p2": [3, 5]}, {"color": 3, "p1": [2, 4], "p2": [0, 3]}, {"color": 4, "p1": [0, 1], "p2": [0, 0]}, {"color": 5, "p1": [3, 2], "p2": [2, 2]}, {"color": 6, "p1": [2, 1], "p2": [2, 0]}]';
const parsed = JSON.parse(endpointsStr);
const endpointsDef = parsed.map((ep) => ({
  color: ep.color,
  p1: { r: ep.p1[1], c: ep.p1[0] },
  p2: { r: ep.p2[1], c: ep.p2[0] }
}));

const height = 6;
const width = 6;
const grid = Array.from({ length: height }, () => Array(width).fill(0));

for (const ep of endpointsDef) {
  try {
    grid[ep.p1.r][ep.p1.c] = ep.color;
    grid[ep.p2.r][ep.p2.c] = ep.color;
  } catch (e) {
    console.error("Crash at", ep, e);
  }
}
console.log("No crash. Grid:", grid);
