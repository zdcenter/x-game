import { Injectable } from '@angular/core';
import { marked, Renderer } from 'marked';

export interface FormattablePost {
  id: string;           // slug (used for auto-URL if sourceUrl absent)
  sourceUrl?: string;   // explicit backlink URL
  coverImage?: string;
  en: { title: string; description: string; content?: string; tags: string[] };
  zh: { title: string; description: string; content?: string; tags: string[] };
}

export const PLATFORM_DEFS = [
  // 中文平台
  { id: 'zhihu',         name: '知乎',          icon: '💬',  langs: ['zh'] as const,        url: 'https://zhuanlan.zhihu.com/write',                        hint: '复制的是 Markdown 源码，粘贴到 mdnice.com 渲染后，再全选复制富文本粘贴到知乎编辑器，格式完美保留' },
  { id: 'juejin',        name: '掘金',          icon: '💎',  langs: ['zh'] as const,        url: 'https://juejin.cn/editor/drafts/new?v=2',                 hint: '中文开发者最集中的平台，技术文章曝光快，有推荐算法加持' },
  { id: 'segmentfault',  name: '思否',          icon: '🧩',  langs: ['zh'] as const,        url: 'https://segmentfault.com/write',                          hint: '中文技术问答 + 文章社区，技术深度内容收录持久，适合教程类' },
  { id: 'v2ex',          name: 'V2EX',          icon: '🌐',  langs: ['zh'] as const,        url: 'https://www.v2ex.com/t/new',                              hint: '独立开发者和技术人聚集地，/indie 节点精准曝光，互动质量高' },
  { id: 'xiaohongshu',   name: '小红书',        icon: '📕',  langs: ['zh'] as const,        url: 'https://www.xiaohongshu.com/publish/publish',              hint: '年轻用户群体，图文并茂效果最佳，话题标签是关键，适合游戏攻略类' },
  { id: 'bilibili',      name: '哔哩哔哩',      icon: '📺',  langs: ['zh'] as const,        url: 'https://member.bilibili.com/platform/upload/text/edit',   hint: '配合视频讲解效果最佳；纯文章效果一般，建议做视频配套' },
  // 英文平台
  { id: 'hackernews',    name: 'Hacker News',   icon: '🔶',  langs: ['en'] as const,        url: 'https://news.ycombinator.com/submit',                     hint: '英文技术社区天花板，"Show HN" 优质帖可带来数千精准访客，高质量讨论' },
  { id: 'producthunt',   name: 'Product Hunt',  icon: '🐱',  langs: ['en'] as const,        url: 'https://www.producthunt.com/posts/new',                   hint: '产品集中发布冲榜用，选好日期、提前造势，适合里程碑节点发布' },
  { id: 'medium',        name: 'Medium',        icon: '✍️',  langs: ['en'] as const,        url: 'https://medium.com/new-story',                            hint: '英文最大博客平台，长期 SEO + 付费会员分成，技术和创业故事受众广' },
  { id: 'devto',         name: 'Dev.to',        icon: '👩‍💻', langs: ['en'] as const,        url: 'https://dev.to/new',                                      hint: '英文开发者社区，原生 Markdown，技术系列文章的日常同步好去处' },
  { id: 'indiehackers',  name: 'IndieHackers',  icon: '🚀',  langs: ['en'] as const,        url: 'https://www.indiehackers.com/post',                       hint: '独立开发者故事社区，真实的收入 / 挫折 / 反思最受欢迎，受众精准' },
  { id: 'blogger',       name: 'Blogger',       icon: '📰',  langs: ['en', 'zh'] as const,  url: 'https://www.blogger.com/',                                hint: '内容沉淀 + 长尾 SEO，文章长期被 Google 收录，慢热但持久' },
  { id: 'reddit',        name: 'Reddit',        icon: '🤖',  langs: ['en'] as const,        url: 'https://www.reddit.com/submit',                           hint: '分社区精准投放：r/gamedev / r/webdev / r/golang，技术文章效果好' },
  // 全球社交 / 职业
  { id: 'linkedin',      name: 'LinkedIn',      icon: '💼',  langs: ['en', 'zh'] as const,  url: 'https://www.linkedin.com/post/new',                       hint: '职业人脉触达，创业经历 / 里程碑类内容效果好，配图 + 话题标签' },
  { id: 'telegram',      name: 'Telegram',      icon: '✈️',  langs: ['en', 'zh'] as const,  url: 'https://t.me',                                            hint: '即时传播，适合有频道或群组基础；双语均可，摘要风格为主' },
  { id: 'x',             name: 'X.com',         icon: '𝕏',   langs: ['en', 'zh'] as const,  url: 'https://x.com/compose/tweet',                             hint: '广泛曝光 + 话题标签引流，280 字短内容，适合配链接做预热' },
] as const;

