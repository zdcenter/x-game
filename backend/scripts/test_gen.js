const { generate } = require('bridges-generator');

for (const islands of [35, 40, 45, 50]) {
    try {
        console.log(`Testing islands: ${islands}...`);
        const t0 = Date.now();
        const puzzle = generate(20, 20, islands, 0.2);
        console.log(`Success ${islands} in`, Date.now() - t0, "ms");
    } catch (e) {
        console.error(`Failed ${islands}`, e.message);
    }
}
