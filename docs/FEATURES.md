# X-Game 核心功能清单

本文档汇总了 X-Game 项目当前已开发实现的所有核心功能模块与技术亮点。

## 1. 基础架构体系 (Infrastructure)

### 后端技术栈 (Go + Fiber)
- **高性能框架**：基于 Fiber v3 构建轻量级、超快速的 HTTP 与 WebSocket 服务。
- **持久化层**：GORM + PostgreSQL 驱动，实现了完善的数据迁移与用户状态落盘。
- **自动化构建部署**：集成了自动编译脚本，支持在每次 Build 时通过 `ldflags` 全自动注入时间戳作为构建版本号（例如 `v2023.10.23.1234`），并在前端实时展示。
- **环境变量化**：集成 `joho/godotenv` 支持本地 `.env` 热替换，并预留了 Docker 化与配置中心的支持。

### 前端技术栈 (Angular 21 + TailwindCSS v4)
- **Zoneless 无区化渲染**：全盘采用 Angular 21 最新的 Signals 响应式特性，性能极致优化，告别 `zone.js` 的性能损耗。
- **无缝切游 (Switch Room Game)**：多人房间结算页面支持房主一键切换游戏，带领全房间玩家瞬间转移至新游戏并保持原状，免除退回大厅重组房间的繁琐步骤。
- **大一统游戏状态引擎**：构建了统一的 `BaseGameStore` 核心层，强制接管所有 14 款子游戏的联机同步、生命周期轮转（Waiting/Starting/Playing/Finished）与玩家列表管理。各子游戏严格遵循单向数据流，仅需实现核心的纯逻辑 `ILocalEngine`。多局系列赛通用信号（`pkWins` / `isSeriesOver` / `pkScoreLabel`）全部内置于基类，各游戏无需重复实现；系列赛重启时 `_pkStatSubmitted` 自动重置，确保每局战绩独立提交。
- **统一游戏组件基类（BaseGameComponent）**：`openChangeSettings()`、`navigateToPkArena()`、`handleJoinRoom()` 等 8 个公共方法上移至基类，消除 11 款游戏的重复样板代码；`GameStoreInterface` 接口新增 `pkWins` / `isSeriesOver` / `pkScoreLabel` 三项约束，确保编译时类型安全。`lobbyPanel` 通过 `@ViewChild override` 模式让子类可选复写而不重复声明。
- **现代美学 UI**：结合 TailwindCSS v4 的原子化 CSS 特性，实现了全面现代化、毛玻璃（Glassmorphism）、微动画（Micro-animations）、金色脉冲光晕等具有震撼视觉的高级游戏界面。
- **自动化版本号**：在前端编译命令中嵌入了自定义 Node 脚本，全自动根据构建时间生成版本号（如 `v2023.10.23.1234`），与后端版本号一并以非侵入式的 UI Overlay 悬浮于全站右下角，供管理员与玩家精准识别系统构建版本。
- **路由懒加载**：实现了核心游戏大厅（Lobby）与具体游戏页面（Minesweeper）的独立路由控制与分离渲染。
- **广告商业化架构 (AdSense)**：全局集成了 Google AdSense 体系，提供独立的 `AdsenseComponent`。该组件完美适配了 SPA 单页应用的路由切换生命周期，能自适应各种广告布局格式，实现优雅的商业化变现方案。
- **游戏元数据 DB 化（运行时覆盖层）**：`gm_game_configs.config`（JSONB）存储完整元数据（icon / multiRound / modes[] / difficulties[]）。`GameRegistryService.loadFromDB()` 通过 `APP_INITIALIZER` 在浏览器端拉取 `GET /api/v1/games/meta` 并覆盖 TS registry；SSR/预渲染期自动降级为 `game-definitions.ts` 静态 fallback，不影响构建。管理员可通过 Admin UI `/admin/games` 直接修改元数据，无需代码部署即时生效。
- **大厅游戏列表无限滚动**：`GET /api/v1/games` 支持分页（`?page&limit`），返回 `{ games, total, hasMore }`。大厅组件用 `IntersectionObserver` 监听底部 sentinel，滚到底自动加载下一页并追加卡片，首屏默认加载 6 款游戏。

---

## Available Games (核心游戏矩阵)

- **Minesweeper (扫雷)**
  - Modes: Single Player (首击必空), PK Speed (异盘竞速), PK Steal (同盘抢雷)
- **Sudoku (数独)**
  - Modes: Single Player (4 difficulties: 初级/中级/高级/专业), PK Speed, PK Steal
  - 核心功能: 毫秒级状态同步、原汁原味的历史撤销与擦除、完美的“重置回初始状态”机制，甚至自动屏蔽用过提示的固定数字。
- **Sliding Puzzle (数字华容道)**
  - Modes: Single Player (3x3 to 6x6), PK Speed
- **Hexa Puzzle (六边形消除)**
  - Modes: Single Player (无尽模式), PK Score
- **Tetris Battle (俄罗斯方块)**
  - Modes: Single Player (无尽马拉松), PK Attack (异盘乱斗 / 发送垃圾行)