export type PlatformId = typeof PLATFORM_DEFS[number]['id'];

@Injectable({ providedIn: 'root' })
export class PlatformFormatterService {
  private readonly siteOrigin = 'https://www.puzzlepk.com';

  private buildUrl(post: FormattablePost, lang: 'en' | 'zh'): string {
    if (post.sourceUrl) return post.sourceUrl;
    if (post.id) return `${this.siteOrigin}/${lang}/blog/${post.id}`;
    return '';
  }

  private buildStyledRenderer(theme: 'blogger' | 'wechat'): Renderer {
    const isBlogger = theme === 'blogger';
    const accent        = isBlogger ? '#4f46e5' : '#07c160';
    const heading1      = isBlogger ? '#1e1b4b' : '#1a1a1a';
    const heading2      = isBlogger ? '#312e81' : '#111';
    const body          = isBlogger ? '#374151' : '#333';
    const mutedFg       = isBlogger ? '#6b7280' : '#666';
    const codeBg        = isBlogger ? '#0f172a' : '#f7f7f7';
    const codeBar       = isBlogger ? '#1e293b' : '#e8e8e8';
    const codeFg        = isBlogger ? '#e2e8f0' : '#333';
    const codeInlineBg  = isBlogger ? '#ede9fe' : '#f0f0f0';
    const codeInlineFg  = isBlogger ? '#6d28d9' : '#c7254e';
    const quoteBorder   = isBlogger ? '#6366f1' : '#07c160';
    const quoteBg       = isBlogger ? '#f5f3ff' : '#f0faf4';
    const quoteFg       = isBlogger ? '#4338ca' : '#005b2f';
    const linkFg        = isBlogger ? '#4f46e5' : '#07c160';
    const strongFg      = isBlogger ? '#1e1b4b' : '#111';
    const emFg          = isBlogger ? '#4338ca' : '#007a42';
    const hrColor       = isBlogger ? '#e2e8f0' : '#ddd';
    const h1Border      = `border-bottom:3px solid ${accent};padding-bottom:10px;`;
    const h2Border      = `border-bottom:1px solid ${hrColor};padding-bottom:6px;`;
    const fontSize      = isBlogger ? '16px' : '17px';

    const htmlEsc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const r = new Renderer();

    // ── Block elements with inline children ──────────────────────────────────
    r.heading = function(this: any, token: any) {
      const text = this.parser.parseInline(token.tokens);
      const styles: Record<number, string> = {
        1: `font-size:26px;font-weight:800;color:${heading1};margin:36px 0 14px;line-height:1.35;${h1Border}`,
        2: `font-size:20px;font-weight:700;color:${heading1};margin:28px 0 12px;${h2Border}`,
        3: `font-size:17px;font-weight:700;color:${heading2};margin:22px 0 8px;`,
        4: `font-size:15px;font-weight:700;color:${accent};margin:16px 0 6px;`,
      };
      const style = styles[token.depth] ?? `font-size:14px;font-weight:700;margin:14px 0 4px;color:${body};`;
      return `<h${token.depth} style="${style}">${text}</h${token.depth}>\n`;
    };

    r.paragraph = function(this: any, token: any) {
      const text = this.parser.parseInline(token.tokens);
      return `<p style="font-size:${fontSize};line-height:1.9;color:${body};margin:0 0 18px;">${text}</p>\n`;
    };

    // ── Block container elements ─────────────────────────────────────────────
    r.blockquote = function(this: any, token: any) {
      const body = this.parser.parse(token.tokens);
      return `<blockquote style="border-left:4px solid ${quoteBorder};margin:20px 0;padding:14px 18px;background:${quoteBg};border-radius:0 8px 8px 0;">`
        + `<div style="color:${quoteFg};line-height:1.75;">${body}</div></blockquote>\n`;
    };

    r.list = function(this: any, token: any) {
      const tag = token.ordered ? 'ol' : 'ul';
      const items = token.items.map((item: any) => {
        const itemBody = item.loose
          ? this.parser.parse(item.tokens)
          : this.parser.parseInline(item.tokens);
        return `<li style="margin:6px 0;">${itemBody}</li>`;
      }).join('\n');
      return `<${tag} style="font-size:${fontSize};line-height:1.85;color:${body};margin:0 0 18px;padding-left:26px;">\n${items}\n</${tag}>\n`;
    };

    // ── Code blocks (leaf — html-escape manually) ────────────────────────────
    r.code = (token: any) => {
      const escaped = htmlEsc(token.text);
      const langBar = token.lang
        ? `\n  <div style="background:${codeBar};padding:5px 16px;font-family:monospace;font-size:11px;color:${mutedFg};letter-spacing:.06em;text-transform:uppercase;">${token.lang}</div>`
        : '';
      return `<div style="background:${codeBg};border-radius:10px;margin:22px 0;overflow:hidden;">${langBar}
  <pre style="margin:0;padding:18px 20px;overflow-x:auto;"><code style="font-family:'Fira Code',Consolas,'Courier New',monospace;font-size:13.5px;color:${codeFg};white-space:pre;display:block;">${escaped}</code></pre>
</div>\n`;
    };

    r.hr = () =>
      `<hr style="border:none;border-top:2px solid ${hrColor};margin:32px 0;">\n`;

    r.image = (token: any) =>
      `<img src="${token.href}" alt="${token.text || ''}" style="max-width:100%;border-radius:8px;margin:16px auto;display:block;">\n`;

    // ── Inline elements that may contain child inline tokens ─────────────────
    r.strong = function(this: any, token: any) {
      const text = this.parser.parseInline(token.tokens);
      return `<strong style="font-weight:700;color:${strongFg};">${text}</strong>`;
    };

    r.em = function(this: any, token: any) {
      const text = this.parser.parseInline(token.tokens);
      return `<em style="font-style:italic;color:${emFg};">${text}</em>`;
    };

    r.link = function(this: any, token: any) {
      const text  = this.parser.parseInline(token.tokens);
      const title = token.title ? ` title="${htmlEsc(token.title)}"` : '';
      return `<a href="${token.href}"${title} style="color:${linkFg};text-decoration:underline;font-weight:500;">${text}</a>`;
    };

    // ── Leaf inline elements (token.text is safe raw text) ───────────────────
    r.codespan = (token: any) =>
      `<code style="background:${codeInlineBg};border-radius:4px;padding:2px 7px;font-family:monospace;font-size:13.5px;color:${codeInlineFg};">${token.text}</code>`;

    // ── Tables ───────────────────────────────────────────────────────────────
    r.table = function(this: any, token: any) {
      const renderCells = (cells: any[], isHeader: boolean) =>
        cells.map(cell => {
          const tag   = isHeader ? 'th' : 'td';
          const style = isHeader
            ? `padding:10px 14px;text-align:left;font-weight:700;color:${heading2};background:${quoteBg};`
            : `padding:10px 14px;color:${body};`;
          const text  = this.parser.parseInline(cell.tokens);
          return `<${tag} style="${style}">${text}</${tag}>`;
        }).join('');

      const head = `<tr style="border-bottom:2px solid ${accent};">${renderCells(token.header, true)}</tr>`;
      const rows = token.rows.map((row: any[]) =>
        `<tr style="border-bottom:1px solid ${hrColor};">${renderCells(row, false)}</tr>`
      ).join('\n');
      return `<div style="overflow-x:auto;margin:24px 0;">`
        + `<table style="width:100%;border-collapse:collapse;font-size:15px;">`
        + `<thead>${head}</thead><tbody>${rows}</tbody>`
        + `</table></div>\n`;
    };

    return r;
  }

