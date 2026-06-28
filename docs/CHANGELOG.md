# Changelog

## [2026-06-28] - 🧩 新增游戏《数织》(Nonogram)

### ✨ 新功能 (Features)
- **全新纯逻辑益智游戏《数织》上线**：支持经典的单机模式，以及联机比拼手速的竞速模式。
- **动态响应式棋盘**：支持 5×5、10×10、15×15 等多种棋盘尺寸，自适应 CSS Grid 与动态单元格大小，完美适配手机、平板与桌面大屏。
- **纯前端极速引擎**：单机模式完全在前端客户端计算逻辑，实现零延迟、毫秒级的格子涂色与画叉（右键/长按切换）。
- **游戏结算对接**：已全面接入全局 `app-game-result-overlay`，通关后支持展示耗时、发放 XP 及游戏重新开始/联机解散功能。

## [2026-06-28] - 🎨 统一 SEO 响应式版面布局重构 (全站 13 款游戏)

### ✨ 布局与 SEO 优化
- **全屏贯穿式导航 (Full-width Header)**：将游戏内部的 `app-game-header` 和进度条提取至页面最顶端，在桌面端横跨整个 1600px 宽度，消除割裂感，提升游戏界面的专业度与大气感。
- **响应式三栏/单栏智能切换**：
  - **PC 端**：彻底重构为 `320px SEO 说明 | 居中游戏棋盘 | 320px 大厅联机` 的对称三栏布局。
  - **移动/平板端**：自动回退为单栏流式排版，棋盘在上，SEO 说明在下。
- **解除高度锁定**：废弃了 `h-[calc(100vh-...)]` 配合 `overflow-hidden` 的死板高度限制，改用 `min-h` 与 `flex-grow` 结合页面外层滚动，完美解决了宽屏设备（如 iPad 横屏）上游戏棋盘被生硬切断的问题。
- **Markdown SEO 渲染**：复用项目中现有的 `.markdown-body` 样式，在无插件依赖的情况下，实现了高质量的 `<h2>`/`<h3>` 多层级富文本渲染，有效解决 Google AdSense 审核中的“内容贫乏”问题。
- **已完成标准化改造的游戏**：扫雷、数独、数字华容道、六边形消除、俄罗斯方块、五子棋、密码破译、Math 24、Drop 2048、水管分色、推箱子、灯谜、1010! Block Puzzle、成语益智，全站 14 款游戏全面升级！

## [2026-06-21] - 📣 推广文章管理系统 + 博客内联分发按钮

### 新功能：推广文章管理系统（`/admin/articles`）
- 后端新增 3 张表：`gm_content_categories`（无限层级分类）、`gm_content_articles`（双语文章）、`gm_content_distributions`（分发记录）
- REST API：分类 CRUD、文章 CRUD + toggle/publish、分发 record + 历史查询
- 前端新建 `ContentService`，支持无限分类树 + 文章增删改查
- 新增 `AdminArticlesComponent`：左侧无限分类树（DFS 展开 + 深度缩进），右侧文章列表（按分类过滤），文章编辑 Modal（元数据 + ZH内容 + EN内容三标签），分发 Modal（6 平台一键复制 + 历史记录展示）
- 侧边栏 Content 分组新增「📣 推广文章」入口，替换旧「📡 分发中心」

### 改进：博客管理后台内联分发（`/admin/blog`）
- 每篇博客行 hover 时显示「📡」分发按钮
- 点击弹出分发 Modal：6 平台 × (ZH/EN) 分别复制按钮
- 复制时自动调用 platform-formatter 格式化，并记录到 `gm_blog_distributions`

### 技术改动
- `PlatformFormatterService`：新增 `FormattablePost` 通用接口，URL 支持 `sourceUrl` 覆盖，`formatForPlatform` 参数类型从 `BlogPostMeta` 改为 `FormattablePost`（结构兼容，无破坏性变更）
- `ContentArticle` 新增 `source_url` 字段，用于发布时附带原文链接

## [2026-06-20] - 🔍 SEO 全面优化：静态博客预渲染 + 生产环境 API 修复 + nginx CORS

### SEO 优化

**博客迁移为静态 JSON（93 个页面完整预渲染）**
- `blog.service.ts`：公开读取方法从 API 改为静态 JSON（`/assets/blog/index.json` + `/assets/blog/{slug}.json`），Admin 写入方法保持调用 API
- 新增 `scripts/export-blog.js`：从生产 API 导出全部博客文章到静态 JSON 文件，发布新文章时执行一次即可
- `app.routes.server.ts`：移除 `RenderMode.Server` blog 配置，所有路由统一为 `RenderMode.Prerender`
- `ssr-noop.interceptor.ts`：新增 `/assets/` 路径白名单，允许静态资源请求在预渲染期通过（API 请求仍被拦截）
- 预渲染路由从 54 条增至 **93 条**（新增博客文章 20 条、博客列表页 2 条、idiom 游戏页 4 条）

**Sitemap 清理**
- `generate-sitemap.js`：移除 `login` / `register` / `profile` 三个无 SEO 价值路径，减少无效爬取配额消耗
- `prerenderPaths` 现在包含所有路径（含博客文章），与 `app.routes.server.ts` 对齐

**robots.txt**
- 新增 `Disallow: /admin/`、`/en/admin/`、`/zh/admin/`，防止 Google 爬取后台登录页

**根路径重定向**
- `functions/[[path]].js`：根路径 `/` 跳转英文版改用 **301**（原 302），Googlebot 默认获得 301 → `/en/lobby`，中文用户仍为 302

### 生产环境 API URL 修复

此前前端部分服务硬编码 `/api/v1/` 导致生产环境（`www.puzzlepk.com`）调用本地地址失败：
- `blog.service.ts`：改用 `environment.apiUrl`
- `game-registry.service.ts`：改用 `environment.apiUrl`
- `idiom.service.ts`：改用 `environment.apiUrl`
- `admin-idiom.component.ts`：改用 `environment.apiUrl`

### nginx CORS 修复

- `deploy/nginx/puzzlepk.conf`：
  - 移除已下线的前端 server block（前端已迁移至 Cloudflare Pages）
  - `Access-Control-Allow-Headers` 新增 `x-skip-logout`（`auth.interceptor.ts` 防自动登出标头）
  - CORS 头从 server 级别改为在 `if ($request_method = OPTIONS)` 块内重复声明（nginx `add_header` 不继承 if 块）

### Cloudflare Pages Chunk MIME 修复

- `functions/[[path]].js`：Cloudflare 自动将 HTML `<link rel="modulepreload" href="chunk-X.js">` 转为 HTTP `Link` 头时使用相对路径，浏览器按请求路径解析导致加载到 HTML 而非 JS 文件
- 修复：边缘函数拦截响应，将 Link 头中的相对路径统一改写为绝对路径（`<chunk-X.js>` → `</chunk-X.js>`）

---

## [2026-06-20] - 🗄️ 后台数据库备份与恢复管理

### 功能概述

Admin 面板新增「数据库管理」模块，支持全量或按表备份、下载、服务器保存、恢复，无需 pg_dump 依赖。

### 后端

- **`backend/internal/handlers/rest/admin_db.go`**（新文件）：
  - `GET /admin/db/tables` — 列出所有 `gm_` 前缀表，含行数（`pg_stat_user_tables`）和大小
  - `POST /admin/db/backup/download` — 选择表 → 生成 ZIP（`manifest.json` + 每表一个 JSON 文件）→ 流式返回浏览器下载
  - `POST /admin/db/backup/save` — 同上但保存到服务器 `BACKUP_DIR`（环境变量，默认 `./backups/`）
  - `POST /admin/db/backup/inspect` — 上传 ZIP，返回 manifest（表列表 + 创建时间），不执行恢复
  - `GET /admin/db/backups` — 列出服务器已保存备份（含大小、时间、表清单，按时间倒序）
  - `GET /admin/db/backups/:name/download` — 下载指定已保存备份
  - `DELETE /admin/db/backups/:name` — 删除指定已保存备份
  - `POST /admin/db/restore` — multipart 上传 ZIP，`confirm=CONFIRM` 防误操作；事务内 DELETE + `json_populate_recordset` 批量 INSERT；Commit 后重置各表 sequence