- **Gomoku (五子棋)**
  - Modes: Single Player (AI挑战 - Easy/Medium/Hard), PK Classic (经典对战)
- **Codebreaker (1A2B)**
- **Math 24**
- **Drop 2048 (Number Merge)**
- **Water Sort Puzzle (水管分色)**
  - Modes: Single Player (单机模式), PK Speed (竞速对决)
- **Sokoban (推箱子)**
  - Modes: Single Player (单机解谜), PK Speed (竞速对决)
  - 核心功能: 动态响应式绝对布局、支持点击空地自动 BFS（广度优先搜索）智能寻路，以及无限次完美撤销。
- **Nonogram (数织)** *(第 15 款游戏)*
- **Hashi (桥梁谜题)**
  - Modes: Single Player (单机解谜)
  - 核心功能: SVG 动态无损渲染引擎，双击切换双桥机制，智能连通性与环路检测算法。深度集成 `bridges-generator` 生成算法，支持初级 (7x7)、中级 (10x10)、高级 (15x15)、专家 (20x20) 四大难度，保证题库唯一解。
  - Modes: Single Player (单机模式), PK Speed (竞速对决)
  - 核心功能: 纯前端逻辑引擎（单机模式不经过服务器），支持 5×5/10×10/15×15 三种网格尺寸，左键涂色/右键打叉双模式操作，自适应多平台棋盘尺寸（CSS Grid + 动态 cellSize 计算），游戏结算弹窗与 XP/成就/历史记录全系统对接。
- **Connect (一笔画连线)** *(第 16 款游戏)*
  - Modes: Single Player (单机模式)
  - 核心功能: 800道关卡，SVG 霓虹发光材质渲染管道，支持鼠标/触摸流畅滑动连接配对颜色。
- **成语益智 (Idiom Quiz)** *(第 14 款游戏)*
  - 三模式：填空闯关分级学习 + 每日猜词（全球同题 Wordle 风格）+ PK 极速填空（联机对战）
  - 数据库：2000 条精选成语（来自 pwxcoo/chinese-xinhua），含释义、故事、出处、拼音
  - **填空闯关分级**：简单 / 中级 / 困难三难度选关，智能推荐当前最适难度（掌握率 <80% 推荐当前级别）；`?difficulty=` 参数过滤加权抽题池
  - 间隔复习：连续答对 3 次→标记已掌握；14 天未复习→自动重入练习池（艾宾浩斯遗忘曲线）
  - 每日 Wordle：日期作随机种子稳定出题，六次猜测，两遍着色算法（正确处理重复汉字）
  - 猜测历史持久化：`gm_user_idiom_daily_guesses` 表保存每次猜词，刷新页面不丢进度
  - 分享功能：生成 emoji 彩格战绩图，支持 Web Share API + 剪贴板降级
  - **PK 极速填空**：双方收到同一道填空题，先答对得分；答错自动解锁重填；2 秒后自动出下一题；先得 N 分赢得系列赛；完整等待室 / 倒计时 / 结果覆盖层流程

## Global Features: Single Player (3/4/5 位数难度练习), PK Speed (同屏竞速破译)

## Personal Records & Global Achievements (个人记录与成就系统)
- **Persistent Local Records**: Registration & Guest Play: Allow players to jump right in or create persistent accounts.
- System Management: Advanced tools for administrators including maintenance mode and global announcements.
- **Global Achievements Profile (`/profile`)**: A unified, centralized dashboard displaying all historical personal records.
- **Game Popularity Tracking**: Each game tracks and displays its visit count (🔥) in real time in the game lobby.
- **Manual Game Sorting**: Administrators can override popularity sorting by manually assigning a `SortOrder` (priority) to games via the Admin Dashboard. Games are strictly ordered by `SortOrder` (ascending) first, breaking ties with `VisitCount` (descending).
- **In-Game Display**: Real-time display of the player's personal best inline within the game interface to promote engagement.

### Admin Dashboard
- User Management: View user lists, toggle active status, and track last login.
- **Global System Settings (Auto-Save)**: Dynamic configuration system for announcements, ads, maintenance mode, and fake traffic simulator. All toggle switches auto-save on change; text/number inputs auto-save on blur. No manual "Save" button needed.
- **Graceful Degradation (Multiplayer Kill Switch)**: Admins can instantly disable all multiplayer and matchmaking features to save server resources or perform maintenance. The system gracefully degrades to a pure local single-player experience without taking the site offline. All 13 games' Right Sidebar lobby panels, mobile toggle buttons, and the global lobby panel are hidden via `@if` conditional rendering. Backend WebSocket guard rejects any stale multiplayer requests with `multiplayer_disabled` error code.
- Real-Time Monitoring: Live graphs and stats of currently active rooms and online players using WebSocket connections.
- Fake Traffic Simulator: Generates random background rooms and players to create a lively lobby environment. Controllable via the Admin Settings panel.
- **Responsive Lobby Grid**: The game lobby uses CSS Grid `auto-fill` to dynamically adjust column count based on available width (up to 5 columns on 4K screens). When the multiplayer sidebar is hidden, cards automatically expand to fill the freed space.
- **游戏元数据管理（Admin Games Settings）**：Admin Dashboard 的 Games 设置弹窗新增 icon emoji 输入框、multiRound 开关、modes JSON 和 difficulties JSON 文本框，管理员可直接编辑并保存至 `gm_game_configs.config`，无需修改代码或重新部署。