  async formatForPlatform(platform: PlatformId, post: FormattablePost, lang: 'en' | 'zh'): Promise<string> {
    const l   = post[lang];
    const url = this.buildUrl(post, lang);
    switch (platform) {
      case 'telegram':  return this.formatTelegram(l.title, l.description, l.content ?? '', l.tags, url);
      case 'x':         return this.formatX(l.title, l.description, l.tags, url, lang);
      case 'zhihu':     return this.formatZhihu(post.zh.title, post.zh.description, post.zh.content ?? '', url);
      case 'bilibili':  return this.formatBilibili(post.zh.title, post.zh.description, post.zh.content ?? '', url);
      case 'blogger':      return this.formatBlogger(l.title, l.description, l.content ?? '', url, post.coverImage);
      case 'reddit':       return this.formatReddit(l.title, l.description, l.content ?? '', l.tags, url);
      case 'juejin':       return this.formatJuejin(post.zh.title, post.zh.description, post.zh.content ?? '', url);
      case 'hackernews':    return this.formatHackerNews(post.en.title, post.en.description, url);
      case 'producthunt':   return this.formatProductHunt(post.en.title, post.en.description, url);
      case 'medium':        return this.formatMedium(post.en.title, post.en.description, post.en.content ?? '', post.en.tags, url, post.coverImage);
      case 'devto':         return this.formatDevTo(post.en.title, post.en.description, post.en.content ?? '', post.en.tags, url);
      case 'indiehackers':  return this.formatIndieHackers(post.en.title, post.en.description, post.en.content ?? '', url);
      case 'segmentfault':  return this.formatSegmentFault(post.zh.title, post.zh.description, post.zh.content ?? '', url);
      case 'v2ex':          return this.formatV2EX(post.zh.title, post.zh.description, post.zh.content ?? '', url);
      case 'xiaohongshu':   return this.formatXiaoHongShu(post.zh.title, post.zh.description, post.zh.content ?? '', post.zh.tags, url);
      case 'linkedin':      return this.formatLinkedIn(l.title, l.description, l.tags, url, lang);
    }
  }

