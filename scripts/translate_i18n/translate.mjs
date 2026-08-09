import fs from 'fs';
import path from 'path';
import { translate } from '@vitalets/google-translate-api';

const sourceFile = '../../frontend/src/assets/i18n/en.json';
const targetDir = '../../frontend/src/assets/i18n';
const langs = ['es', 'ja', 'ko', 'pt', 'fr', 'de'];

async function run() {
  const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  
  for (const lang of langs) {
    const targetFile = path.join(targetDir, `${lang}.json`);
    let targetData = {};
    if (fs.existsSync(targetFile)) {
      try {
        targetData = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      } catch (e) {
        console.error(`Error reading ${targetFile}`);
      }
    }

    const keys = Object.keys(sourceData);
    let count = 0;
    
    console.log(`Starting translation for ${lang}...`);
    
    for (const key of keys) {
      if (targetData[key]) continue; // Skip if already translated
      
      const originalText = sourceData[key];
      // Skip empty strings
      if (!originalText || typeof originalText !== 'string') {
        targetData[key] = originalText;
        continue;
      }
      
      try {
        const res = await translate(originalText, { to: lang });
        targetData[key] = res.text;
        count++;
        
        // Save intermediate to avoid losing progress
        if (count % 20 === 0) {
          fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2));
          console.log(`[${lang}] Translated ${count} items...`);
        }
        
        // Rate limiting pause
        await new Promise(r => setTimeout(r, 200)); 
      } catch (err) {
        console.error(`[${lang}] Error translating key ${key}:`, err.message);
        // On error, write the english text to not break the UI
        targetData[key] = originalText;
      }
    }
    
    // Final save
    fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2));
    console.log(`Finished translating for ${lang}. Total new translations: ${count}`);
  }
}

run();