## UI/UX Design System (UI/UX 规范)

- **全局状态隔离**：通过依赖注入（DI）与 Signals 双向绑定实现了纯前端状态管理的强隔离。
- **无缝多语言切换 (I18n)**：`I18nService` 支持中文（zh-CN）与英文（en-US）的瞬时热切换，不刷新页面即刻更新全站文案。
- **动态主题系统**：`ThemeService` 提供 Light / Dark 等系统级别的主题色轮换，结合 CSS 原生变量（CSS Variables）映射到 Tailwind 工具类中，实现高级的夜间护眼与酷炫竞技模式的流转。
- **定制化滚动条 (Custom Scrollbar)**：所有包含垂直或水平滚动的容器，必须添加 `custom-scrollbar` 类，以防止浏览器原生白色滚动条破坏暗黑主题的视觉一致性。
- **SEO 与广告合规的 3 列响应式布局 (3-Column SEO Layout)**：全站 14 款游戏页面均采用 `320px SEO说明 | 居中游戏区 | 320px 联机大厅` 的对称三栏布局。左侧提供丰富的富文本游戏玩法与技巧（极大提升 AdSense 审核与 Google SEO 索引质量），中间为核心游戏区，右侧为多联机大厅。在移动端自动降级为流式单列布局，保证内容呈现完整。并且游戏主界面抛弃死板的锁定高度，全面改用 `min-h` 支持宽屏与大屏设备自然流式滚动。

---

## 2.5 跨游戏通用功能体系
- **全局竞技大厅 (Global Arena Lobby)**：在平台首页提供汇总的竞技大厅面板。PC端以侧边栏常驻，移动端以抽屉弹层呼出；玩家能够直观看到所有游戏的活跃房间和在线玩家，并支持跨游戏直接加入房间对战，大大提升对战效率和社区活力。
- **综合包厢模式 (Party Room Mode)**：为了提供最好的朋友开黑（Party）体验，我们的房间设计不再死板地绑定于某一款游戏。玩家聚在一个房间里后，**房主可以随时更改房间设置，无缝切换到其他游戏或难度**。后端会自动热重载新的游戏引擎，并通过广播带领房间内所有玩家集体、平滑地转场到新的游戏界面，真正实现了“一个房间，玩遍全站”的派对体验。
- **大厅公屏广播：“发英雄帖” (Global Lobby Broadcast)**：在全局竞技大厅或游戏内房间面板，房主可一键发送英雄帖。大厅顶部会以跑马灯形式滚动系统高亮广播，其他在线玩家点击广播内的链接即可瞬间跨游戏加入对战，极大盘活全局活跃度。
- **全页 PK 竞技大厅 (GamePkLobbyComponent)**：点击游戏右上角人群图标，单机模式下直接展开全页 PK 大厅，统管所有游戏房间。顶部导航显示统一的"⚔️ PK 竞技大厅"标题而非单一游戏名称。桌面端两栏布局（左：创建表单，右：活跃房间+在线玩家 Tab）；移动端折叠式 Accordion。新增三大能力：①创建表单内置全游戏选择器（4列 icon 格，切换游戏自动联动 Mode/Difficulty）；②房间列表支持按游戏筛选（chip 过滤条，仅有多种游戏时显示）；③我的房间可通过 ⚙ 按钮触发"换游戏"弹窗实时切换游戏/模式/难度（走 change_game WS 动作）。
- **多局制 PK 系列赛 (Best-of-N)**：创建房间时可指定目标局数（1 / 3 / 5 / 10），先赢 N 局者获得系列赛冠军。玩家 Badge 实时显示 `🏆 当前局/总局`。系列赛结束后自动重置 Wins，支持再来一局开启新系列。已支持游戏：扫雷（速度模式）、滑块拼图、灯谜、密码破译。多局通用逻辑（`pkWins` / `isSeriesOver` / `pkScoreLabel`）已全部内置于 `BaseGameStore`，各游戏无需重复实现；同时修复了系列赛重启时 `_pkStatSubmitted` 未重置导致后续局对战统计不提交的 Bug。
- **动态竞技房间**：每款游戏内部也有独立大厅。玩家可创建房间、调整难度模式、邀请在线玩家。支持跨设备的双人实时对战和计分同步。
- **私密好友房 (Private Room Password)**：创建房间时支持设置 4 位纯数字密码保护。大厅中带有锁定图标 🔒 的房间加入时需验证密码。结合包厢模式，密码验证状态在切游戏时会无缝跨路由传递；且房主断网重连可自动免密直连。
- **全端社交裂变与分享系统 (Social Sharing & Promotion)**：
  - **原生 Web Share API 集成**：移动端可直接唤起系统级分享（直通微信、推特等社交软件）；PC端则通过自定义的超高颜值 `ShareModal` 弹窗展示。
  - **动态二维码生成 (QR Code)**：引入 `qrcode` 实时渲染带分享链接的高清二维码，扫描即刻拉起游戏页面。
  - **房间直达裂变**：在联机房间内点击“分享”，会自动生成带有房间号、模式、房主ID参数的专属邀请链接。朋友点击即可瞬间拉起对应的游戏并直通对战房间。
  - **动态 SEO 与富文本预览 (Open Graph)**：集成了 `SeoService`，支持按当前游玩的游戏动态更新 `og:image` 与 `og:title/description`。在即时通讯软件发送链接时，会自动带出极其精美的游戏卡片预览，极大地提高转化率。
  - **OG 封面图**：`public/og-cover.png`（1200×630px）作为所有页面的默认分享图；博客文章页额外注入 BlogPosting JSON-LD 结构化数据，提升 Google 富文本搜索结果展示。
  - **Sitemap 自动生成**：`scripts/generate-sitemap.js` 自动扫描 `features/games/` 目录与博客索引，生成含 `<lastmod>`、`hreflang`、`x-default` 的双语 sitemap（共 92 个 URL），同步输出 Angular SSG 用 `routes.txt`。
  - **全站静态预渲染（93 条路由）**：`app.routes.server.ts` 所有路由统一 `RenderMode.Prerender`，包含博客文章、游戏页、文档页。Googlebot 访问任一 URL 均获得完整 HTML，无 JS 执行需求。
  - **博客内容中心（静态 JSON 驱动）**：10 篇双语博客文章存储于 `public/assets/blog/{slug}.json`；`blog.service.ts` 读取静态文件（预渲染友好），Admin 面板写入 DB 后通过 `scripts/export-blog.js` 一键导出同步。文章均达到 900+ 英文词 / 1900+ 中文字，满足 AdSense 内容质量要求。
  - **robots.txt 精细配置**：允许全站爬取，Disallow `/admin/` 路径节省爬取配额；Cloudflare 托管层额外屏蔽 AI 训练爬虫（GPTBot、ClaudeBot 等）。
  - **AdSense 合规**：隐私政策含 Cookie/广告披露条款及用户退出链接；About 页含联系邮箱（contact@puzzlepk.com）。
