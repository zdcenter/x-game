import fs from 'fs';
import path from 'path';
import { translate } from 'bing-translate-api';

const sourceFile = '../../frontend/src/assets/i18n/en.json';
const targetDir = '../../frontend/src/assets/i18n';
const langs = ['ja', 'ko', 'pt', 'fr', 'de']; // 'es' already finished!

// Wrap translation in a timeout to prevent hanging
async function translateWithTimeout(text, lang) {
  return Promise.race([
    translate(text, null, lang).then(res => res.translation),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
  ]);
}

async function translateText(text, lang) {
  if (!text || typeof text !== 'string') return text;
  
  if (text.length <= 900) {
    return await translateWithTimeout(text, lang);
  }
  
  let chunks = [];
  if (text.includes('\n\n')) {
    chunks = text.split('\n\n').map(c => c + '\n\n');
  } else if (text.includes('\n')) {
    chunks = text.split('\n').map(c => c + '\n');
  } else {
    let current = '';
    const sentences = text.split(/([.!?]\s)/);
    for (const s of sentences) {
      if (current.length + s.length > 900) {
        chunks.push(current);
        current = s;
      } else {
        current += s;
      }
    }
    if (current) chunks.push(current);
  }

  let translatedBody = '';
  for (const chunk of chunks) {
    if (chunk.trim().length === 0) {
      translatedBody += chunk;
      continue;
    }
    
    if (chunk.length > 900) {
       for (let i = 0; i < chunk.length; i += 900) {
           const subchunk = chunk.slice(i, i + 900);
           try {
             const res = await translateWithTimeout(subchunk, lang);
             translatedBody += res || subchunk;
           } catch (e) {
             console.log(`[${lang}] chunk timeout/error`);
             translatedBody += subchunk;
           }
           await new Promise(r => setTimeout(r, 500));
       }
    } else {
       try {
         const res = await translateWithTimeout(chunk, lang);
         translatedBody += res || chunk;
       } catch (e) {
         console.log(`[${lang}] chunk timeout/error`);
         translatedBody += chunk;
       }
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return translatedBody;
}

async function run() {
  const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  
  for (const lang of langs) {
    const targetFile = path.join(targetDir, `${lang}.json`);
    let targetData = {};
    if (fs.existsSync(targetFile)) {
      try {
        targetData = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      } catch (e) {}
    }

    let count = 0;
    
    async function deepTranslate(sourceNode, targetNode) {
      for (const key of Object.keys(sourceNode)) {
        const sourceVal = sourceNode[key];
        
        if (typeof sourceVal === 'object' && sourceVal !== null) {
          if (!targetNode[key] || typeof targetNode[key] !== 'object') {
            targetNode[key] = {};
          }
          await deepTranslate(sourceVal, targetNode[key]);
        } else if (typeof sourceVal === 'string') {
          // Fix old object bug
          if (targetNode[key] === `[${lang}] [object Object]`) {
            targetNode[key] = `[${lang}] ${sourceVal}`;
          }
          
          if (!targetNode[key]) {
            targetNode[key] = `[${lang}] ${sourceVal}`;
          }
          
          const targetVal = targetNode[key];
          const placeholder = `[${lang}] `;
          
          if (typeof targetVal === 'string' && targetVal.startsWith(placeholder)) {
            try {
              const translatedStr = await translateText(sourceVal, lang);
              if (translatedStr) {
                targetNode[key] = translatedStr;
                count++;
                
                if (count % 10 === 0) {
                  fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2));
                  console.log(`[${lang}] Translated ${count} items...`);
                }
              }
            } catch (err) {
              console.error(`[${lang}] Error translating key ${key}:`, err.message);
            }
          }
        }
      }
    }
    
    console.log(`Starting recursive translation for ${lang}...`);
    await deepTranslate(sourceData, targetData);
    
    fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2));
    console.log(`Finished translating for ${lang}. Total new translations: ${count}`);
  }
}

run();