- 所有路由注册在 `AdminProtected()` 中间件之下，非 admin 用户无法访问
- 文件名安全校验（防 path traversal）、表名白名单校验（防 SQL 注入）

### 前端

- **`frontend/src/app/features/admin/admin-database.component.ts`**（新文件）：三 Tab UI
  - **备份**：勾选/全选表，「下载备份 ZIP」（浏览器直接下载）或「保存到服务器」
  - **恢复**：拖拽/选择 ZIP 文件，调用 `/inspect` API 自动解析 manifest 显示表列表，勾选要恢复的表，输入 `CONFIRM`，执行恢复
  - **备份历史**：列出服务器端所有 ZIP，支持下载、恢复（跳转恢复 Tab 并预填信息）、删除
- 路由 `/admin/database` 已注册
- Admin 侧边栏新增「🗄️ 数据库管理」导航项（System 分组）

## [2026-06-20] - ⚡ 成语填空分级闯关 + 联机 PK 模式

### 填空闯关：分级学习体系

- **三难度选关 UI**：进入填空模式后先展示简单 / 中级 / 困难三张卡片，每张显示掌握进度条（已掌握 / 总数）
- **智能推荐**：根据当前难度掌握率自动高亮「✦ 推荐」标签（easy <80% → 推荐 easy，以此类推）；三个难度全部可直接进入，不设硬锁
- **后端过滤**：`GET /idiom/fill?difficulty=easy|medium|hard`，`weightedPickIdiom` 按难度过滤 seen/unseen 池
- **Header 快速切换**：填空界面右上角显示当前难度 chip，点击或按返回键可回到选关页

### 成语填空 PK 模式（联机对战）

**后端**
- 新引擎 `backend/internal/engine/idiom/engine.go`（`idiom_pk_speed`）：双方收到同一道填空题（同成语、同挖空位、同候选字盘）；先答对得 1 分，答错 600ms 后自动解锁重填；得分方触发后 2 秒自动出下一题；先达到 `target` 分赢得系列赛
- 支持 `start` / `restart_game` / `forfeit` / `input`（提交答案）动作
- `go generate` 自动注册，engines_gen.go 新增 `idiom` 包

**前端**
- 新 Store `idiom-pk.store.ts`：继承 `BaseGameStore`，computed 暴露 `display` / `keyboard` / `myWins` / `opponentWins` / `roundWinner` / `isRoundOver` / `iWonRound` 等信号；`submitFillAnswer(answer)` 通过 WS 发送 `input` 动作
- `game-definitions.ts`：成语游戏加 `Speed` 模式（`multiRound: true`）
- `idiom.component.ts` 集成 PK 生命周期：query param 自动进入 PK 房间，支持断线重连；PK 视图包含等待室 → 倒计时覆盖层 → 对战界面（得分点阵、填空格、候选字盘、局胜 banner）→ 结果覆盖层

---

## [2026-06-19] - 📖 成语益智游戏上线（第 14 款）

### 新游戏：成语益智 (`/games/idiom`)

**双模式设计**

- **填空闯关**：随机抽取成语并挖空 1~2 字，玩家从候选字盘（20 字）点选填入。后端加权抽题（错多分高、答对减权），连续答对 3 次标记「已掌握」，14 天未复习自动重入池。
- **每日猜词**：全球玩家每天猜同一个 4 字成语，6 次机会，绿/黄/灰三色反馈（两遍着色算法，正确处理重复汉字）。猜测记录存库，刷新不丢进度，完成后可分享 emoji 战绩图。

**后端**
- 新增 4 张表：`gm_idioms`、`gm_idiom_daily_challenges`、`gm_user_idiom_daily_guesses`、`gm_user_idiom_progress`
- 种子数据：2000 条精选成语（pwxcoo/chinese-xinhua），`//go:embed` 嵌入二进制，幂等 seed
- 6 个 REST 接口：`/fill`、`/fill/submit`、`/daily/state`、`/daily/guess`、`/stats`、`/daily/social`
- 算法：两遍 Wordle 着色、日期种子稳定出题、干扰字盘过滤答案字、遗忘曲线权重调度

**前端**
- `idiom.component.ts`：全 Signals 实现，无外部 Store 依赖，双 Tab 切换
- `idiom.service.ts`：6 个 HTTP 接口封装
- `game-definitions.ts` + `game.model.ts`：路由与 GameId 注册
- 中英文 i18n 键全量添加
- `postgres.go Seed()`：完整 Config + Rules + Overview 注册

---

## [2026-06-18] - 🗄️ 游戏元数据 DB 化 + 🔄 大厅无限滚动

### 🗄️ 架构升级：游戏元数据 DB 化管理

**问题背景**：游戏元数据（icon、modes、difficulties、multiRound）原先只存在 `game-definitions.ts` 中，每次修改需要代码部署。

**方案**：DB 作「运行时覆盖层」，TS 作「编译期/SSR fallback」
- 后端 `gm_game_configs.config`（JSONB）扩充为完整元数据：`icon` / `multiRound` / `modes[]` / `difficulties[]` 与现有业务参数（如 `penaltySeconds`）合并
- 新增 `GET /api/v1/games/meta` 端点（无需 auth），只返回 `id + config` 字段
- 前端 `GameRegistryService.loadFromDB()` 在 `APP_INITIALIZER` 中浏览器端执行，将 DB 数据覆盖 TS registry；SSR/预渲染期跳过（`ssrNoopInterceptor` 阻断，TS fallback 生效）
- Admin UI（`/admin/games`）Settings 弹窗新增 icon emoji 输入、multiRound 开关、modes/difficulties JSON 文本框，保存后即时生效

**后端变更**
- `domain/game_config.go`：新增 `GameMetaConfig` / `GameModeInfo` / `GameDiffInfo` struct
- `pkg/db/postgres.go`：13 个游戏 Config JSON 全量扩充 icon/multiRound/modes/difficulties
- `handlers/rest/game.go`：新增 `GetGamesMeta`
- `cmd/api/main.go`：注册 `v1.Get("/games/meta", ...)`

**前端变更**
- `game-registry.service.ts`：注入 `HttpClient`，新增 `loadFromDB()` Promise
- `app.config.ts`：追加 `APP_INITIALIZER` 调用 `loadFromDB()`
- `admin-games.component.ts`：扩展 Settings 弹窗（icon / multiRound / modesJson / difficultiesJson）

### 🔄 功能升级：大厅游戏列表分页 + 无限滚动

- **后端** `GET /api/v1/games` 支持分页参数 `?page=1&limit=6`，返回 `{ games, total, page, limit, hasMore }`
- **前端** `GameService` 拆分为两个方法：
  - `getGames(page, limit)` → 返回 `GamesPage`（供大厅分页加载）
  - `getAllGames()` → 返回 `Observable<GameConfig[]>`（供 docs/profile/rules-modal 非分页场景使用，内部请求 `limit=100`）
- **大厅组件** 改用 `IntersectionObserver` 监听底部 sentinel 元素，滚动到底自动触发下一页加载并追加游戏卡片；`isLoadingGames` 控制旋转加载图标，`hasMoreGames` 控制「全部游戏已加载」提示
- SSG 预渲染 fallback 从全 13 张缩减为前 6 张，与首页 API 响应一致，避免水合后列表闪缩

---

## [2026-06-18] - 🐛 Bug 修复 + 🏗️ 架构重构（BaseGameStore 多局模式封装）

### 🐛 Bug 修复

**多局模式 PK（Multi-Round Series）**
- 修复第 2+ 局不提交战绩的问题：`_pkStatSubmitted` 原先只在 `joinRoom` 时重置，重启后不重置；现在改为 `Finished → Waiting`（host 重启）时自动重置，确保每局均提交战绩
- 新增 `BaseGameStore.pkWins` / `isSeriesOver` / `pkScoreLabel` 三个 computed signal，统一处理多局逻辑，不再需要每个游戏各写一遍

### 🏗️ 架构重构

**BaseGameStore — 多局系列赛封装**
- `pkWins: Signal<Record<string, number>>` — 读取后端 `wins` 字段，各玩家已赢局数
- `isSeriesOver: Signal<boolean>` — 自动判断系列赛是否结束（有人达到 target 局）
- `pkScoreLabel: Signal<string>` — PK 比分标签（如 "1 : 0"），系列结束时返回空字符串
- 4 个游戏（minesweeper, sliding, codebreaker, lightsout）的 `isSeriesOver`/`pkWins` 本地实现全部删除，改用基类

