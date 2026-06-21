const fs = require('fs');
const path = require('path');

// Force UTC+8 so version timestamp matches CST regardless of build server timezone
const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
const pad = (n) => n.toString().padStart(2, '0');
const version = `v${now.getUTCFullYear()}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}.${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;

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