- **结果页智能推荐 (Smart Game Recommendation)**：每局单机或联机游戏结束后，胜利/失败的 Overlay 面板底部会智能展示一排相关游戏的精美入口卡片。结合 `GameRegistryService` 动态匹配相关游戏，有效提高用户粘性和游戏间引流。

---

## 3. 真实用户鉴权系统 (User Authentication)

- **JWT 持久化鉴权**：借助 Fiber 的 JWT Token 下发，实现前后端分离的强校验机制，确保游戏数据不可篡改。
- **Signals 鉴权状态 (AuthStore)**：以 Angular Signals 重构全局鉴权商店 `AuthStore`，监听全局状态自动更新 Navbar 上的玩家昵称与登录入口。
- **毛玻璃动效表单 (Glassmorphism Forms)**：倾心打造带有高级光晕动效的 Login/Register 极具赛博质感的页面。
- **强硬隔离的路由守卫 (Auth Guard)**：任何未持有 Token 的匿名访问，都会在前端路由层被强踢回登录页面。

## 4. 后台管理与全栈权限控制 (Admin Dashboard & RBAC)

- **核心权限模型 (RBAC)**：数据库层面扩充了 `Role`（角色）与 `Status`（账号状态），支撑起了整个平台的最高管理权限与封禁隔离机制。
- **全站立体防线**：
  - 后端：通过 Fiber 中间件验证 JWT 票据中的 `role` 声明，实现 API 级别的绝对保护。
  - 前端：依托 Angular 的 `CanActivateFn` 路由守卫阻断任何非法的面板访问尝试。
- **高颜值管理控制台**：搭载极具科幻质感的响应式仪表盘数据大屏。管理员可一览注册总人数、快速检索玩家信息，并执行一键 `BAN`（封号隔离）等惩戒操作。

---

## 5. 多人竞技引擎架构 (Game Engine Architecture)

- **纯正的后端权威模式**：从根本上摒弃了浏览器本地算雷的伪联机机制。前端只作为渲染视图（View层），计算核心全部在 Go 引擎执行，防范任何形式的外挂注入透视作弊。
- **独立 WebSocket 房间系统 (Room Manager)**：
  - 基于房间 ID（Room ID）的隔离广播模型。
  - 用户接入即初始化其游戏状态、记录比分，任何一个人断开与重连都不会导致房间状态损毁。
  - **严格分离创建与加入**：`CreateRoom` 和 `JoinRoom` 两个独立操作，杜绝了断线重连意外创建幽灵房间的可能。
  - **房主自动转移**：房主断线 30 秒未重连时，系统自动将房主权限转移给下一个在线玩家，而非解散房间，最大化保护其他玩家的游戏体验。
  - **踢人冷却机制**：被踢出的玩家需等待 30 秒冷却后才能重新加入同一房间。