**GameStoreInterface** — 新增 `pkWins`、`isSeriesOver`、`pkScoreLabel` 三个接口声明，编译期保证所有 store 实现

---

## [2026-06-18] - 🐛 Bug 修复 + 🏗️ 架构重构（BaseGameComponent 封装）

### 🐛 Bug 修复

**数独（Sudoku）**
- 修复 PK 模式倒计时界面高度异常（仅占屏幕少许高度）：将外层容器从 `h-full` 改为 `h-[calc(100dvh-64px)]`
- 修复 PK 模式进入游戏后无棋盘/无数据：`effect` 现在追踪 `rawState().puzzle` 信号，puzzle 到达即初始化棋盘，不再依赖 view 切换时机

**五子棋（Gomoku）**
- 修复等待房间不显示房主皇冠图标（👑）：后端返回 `"players": []string`（数组而非对象），`Object.keys(array)` 返回数字索引导致玩家 ID 匹配失败；新增 `playersList` override 检测并转换数组格式

**密码破译（Codebreaker）**
- 移除本地 `hostId` signal（可能与服务端 host 状态脱节），改用 `store.hostId()`（派生自 WS 实时数据）

### ✨ 功能升级 / 架构重构

**BaseGameComponent — 新增通用封装**
- 新增 `openChangeSettings()` 方法：通过 `lobbyPanel` 和 `store.gameId` 打开修改房间设置弹窗，消除了 9 款游戏中完全相同的重复代码
- `GameStoreInterface` 新增 `gameId: string` 和 `currentRoomTarget: Signal<number>` 必要属性

**游戏容器高度统一**
- 将 Block、Drop2048、Gomoku、Hexa、Lightsout、Sliding、Codebreaker 等 7 款游戏的外层 `h-full` / `flex-1` 改为 `h-[calc(100dvh-64px)]`（防止倒计时/空内容视图塌陷）

**等待房间 `[target]` 绑定补全**
- Block、Hexa 的 `<app-game-waiting-room>` 补全 `[target]="store.currentRoomTarget()"` 绑定

**生命周期修复**
- Minesweeper 组件补全缺失的 `super.ngOnDestroy()` 调用

---

## [2026-06-18] - ⚔️ PK 竞技大厅全面升级（跨游戏统管）

### ✨ 功能升级

**GamePkLobbyComponent — 升级为全局 PK 竞技大厅**
- 顶部导航从「当前游戏标题」改为统一的 `⚔️ PK 竞技大厅`，不再局限于单一游戏
- 创建表单新增全游戏选择器（4 列 icon 格），切换游戏后 Mode/Difficulty 自动联动更新
- 房间列表新增游戏筛选条（chip 过滤，有多种游戏时才显示）；点击同一 chip 可取消筛选
- 我的房间新增 `⚙` 换游戏按钮，弹窗内可选择新游戏/模式/难度，确认后发送 `change_game` WS 动作实时切换
- 新增 i18n 键：`game.pk_lobby_title`、`game.all_games`、`game.change_room_game`、`game.change_room_game_title`、`game.filter_rooms`（中英双语）

## [2026-06-18] - 🐛 修复多局制 Bug + Admin 多局制开关

### 🐛 Bug 修复

**多局制 PK 结算界面错误**
- 修复灯谜 `getOverlayStatus()` 使用旧 mode 字符串 `'same_pk_speed'`（实为 `'speed'`）导致双方玩家均显示"你赢了"的 Bug
- 修复灯谜 `getOverlaySubtitle()` 错误引用 `minesweeper.cleared` key 导致显示扫雷相关文字的 Bug
- 修复所有 4 款多局制游戏（扫雷/滑块/灯谜/密码破译）每局结束均显示终局"游戏胜利/失败"界面的 Bug
  - 实际应区分「局中结算」（`本局胜利/本局落败` + 当前比分 `X : Y`）与「系列赛终局」（`游戏胜利/游戏失败`）
  - 新增 `isSeriesOver` getter：仅当某玩家 Wins ≥ Target 时才判定系列赛结束
- `🏆 X/N` badge 现在仅在 `target > 1` 时显示，单局赛不再显示无意义的 `0/1`

### ✨ 新功能

**Admin 多局制开关（pk_multi_round_enabled）**
- 后端 `SeedSettings()` 新增 `pk_multi_round_enabled`（默认 `true`），并加入 Public Settings API
- 前端 `SettingsService` 新增 `pk_multi_round_enabled` 字段
- `GamePkLobbyComponent` 注入 `SettingsService`：当 `pk_multi_round_enabled = false` 时隐藏「目标局数」选择区，创建时强制 `target = 1`
- Admin 后台可直接通过 Settings 界面关闭多局制支持，对所有 4 款 PK 游戏生效

### 🌐 国际化
- 新增 i18n key：`game.round_won`（本局胜利）/ `game.round_lost`（本局落败）/ `game.all_lights_out`（所有灯已熄灭）

---

## [2026-06-17] - ⚔️ PK 全页大厅 + 多局制支持（扫雷/滑块/灯谜/密码破译）

### ✨ 新功能

**多局制 PK（先到 N 局者胜）**
- 扫雷、滑块拼图、灯谜（Lights Out）、密码破译（Codebreaker）四款游戏的后端引擎新增 `Wins map[string]int` + `Target int` 字段
- 通过 WS 查询参数 `target` 传入局数目标，后端 `InitGame` 读取并应用
- 重启逻辑智能区分「继续当前系列」（Wins 保留）与「开新系列」（任一玩家达到 Target 后重置 Wins）
- 前端 Badge 新增 `🏆 X/N` 显示，实时反映当前系列进度；`currentRoomTarget()` 来自 `BaseGameStore`

**全页 PK 大厅（GamePkLobbyComponent）**
- 新增共享组件 `GamePkLobbyComponent`（`app-game-pk-lobby`），替代游戏内 320px 窄侧边栏用于 PK 创建/加入
- 桌面两栏布局：左侧 360px 固定创建表单（模式/难度/目标局数 1/3/5/10/密码），右侧 flex-grow 房间列表+在线玩家 Tab
- 移动端单列 Accordion：折叠/展开创建表单，房间列表始终在下方可见
- 条件样式全部使用 `[class]="ternary"` 字符串绑定，兼容 Angular 模板解析器
- 已集成至：扫雷、滑块拼图、灯谜、密码破译（其他游戏后续集成）
- 入口：游戏右上角人群图标（Single 模式点击 → 全页 PK 大厅；PK 模式点击 → 改设置侧边栏）
- z-index 层次：游戏 < PK大厅(z-90) < WaitingRoom(z-100) < Navbar

**i18n 新增键**
- `game.pk_lobby_subtitle`、`game.no_online_players`（中英双语）

### 📁 涉及文件

**后端**
- `backend/internal/engine/minesweeper/speed_engine.go`
- `backend/internal/engine/sliding/speed_engine.go`
- `backend/internal/engine/lightsout/engine.go`
- `backend/internal/engine/codebreaker/engine.go`

**前端**
- `frontend/src/app/shared/components/game-pk-lobby/game-pk-lobby.component.ts` *(新建)*
- `frontend/src/app/shared/components/game-pk-lobby/game-pk-lobby.component.html` *(新建)*
- `frontend/src/app/features/games/minesweeper/minesweeper.component.{ts,html}`
- `frontend/src/app/features/games/sliding/sliding.component.{ts,html}`
- `frontend/src/app/features/games/lightsout/lightsout.component.{ts,html}`
- `frontend/src/app/features/games/codebreaker/codebreaker.component.{ts,html}`
- `frontend/src/app/features/games/minesweeper/store/minesweeper.store.ts`
- `frontend/src/app/features/games/sliding/store/sliding.store.ts`
- `frontend/src/app/features/games/lightsout/store/lightsout.store.ts`
- `frontend/src/app/features/games/codebreaker/store/codebreaker.store.ts`
- `frontend/src/app/core/i18n/core.translations.ts`

---