  private formatTelegram(title: string, desc: string, content: string, tags: string[], url: string): string {
    const plain   = this.stripMarkdown(content);
    const body    = plain.length > 2000 ? plain.slice(0, 2000) + '...' : plain;
    const htags   = tags.map(t => '#' + t.replace(/\s+/g, '_')).join(' ');
    const urlLine = url ? `\n\n🌐 ${url}` : '';
    return `📌 ${title}\n\n${desc}\n\n${body}${urlLine}\n\n${htags}`.trim();
  }

  private formatX(title: string, _desc: string, _tags: string[], url: string, lang: 'en' | 'zh'): string {
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

  private async formatBilibili(title: string, desc: string, content: string, url: string): Promise<string> {
    const bodyHtml = await marked.parse(content, { renderer: this.buildStyledRenderer('wechat') });
    const footer   = url
      ? `<hr style="border:none;border-top:1px solid #ddd;margin:28px 0;"><p style="font-size:13px;color:#999;text-align:center;">本文同步发布于 <a href="${url}" style="color:#00a1d6;">Puzzle PK 益智游戏平台</a>，版权归作者所有，转载请注明出处。</p>`
      : '';
    return `<!-- B站专栏文章 -->
<div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;">

  <h1 style="font-size:24px;font-weight:800;color:#1a1a1a;margin:0 0 12px;line-height:1.4;">${title}</h1>
  <p style="font-size:15px;color:#666;margin:0 0 24px;padding-bottom:18px;border-bottom:2px solid #00a1d6;line-height:1.7;">${desc}</p>

  ${bodyHtml}

  ${footer}

</div>`.trim();
  }

  private async formatBlogger(title: string, desc: string, content: string, url: string, coverImage?: string): Promise<string> {
    const bodyHtml = await marked.parse(content, { renderer: this.buildStyledRenderer('blogger') });
    const footer   = url
      ? `<p style="font-size:13px;color:#9ca3af;text-align:center;">
  Originally published at <a href="${url}" style="color:#4f46e5;text-decoration:underline;">${url}</a>
</p>`
      : '';
    const coverHtml = coverImage
      ? `\n  <img src="${coverImage}" alt="${title}" style="width:100%;max-height:460px;object-fit:cover;border-radius:10px;margin:0 0 28px;display:block;" />`
      : '';
    return `<!-- Blogger Post: ${title} -->
<div style="max-width:720px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;color:#374151;">${coverHtml}

  <!-- Title -->
  <h1 style="font-size:32px;font-weight:800;color:#1e1b4b;margin:0 0 14px;line-height:1.3;">${title}</h1>

  <!-- Subtitle -->
  <p style="font-size:17px;color:#6b7280;font-style:italic;margin:0 0 36px;padding-bottom:24px;border-bottom:3px solid #4f46e5;">${desc}</p>

  <!-- Body -->
  ${bodyHtml}

  <!-- Footer -->
  <hr style="border:none;border-top:2px solid #e2e8f0;margin:40px 0 20px;">
  ${footer}

</div>`.trim();
  }

  // 掘金：富文本编辑器，输出 HTML
  private async formatJuejin(title: string, desc: string, content: string, url: string): Promise<string> {
    const bodyHtml = await marked.parse(content, { renderer: this.buildStyledRenderer('wechat') });
    const intro  = url
      ? `<blockquote style="border-left:4px solid #1e80ff;margin:0 0 24px;padding:10px 16px;background:#e8f3ff;border-radius:0 6px 6px 0;"><p style="margin:0;color:#1e6bd6;font-size:14px;">本文同步发布于 <a href="${url}" style="color:#1e80ff;">Puzzle PK 益智游戏平台</a></p></blockquote>`
      : '';
    const footer = url
      ? `<hr style="border:none;border-top:1px solid #e4e6eb;margin:32px 0;"><p style="font-size:13px;color:#8a919f;text-align:center;">如果觉得有帮助，欢迎点赞收藏～<br>原文链接：<a href="${url}" style="color:#1e80ff;">${url}</a></p>`
      : '';
    return `<!-- 掘金文章 -->
<div style="max-width:700px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;">

  ${intro}
  <h1 style="font-size:26px;font-weight:800;color:#1d2129;margin:0 0 12px;line-height:1.4;">${title}</h1>
  <p style="font-size:16px;color:#4e5969;margin:0 0 28px;padding-bottom:20px;border-bottom:2px solid #1e80ff;line-height:1.75;">${desc}</p>

  ${bodyHtml}

  ${footer}

</div>`.trim();
  }

  // Hacker News：「Show HN」格式，只需标题 + 一段说明，链接单独贴
  private formatHackerNews(title: string, desc: string, url: string): string {
    const hnTitle = title.startsWith('Show HN') ? title : `Show HN: ${title}`;
    const linkLine = url ? `\n\n${url}` : '';
    return `${hnTitle}${linkLine}\n\n${desc}\n\nLooking for feedback — happy to answer any technical questions in the comments.`.trim();
  }

  // Product Hunt：tagline（60字以内）+ description + first comment 文案
  private formatProductHunt(_title: string, desc: string, url: string): string {
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

  private formatReddit(_title: string, desc: string, content: string, tags: string[], url: string): string {
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

  // Medium：Markdown + canonical link frontmatter 风格页眉
  private formatMedium(title: string, desc: string, content: string, _tags: string[], url: string, coverImage?: string): string {
    const canonical = url ? `\n\n---\n\n*Originally published at [puzzlepk.com](${url})*` : '';
    const coverMd   = coverImage ? `![Cover Image](${coverImage})\n\n` : '';
    return `# ${title}\n\n*${desc}*\n\n${coverMd}${content}${canonical}`.trim();
  }

  // 思否 SegmentFault：Markdown，和掘金风格类似
  private async formatSegmentFault(title: string, desc: string, content: string, url: string): Promise<string> {
    const bodyHtml = await marked.parse(content, { renderer: this.buildStyledRenderer('wechat') });
    const intro  = url
      ? `<blockquote style="border-left:4px solid #009a29;margin:0 0 24px;padding:10px 16px;background:#f0fbf4;border-radius:0 6px 6px 0;"><p style="margin:0;color:#007a22;font-size:14px;">本文同步发布于 <a href="${url}" style="color:#009a29;">Puzzle PK 益智游戏平台</a></p></blockquote>`
      : '';
    const footer = url
      ? `<hr style="border:none;border-top:1px solid #e6e6e6;margin:32px 0;"><p style="font-size:13px;color:#999;text-align:center;">感谢阅读，欢迎点赞收藏。原文：<a href="${url}" style="color:#009a29;">${url}</a></p>`
      : '';
    return `<!-- 思否文章 -->
<div style="max-width:700px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;">

  ${intro}
  <h1 style="font-size:26px;font-weight:800;color:#1a1a1a;margin:0 0 12px;line-height:1.4;">${title}</h1>
  <p style="font-size:16px;color:#555;margin:0 0 28px;padding-bottom:20px;border-bottom:2px solid #009a29;line-height:1.75;">${desc}</p>

  ${bodyHtml}

  ${footer}

</div>`.trim();
  }

  // V2EX：纯文本，标题精炼，正文简短+链接，节点建议
  private formatV2EX(title: string, desc: string, content: string, url: string): string {
    const plain  = this.stripMarkdown(content);
    const body   = plain.length > 1200 ? plain.slice(0, 1200) + '...' : plain;
    const link   = url ? `\n\n🔗 ${url}` : '';
    const node   = '\n\n建议节点：/indie 或 /share';
    return `${title}\n\n${desc}\n\n${body}${link}${node}`.trim();
  }

  // 小红书：emoji 密集，话题标签在末尾，纯文本无 Markdown
  private formatXiaoHongShu(title: string, desc: string, content: string, tags: string[], url: string): string {
    const plain  = this.stripMarkdown(content);
    const body   = plain.length > 1000 ? plain.slice(0, 1000) + '...' : plain;
    const htags  = ['益智游戏', '独立开发', '游戏推荐', ...tags]
      .slice(0, 8).map(t => `#${t}`).join(' ');
    const link   = url ? `\n\n🔗 ${url}` : '';
    return `🎮 ${title}\n\n${desc}\n\n${body}${link}\n\n${htags}`.trim();
  }

  // LinkedIn：职业风格，3 段落 + 3~5 话题标签，不超过 1300 字
  private formatLinkedIn(title: string, desc: string, tags: string[], url: string, lang: 'en' | 'zh'): string {
    const isZh   = lang === 'zh';
    const hook   = isZh ? `🎮 ${title}` : `🎮 ${title}`;
    const cta    = isZh
      ? `💬 欢迎在评论区分享你的想法！`
      : `💬 Would love to hear your thoughts in the comments!`;
    const link   = url ? `\n\n🔗 ${url}` : '';
    const baseTags = isZh
      ? ['独立开发', '益智游戏', '创业']
      : ['indiedev', 'gamedev', 'startup'];
    const htags  = [...baseTags, ...tags].slice(0, 5).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
    return `${hook}\n\n${desc}${link}\n\n${cta}\n\n${htags}`.trim();
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
