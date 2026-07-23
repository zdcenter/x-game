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
    ['益智大作战', '益智擂台']
]);

// 2. zh.json
replaceInFile('frontend/src/assets/i18n/zh.json', [
    ['益智大作战团队', '益智擂台团队'],
    ['益智大作战', '益智擂台']
]);

// 3. seo.service.ts
replaceInFile('frontend/src/app/core/services/seo.service.ts', [
    ['益智大作战', '益智擂台']
]);

// 4. Admin and Blog files
replaceInFile('frontend/src/app/features/admin/admin-articles.component.ts', [
    ['益智大作战团队', '益智擂台团队']
]);
replaceInFile('frontend/src/app/features/admin/admin-blog.component.ts', [
    ['益智大作战团队', '益智擂台团队']
]);
replaceInFile('frontend/src/assets/blog/index.json', [
    ['益智大作战团队', '益智擂台团队']
]);

console.log("Done");
