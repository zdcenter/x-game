# Changelog

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