- **三重可靠性保障 (Triple Reliability)**：
  - **心跳保活 (Ping/Pong)**：后端每 30 秒发送 Ping 帧，90 秒无响应则关闭连接；前端每 25 秒发送应用层心跳，双重检测连接存活。
  - **实时推送 (WebSocket Push)**：房间变化时通过 `BroadcastLobbyUpdate` 毫秒级推送到所有大厅客户端。
  - **HTTP 轮询兜底 (Polling Fallback)**：前端每 10 秒通过 `GET /api/v1/rooms` REST 端点拉取房间列表（WS 断开时加速至 3 秒），即使推送丢失也能恢复数据。
- **智能重连策略 (Exponential Backoff)**：前端 WebSocket 断线重连采用指数退避算法（2s→4s→8s→最大 30s），并严格区分"正常断开"（不重连）和"异常断开"（自动重连），减少服务器压力。
- **核心游戏调度接口 (`GameEngine` Interface)**：
  - 标准化 `InitGame`（初始化）、`HandleAction`（处理点击）、`GetState`（拉取状态快照）等生命周期钩子，为未来无限扩增新的益智类游戏铺平了底层架构。

---

## 6. 扫雷核心对战功能 (Minesweeper PK Mode)

- **硬核 PK 联机竞速规则**：不再是无脑刷经验或合作通关模式，所有房间内的玩家都在**同一个棋盘**上竞技：
  - **推理抢雷**：当你确认某个格子是地雷时，迅速切到**插旗（Flag）**模式点下去，服务器验证如果正确，你将**获得 1 分**。
  - **格子宣誓主权**：成功插旗的格子不仅会变幻边框和动画特效，还会盖上该玩家专属的 ID 名牌！
- **犯错反噬（硬直惩罚）机制**：
  - 乱挖到雷，或者插错安全区，不会导致全盘皆输！
  - 而是引入了 3 秒的**眩晕/冻结 (Freeze Cooldown)** 惩罚。服务器会硬拒你的所有点击操作。这段时间你的对手可以尽情收割积分！
- **实时积分榜显示 (Scoreboard)**：界面上空实时浮动当前房间内的连接玩家列表，并且只要有分数变化，UI 立刻跳动更新（即连即注册，初入房间即可看到自己 0 分挂榜）。
- **iOS 风格高阶难度配置**：不仅内建了 7 个维度的渐进难度阶梯（从 初级 到 专家），还通过全屏毛玻璃 Modal 支持了**完全自定义的滑动条调整（Custom Board Size & Mines）**，后端动态计算引擎同步适配。
- **动感声效服务 (AudioService)**：
  - **点击探雷**：清脆轻盈的木块声响。
  - **插旗得分**：急促的确认声效反馈。
  - **爆炸惩罚**：深沉短促的爆炸声效，增强玩家错误操作的惊险度。
  - **全盘胜利**：通关时刻宏大的庆祝音效与胜利金光 Overlay 动画双层叠加，营造巨大的爽感反馈。

---

## 7. 泛用型大厅与数独框架 (Generic Lobby & Sudoku PK)

- **高度解耦的引擎注册机制 (Factory Registry)**：
  - `GameEngine` 实现了高度插件化。核心 WebSocket 大厅不再关心具体游玩的是扫雷、数独还是未来的俄罗斯方块。
  - 新增游戏只需要通过 `engine.Register()` 向框架注册并实现统一的生命周期与广播接口 (`SetBroadcaster`)，即可开箱即用地继承所有的房间、对战和重连机制。
- **全端参数与标识符标准化 (Unified Identifiers)**：
  - 前端路由与组件中，对战模式统一抽象为泛用的 `steal`, `speed`, `score`, `battle`。
  - 后端 Engine Factory 自动通过统一 `gameId` 和 `mode` 反射生成游戏实例。
- **全端响应式界面与大厅交互 (Responsive Drawer Panel)**：
  - 各类游戏全面适配桌面与移动端 UI 体验。移动端大厅抽屉（Drawer）不会由于 CSS 冲突自动常驻遮挡游戏区域；关闭逻辑保证精准恢复游戏棋盘视觉，`flex` 布局受抽屉状态（`isMobileSidebarOpen`）严格控制，彻底告别移动端样式穿透带来的操作障碍。
  - **样式开发强制规范**：开发任何带有 `overflow-y-auto` 或 `overflow-x-auto` 的可滚动容器时，必须附加 `.custom-scrollbar` 全局样式类，保证多主题下的原生滚动条外观一致性。
