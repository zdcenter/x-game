import { Injectable } from '@angular/core';
import { marked } from 'marked';

export interface FormattablePost {
  id: string;           // slug (used for auto-URL if sourceUrl absent)
  sourceUrl?: string;   // explicit backlink URL
  en: { title: string; description: string; content?: string; tags: string[] };
  zh: { title: string; description: string; content?: string; tags: string[] };
}

export const PLATFORM_DEFS = [
  // 中文平台
  { id: 'wechat',       name: '微信公众号',    icon: '💚',  langs: ['zh'] as const,        url: 'https://mp.weixin.qq.com/cgi-bin/home',                   hint: '适合有粉丝基础的深度内容，打开率高、转化率强，内容留存久' },
  { id: 'zhihu',        name: '知乎',          icon: '💬',  langs: ['zh'] as const,        url: 'https://zhuanlan.zhihu.com/write',                        hint: '中文技术 / 故事长文首选，长尾搜索流量好，适合深度内容' },
  { id: 'juejin',       name: '掘金',          icon: '💎',  langs: ['zh'] as const,        url: 'https://juejin.cn/editor/drafts/new?v=2',                 hint: '中文开发者最集中的平台，技术文章曝光快，有推荐算法加持' },
  { id: 'bilibili',     name: '哔哩哔哩',      icon: '📺',  langs: ['zh'] as const,        url: 'https://member.bilibili.com/platform/upload/text/edit',   hint: '配合视频讲解效果最佳；纯文章效果一般，建议做视频配套' },
  // 英文平台
  { id: 'hackernews',   name: 'Hacker News',   icon: '🔶',  langs: ['en'] as const,        url: 'https://news.ycombinator.com/submit',                     hint: '英文技术社区天花板，"Show HN" 优质帖可带来数千精准访客，高质量讨论' },
  { id: 'producthunt',  name: 'Product Hunt',  icon: '🐱',  langs: ['en'] as const,        url: 'https://www.producthunt.com/posts/new',                   hint: '产品集中发布冲榜用，选好日期、提前造势，适合里程碑节点发布' },
  { id: 'devto',        name: 'Dev.to',        icon: '👩‍💻', langs: ['en'] as const,        url: 'https://dev.to/new',                                      hint: '英文开发者社区，原生 Markdown，技术系列文章的日常同步好去处' },
  { id: 'indiehackers', name: 'IndieHackers',  icon: '🚀',  langs: ['en'] as const,        url: 'https://www.indiehackers.com/post',                       hint: '独立开发者故事社区，真实的收入 / 挫折 / 反思最受欢迎，受众精准' },
  { id: 'blogger',      name: 'Blogger',       icon: '📰',  langs: ['en', 'zh'] as const,  url: 'https://www.blogger.com/blog/posts/create',               hint: '内容沉淀 + 长尾 SEO，文章长期被 Google 收录，慢热但持久' },
  { id: 'reddit',       name: 'Reddit',        icon: '🤖',  langs: ['en'] as const,        url: 'https://www.reddit.com/submit',                           hint: '分社区精准投放：r/gamedev / r/webdev / r/golang，技术文章效果好' },
  // 全球社交
  { id: 'telegram',     name: 'Telegram',      icon: '✈️',  langs: ['en', 'zh'] as const,  url: 'https://t.me',                                            hint: '即时传播，适合有频道或群组基础；双语均可，摘要风格为主' },
  { id: 'x',            name: 'X.com',         icon: '𝕏',   langs: ['en', 'zh'] as const,  url: 'https://x.com/compose/tweet',                             hint: '广泛曝光 + 话题标签引流，280 字短内容，适合配链接做预热' },
] as const;

export type PlatformId = typeof PLATFORM_DEFS[number]['id'];

@Injectable({ providedIn: 'root' })
export class PlatformFormatterService {
  private get siteOrigin(): string {
    return typeof window !== 'undefined' ? window.location.origin : 'https://puzzlepk.com';
  }

  private buildUrl(post: FormattablePost, lang: 'en' | 'zh'): string {
    if (post.sourceUrl) return post.sourceUrl;
    if (post.id) return `${this.siteOrigin}/${lang}/blog/${post.id}`;
    return '';
  }