## [2026-06-17] - 🔑 修复刷新后用户名消失 & Profile NaN

### 🐛 修复

- **auth.interceptor.ts**：新增 `X-Skip-Logout` 标头检查——携带此标头的请求 401 时不触发自动登出，防止后台刷新意外清掉用户状态
- **auth.store.ts**：`refreshProfile()` 请求携带 `X-Skip-Logout: true`，避免因 API 401（token 过期/网络问题）导致静默登出、导航栏头像变 "?"
- **xp.service.ts**：`levelProgress(xp)` 改用 `xp ?? 0` 兜底，防止旧 localStorage 数据缺 `xp` 字段时出现 NaN（影响 Profile 总览 XP 进度条）

---

## [2026-06-16] - 🗃️ 博客系统 DB 化：数据库存储 + Admin 管理 UI + API 驱动

### ✨ 新功能

**后端**
- 新增 `domain.BlogPost` 模型（`gm_blog_posts` 表）：支持中英双语字段（title/desc/keywords/readTime/author/tags/content）、slug 唯一索引、published/sort_order 控制
- `pkg/db/seed_blog.go`：使用 `//go:embed blog_seeds.json` 嵌入 10 篇默认文章种子数据（137KB），首次启动自动幂等插入（已有则跳过）
- `pkg/db/postgres.go`：AutoMigrate 追加 BlogPost，初始化时调用 SeedBlog
- 公开 API：`GET /api/v1/blog/posts`（列表，无 content）、`GET /api/v1/blog/posts/:slug`（全文+content）
- Admin CRUD：`GET|POST|PUT|DELETE /api/v1/admin/blog/posts`、`PATCH /:id/toggle`（发布/下线）

**前端**
- `BlogService` 重构：从 `/api/v1/blog/posts` 读取列表和全文，API 响应直接包含 markdown content，无需再单独请求 `.md` 文件
- `blog-post.component.ts`：改用 `getBlogPost(slug)` 单次请求同时获取 meta + content，语言切换时直接从已加载数据中选择，无额外网络请求
- `app.routes.server.ts`：博客路由改为 `RenderMode.Server`（SSR 动态渲染），避免需要在 SSG 构建时访问 DB；其他路由保持 Prerender
- 新增 `admin-blog.component.ts`：完整 Admin 博客管理 UI
  - 文章列表：标题（英+中）、日期、发布状态一键切换、排序权重、快速预览链接
  - 编辑弹窗三 Tab：元数据（英+中）/ 英文正文（Markdown，实时词数）/ 中文正文（Markdown，实时字符数）
  - 完整 CRUD：新建、编辑、删除（带确认）、发布/下线切换
- Admin 侧边导航新增 "Content" 分区及 Blog 菜单项
- `app.routes.ts` 追加 `/admin/blog` 路由
- `scripts/generate-sitemap.js`：Sitemap 生成优先读取 `public/assets/blog/index.json`（生产源），fallback 到 `src/assets/`

---

## [2026-06-16] - 📝 SEO & AdSense 合规：OG 封面图、博客扩充、隐私政策完善

### ✨ 新功能 & 优化

**OG 封面图**
- 新增 `public/og-cover.png`（1200×630px）：深蓝背景、点阵网格、13款游戏色块展示
- `index.html` og:image、`seo.service.ts`、`blog-post.component.ts` 统一指向 `/og-cover.png`

**SEO 优化**
- `index.html`：移除 `user-scalable=no`（Google 无障碍扣分）、移除 `Pragma/Expires` no-cache 头（PageSpeed 杀手）
- `index.html` 标题更新为包含具体游戏名称的长尾关键词
- `blog-post.component.ts`：新增 BlogPosting JSON-LD 结构化数据（Schema.org）、每篇文章独立 og:title/og:description
- `scripts/generate-sitemap.js` 完整重写：自动读取 `public/assets/blog/index.json` 生成博客 URL、补充 `/leaderboard` 和 `/daily`、全部 URL 加 `<lastmod>`

**导航调整**
- 顶部导航移除 `/docs` 和 `/blog` 链接
- Footer 统一整合：Docs · Blog · Privacy · Terms · About 内联排列

**博客内容大幅扩充（AdSense 审核合规）**
- 所有英文文章扩充至 900+ 词，中文文章 1900+ 汉字
- 新增4篇全新双语文章：五子棋策略、水管排序攻略、方块对战策略、推箱子完整指南
- 现有文章全部重写扩充：1A2B 算法详解、数独每日益处、扫雷逻辑指南
- `public/assets/blog/index.json` 更新为 10 篇文章（+4 新增，+3 迁移扩充）
- `src/assets/blog/index.json` 同步更新

**隐私政策 & About 页**
- 隐私政策：新增 Cookie/AdSense 条款、用户权利、联系方式（contact@puzzlepk.com）
- About 页：改写为完整介绍页，列出全部13款游戏、使命说明、联系邮箱

---

## [2026-06-16] - 🔄 用户留存系统深化：新手引导扩展 + PK 对战历史自动提交

### ✨ 新功能 & Bug 修复

**每日挑战横幅**
- 修复每日挑战横幅游戏名称显示：改用 `I18nService.t(def.titleKey)()` 渲染翻译后的游戏名，而非原始 ID 字符串
- 横幅 CTA 链接追加 `puzzleId` query param，游戏组件无需二次请求即可直接加载目标关卡

**连续登录 Streak**
- 修复登录 API (`auth.go`) 未触发 `CheckLoginStreak()`：现在每次成功登录后服务端自动检测并发放登录 XP，并在响应中返回 `login_streak` 与 `bonus_xp` 字段

**每日挑战自动联通**
- 数独（Sudoku）：支持 `?dailyChallengeId=&puzzleId=` 参数直接跳转加载指定关卡，完成后自动调用 `DailyChallengeService.finish()` 标记完成
- Math24：同上，完成后自动标记每日挑战完成
- 推箱子（Sokoban）：新增 `joinRoomWithLevel(levelId, difficulty)` 绕过 `fetchLevelsAndLoad()` 竞争条件，支持每日挑战精准跳题

**新手引导扩展**
- Codebreaker（1A2B）：首次单机游戏加载 600ms 后自动弹出 4 步教学引导；`TutorialService.hasSeen/markSeen` 控制只触发一次
- WaterSort（水管分色）：同上，4 步引导介绍目标、操作、规则和提示用法
- Sokoban（推箱子）：同上，4 步引导介绍目标、控制、规则和撤销功能
- `game-definitions.ts` 补充三款游戏的 `tutorial` 步骤配置（标题/描述均接入 i18n）
- `retention.translations.ts` 新增 3 × 8 = 24 组（zh+en 各 12 组）教程翻译键

**PK 对战历史自动提交（BaseGameStore）**
- `BaseGameStore` 新增构造函数 `effect()`：自动检测 PK 模式下 Playing→Finished 状态迁移
- 认证用户结束 PK 对战时，自动调用 `_submitPKStat()` → `POST /api/v1/stats/:gameId`，记入对战历史、发放 XP、触发成就检测
- 新增 `extractPKStatPayload()` 虚方法供子类 override，默认从 `rawState.players[playerId]` 提取 `score/time`
- 使用普通属性（`_pkPrevStatus`, `_pkStatSubmitted`）而非 Signal 跟踪状态，避免 `allowSignalWrites` 复杂度
- `joinRoom()` 调用时重置 PK 追踪 flag，防止跨房间误触发

**XLF 构建警告修复**
- `messages.zh.xlf` 和 `messages.en.xlf` 补充 4 个缺失的 Admin 菜单翻译单元：`admin.menu.achievements`, `admin.menu.daily_challenges`, `admin.menu.leaderboard`, `admin.menu.xp_config`，消除 Angular i18n 编译警告

---

## [2026-06-16] - 🏆 用户留存系统：XP/等级/成就/排行榜/每日挑战/对战历史全面上线
### 🌟 新功能 (New Features)

