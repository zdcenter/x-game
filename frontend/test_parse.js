const endpointsStr = '[{"color": 1, "p1": [5, 2], "p2": [5, 3]}, {"color": 2, "p1": [4, 5], "p2": [3, 5]}]';
const parsed = JSON.parse(endpointsStr);
let endpointsDef = [];
if (parsed.length > 0) {
  if (parsed[0].r !== undefined) {
    console.log("format 1");
  } else if (Array.isArray(parsed[0].p1)) {
    console.log("format 2");
    endpointsDef = parsed.map((ep) => ({
      color: ep.color,
      p1: { r: ep.p1[1], c: ep.p1[0] },
      p2: { r: ep.p2[1], c: ep.p2[0] }
    }));
  }
}
console.log(JSON.stringify(endpointsDef, null, 2));
