const fs = require('fs');
const path = 'frontend/src/app/core/i18n/core.translations.ts';
let content = fs.readFileSync(path, 'utf-8');

const enAdditions = `
    'nav.profile': 'Profile',
    'nav.guest': 'Guest',
    'nav.signin': 'Sign In / Register',
    'auth.play_as_guest': 'Play as Guest',
    'game.players_count': 'Players',
    'game.single_mode': 'Single',
`;

const zhAdditions = `
    'nav.profile': '成就',
    'nav.guest': '游客',
    'nav.signin': '登录 / 注册',
    'auth.play_as_guest': '游客直接游玩',
    'game.players_count': '人',
    'game.single_mode': '单机',
`;

content = content.replace(/('en': \{[\s\S]*?)(    'game\.active_rooms)/, `$1${enAdditions}$2`);
content = content.replace(/('zh': \{[\s\S]*?)(    'game\.active_rooms)/, `$1${zhAdditions}$2`);

fs.writeFileSync(path, content);
console.log("Translations added.");