**后端新增**
- **XP/等级系统**：`service/xp.go` — `CalcLevel(xp)=floor(sqrt(xp/100))+1`，原子更新 User.XP/Level，每次 SubmitStat 和 PuzzleFinish 自动派发 XP（单机完成+2/胜利+5，PK参与+5/胜利+15，每日挑战+30）
- **连续登录奖励**：`CheckLoginStreak()` 每天首次调用发放 3-50 XP 登录奖励，连续天数越多奖励越高
- **成就系统**：35个成就（starter/playtime/streak/daily/allround/mastery类别），稀有度 common/rare/epic/legendary，条件由 `service/achievement.go` switch 评估，解锁时自动追加 XP 并返回至前端
- **全球排行榜**：直查 `gm_user_game_stats JOIN gm_users`，支持 all-time/weekly 周期、time/score 类型，自动附带当前用户排名；过滤 guest 用户
- **每日挑战**：Admin 可预排期任意日期任何游戏（含批量创建），用户每天只可完成一次（防重复提交），完成奖励 +30XP 并检测成就
- **对战历史**：所有 SubmitStat 和 PuzzleFinish 自动写 `gm_match_history`，支持按游戏/模式过滤
- **Admin REST 扩展**：成就 CRUD、每日挑战 CRUD+批量创建、排行榜查看+删除条目

**前端新增**
- **XP 浮字动画**：`XpGainBadgeComponent` 全局挂载，游戏结束后右下角弹出 `+N XP` 向上飘出动画
- **成就解锁弹窗**：`AchievementUnlockOverlayComponent` 底部 Toast，稀有度主题光晕，队列式展示
- **排行榜页面** (`/leaderboard`)：按游戏/模式/难度/时段筛选，金银铜牌徽章，高亮当前用户排名
- **每日挑战页面** (`/daily`)：今日挑战卡片+倒计时，30天日历格完成状态，历史列表
- **Profile 重构**：4-tab 布局（总览/成就/排名/历史），XP 进度条，等级徽章，成就格子按类别分组
- **每日挑战横幅**：`DailyChallengeBannerComponent` 嵌入 Lobby 首页顶部，CTA 直跳游戏
- **Admin 扩展**：4个新后台页面（成就管理/每日挑战日历/排行榜管理/XP配置），Admin 导航栏 Retention 分区
- **导航栏**：顶部追加排行榜和每日挑战链接

## [2026-06-15] - ⚙️ 核心架构深化：前端状态机大一统与多人联机逻辑解耦
### 🌟 架构重构 (Architecture & Refactoring)
- **房间内无缝切游 (Switch Room Game)**：在多人对战房间结算页面，房主现在可以直接一键切换至其他游戏（通过 `ActionChangeGame` C2S 指令），所有房间内的玩家都会跟随房主自动跳转至新游戏，无需解散房间或退回大厅。所有 13 款游戏均已接入新的 `<app-game-result-overlay>` 机制并支持此功能！
- **前端核心 Store (BaseGameStore) 状态机重构**：将所有 13 款子游戏前端 Store 中散落各处的、硬编码的游戏状态更新逻辑（如 `this.status.set(GameStatus.Playing)`）彻底清理。现在前端状态机的运转完全下沉至 `BaseGameStore`，通过自动解析 WebSocket 房间全局 Payload 来推导当前状态，彻底断绝了前端因单机/联机状态混淆导致的幽灵 BUG。
- **派生状态标准化**：为 `BaseGameStore` 添加了一系列健壮的计算属性（`isWaiting`, `isStarting`, `isPlaying`, `isFinished`，以及 `playersList` 和 `winners`），完全接管了原来各子游戏中冗余、重复的状态判断代码。各子游戏仅需负责提供自身的单机数据实现（如 `singlePlayerStatus`, `singlePlayerList`），基类会自动完成模式判别。
- **后端 Lifecycle 生命周期托管**：在后端的 `BaseEngine` 引擎层提供 `HandleLifecycle`，并为子游戏暴露统一的钩子 `OnGameStart` 和 `OnGameRestart`，清除了冗长的 action 分发样板代码，使所有游戏的启停状态变更与房间通信逻辑保持绝对一致。
## [2026-06-14] - 🔧 全栈统一：游戏模式与难度枚举标准化重构
### 🌟 架构重构 (Architecture & Refactoring)
- **房间内无缝切游 (Switch Room Game)**：在多人对战房间结算页面，房主现在可以直接一键切换至其他游戏（通过 `ActionChangeGame` C2S 指令），所有房间内的玩家都会跟随房主自动跳转至新游戏，无需解散房间或退回大厅。所有 13 款游戏均已接入新的 `<app-game-result-overlay>` 机制并支持此功能！
- **多游戏骨架重构 (Hexa, Tetris, Drop2048, Block)**：对《六边形消除》、《俄罗斯方块》、《下落 2048》和《1010! 方块》进行了深度的 `ILocalEngine` 与 `BaseGameStore` 核心架构改造。彻底分离了游戏特有的重力/掉落/消除逻辑引擎与前端 UI 组件，让组件全面降维为“只渲染状态”的傻瓜视图层。
- **华容道 (Sliding Puzzle) 引擎彻底标准化重构**：将老旧的底层存储状态和组件逻辑推翻重写，完全接入全新的 `ILocalEngine` 协议；用 `BaseGameStore` 替换了原有的冗余继承链；将组件内所有零散的方法调用升级为标准化的 `store.dispatch(action)` 单向数据流模式；并彻底清扫了 `'single'`, `'win'`, `'lose'` 等魔法字符串，完美并入 `GameResult` 全局强类型枚举控制。
- **游戏常量大一统 (激进派重构)**：彻底推翻了前端和后端各游戏中碎片化、硬编码的魔法字符串（如 `local`, `same_pk_speed`, `diff_pk_score`, `beginner` 等），建立了全栈统一的 `GameMode` (`single`, `speed`, `steal`, `score`, `battle`) 和 `GameDifficulty` (`easy`, `medium`, `hard`, `expert`, `master` 等) 绝对标准体系。
- **Go 后端引擎无缝迁移**：批量替换了后端引擎工厂注册名，统一去除了冗长的 `same_pk_` 前缀，并自动映射到简化的新枚举值。
- **历史战绩数据库无损迁移 (DB Migration)**：在 `backend/pkg/db/postgres.go` 中新增了基于 SQL 的无损平滑迁移脚本，确保原有使用老版本模式和难度的数万条对局数据自动映射到新的大一统体系。## [2026-06-12] - 🚀 优化推箱子与数独体验
### ✨ 体验优化与 Bug 修复 (Bug Fixes)
- **推箱子 (Sokoban) 自动寻路**：彻底告别长距离手滑！现在只需点击棋盘上的任意空地或目标点，人物就会自动通过 BFS（广度优先搜索）寻路并自动走过去。寻路期间绝对不会意外推动任何箱子，且可以通过按键盘或滑动屏幕随时打断，极大提升了玩家的移动效率。
- **数独 (Sudoku) 完美重置**：修复了在使用了“提示 (Hint)”功能后，系统将提示的数字标记为固定导致点击“清空”按钮无法将其擦除的 Bug。现在点击清空会以关卡的“最原始状态”为绝对基准，瞬间抹除所有玩家填入或提示的数字，完美还原一个“干干净净”的全新棋盘！

## [2026-06-11] - 🛡️ 联机总开关全面落地 & 管理后台自动保存 & 大厅智能流式布局
### ✨ 新功能 (Features)
- **联机总开关全面落地 (Multiplayer Kill Switch - Full Implementation)**：
  - 后台管理面板的"多人联机系统"开关现已与全站所有游戏深度打通。关闭后，**所有 13 款游戏**的右侧竞技大厅面板（Right Sidebar）、手机端呼出大厅的小按钮、以及主页大厅的全局竞技面板，全部会被 `@if` 条件渲染彻底隐藏，玩家只能体验纯单机模式。
  - 统一了所有游戏模板中侧边栏的 HTML 注释标识为 `<!-- Right Sidebar (Lobby Panel) -->`，方便后续全局搜索和批量维护。
  - 后端 WebSocket 层增加了 `multiplayer_disabled` 错误码守卫：即使前端出现缓存残留导致用户意外进入联机等待大厅，后端也会在一瞬间将其弹回单机模式，做到滴水不漏。
