import fs from 'fs';
import path from 'path';

const sourceFile = '../../frontend/src/assets/i18n/en.json';
const targetDir = '../../frontend/src/assets/i18n';
const langs = ['ja', 'ko', 'pt', 'fr', 'de'];

function repairStructure(sourceNode, targetNode, lang) {
  for (const key of Object.keys(sourceNode)) {
    const sourceVal = sourceNode[key];
    
    if (typeof sourceVal === 'object' && sourceVal !== null) {
      if (!targetNode[key] || typeof targetNode[key] !== 'object') {
        targetNode[key] = {};
      }
      repairStructure(sourceVal, targetNode[key], lang);
    } else if (typeof sourceVal === 'string') {
      // If the target is corrupt or missing
      if (!targetNode[key] || targetNode[key] === `[${lang}] [object Object]`) {
        targetNode[key] = `[${lang}] ${sourceVal}`;
      } else if (typeof targetNode[key] === 'string' && targetNode[key].includes('[object Object]')) {
        targetNode[key] = `[${lang}] ${sourceVal}`;
      }
    }
  }
}

function run() {
  const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  
  for (const lang of langs) {
    const targetFile = path.join(targetDir, `${lang}.json`);
    let targetData = {};
    if (fs.existsSync(targetFile)) {
      try {
        targetData = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      } catch (e) {}
    }

    // Repair root level structural corruptions (e.g. if 'footer' became a string)
    for (const key of Object.keys(targetData)) {
       if (typeof sourceData[key] === 'object' && sourceData[key] !== null) {
           if (typeof targetData[key] !== 'object') {
               targetData[key] = {};
           }
       }
    }

    repairStructure(sourceData, targetData, lang);
    fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2));
    console.log(`Repaired structure for ${lang}`);
  }
}

run();
