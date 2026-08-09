import fs from 'fs';
import path from 'path';
import { translate } from 'bing-translate-api';

const gamesDocsFile = '../../frontend/public/assets/games-docs.json';
const langs = ['es', 'ja', 'ko', 'pt', 'fr', 'de'];

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
    try {
      return await translateWithTimeout(text, lang);
    } catch (e) {
      return text;
    }
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
             translatedBody += subchunk;
           }
           await new Promise(r => setTimeout(r, 500));
       }
    } else {
       try {
         const res = await translateWithTimeout(chunk, lang);
         translatedBody += res || chunk;
       } catch (e) {
         translatedBody += chunk;
       }
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return translatedBody;
}

async function translateGamesDocs() {
  if (!fs.existsSync(gamesDocsFile)) {
    console.log("No games docs file found.");
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(gamesDocsFile, 'utf-8'));
  
  for (const game of data) {
    console.log(`Processing game: ${game.id}`);
    const fields = ['name', 'overview', 'rules'];
    
    for (const field of fields) {
      if (!game[field]) continue;
      
      let parsed = {};
      try {
        parsed = JSON.parse(game[field]);
      } catch (e) {
        continue;
      }
      
      if (!parsed.en) continue;
      
      for (const lang of langs) {
        if (!parsed[lang] || parsed[lang].startsWith(`[${lang}] `) || parsed[lang] === parsed.en) {
          console.log(`Translating ${game.id} - ${field} for ${lang}...`);
          try {
            const result = await translateText(parsed.en, lang);
            if (result) {
               parsed[lang] = result;
            }
          } catch (e) {
            console.error(`Error:`, e.message);
          }
        }
      }
      
      game[field] = JSON.stringify(parsed);
      // Save iteratively
      fs.writeFileSync(gamesDocsFile, JSON.stringify(data, null, 2));
    }
  }
  
  console.log('Games docs translated!');
}

translateGamesDocs();