- **管理后台设置自动保存 (Admin Settings Auto-Save)**：移除了原先需要手动点击的"保存所有设置"大按钮，所有开关（维护模式、联机开关、模拟器）改为拨动即自动保存，所有输入框（广告 Slot ID、频率等）改为失焦/回车后自动保存。保存过程中右上角会显示脉冲式"保存中..."提示。
- **大厅智能流式布局 (Responsive Lobby Grid)**：游戏大厅的卡片网格从写死的 3 列 (`xl:grid-cols-3`) 升级为 CSS Grid 的 `auto-fill` 智能计算。现在会根据可用宽度自动决定列数（大屏可达 4-5 列），关闭联机侧边栏后卡片自动舒展填满屏幕，最大宽度从 `max-w-6xl` 放宽至 `1600px`。

## [2026-06-11] - 🚀 新增全端社交分享与二维码推广功能
### ✨ 新功能 (Features)
- **原生 Web Share API 集成**：支持移动端直接唤起系统级分享。
- **自定义二维码高颜值弹窗**：在不支持 Web Share 的 PC 端，或者当用户需要直观扫码时，弹出一个带有高斯模糊、3D 卡片质感的专属 `ShareModalComponent` 弹窗。
- **动态 SEO (Open Graph) 支持**：更新了系统级 `SeoService`，支持针对不同的游戏动态注入带有游戏 3D SVG 图标链接的 `og:image`，保证在微信/Twitter 等聊天软件里预览极具视觉冲击力。
- **大厅与房间分享直通车**：
  - 在大厅的每个游戏卡片上新增了 🔥 分享按钮，点击即分享该游戏的专属体验链接。
  - 在每个游戏的对局等待大厅（`GameWaitingRoomComponent`）中，原有的“复制邀请链接”全面升级为原生的“邀请好友”分享流，支持直接带入模式、难度、房主和房间号，朋友点开链接直通包厢。

## [2026-06-10] - 🚀 新增游戏《推箱子》(Sokoban)
### ✨ 新功能 (Features)
- **经典益智游戏《推箱子》上线**：支持经典的单机解谜模式，以及联机比拼手速的竞速模式。
- **动态响应式棋盘**：采用 vmin 结合绝对尺寸锁定方案，完美解决了复杂地图在移动端的伸缩跳动问题。
- **本地历史记录与撤销**：单机模式支持无限次的撤销历史（Undo），大大增强了游戏体验。

## [2026-06-09] - 🚀 新增游戏《水管分色》(Water Sort Puzzle)
### ✨ 新功能 (Features)
- **全新益智游戏《水管分色》上线**：基于经典的倒水逻辑，加入了全新的 1v1 PK 竞速模式与单人闯关模式。
- **全屏响应式与多主题适配**：适配了深色/浅色模式，并针对 iPad 和平板的大屏环境优化了试管阵列的布局与缩放体验。
- **标准化引擎集成**：水管分色完全采用最新版本的 `GameEngine` 接口开发，严格遵照 `CheckGameOver` 与 `GetState` 通用生命周期规范，成为后续新游戏接入的最佳参考范本。

### 🐛 体验优化与 Bug 修复 (Bug Fixes)
- 修复了《水管分色》在部分情况下由于未绑定公共 `<app-game-waiting-room>` 和生命周期管理器而导致的"开始不了游戏"和"房间已不存在"的 Bug，现在可以正常触发 3 秒倒计时及结算面板了。
- 为《水管分色》增加了标准的顶部 `<app-game-header>` 导航栏和右侧信息侧边栏，支持完整的断线重连体验。

## [2026-06-07] - 🚀 重大重构：Cloudflare 边缘路由优化与全站 Angular 编译级多语言

### 🌟 架构重构 (Architecture & Refactoring)
- **房间内无缝切游 (Switch Room Game)**：在多人对战房间结算页面，房主现在可以直接一键切换至其他游戏（通过 `ActionChangeGame` C2S 指令），所有房间内的玩家都会跟随房主自动跳转至新游戏，无需解散房间或退回大厅。所有 13 款游戏均已接入新的 `<app-game-result-overlay>` 机制并支持此功能！
- **全面迁移至 Angular 原生多语言架构 (`@angular/localize`)**：废弃了原有的动态加载 JSON 字典方案，改用编译时 AOT 方案。大大提升了首屏加载速度，并实现了纯正的 SEO 支持。
- **自研 XLF 提取引擎**：开发了轻量级的 `generate-xlf.js` 脚本，可一键扫描前端 `core.translations.ts` 并自动生成/更新供 Angular 编译器使用的 `.xlf` 物理字典包。
- **边缘网络重写 (Cloudflare Functions)**：新增了 `functions/[[path]].js` 中间件，拦截并智能分发 `/zh/` 和 `/en/` 流量。彻底解决了 Cloudflare Pages SPA Auto-Routing 机制导致的多语言子路径 404 及无限重定向死循环问题。

### ✨ 新功能 (Features)
- **海量题库扩充与难度对齐**：使用后台脚本离线生成了 2000 道优质《数独》关卡和 1362 道《24点》关卡，剔除无解或多解的残次盘面。同时统一将题库分为四大金刚（初级、中级、高级、专业），并在前端的 PK 房间创建面板中实现了 1 比 1 的精准难度映射，保证竞技绝对公平。
- **游客进度保存提示**：在《数独》和《24点》单机闯关成功后的结算界面（GameResultOverlay），新增了专门针对未登录游客的精美温馨提示卡片，引导游客一键注册账号，支持多端数据同步。
- **全站 SEO URL 规范化**：现已支持 `www.puzzlepk.com/zh/lobby` 与 `www.puzzlepk.com/en/lobby` 纯静态物理隔离的 URL 结构，并已更新 `sitemap.xml` 支持 Google hreflang 抓取规范。
- **国际化博客系统 (i18n Markdown Blog)**：引入了全新的纯静态 Markdown 博客引擎，支持 `_zh.md` 和 `_en.md` 语言级隔离。使用 `Location` 服务自动动态适配 BaseHref，解决了深层级路由下图片与资产加载 404 的问题。
- **游戏元数据深度国际化**：改造了 `GameRegistryService` 和后端下发的数据库标题。现在大厅的所有游戏名、游戏规则介绍全部通过统一的 `I18nService` 即时翻译。

### 🐛 体验优化与 Bug 修复 (Bug Fixes)
- **修复桌面端大厅无法使用鼠标滚轮滚动的问题**：彻底重构了 `LobbyComponent` 的 CSS Flex 嵌套布局，废弃了局部的 `overflow-y-auto` 双重嵌套，改用全局原生的 Document `main` 级滚动，并将右侧竞技大厅替换为 CSS 原生的 `sticky` (粘性悬停) 机制。现在桌面端左侧长列表滚动极其丝滑，且右侧竞技大厅完美驻留视口。
- **修复 PWA 更新导致的 ChunkLoadError**：新增了底层 `GlobalErrorHandler`，精准拦截 Angular 懒加载模块报错与浏览器 `MIME text/html` 回退异常。在检测到新旧版本哈希冲突时，自动注入 `?version_update=1` 查询参数并瞬间强制 `location.reload()`，彻底消除了用户因为未清空 Service Worker 缓存导致的点击游戏白屏报错的灵异现象。
- 修复了竞技大厅“发英雄帖”广播组件部分文本未被翻译的遗留问题。
- 重写了 `GameWaitingRoomComponent` (等待大厅) 的移动端自适应 Flex 布局结构，解决了在小屏或多玩家情况下，底部的“Ready (准备)” 按钮被挤出屏幕且无法滚动的问题。

### 🔧 核心重构 - WebSocket 房间系统
- **三重保障机制**：实现了心跳保活（Ping/Pong 30 秒检测）+ 实时推送 + HTTP 轮询兜底（10 秒间隔），彻底解决了"其他玩家看不到房间"的致命 Bug。
- **拆分房间创建/加入**：将 `GetOrCreateRoom` 拆分为 `CreateRoom` 和 `JoinRoom` 两个独立操作，消灭了断线重连意外创建幽灵房间的问题。
- **房主断线自动转移**：房主异常断线后等待 30 秒，若未重连则自动将房主权限转移给下一个在线玩家，而非直接解散房间。
- **踢人冷却期**：被踢出的玩家需等待 30 秒后才能重新加入同一房间，防止恶意循环加入。
- **切换游戏重置准备**：房主切换游戏类型时自动重置所有房客的"已准备"状态。
- **指数退避重连**：前端 WebSocket 断线重连从固定 2 秒改为指数退避（2s→4s→8s→最大 30s），减少服务器压力。
- **DismissedRooms 延长**：被解散房间的记录保留时间从 30 秒延长至 5 分钟，防止旧连接意外重建房间。

