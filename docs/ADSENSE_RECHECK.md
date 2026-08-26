# AdSense 重提检查清单 (AdSense Re-Application Checklist)

> 适用阶段：阶段一/二/三代码与内容全部就绪后，重新部署 → 收录 → 等待 → 重新提交 AdSense。

## 0. 为什么当前线上版本不完整（必须先重新部署）

线上站点已包含阶段一修复（contact 页、/pages→/legal 301、docs 攻略中心、作者卡片），
但 **connect/nonogram 游戏页新文案、About 页扩充、5 篇博客的多语言翻译尚未上线**。
原因是构建时的 `export-blog.js` 旧版本会用生产库（仅 en/zh）覆盖博客文件。
**当前仓库的 export-blog.js 已加入空值保护**，但必须用最新仓库代码重新构建。

## 1. 重新部署 (Deploy) — 必须先做

```bash
# 确保拉取最新仓库代码（含 export-blog.js 空值保护 + 全部阶段二内容）
git pull

# 前端构建（会依次执行：export-blog.js → generate-version → generate-sitemap → ng build）
cd frontend && npm run build

# 验证构建产物中的博客翻译没有被覆盖
python3 -c "
import json
d = json.load(open('public/assets/blog/1a2b-bulls-cows.json'))
print('fr content chars:', len(d['fr']['content']))   # 应 > 8000，而非 0
"

# 按你现有的 Cloudflare Pages 流程部署（含 functions/[[path]].js）
```

部署后验证（任选其一）：
```bash
# 全站爬取检查（Googlebot 视角）：期望 448 条全部 200 + 有内容
python3 scripts/check_live_urls.py

# 抽查关键页面
#   /en/legal/contact        → 标题 "Contact Us - Puzzle PK"，含 support@puzzlepk.com
#   /en/pages/about          → 301 到 /en/legal/about
#   /en/games/connect        → 页面文字应 > 600 词（新增 SEO 文案）
#   /fr/blog/1a2b-bulls-cows → 应为法语正文（不再是空页或英文）
```

## 2. Google Search Console (GSC) — 部署后 1-2 天内

1. 在 [Google Search Console](https://search.google.com/search-console) 添加资源
   `www.puzzlepk.com`（域名验证：DNS TXT 或 HTML 文件均可）。
2. **站点地图**：提交 `https://www.puzzlepk.com/sitemap.xml`（448 条 URL）。
3. **请求收录**：对以下新页面逐一使用 "URL 检查 → 请求编入索引"：
   - `/en/legal/contact`（8 语言各一条）
   - `/en/docs`（攻略中心首页）
   - `/en/games/connect`、`/en/games/nonogram`
   - 5 篇补译博客的非英语版本（如 `/fr/blog/1a2b-bulls-cows`）
4. **监控覆盖**：2 周内目标 —— 已收录页面 ≥ 200 条，"发现 - 尚未编入索引"数量不持续增长。

## 3. 内容补强（阶段三，可选继续）

- 新博客文章：`content/blog_new/*.json` 已备好，用管理端导入：
  ```bash
  ADMIN_TOKEN=<你的管理员JWT> node scripts/import_blog_posts.js
  cd frontend && node scripts/export-blog.js && npm run build   # 再部署一次
  ```
- 每 1-2 周发布 2-3 篇新文章，总篇数朝 30+ 稳步增长。

## 4. 等待期 (Wait) — 3-4 周

- **不要反复提交 AdSense**：每次提交都会记录一次审核。期间内容有实质变化（≥10 篇新文章、收录量明显上升）再重提。
- 域名年龄：puzzlepk.com 注册于 2026-06-06。**最稳妥是满 4-6 个月（2026 年 10-12 月）再提交**；若 3-4 周后收录良好可提前试一次。
- 期间保持：
  - 每周有内容更新（博客新文章或游戏内容）
  - GSC 无 Security / Manual action 警告
  - 页面速度无重大回退

## 5. 重新提交 AdSense

1. 登录 AdSense，对 puzzlepk.com 提交审核（选择"我已在网站上放置了广告代码"或直接提交）。
2. 审核通常 1-2 周出结果。被拒后查看具体原因页：
   - 若仍提示"低价值内容"：继续补博客内容 + 等待更长时间，2-4 周后再试。
   - 若提示其他问题（如"导航不完整""内容不匹配"）：按提示逐一修复。

## 附：已完成的合规项（对照自查）

- ✅ 隐私政策 / 服务条款 / About / Contact 四页齐全且预渲染，含邮箱与 48 小时回复承诺
- ✅ 页脚与 Cookie 弹窗链接全部指向可索引页面（无空壳页、无死链）
- ✅ ads.txt（pub-8428944074138941）、robots.txt、sitemap.xml（448 URL）、hreflang、canonical
- ✅ 18 款游戏页均有 8 语言 SEO 文案；11 篇博客 × 8 语言内容全部真实翻译（无英文回退）
- ✅ Cookie 同意弹窗、JSON-LD 结构化数据（WebApplication / HowTo / BlogPosting）
- ✅ 博客作者卡片 + About 页充实（E-E-A-T 信号）
- ✅ 语言一致性：en/zh/es/ja/ko/pt/fr/de 八语言内容全覆盖
- ✅ 结构化数据合规：无虚构评分（AggregateRating 已移除）；inLanguage/og:locale 八语言正确映射；BreadcrumbList 面包屑
- ✅ 无软 404：未知路径返回真实 404；客户端路由（login/register/profile/admin）正常返回 SPA 壳
- ✅ 游戏页→博客攻略内链（9 款游戏"阅读完整攻略"入口）