- **全局沉浸式交互与桌面大厅侧边栏 (Responsive Lobby Drawer)**：
  - 移除了仅在移动端显示大厅按钮的限制。所有单机/PK游戏界面的右侧，均强制存在呼出房间信息的统一图标。
  - 在大屏桌面端（Desktop）处于房间（PK 模式）时，大厅面板自动演化为抽屉式 Overlay 覆盖层（而不是之前的相对布局或强行隐藏），确保玩家游玩过程中可随时浏览、加入新房间。
- **数独 Steal 模式 (抢夺激战)**：
  - 多名玩家共用一个棋盘填空，正确填入直接得分锁定，错误填入倒扣分并带来 3 秒冰冻。
  - 毫秒级的状态帧同步，让原本静态的逻辑推理游戏变成了心跳加速的眼疾手快竞技场。
- **数独 Speed 模式 (竞速冲刺)**：
  - 玩家互不干涉在各自的完整克隆棋盘中解同一道题，比拼谁先 100% 正确提交解答。

### 4. 数字华容道 (Sliding Puzzle)
- **支持模式**：单机模式、PK 竞速模式 (Speed)
- **难度选择**：初级 (4x4)、中级 (5x5)、高级 (6x6)。
- **完全同盘洗牌**：竞速模式下，后端保证给全场所有玩家下发相同的初始打乱状态棋盘，确保竞技的公平性。
- **平滑动画与响应式**：采用 Tailwind 动态计算宽高结合定位过渡，达到极佳的视觉移动反馈。

### 5. 六边形消除 (Hexa Puzzle)
- **支持模式**：单机模式、同盘抢分模式 (Steal)
- **消除逻辑**：三向匹配验证算法，单次放置触发连环消除，完美契合六边形网格特性。
- **动态分数池**：同盘对战中，分数实时广播同步，打造你争我夺的刺激对抗体验。
- **多语言支持**：完全兼容全站动态多语言引擎热切换。

### 6. 俄罗斯方块异盘乱斗 (Tetris Battle)
- **支持模式**：单机闯关、异盘乱斗模式 (PK Attack)
- **核心战斗机制**：玩家每次消除2行及以上，即可产生相应的垃圾行 (Garbage Lines)，并实时发送给对手。
- **硬核生存**：谁先溢出顶部谁即战败，经典的大逃杀下落式体验，极其考验手速与反应！

---

## 8. 多人联机游戏接入规范 (Multiplayer Game Development Specification)

为了保证平台的健壮性，任何未来新增的联机游戏（如俄罗斯方块、五子棋等）**必须**严格遵守以下生命周期与接口适配规范，防止出现状态遗漏或“幽灵房间”等严重 Bug：

- **房间生命周期与解散监听 (Room Dismissal Handling)**：
  - 后端房间解散时会全局广播 `{"type": "room_dismissed"}`。
  - **前端硬性要求**：新增游戏组件必须在初始化时（如 `constructor` 中）使用 `effect` 监听 `this.wsService.roomDismissedEvent()`。一旦监听到解散，必须强制弹出 Toast 提示（“房主已解散房间”），并立刻调用 `store.leaveRoom()` 将当前所有非房主玩家强制踢回大厅。绝对禁止遗留任何玩家在已被销毁的房间中卡死。
- **加入与退出逻辑 (Join & Leave)**：
  - 同游戏内加入：通过 `GameLobbyPanelComponent` 的 `(joinRoom)` 事件直接调用 `store.joinRoom()`。
  - **跨服加入 (Cross-Game Join)**：通过全局 `CrossGameJoinService` 实现。大厅面板在检测到目标房间属于不同游戏时，自动调用 `crossGameJoin.setPendingJoin()` 存储房间信息，然后通过 Angular Router 导航到目标游戏路由（不携带 queryParams）。目标游戏组件在 `ngOnInit` 中调用 `crossGameJoin.consumePendingJoin(gameId)` 同步读取并消费待加入信息。此机制彻底避免了 queryParams 的时序竞争和 URL 二次触发问题。
  - 组件销毁 (`ngOnDestroy`) 或玩家主动点击离开时，必须触发退房逻辑。
- **新游戏跨服接入模板 (Cross-Game Join Template)**：
  ```typescript
  // 在新游戏组件的 ngOnInit 中加入：
  private crossGameJoin = inject(CrossGameJoinService);
  ngOnInit() {
    const pending = this.crossGameJoin.consumePendingJoin('新游戏ID');
    if (pending) {
      this.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host);
    }
  }
  ```
- **后端引擎标准化 (Engine Registration)**：
  - 游戏必须在后端的 `engine` 目录新建实现，并且必须通过 `engine.Register("gameId_mode", factory)` 注册。
  - **强制继承基石引擎**：任何新增对战引擎必须 `embed` (嵌入) `engine.BaseEngine`。这会自动继承 `Mu` 锁、`State`、`Broadcast` 等基础设施，且不再需要重复实现 `GetStatus` 和 `SetBroadcaster`。