### Changed / Improved

### Changed / Improved
- **Global Arena Lobby (Homepage)**: The arena lobby has been promoted to the homepage (`LobbyComponent`). Players can now view all active rooms across all games directly from the main index. On desktop, it is a permanent sidebar; on mobile, it uses a smooth overlay drawer.
- **Lobby Icons**: Replaced the generic hamburger menu icon with a semantic "User Group" (People) icon across all game views to intuitively represent multiplayer rooms and lobbies.
- **3D SVG Game Icons**: 全面移除了竞技大厅面板（房间列表、创建房间弹出框）以及游戏结算推荐面板（You might also like）中的原生 Emoji（如 💣, 🔢）。现已全部无缝升级为高清 3D 拟物化 SVG 图标（位于 `frontend/public/assets/games/icons/*.svg`），在所有设备与分辨率下带来顶级的视觉与高极感。

## [Unreleased]
### Added
- **Multiplayer Kill Switch**: Added a global `multiplayer_enabled` toggle in Admin settings. When disabled, all room creation, matchmaking, and PK UI elements are hidden globally, gracefully falling back to offline single-player modes to save server resources during maintenance.
- **Sokoban PK Mode**: Implemented real-time Sokoban PK battles. Includes side-by-side opponent boards, ghost overlays, and real-time cursor/movement syncing.
- **Dynamic Avatar Generation**: Removed static SVG avatars. Added dynamic DiceBear avatar generation (identicon/bottts/avataaars) using a custom `DiceBearService` connected to Cloudflare Workers for caching. 100% solvable puzzles without needing a static puzzle bank. Built with stunning glassmorphic UI, fluid CSS pouring animations, and fully integrated with the Party Room (综合包厢) system.
- **Google AdSense Integration**: 增加了全局的 Google AdSense 支持，并在前端封装了可高度复用的 `AdsenseComponent` 组件，便于在平台（如大厅、游戏结算等）各处无缝植入广告位，为商业化变现打好基础。
- **24点智能提示 (Math 24 Hint Ad)**：接入 Google H5 Games Ads（激励视频广告），当玩家遇到不会解的局面时，点击提示观看广告即可获取由回溯算法实时算出的动态解题步骤。
- **System Settings Module**: Added a new settings page in the Admin Dashboard to control global website configurations.
  - Added Site Maintenance mode toggle with custom message support.
  - Added Global Announcement banner for the game lobby.
  - Migrated Simulator toggle to the database-backed settings system.

### Changed
- **Block Puzzle & Hexa Puzzle**: 完善多语言 (i18n) 适配，彻底修复并抽离了游戏组件中遗留的硬编码文本（包含 SCORE、COMBO、BEST 和大厅界面标签等），并为 Block Puzzle 新建了独立的翻译字典，全面接入 `I18nService` 动态多语言引擎。
- Improved traffic simulator to randomize player counts and room creation times for a more natural look.
- **Tetris**: Fixed a bug where restarting a single-player game incorrectly displayed the 'Spectating' overlay.
- Added pure WebSocket-driven real-time admin dashboard (在线玩家/活跃房间监控).
- Upgraded JWT auth middleware to support `?token=` query param parsing for WebSocket connections.
- **Game Visit Counter**: Added a mechanism to track game visits.
  - Backend: Added `visit_count` to `GameConfig` and a new `POST /api/v1/games/:id/visit` endpoint.
  - Frontend: Games now automatically record a visit on launch, and the lobby displays a 🔥 badge with the current visit count for each game.
- **Manual Game Sorting (SortOrder)**: 
  - Added a `SortOrder` field to the backend `GameConfig` model.
  - Games in the Lobby are now systematically sorted by `SortOrder ASC` (highest priority first), falling back to `VisitCount DESC` for ties.
  - Added a UI input in the Admin Games Dashboard to manually override the sort order.

- **私密房间密码保护 (Private Room Password)**: 
  - 玩家在创建房间时可以设置 4 位纯数字密码，建立私密好友房。
  - 大厅中的私密房间会显示锁定图标 🔒，其他玩家点击加入时会弹出美观的毛玻璃质感密码输入框。
  - **无缝跨游戏体验**：结合现有的综合包厢模式（Party Room Mode），密码状态会由系统在跨游戏路由跳转间被妥善保存与传递，免除了切游戏需要反复输入密码的繁琐。
  - **房主断线直连**：系统智能识别并赋予特权，当房主断线重连时，直接跳过密码验证环节瞬间回到房间。
- **New Game**: Added Drop 2048 (Number Merge) with physics dropping, combo sounds, vibration feedback, and PK Score Mode support.

## [v0.3.3] - 2026-06-02
### Added
- **Sudoku**: Full implementation of Sudoku including Single Player, PK Speed, and PK Steal modes.
- **Sudoku Engine**: Go backend engine handling board verification and real-time multiplayer states.

### Changed
- **Math24**: Filtered and optimized puzzle datasets (limited easy/medium counts, prioritized puzzles with fractions).
- **Math24 PK Modes Overhaul**: 
  - **Speed Mode**: Fixed an issue where the game ended after only 1 puzzle. It now strictly requires solving 5 consecutive puzzles to win.
  - **Steal Mode**: Fixed an issue where the board did not visually update to the new puzzle after an opponent scored.
  - **Freeze Penalty**: Enabled a 3-second freeze penalty in both PK modes for incorrect submissions, complete with a new visually immersive icy overlay and countdown timer on the board.

### Added
- **1A2B 密码破译 (Codebreaker)**: 经典的逻辑推理猜数字游戏正式上线！支持单人练习模式（支持 3 位/4 位/5 位数难度选项）与双人联机实时竞速（PK Speed）模式。游戏搭载了极其精美的毛玻璃（Glassmorphism）科技风格 UI 界面、自适应虚拟辅助数字键盘（一键排除、锁定草稿），以及联机模式下的实时对手进度追踪和战绩看板，带来无与伦比的智力博弈体验。
  - **细节体验全面升级**：在移动端左上角独立增加了直观的 `返回`（<）按钮；为游戏内数字键盘增加了符合直觉的 `删除 (Delete)` 退格键，替代了之前体验不佳的 `清空 (Clear)` 键。
  - **修复了大厅死锁 Bug**：修复了玩家在进入已解散的联机房间后，缓存未能被正确清除，导致之后即使在大厅点击 1A2B 也无限提示“房主已解散房间”并被强制弹出的死锁问题。现在玩家可以随时无缝重开单机游戏了。
  - **后端房间管理逻辑极简重构**：大刀阔斧地简化了联机房间的生命周期（去除了原先导致逻辑混乱的“空房间 60 秒滞留”和“房主转移 15 秒延迟”）。现在，只要房间内所有人都离开，该房间就会立刻被销毁，彻底杜绝了大厅中无缘无故多出“幽灵房间”的灵异现象，也解决了房主解散房间可能失效的问题。
