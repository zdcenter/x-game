import fs from 'fs';
import path from 'path';
import { translate } from 'bing-translate-api';

const blogSeedsFile = '../../backend/pkg/db/blog_seeds.json';
const langs = ['es', 'ja', 'ko', 'pt', 'fr', 'de'];

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

async function translateBlogSeeds() {
  if (!fs.existsSync(blogSeedsFile)) return;
  const data = JSON.parse(fs.readFileSync(blogSeedsFile, 'utf-8'));
  
  for (const post of data) {
    if (!post.en) continue;
    
    for (const lang of langs) {
      if (!post[lang]) {
        post[lang] = { ...post.en };
      }
      
      const p = post[lang];
      const placeholder = `[${lang}] `;
      
      if (p.title && (p.title.startsWith(placeholder) || p.title === post.en.title)) {
        console.log(`Translating title for ${lang}...`);
        try {
          p.title = await translateText(post.en.title, lang);
        } catch (e) {
          console.error(`Error translating title:`, e.message);
        }
      }
      
      if (p.description && (p.description.startsWith(placeholder) || p.description === post.en.description)) {
        console.log(`Translating description for ${lang}...`);
        try {
          p.description = await translateText(post.en.description, lang);
        } catch (e) {
          console.error(`Error translating description:`, e.message);
        }
      }
      
      if (p.content && (p.content.startsWith(placeholder) || p.content === post.en.content)) {
        console.log(`Translating content for ${lang}...`);
        try {
          p.content = await translateText(post.en.content, lang);
        } catch (e) {
          console.error(`Error translating content:`, e.message);
        }
      }
      // Save iteratively
      fs.writeFileSync(blogSeedsFile, JSON.stringify(data, null, 2));
    }
  }
  
  fs.writeFileSync(blogSeedsFile, JSON.stringify(data, null, 2));
  console.log('Blog seeds translated!');
}

translateBlogSeeds();
