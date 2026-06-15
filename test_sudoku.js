const b = [
  [{val: 5, fixed: true, error: false}, {val: 3, fixed: true, error: false}, {val: 0, fixed: false, error: false}],
  [{val: 6, fixed: true, error: false}, {val: 0, fixed: false, error: false}, {val: 0, fixed: false, error: false}]
];
const orig = "530600000"; // just mock

const newBoard = b.map((row, r) => row.map((c, col) => {
  let isOrigFixed = false;
  if (orig && orig.length === 81) {
    const char = orig[r * 9 + col];
    isOrigFixed = (char !== '.' && char !== '0' && char !== '-');
  } else {
    isOrigFixed = c.fixed;
  }

  if (!isOrigFixed) {
    return { ...c, val: 0, fixed: false, error: false };
  }
  return { ...c, error: false };
}));

console.log(JSON.stringify(newBoard, null, 2));
