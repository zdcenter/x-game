const fs = require('fs');
const path = require('path');

// Force UTC+8 so version timestamp matches CST regardless of build server timezone
const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
const pad = (n) => n.toString().padStart(2, '0');
const version = `v${now.getUTCFullYear()}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}.${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
const buildTime = Date.now();

// 1. Generate src/environments/version.ts
const envContent = `export const environment = {
  version: '${version}',
  buildTime: ${buildTime}
};
`;

const destPath = path.join(__dirname, '../src/environments/version.ts');
const dir = path.dirname(destPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(destPath, envContent);
console.log(`[Version Generator] Generated version file at src/environments/version.ts with version: ${version}`);

// 2. Generate public/version.json for client-side live polling
const versionJsonPath = path.join(__dirname, '../public/version.json');
const versionJsonContent = JSON.stringify({
  version,
  buildTime
}, null, 2);
fs.writeFileSync(versionJsonPath, versionJsonContent);
console.log(`[Version Generator] Generated public/version.json with version: ${version}`);

// 3. Dynamically update CACHE_NAME in public/sw.js to force browser & Cloudflare SW refresh
const swPath = path.join(__dirname, '../public/sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  const cacheNameRegex = /const CACHE_NAME = ['"][^'"]+['"];/;
  const newCacheName = `const CACHE_NAME = 'xgame-offline-${version}';`;
  if (cacheNameRegex.test(swContent)) {
    swContent = swContent.replace(cacheNameRegex, newCacheName);
    fs.writeFileSync(swPath, swContent);
    console.log(`[Version Generator] Updated public/sw.js CACHE_NAME to: xgame-offline-${version}`);
  }
}
