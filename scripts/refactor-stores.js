const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, '../frontend/src/app/features/games');
const games = fs.readdirSync(gamesDir).filter(f => fs.statSync(path.join(gamesDir, f)).isDirectory() && f !== 'minesweeper' && f !== 'sudoku');

games.forEach(game => {
    const storePath = path.join(gamesDir, game, 'store', `${game}.store.ts`);
    if (!fs.existsSync(storePath)) return;

    let content = fs.readFileSync(storePath, 'utf8');
    
    // 1. Replace imports
    content = content.replace(
        /import\s+\{\s*GameStoreInterface\s*\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/core\/interfaces\/game-store\.interface['"];?/,
        "import { BaseGameStore } from '../../../../core/store/base-game.store';"
    );
    
    // 2. Change class signature
    const classRegex = new RegExp(`export class ${game[0].toUpperCase() + game.slice(1)}Store implements GameStoreInterface \\{`);
    content = content.replace(classRegex, `export class ${game[0].toUpperCase() + game.slice(1)}Store extends BaseGameStore {\n  readonly gameId = '${game}';`);
    if (!content.includes(`extends BaseGameStore`)) {
        const classRegexFallback = new RegExp(`export class (\\w+)Store implements GameStoreInterface \\{`);
        content = content.replace(classRegexFallback, `export class $1Store extends BaseGameStore {\n  readonly gameId = '${game}';`);
    }

    // 3. Remove ws, auth injection
    content = content.replace(/\s*(?:private\s+|public\s+)?ws\s*=\s*inject\(WebSocketService\);?/, '');
    content = content.replace(/\s*(?:private\s+|public\s+)?auth\s*=\s*inject\(AuthStore\);?/, '');

    // 4. Remove standard signals
    content = content.replace(/\s*playerId\s*=\s*computed\(\(\)\s*=>\s*this\.auth\.currentUser\(\)\?.username\s*\|\|\s*this\.auth\.guestId\);?/, '');
    content = content.replace(/\s*currentMode\s*=\s*signal<string>\('single'\);?/, '');
    content = content.replace(/\s*roomId\s*=\s*signal<string>\(''\);?/, '');

    // 5. Add override to hostId, status, playersList
    content = content.replace(/readonly\s+hostId\s*=\s*computed\(/g, 'override readonly hostId = computed(');
    content = content.replace(/readonly\s+status\s*=\s*computed\(/g, 'override readonly status = computed(');
    content = content.replace(/readonly\s+playersList\s*=\s*computed\(/g, 'override readonly playersList = computed(');
    
    // Replace currentMode() with currentRoomMode() everywhere in this file
    content = content.replace(/this\.currentMode\(\)/g, 'this.currentRoomMode()');

    // 6. Delete base methods if they are strictly boilerplate.
    // Actually, to be safe, we will just rename them to _old_xxx so we can review, or just comment them out.
    // Better yet, just remove them if they perfectly match boilerplate.
    
    fs.writeFileSync(storePath, content);
    console.log(`Refactored ${game}`);
});