  async formatForPlatform(platform: PlatformId, post: FormattablePost, lang: 'en' | 'zh'): Promise<string> {
    const l   = post[lang];
    const url = this.buildUrl(post, lang);
    switch (platform) {
      case 'telegram':  return this.formatTelegram(l.title, l.description, l.content ?? '', l.tags, url);
      case 'x':         return this.formatX(l.title, l.description, l.tags, url, lang);
      case 'zhihu':     return this.formatZhihu(post.zh.title, post.zh.description, post.zh.content ?? '', url);
      case 'bilibili':  return this.formatBilibili(post.zh.title, post.zh.description, post.zh.content ?? '', url);
      case 'wechat':    return this.formatWeChat(post.zh.title, post.zh.description, post.zh.content ?? '', url);
      case 'blogger':      return this.formatBlogger(l.title, l.description, l.content ?? '', url);
      case 'reddit':       return this.formatReddit(l.title, l.description, l.content ?? '', l.tags, url);
      case 'juejin':       return this.formatJuejin(post.zh.title, post.zh.description, post.zh.content ?? '', url);
      case 'hackernews':   return this.formatHackerNews(post.en.title, post.en.description, url);
      case 'producthunt':  return this.formatProductHunt(post.en.title, post.en.description, url);
      case 'devto':        return this.formatDevTo(post.en.title, post.en.description, post.en.content ?? '', post.en.tags, url);
      case 'indiehackers': return this.formatIndieHackers(post.en.title, post.en.description, post.en.content ?? '', url);
    }
  }

  private formatTelegram(title: string, desc: string, content: string, tags: string[], url: string): string {
    const plain   = this.stripMarkdown(content);
    const body    = plain.length > 2000 ? plain.slice(0, 2000) + '...' : plain;
    const htags   = tags.map(t => '#' + t.replace(/\s+/g, '_')).join(' ');
    const urlLine = url ? `\n\n🌐 ${url}` : '';
    return `📌 ${title}\n\n${desc}\n\n${body}${urlLine}\n\n${htags}`.trim();
  }

  private formatX(title: string, desc: string, tags: string[], url: string, lang: 'en' | 'zh'): string {
    const htags  = lang === 'zh' ? '#益智游戏 #游戏开发' : '#puzzle #gamedev';
    const link   = url ? `\n\n🔗 ${url}` : '';
    const base   = `🎮 ${title}${link}\n\n${htags}`;
    if (base.length <= 280) return base;
    const overhead = `🎮 ${link}\n\n${htags}`.length;
    return `🎮 ${title.slice(0, 280 - overhead - 2)}…${link}\n\n${htags}`;
  }

  private formatZhihu(title: string, desc: string, content: string, url: string): string {
    const intro  = url ? `> 本文首发于 [Puzzle PK 益智游戏平台](${url})\n\n` : '';
    const footer = url ? `\n\n---\n原文链接：${url}` : '';
    return `${intro}# ${title}\n\n${desc}\n\n${content}${footer}`.trim();
  }

  private formatBilibili(title: string, desc: string, content: string, url: string): string {
    const footer = url ? `\n\n---\n本文同步发布于 Puzzle PK 益智游戏平台：${url}\n版权归作者所有，转载请注明出处。` : '';
    return `# ${title}\n\n${desc}\n\n${content}${footer}`.trim();
  }

  private async formatWeChat(title: string, desc: string, content: string, url: string): Promise<string> {
    const bodyHtml = await marked.parse(content);
    const footer   = url ? `<p style="color:#999;font-size:12px;">本文首发于 <a href="${url}" style="color:#07c160;">Puzzle PK 益智游戏平台</a></p>` : '';
    return `<h1 style="font-size:22px;font-weight:bold;margin-bottom:12px;">${title}</h1>
<p style="color:#666;font-size:14px;margin-bottom:20px;">${desc}</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
${bodyHtml}
<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
${footer}`.trim();
  }

  private async formatBlogger(title: string, desc: string, content: string, url: string): Promise<string> {
    const bodyHtml = await marked.parse(content);
    const footer   = url ? `<p><small>Originally published at <a href="${url}">${url}</a></small></p>` : '';
    return `<h1>${title}</h1>
<p><em>${desc}</em></p>
${bodyHtml}
<hr>
${footer}`.trim();
  }

