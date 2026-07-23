const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    for (const [search, replace] of replacements) {
        const newContent = content.split(search).join(replace);
        if (newContent !== content) {
            content = newContent;
            modified = true;
        }
    }
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

// 1. index.html
replaceInFile('frontend/src/index.html', [
    ['<title>Puzzle PK - Free Brain Games Online | Play Sudoku, Minesweeper & More</title>', '<title>益智大作战 - 免费在线多人益智游戏对战平台 | Puzzle PK</title>'],
    ['content="Puzzle PK - Free Brain Games Online"', 'content="益智大作战 - 免费在线多人益智游戏对战平台 | Puzzle PK"'],
    ['content="Puzzle PK"', 'content="益智大作战 | Puzzle PK"']
]);

// 2. zh.json
replaceInFile('frontend/src/assets/i18n/zh.json', [
    ['"app.title": "扫雷"', '"app.title": "益智大作战"'],
    ['欢迎来到 Puzzle PK', '欢迎来到 益智大作战'],
    ['Puzzle PK 是一个', '益智大作战是一个'],
    ['Puzzle PK 的财产', '益智大作战 的财产'],
    ['使用 Puzzle PK', '使用 益智大作战'],
    ['Puzzle PK 平台', '益智大作战 平台'],
    ['选择 Puzzle PK', '选择 益智大作战'],
    ['@PuzzlePK', '@PuzzlePK (益智大作战)'],
    ['Puzzle PK 团队', '益智大作战团队']
]);

// 3. en.json
replaceInFile('frontend/src/assets/i18n/en.json', [
    ['"app.title": "Minesweeper"', '"app.title": "Puzzle PK"']
]);

// 4. seo.service.ts
replaceInFile('frontend/src/app/core/services/seo.service.ts', [
    ["content: 'Puzzle PK'", "content: lang === 'zh' ? '益智大作战' : 'Puzzle PK'"],
    ["'name': 'Puzzle PK'", "'name': lang === 'zh' ? '益智大作战' : 'Puzzle PK'"]
]);

// 5. Replace hardcoded " - Puzzle PK" in various components
const filesToTranslate = [
    'frontend/src/app/features/lobby/lobby.component.ts',
    'frontend/src/app/shared/components/game-toolbar/game-toolbar.component.ts',
    'frontend/src/app/shared/components/game-waiting-room/game-waiting-room.component.ts',
    'frontend/src/app/shared/components/game-result-overlay/game-result-overlay.component.ts',
    'frontend/src/app/features/docs/docs.component.ts',
    'frontend/src/app/features/blog/blog-post/blog-post.component.ts'
];

for (const file of filesToTranslate) {
    replaceInFile(file, [
        [" - Puzzle PK", " - ${this.i18n.t('app.title')()}"],
        ["| Puzzle PK", "| ${this.i18n.t('app.title')()}"],
        ["'Puzzle PK'", "this.i18n.t('app.title')()"],
        ["`Puzzle PK - ${gameName}`", "`${this.i18n.t('app.title')()} - ${gameName}`"],
        ["'Puzzle PK - '", "this.i18n.t('app.title')() + ' - '"]
    ]);
}

// 6. Replace admin/content author references
replaceInFile('frontend/src/app/features/admin/admin-articles.component.ts', [
    ["Puzzle PK 团队", "益智大作战团队"]
]);
replaceInFile('frontend/src/app/features/admin/admin-blog.component.ts', [
    ["Puzzle PK 团队", "益智大作战团队"]
]);
replaceInFile('frontend/src/assets/blog/index.json', [
    ['"author": "Puzzle PK 团队"', '"author": "益智大作战团队"']
]);

console.log("Done");
