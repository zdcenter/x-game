const fs = require('fs');
const path = require('path');

const now = new Date();
const pad = (n) => n.toString().padStart(2, '0');
const version = `v${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}`;

const content = `export const environment = {
  version: '${version}'
};
`;

const destPath = path.join(__dirname, '../src/environments/version.ts');

// Create environments directory if it doesn't exist
const dir = path.dirname(destPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(destPath, content);
console.log(`[Version Generator] Generated version file at src/environments/version.ts with version: ${version}`);
