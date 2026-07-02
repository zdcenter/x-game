const endpointsStr = '[{"r": 1, "c": 0, "color": 1}, {"r": 5, "c": 2, "color": 1}]';
const parsed = JSON.parse(endpointsStr);
let endpointsDef = [];
if (parsed.length > 0) {
  if (parsed[0].r !== undefined) {
    console.log("format 1");
    const colorMap = new Map();
    for (const ep of parsed) {
      if (!colorMap.has(ep.color)) colorMap.set(ep.color, []);
      colorMap.get(ep.color).push({r: ep.r, c: ep.c});
    }
    for (const [color, pts] of colorMap.entries()) {
      if (pts.length === 2) {
        endpointsDef.push({ color, p1: pts[0], p2: pts[1] });
      }
    }
  }
}
console.log(JSON.stringify(endpointsDef, null, 2));
