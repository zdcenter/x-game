const fs = require('fs');

const zhPath = 'frontend/src/assets/i18n/zh.json';
let content = fs.readFileSync(zhPath, 'utf8');

content = content.replace(
    /"seo\.default\.title":\s*".*?"/, 
    '"seo.default.title": "益智擂台 - Puzzle PK | 免费在线真人实时脑力对战"'
);

content = content.replace(
    /"seo\.lobby\.title":\s*".*?"/, 
    '"seo.lobby.title": "精选益智小游戏 - 真人实时脑力对战大厅"'
);

fs.writeFileSync(zhPath, content, 'utf8');
console.log("Updated zh.json SEO titles");