- **Gomoku (五子棋)**: Classic 5-in-a-row strategy game! Includes an advanced Alpha-Beta Pruning AI for single-player practice (3 difficulties), and full WebSocket PvP support for challenging friends! Features a highly-polished wood-textured board with glassmorphic pieces.
- **Global Achievements (Profile) Page**: A centralized dashboard to view best records across all 5 single-player games. Includes a new `🏆 Profile` button in the main navigation.
- **In-Game Best Records**: Display real-time "Best Time" or "Best Score" inline during single-player gameplay for all games.
- **(Architecture) Party Room Mode (综合包厢模式)**: 实现了无缝切游戏功能！现在在任何游戏的等待大厅内，房主可以直接点击「更改设置（Change Settings）」随时将当前房间切换为其他游戏或模式，无需解散房间重新拉人。后端引擎会热重载并向所有玩家下发 `room_game_changed` 广播，前端通过 Angular Router 自动将全员平滑过渡到新游戏组件。
- **统一所有游戏内的「进大厅」图标**：修复了在 PK 模式下，部分游戏（尤其是数独）缺失右侧呼出大厅按钮的问题；全面支持桌面端在对局时通过抽屉方式呼出房间大厅列表，方便玩家无缝加入新房间。
- **(Tetris)** 修复了俄罗斯方块和六边形消除中等待房间模式不匹配（`game` vs `mode`）导致无法正常显示倒计时的问题，统一调整属性映射。
- **(Global UI)** 修复了所有游戏在移动端下右侧大厅抽屉默认遮挡游戏区域的问题。移除了包裹层的固定 `flex-col` 类，改为在 `ngClass` 中根据抽屉状态动态添加，确保 `hidden` 属性在移动端能正确生效，现在点击移动端大厅的任何游戏都将默认直接看到游戏棋盘，并可正确点击关闭按钮收起抽屉。
- **(Gomoku PK Mode Bug Fixes)**:
  - 修复了后端 `ClassicEngine` 中的 `HandleAction` 在参数 `action` 为空时未从 JSON payload 中提取 `action` 字段，导致“开始游戏” (`start`) 和“落子” (`move`) 动作报错 "unknown action" 并失效的 Bug。
  - 修复了 `GomokuComponent` 初始化时未连接 Lobby WebSocket，导致游戏内置的房间大厅面板无法获取在线房间列表和玩家数的 Bug。
  - **修复了五子棋 PK 模式下房间状态与玩家列表同步失效的 Bug**：重构了前端 `GomokuStore`，全面采用 Angular Signals 响应式派生机制（`computed` 信号），不再在 `effect` 中通过副作用强行 `set` 数据，确保玩家加入/退出、房间创建以及棋盘更新时，大厅面板与等待房间界面均能秒级双向实时渲染。
  - **统一五子棋 PK 倒计时与文字居中**：移除了原本偏斜、未居中的“准备就绪！”硬编码提示，全面接入全局 `GameTimerService`。现在五子棋在 PK 倒计时阶段也会展示统一的 3、2、1、GO! 动感倒计时，且文字在棋盘上完全水平/垂直居中。
  - **修复跨游戏切换游戏 (综合包厢模式) 五子棋同步失效的 Bug**：修复了房主从其他游戏切换到五子棋时，房客无法自动同步切换的 regression。原因为 `GomokuComponent` 的模板与代码中未声明 `#lobbyPanel`、未绑定 `(changeSettings)` 事件以及缺少 `openChangeSettings()` 方法，导致路由及大厅的更新流程发生阻断。已全面补齐相关逻辑，确保多人在房间内可以无缝自由切换各种游戏。
  - **Gomoku PK 模式的「离开」与「认输」功能修复**：
    - 后端：在五子棋经典 PK 引擎 `ClassicEngine.HandleAction` 中新增对 `forfeit`（认输）动作的支持。接收到认输请求后，自动将游戏状态切换为已结束（Finished），并判定另一方玩家为获胜者，彻底解决以往 PK 模式下认输没有效果的问题。
    - 前端：在五子棋模板头部导航栏新增「离开」按钮（仅在 PK 模式下显示），调用统一的 `leaveGame()`。退出时自动清理 SessionStorage 重连缓存、断开 WebSocket 并返回游戏大厅，避免在房间中产生幽灵连接。
  - **1A2B 密码破译联机对战体验优化**：
    - 前端：在右侧对手猜测进度面板头部，动态引入了当前对手的专属玩家昵称 `👤 player_id`；并新增实时破译状态微动效徽章（`⚡ 正在推理` / `🎉 已破译`），让竞速对决过程更具代入感与竞技友好度。
- Added Tetris (俄罗斯方块异盘乱斗), with Single Player and PK Attack mode
- Included SVG icons for tetris board
- Updated i18n
- Fixed Tetris main board layout height collapsing bug by wrapping it in a relative absolute container chain
- **统一所有游戏 PK 模式的"再来一局"与"解散房间"功能**：
  - 修复扫雷 PK 模式"再来一局"按钮无效的 Bug（协议字段 `action` 应为 `type`）
  - 为所有游戏 Store（扫雷、俄罗斯方块、六边形、数字华容道、数独）统一添加 `dismissRoom()` 方法
  - 所有组件的 `dismissRoom()` 确认弹窗统一改用 i18n 多语言翻译，消灭硬编码英文
  - 添加 `game.restart` 和 `game.dismiss_room` 翻译键（中/英双语）
  - **大厅房间列表的"解散"按钮现在仅对房主可见**
- **游戏大厅 UI 与翻译细节体验优化**：
  - 将等待大厅的「更改设置」按钮文案统一修改为更直观的「切换游戏」（对应英文修改为 `Switch Game`），符合综合包厢派对模式的用户心理预期。
  - 修复了创建房间/修改设置对话框中，因各游戏模式和难度数量不一致导致按钮垂直居中抖动的不良视觉效果。将选择游戏、选择难度两个多行/多列按钮网格的垂直对齐方式统一优化为**顶部对齐**（`justify-start pt-3 pb-2`），并增加了一致的 `min-h-[72px]` 高度约束，使界面在切换游戏时极其平滑、不会抖动。
  - **修复了创建/修改房间设置弹窗由于整体垂直居中和高度拉伸导致的上下跳动与空白问题**：将 Modal 蒙层的对齐方式变更为直接置顶（`items-start pt-0 px-4 pb-4`），并去除了弹窗卡片的顶部圆角（`rounded-t-none rounded-b-2xl md:rounded-b-3xl`）以完美无缝贴合浏览器顶部边缘。增加了 `overflow-y-auto` 滚动支持及 `h-fit` 自适应高度，彻底解决旧版浏览器中 flex-col 导致的高度被拉伸到最大 `max-h` 的 Bug。现在切换不同游戏时，弹窗顶部始终完美贴合视口最上方，仅下方内容根据难度自适应收缩或伸展，界面极其美观紧凑。



- **统一各游戏对战模式的动态顶部 Header 显示 (Dynamic PK Header UI)**：
  - 彻底移除了原先硬编码在页面模板中类似 `PK: 抢雷` 等文字标签，重构为通过 `GameRegistryService` 全局按需拉取当前设定模式及难度对应的本地化多语言资源进行动态渲染。
  - 优化了 PK 房间头部的排版视觉体验，通过“同盘抢分 / 中等”这种带有分隔符的单行水平布局替代原本上下两排居中的文字，节约了垂直空间，极大地改善了移动端的排版紧凑感。
- **修复综合包厢（Party Room）内同路由组件不刷新及后台通讯失效的问题**：
  - 将前端「更改房间设置」弹窗下发的事件标识从 `update_room_settings` 修正为与 Go 后端引擎 `change_game` 动作完美对齐，解决了修改对局规则后没有反应的 Bug。
  - 修复了 Angular Router 在同页面（同 URL 下比如都是 `/games/sudoku` 但只改难度和模式）不会触发重新实例化的特性漏洞。在核心 WS 服务监听 `room_game_changed` 时，如果遇到相同组件，则强制采用 `skipLocationChange: true` 辅以跳至根目录的方案迫使 Angular Router 完全刷新，并触发了组件层的生命周期流转。

### Added
- **Math 24 Game**: Added a new Math 24 game supporting single-player mode, speed PK mode, and steal PK mode. The game follows the standard game architecture and generic lobby mechanisms.
- **大厅公屏广播：“发英雄帖” (Global Lobby Broadcast)**:
  - 玩家创建房间后，可在“我的房间”内点击【📢 发英雄帖】按钮。
  - 大厅面板顶部新增跑马灯式广播横幅区域，全服玩家可实时接收。
  - 广播消息内嵌 `[点击此处] 立即应战！` 的快速加房链接，点击后即刻跨游戏进入对方房间，极大促进玩家互动和跨游戏引流。
- **结果页智能推荐 (Smart Game Recommendation)**:
  - 游戏结算 Overlay（胜利/失败界面）底部新增横向滑动的“你可能还想挑战”精美卡片区。
  - 通过 `GameRegistryService` 全局按需动态提供当前游戏的相关推荐。例如：玩过《数字华容道》，自动推荐挑战《数独》或《六边形消除》。
  - 点击推荐卡片直接路由至新游戏界面，有效提升游戏内停留时长（User Retention）。