- **前端组件强制继承 (Component Extension)**：
  - 所有的对战级别主游戏组件必须 `extends BaseGameComponent`。基类不仅完美处理了房间加入、创建、解散等通用逻辑，还会在 `ngOnInit` 阶段自动连接竞技大厅的 WebSocket (`connectLobby()`)，确保右侧面板始终能收到实时的房间与玩家数据更新。子类如果覆盖生命周期函数必须调用 `super.ngOnInit()`。
- **统一模式命名字典 (Mode Naming Convention)**：
  - 各个游戏的模式命名强制使用公共常量规范：同盘抢分/抢雷模式统一后缀为 `steal`，异盘竞速模式统一后缀为 `speed`，分数生存模式统一为 `score`，对战互相攻击模式为 `battle`。前端使用通用的 `GameLobbyPanelComponent` 组件即可零代码获得大厅列表、建房弹窗和模式匹配的支持。

### 7. 24点游戏 (Math 24)
- **支持模式**：单机模式、同盘抢分模式 (Steal)、竞速冲刺模式 (Speed)
- **硬核对战机制**：
  - **竞速冲刺 (Speed)**：所有玩家各自独立面对相同的 5 道题，最先全部解完的玩家获胜。
  - **同盘抢答 (Steal)**：所有玩家面对同一道题。第一个算出的玩家得 1 分，并且全场题目瞬间刷新为下一题。抢得 5 分者获胜。
  - **错误惩罚 (Freeze)**：对战模式下，如果玩家错误提交，会受到 3 秒的冻结惩罚，并出现冰雪覆盖棋盘的视觉特效，防止无脑穷举。
- **难度选择**：初级 (简单整数加减乘除)、中级 (需要括号整数)、高级 (常规唯一解)、专业 (分数解)。
- **智能提示与广告集成**：集成谷歌 AdSense 激励广告（H5 Games Ads API）。当玩家遇到死局或不会解题时，点击“提示”观看广告即可获取回溯算法生成的动态解题步骤。
- **操作逻辑**：点击卡片选择数字和操作符进行运算，支持撤销和重置功能。
- **机制同步**：完全接入大厅与通用对战引擎，共享基础房间和状态广播机制。

---

## 9. 用户留存系统 (User Retention System)

### 9.1 XP / 等级系统
- **公式**：`level = floor(sqrt(xp / 100)) + 1`，XP 随对局、胜利、每日挑战自动累积。
- **奖励机制**：单机对局 +2 XP，单机胜利 +5 XP，PK 对局 +5 XP，PK 胜利 +15 XP，每日挑战 +30 XP；后台可通过 `system_settings` 动态调整。
- **连续登录奖励**：每日首次触发 `CheckLoginStreak()`，连续登录奖励叠加 XP（可在后台配置）。
- **前端可视化**：全局 `XpGainBadgeComponent` 在每次获得 XP 时显示向上飘出动画（`+N XP`）；个人资料页展示 XP 进度条与等级徽章。
- **Admin 管理**：`/admin/xp-config` 页面通过 `PUT /admin/settings/bulk` 批量读写 10 个 XP 奖励参数。

### 9.2 成就系统
- **35 个内置成就**：分 6 大类别（starter / mastery / streak / playtime / daily / allround），4 个稀有度（common / rare / epic / legendary）。
- **条件驱动评测**：每次 `SubmitStat` / `puzzle/finish` 触发后端 `CheckAchievements()`，支持 9 种条件类型（首次登录、首胜、连胜、总局数、全游戏挑战等）。
- **解锁 XP 奖励**：每个成就解锁后自动累加 `xp_reward` 到用户账户。
- **前端弹窗**：`AchievementUnlockOverlayComponent` 全局队列式展示成就解锁弹窗（稀有度光晕动效）。
- **Admin 管理**：`/admin/achievements` 支持成就 CRUD、稀有度徽章、一键启用/停用，以及用户成就查看。

### 9.3 全球排行榜
- **多维过滤**：按游戏 / 模式 / 难度 / 时间段（全榜 / 本周）筛选；时间型游戏显示最佳用时，得分型游戏显示最高分。
- **我的排名**：登录后实时展示当前用户在所选榜单的名次（金/银/铜 Medal 展示）。
- **隐私保护**：guest 用户不参与排行，`role='guest'` 自动过滤。
- **Admin 管理**：`/admin/leaderboard` 支持管理员查看与删除疑似作弊条目。

### 9.4 每日挑战
- **每日一题**：管理员提前在 `/admin/daily-challenges` 月历视图中排期；支持单条创建或批量生成（按月份+游戏）。
- **完成追踪**：玩家完成后后端防重复保护，奖励固定 30 XP，触发成就检测。
- **倒计时横幅**：大厅页顶部 `DailyChallengeBannerComponent` 实时展示今日挑战与剩余时间，已完成显示绿色勾。
- **历史日历**：`/daily` 页面展示 30 天完成日历与历史记录。

