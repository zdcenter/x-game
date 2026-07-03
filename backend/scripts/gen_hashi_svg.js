const fs = require('fs');

const svgHeader = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <!-- Background Tray Shadow -->
    <filter id="board-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="15" stdDeviation="15" flood-color="#000" flood-opacity="0.6"/>
    </filter>
    <filter id="island-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
    </filter>
    <pattern id="gridPattern" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="translate(70, 70)">
      <!-- We don't need pattern for grid lines, we will draw them explicitly -->
    </pattern>
    <linearGradient id="island-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <linearGradient id="highlight-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#db2777" />
    </linearGradient>
  </defs>

  <!-- Base Tray -->
  <g filter="url(#board-shadow)">
    <rect x="20" y="20" width="460" height="460" rx="30" fill="#ffffff" stroke="#e2e8f0" stroke-width="5" />
  </g>
`;

let svgBody = '';
// Draw grid lines
svgBody += `  <!-- Grid Lines -->\n  <g stroke="#cbd5e1" stroke-width="2">\n`;
for (let i = 0; i <= 6; i++) {
  const x = 70 + i * 60;
  svgBody += `    <line x1="${x}" y1="70" x2="${x}" y2="430" />\n`;
  const y = 70 + i * 60;
  svgBody += `    <line x1="70" y1="${y}" x2="430" y2="${y}" />\n`;
}
svgBody += `  </g>\n`;

// Draw Bridges
const bridges = [
  // [c1, r1, c2, r2, count]
  [0, 0, 2, 0, 2],
  [2, 0, 4, 0, 1],
  [0, 0, 0, 2, 1],
  [0, 2, 0, 4, 2],
  [2, 0, 2, 2, 1],
  [2, 2, 4, 2, 2],
  [4, 0, 4, 2, 2],
  [0, 4, 2, 4, 1],
  [2, 2, 2, 4, 1],
  [4, 2, 6, 2, 1],
  [6, 2, 6, 6, 2],
  [2, 4, 4, 4, 2],
  [4, 4, 4, 6, 1],
  [4, 6, 6, 6, 1]
];

svgBody += `  <!-- Bridges -->\n  <g stroke="#64748b" stroke-linecap="round">\n`;
for (const b of bridges) {
  const x1 = 70 + b[0] * 60;
  const y1 = 70 + b[1] * 60;
  const x2 = 70 + b[2] * 60;
  const y2 = 70 + b[3] * 60;
  const isHoriz = (y1 === y2);
  const count = b[4];

  if (count === 1) {
    svgBody += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="6" />\n`;
  } else {
    if (isHoriz) {
      svgBody += `    <line x1="${x1}" y1="${y1-5}" x2="${x2}" y2="${y2-5}" stroke-width="6" />\n`;
      svgBody += `    <line x1="${x1}" y1="${y1+5}" x2="${x2}" y2="${y2+5}" stroke-width="6" />\n`;
    } else {
      svgBody += `    <line x1="${x1-5}" y1="${y1}" x2="${x2-5}" y2="${y2}" stroke-width="6" />\n`;
      svgBody += `    <line x1="${x1+5}" y1="${y1}" x2="${x2+5}" y2="${y2}" stroke-width="6" />\n`;
    }
  }
}
svgBody += `  </g>\n`;

// Draw Islands
const islands = [
  [0, 0, 3], [2, 0, 4], [4, 0, 3], 
  [0, 2, 3], [2, 2, 4], [4, 2, 5], [6, 2, 3],
  [0, 4, 3], [2, 4, 4], [4, 4, 3], 
  [4, 6, 2], [6, 6, 3]
];

svgBody += `  <!-- Islands -->\n  <g filter="url(#island-shadow)">\n`;
for (const isl of islands) {
  const x = 70 + isl[0] * 60;
  const y = 70 + isl[1] * 60;
  const val = isl[2];
  
  // Is completely satisfied? Let's highlight some.
  const isHighlighted = (val === 4 && isl[0] === 2 && isl[1] === 4) || (val === 3 && isl[0]===6 && isl[1]===6);
  const fillUrl = isHighlighted ? "url(#highlight-grad)" : "url(#island-grad)";
  const strokeColor = isHighlighted ? "rgba(255,255,255,0.4)" : "#334155";
  const textColor = isHighlighted ? "#ffffff" : "#0f172a";

  svgBody += `    <circle cx="${x}" cy="${y}" r="22" fill="${fillUrl}" stroke="${strokeColor}" stroke-width="3" />\n`;
  svgBody += `    <text x="${x}" y="${y+8}" font-family="sans-serif" font-weight="900" font-size="24" fill="${textColor}" text-anchor="middle">${val}</text>\n`;
}
svgBody += `  </g>\n`;

const svgFooter = `</svg>`;

const finalSvg = svgHeader + svgBody + svgFooter;
fs.writeFileSync('/home/zd/x-game/frontend/public/assets/games/icons/hashi.svg', finalSvg);
console.log('SVG generated at /home/zd/x-game/frontend/public/assets/games/icons/hashi.svg');
