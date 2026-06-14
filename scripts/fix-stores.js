const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, '../frontend/src/app/features/games');
const games = fs.readdirSync(gamesDir).filter(f => fs.statSync(path.join(gamesDir, f)).isDirectory() && f !== 'minesweeper' && f !== 'sudoku');

games.forEach(game => {
    const storePath = path.join(gamesDir, game, 'store', `${game}.store.ts`);
    if (!fs.existsSync(storePath)) return;

    let content = fs.readFileSync(storePath, 'utf8');

    // Remove conflicting properties
    content = content.replace(/^\s*(?:override\s+)?(?:readonly\s+)?currentRoomMode\s*=\s*(?:computed|signal).*?;?$/gm, '');
    content = content.replace(/^\s*(?:override\s+)?(?:readonly\s+)?currentDifficulty\s*=\s*(?:computed|signal).*?;?$/gm, '');
    content = content.replace(/^\s*(?:override\s+)?(?:readonly\s+)?roomId\s*=\s*(?:computed|signal).*?;?$/gm, '');
    content = content.replace(/^\s*(?:override\s+)?(?:readonly\s+)?readyPlayers\s*=\s*(?:computed|signal).*?;?$/gm, '');
    content = content.replace(/^\s*(?:private\s+)?(?:override\s+)?(?:readonly\s+)?rawState\s*=\s*computed.*?;?$/gm, '');
    content = content.replace(/^\s*(?:override\s+)?(?:readonly\s+)?hostId\s*=\s*computed.*?;?$/gm, '');

    // Replace Member 'readonly' implicitly has an 'any' type (orphan lines)
    content = content.replace(/^\s*readonly\s*$/gm, '');
    content = content.replace(/^\s*private\s*$/gm, '');

    // Add super() to constructors
    content = content.replace(/(constructor\([^)]*\)\s*\{)(?!\s*super\(\);)/g, '$1\n    super();');

    fs.writeFileSync(storePath, content);
    console.log(`Fixed properties in ${game}`);
});