### 9.5 对战历史记录
- **全局记录**：每次 `SubmitStat` / `puzzle/finish` 写入 `gm_match_history`，记录游戏、模式、难度、结果、用时、XP 获得。
- **时间线展示**：个人资料页「历史」标签展示最近 20 场，含游戏图标、结果徽章（胜/负/完成）、XP 收益。
- **API**：`GET /api/v1/history?limit=20&gameId=&mode=` 支持按游戏和模式过滤。
- **PK 对战自动提交**：`BaseGameStore` 构造函数 `effect()` 检测 PK 模式 Playing→Finished 状态迁移，自动调用 `_submitPKStat()` 提交对战统计；子类可 override `extractPKStatPayload()` 提供游戏特定的 score/time 提取逻辑。多局系列赛场景下，`_pkStatSubmitted` 标志在每局结束后（Finished → Waiting）自动重置，确保每局独立计入历史记录而非只记第一局。

### 9.6 新手引导
- **游戏内嵌步骤引导**：`TutorialOverlayComponent` 分步展示引导卡片（图标 + 标题 + 描述）。
- **一次性触发**：`TutorialService` 通过 localStorage 记录 `seen_tutorial_[gameId]`，每个用户每款游戏只展示一次。
- **集成游戏**：扫雷（5步）、数独（4步）、Math 24（4步）、Codebreaker（4步）、WaterSort（4步）、Sokoban（4步）；步骤内容在 `game-definitions.ts` 中集中管理，支持 i18n。

### 9.7 游戏结果增强
- **破纪录标识**：游戏结算界面展示「New Record」标识（金色横幅），对比历史最佳。
- **XP 增益展示**：结算界面内联展示本局 XP 收益及升级提示。
- **`lastStatResult` Signal**：`BaseGameStore` 保存最后一次提交结果，供各游戏结算页读取。

### 9.8 Admin 留存管理后台
- **成就管理** (`/admin/achievements`)：CRUD、稀有度徽章、启用/停用开关、解锁次数统计。
- **每日挑战排期** (`/admin/daily-challenges`)：7 列月历 CSS Grid 视图 + 单条/批量创建弹窗。
- **排行榜管理** (`/admin/leaderboard`)：多维过滤 + 条目删除（防作弊）。
- **XP 配置** (`/admin/xp-config`)：滑动条调整 10 个 XP 参数，实时同步至 `system_settings`。

### 9.9 Cloudflare Pages 生产部署

- **边缘函数**（`functions/[[path]].js`）：语言检测（Accept-Language）→ 根路径 301/302 跳转；显式加载预渲染 `index.html` 避免 Cloudflare 301 trailing-slash 重定向循环；修复 HTTP `Link` 头相对路径（Cloudflare 自动 Early Hints 生成，需改写为绝对路径防 MIME 错误）。
- **nginx 反代**（`deploy/nginx/puzzlepk.conf`）：仅代理 `api.puzzlepk.com:8443`，前端由 Cloudflare Pages 全权托管；CORS 头在 OPTIONS if 块内显式声明（含 `x-skip-logout` 自定义头）。
- **缓存策略**（`public/_headers`）：HTML 页面 `no-store`，JS/CSS chunk 文件 `max-age=31536000 immutable`。

### 9.10 数据库备份与恢复 (`/admin/database`)
- **表信息面板**：列出所有 23 张 `gm_` 表，实时显示行数与存储大小（`pg_stat_user_tables`）。
- **备份（ZIP + JSON）**：多选或全选表，一键生成 ZIP 备份包（`manifest.json` + 每表独立 JSON 文件），支持「浏览器直接下载」或「保存到服务器 `BACKUP_DIR`」两种模式；无需 pg_dump，纯 Go 实现。
- **备份历史**：列出服务器端所有已保存 ZIP，按时间倒序；支持下载、删除及一键跳转至恢复流程。
- **恢复（事务安全）**：上传 ZIP → 调用 `/backup/inspect` 自动解析 manifest 显示表清单 → 勾选要恢复的表 → 输入 `CONFIRM` → 后端在事务内 DELETE + `json_populate_recordset` 批量 INSERT → Commit 后自动重置各表 sequence；任何步骤失败全量回滚。
- **安全防护**：文件名 path traversal 校验、表名白名单（仅限已存在的 `gm_` 表）、`AdminProtected()` 中间件双重守卫。

---

### 8. 水管分色 (Water Sort Puzzle)
- **支持模式**：单机模式、竞速对决 (Speed)
- **后端生成算法**：采用完全动态的**逆向洗牌算法**，实时在内存中由解开的胜利状态向后推演数千次产生死局，100%保证每一次生成的关卡都有解，彻底消灭了静态题库维护成本。
- **全动态 UI 渲染**：不使用现成的图片素材，管子与内部的液体全部采用 TailwindCSS + CSS 原生动画渲染，不仅支持深色/浅色模式无缝切换，更通过动态高度计算模拟了平滑的水位上升下降和混合倾倒动效。
- **点击交互体验**：移动端触屏友好，摒弃了容易误操作的拖拽，转而采用 Click-Click（点击源试管 -> 点击目标试管）的精准选取逻辑。
- **Hashi (Bridges)**: Single Player & Multiplayer Speed PK Modes
