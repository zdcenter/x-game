import fs from 'fs';
import path from 'path';

const sourceFile = '../../frontend/src/assets/i18n/en.json';
const targetDir = '../../frontend/src/assets/i18n';
const langs = ['es', 'ja', 'ko', 'pt', 'fr', 'de'];

function run() {
  const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  
  for (const lang of langs) {
    const targetFile = path.join(targetDir, `${lang}.json`);
    let targetData = {};
    if (fs.existsSync(targetFile)) {
      targetData = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
    }

    // Just copy the english text for any missing keys, with a bracket prefix to indicate it's not translated yet
    for (const key of Object.keys(sourceData)) {
      if (!targetData[key]) {
        targetData[key] = `[${lang}] ${sourceData[key]}`;
      }
    }
    
    fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2));
    console.log(`Finished copying for ${lang}.`);
  }
}

run();
