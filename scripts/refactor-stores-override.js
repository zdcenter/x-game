const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, '../frontend/src/app/features/games');
const games = fs.readdirSync(gamesDir).filter(f => fs.statSync(path.join(gamesDir, f)).isDirectory() && f !== 'minesweeper' && f !== 'sudoku');

const methodsToOverride = [
    'joinRoom',
    'leaveRoom',
    'startGame',
    'restartGame',
    'dismissRoom',
    'kickPlayer',
    'ready',
    'cancelReady'
];

games.forEach(game => {
    const storePath = path.join(gamesDir, game, 'store', `${game}.store.ts`);
    if (!fs.existsSync(storePath)) return;

    let content = fs.readFileSync(storePath, 'utf8');
    
    // Add override to existing methods
    methodsToOverride.forEach(method => {
        // match e.g. "joinRoom(" or "async joinRoom("
        // but avoid matching "override joinRoom("
        const regex = new RegExp(`(^|\\n)\\s*(async\\s+)?${method}\\(`, 'g');
        content = content.replace(regex, (match, p1, p2) => {
            if (match.includes('override')) return match;
            return `${p1}  override ${p2 || ''}${method}(`;
        });
    });
    
    fs.writeFileSync(storePath, content);
    console.log(`Added overrides in ${game}`);
});