  // 掘金：和知乎类似，Markdown，加掘金专属引导语
  private formatJuejin(title: string, desc: string, content: string, url: string): string {
    const intro  = url ? `> 本文同步发布于 [Puzzle PK 益智游戏平台](${url})\n\n` : '';
    const footer = url ? `\n\n---\n\n如果觉得有帮助，欢迎点赞收藏～\n原文链接：${url}` : '';
    return `${intro}## ${title}\n\n${desc}\n\n${content}${footer}`.trim();
  }

  // Hacker News：「Show HN」格式，只需标题 + 一段说明，链接单独贴
  private formatHackerNews(title: string, desc: string, url: string): string {
    const hnTitle = title.startsWith('Show HN') ? title : `Show HN: ${title}`;
    const linkLine = url ? `\n\n${url}` : '';
    return `${hnTitle}${linkLine}\n\n${desc}\n\nLooking for feedback — happy to answer any technical questions in the comments.`.trim();
  }

  // Product Hunt：tagline（60字以内）+ description + first comment 文案
  private formatProductHunt(title: string, desc: string, url: string): string {
    const tagline = desc.length <= 60 ? desc : desc.slice(0, 57) + '...';
    const linkLine = url ? `\n\n🔗 ${url}` : '';
    return `**Tagline (≤60 chars):**\n${tagline}\n\n**Description:**\n${desc}${linkLine}\n\n**First comment template:**\nHi PH! 👋 I'm the solo developer behind this project. Happy to answer questions about the tech stack, game design, or anything else. Would love your feedback!`.trim();
  }

  // Dev.to：Markdown + frontmatter tags
  private formatDevTo(title: string, desc: string, content: string, tags: string[], url: string): string {
    const devTags = tags.slice(0, 4).join(', ');
    const footer  = url ? `\n\n---\n\n*Originally published at [puzzlepk.com](${url})*` : '';
    return `---\ntitle: ${title}\ndescription: ${desc}\ntags: ${devTags}\n---\n\n${content}${footer}`.trim();
  }

  // IndieHackers：故事性 + 数据 + 诚实的反思，社区最喜欢这类风格
  private formatIndieHackers(title: string, desc: string, content: string, url: string): string {
    const footer = url ? `\n\n---\n\n**Link:** ${url}\n\nHappy to answer questions — what would you do differently?` : '';
    return `## ${title}\n\n${desc}\n\n${content}${footer}`.trim();
  }

  private formatReddit(title: string, desc: string, content: string, tags: string[], url: string): string {
    const subreddits = this.suggestSubreddits(tags);
    const subLine    = subreddits.length ? `*Suggested subreddits: ${subreddits.map(s => `r/${s}`).join(', ')}*\n\n---\n\n` : '';
    const footer     = url ? `\n\n---\n\n*Originally published at [puzzlepk.com](${url})*` : '';
    return `${subLine}${content || desc}${footer}`.trim();
  }

  private suggestSubreddits(tags: string[]): string[] {
    const map: Record<string, string[]> = {
      'angular':       ['Angular', 'webdev', 'javascript'],
      'golang':        ['golang', 'programming'],
      'go':            ['golang'],
      'websocket':     ['webdev', 'gamedev'],
      'game dev':      ['gamedev', 'indiegaming'],
      'gamedev':       ['gamedev', 'indiegaming'],
      'indie dev':     ['gamedev', 'indiegaming', 'webdev'],
      'puzzle game':   ['gamedev', 'indiegaming', 'puzzles'],
      'seo':           ['SEO', 'webdev'],
      'multiplayer':   ['gamedev'],
      'algorithm':     ['algorithms', 'programming'],
      'sudoku':        ['sudoku', 'puzzles', 'gamedev'],
      'minesweeper':   ['gamedev', 'puzzles'],
      'sokoban':       ['gamedev', 'puzzles'],
      'monetization':  ['gamedev', 'indiegaming', 'Entrepreneur'],
      'achievement':   ['gamedev'],
    };
    const result = new Set<string>();
    for (const tag of tags) {
      const key = tag.toLowerCase();
      for (const [k, subs] of Object.entries(map)) {
        if (key.includes(k) || k.includes(key)) subs.forEach(s => result.add(s));
      }
    }
    // 默认兜底
    if (result.size === 0) result.add('webdev');
    return [...result].slice(0, 3);
  }

  private stripMarkdown(md: string): string {
    return md
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.+?)\]\(.*?\)/g, '$1')
      .replace(/^[-*+]\s+/gm, '• ')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/^-{3,}$/gm, '---')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
