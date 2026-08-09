import fs from 'fs';
import path from 'path';

const blogSeedsFile = '../../backend/pkg/db/blog_seeds.json';
const OUT_DIR = '../../frontend/public/assets/blog';

function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const data = JSON.parse(fs.readFileSync(blogSeedsFile, 'utf-8'));
  const index = [];

  for (const post of data) {
    if (!post.published) continue;

    const slug = post.slug;
    
    // Construct the detail object matching export-blog.js structure
    const postData = {
      id: slug,
      date: post.date,
      published: post.published,
      en: {
        title: post.en.title,
        description: post.en.desc,
        keywords: post.en.keywords,
        readTime: post.en.read_time,
        author: post.en.author,
        tags: post.en.tags || [],
        content: post.en.content || '',
      },
      zh: {
        title: post.zh.title,
        description: post.zh.desc,
        keywords: post.zh.keywords,
        readTime: post.zh.read_time,
        author: post.zh.author,
        tags: post.zh.tags || [],
        content: post.zh.content || '',
      },
      es: {
        title: post.es?.title || '',
        description: post.es?.desc || '',
        keywords: post.es?.keywords || '',
        readTime: post.es?.read_time || '',
        author: post.es?.author || '',
        tags: post.es?.tags || [],
        content: post.es?.content || '',
      },
      ja: {
        title: post.ja?.title || '',
        description: post.ja?.desc || '',
        keywords: post.ja?.keywords || '',
        readTime: post.ja?.read_time || '',
        author: post.ja?.author || '',
        tags: post.ja?.tags || [],
        content: post.ja?.content || '',
      },
      ko: {
        title: post.ko?.title || '',
        description: post.ko?.desc || '',
        keywords: post.ko?.keywords || '',
        readTime: post.ko?.read_time || '',
        author: post.ko?.author || '',
        tags: post.ko?.tags || [],
        content: post.ko?.content || '',
      },
      pt: {
        title: post.pt?.title || '',
        description: post.pt?.desc || '',
        keywords: post.pt?.keywords || '',
        readTime: post.pt?.read_time || '',
        author: post.pt?.author || '',
        tags: post.pt?.tags || [],
        content: post.pt?.content || '',
      },
      fr: {
        title: post.fr?.title || '',
        description: post.fr?.desc || '',
        keywords: post.fr?.keywords || '',
        readTime: post.fr?.read_time || '',
        author: post.fr?.author || '',
        tags: post.fr?.tags || [],
        content: post.fr?.content || '',
      },
      de: {
        title: post.de?.title || '',
        description: post.de?.desc || '',
        keywords: post.de?.keywords || '',
        readTime: post.de?.read_time || '',
        author: post.de?.author || '',
        tags: post.de?.tags || [],
        content: post.de?.content || '',
      },
    };

    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(postData, null, 2), 'utf-8');

    // Index entry (no content)
    const { 
      en: { content: _ec, ...enMeta }, 
      zh: { content: _zc, ...zhMeta },
      es: { content: _sc, ...esMeta },
      ja: { content: _jc, ...jaMeta },
      ko: { content: _kc, ...koMeta },
      pt: { content: _pc, ...ptMeta },
      fr: { content: _fc, ...frMeta },
      de: { content: _dc, ...deMeta }
    } = postData;
    index.push({ id: slug, date: postData.date, en: enMeta, zh: zhMeta, es: esMeta, ja: jaMeta, ko: koMeta, pt: ptMeta, fr: frMeta, de: deMeta });
  }

  // Sort by date (descending)
  index.sort((a, b) => b.date.localeCompare(a.date));

  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');
  console.log(`\nDone: ${index.length} posts exported to ${OUT_DIR}`);
}

run();
