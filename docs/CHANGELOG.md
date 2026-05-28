# X-Game 更新日志 (Changelog)

本文档专门记录项目从起步到当前所有里程碑的变更、新功能上线以及重要重构轨迹。

## [Phase 8] 2026-05-28: 前端架构优化与通用化封装 (Architecture Refactoring)

### 重构 (Refactors)
- **🌐 i18n 自动合并机制**：重构 `translations.ts` 为数组注册模式，新游戏翻译只需加一行即可自动合并。新建 `sudoku/i18n/sudoku.translations.ts`，将数独专属文案从 `coreTranslations` 中剥离。
- **📖 通用游戏规则弹窗**：新建 `shared/components/game-rules-modal/`，任何游戏只需 `<app-game-rules-modal [gameId]="'xxx'" [isOpen]="..." (closed)="...">` 一行即可接入。从扫雷组件中移除了 27 行内联规则弹窗模板和规则加载逻辑。
- **🔄 房间生命周期封装**：新建 `core/services/room-lifecycle.ts`，通过 `setupRoomLifecycle()` 函数封装了跨服加入、断线重连（sessionStorage）、房间解散监听三大功能。扫雷和数独均已接入，新游戏只需在 constructor 中调用一行即可获得全部房间管理能力。
- **📋 游戏注册表**：新建 `core/services/game-registry.service.ts`，每个游戏在 constructor 中自注册元数据（modes、difficulties、路由、图标）。`GameLobbyPanel` 利用注册表动态查询任意游戏的 mode/difficulty 标签，消除了跨游戏场景下的 hardcoded fallback。
- **🧹 扫雷组件瘦身**：移除了 `gameRules`/`parsedRulesHTML`/`gameService`/`marked` 等已被通用组件替代的依赖，组件减少约 60 行。

### 新增功能 (Features)
- **⏱️ 数独 PK 倒计时**：数独多人模式开始前增加 3-2-1-GO 倒计时动画和音效，与扫雷 PK 体验一致。新增 `countdown` 视图状态，在 store 中实现 `room → countdown → play` 三段式过渡。

---

## [Phase 7] 2026-05-28: 跨服加入房间系统重构 (Cross-Game Join Refactoring)

### 重构 (Refactors)
- **🔀 CrossGameJoinService**：新建全局 `CrossGameJoinService`，彻底替换了基于 `queryParams` 的跨服加入机制。通过 Angular Signal 存储待加入房间信息，消除了 URL 参数二次触发、时序竞争和 `window.history.replaceState` 与 Angular Router 冲突等根本性缺陷。
- **🧹 代码精简**：移除了扫雷和数独组件中的 `ActivatedRoute` 依赖、`take(1)` 订阅、`replaceState` hack 等临时方案，`ngOnInit` 逻辑从异步订阅简化为同步一行调用。
- **📐 新游戏接入零成本**：任何新增游戏只需在 `ngOnInit` 中调用 `crossGameJoin.consumePendingJoin('gameId')` 即可自动获得跨服加入能力，无需了解底层路由细节。

---

## [Phase 6] 2026-05-27: 泛用型多人大厅与数独双模式上线 (Generic Lobby & Sudoku PK)

### 新功能 (New Features)
- **🧩 泛用型游戏大厅系统**：重构了后端的 `Room Manager`，全面剥离了游戏专属逻辑。引入了**引擎工厂模式 (Engine Factory Registry)**，所有新增游戏实现高度插件化、解耦化。新游戏只需 `engine.Register()` 即可零代码侵入直接使用现成的房间广播和组队模块。
- **🎮 数独双人对战 (Sudoku PK)**：完美并入全站大厅系统，推出了基于房间同步机制的两大硬核竞速玩法：
  - **Steal Mode（抢夺模式）**：同屏共用一张大数独网格。玩家每填对一格 +1 分，填错 -1 分并冻结 3 秒。真正的同屏厮杀，格子被正确填上即全房间同步锁定。
  - **Speed Mode（竞速模式）**：同解一道题，各自有一张独立画板互不干扰，拼手速看谁先 100% 正确填完提交。
- **⚙️ 全端参数标准化 (Unified Parameter Standards)**：重构了所有游戏的联机模式标识符，前端使用纯泛用性的 `pk_steal` 与 `pk_speed`，而后端 Factory 按 `[gameId]_[mode]` 的组合键注册，彻底扫清了后续接入其他小游戏的底层障碍。
- **⏱️ 引擎级异步广播**：实现了 `SetBroadcaster` 接口能力，扫雷的 3 秒倒计时逻辑从大厅剥离到引擎内部自我控制，提升了底层框架的优雅性与一致性。

---

## [Phase 5] 2026-05-24: 后台管理体系建设 (Admin Dashboard)

### 新功能 (New Features)
- **👑 RBAC 核心架构落地**：在数据库底层向 User 模型加入了 `Role` 和 `Status`。
- **🛡 铜墙铁壁的越权拦截**：在 Fiber 层引入 `AdminProtected` API 级中间件，在 Angular 层配备 `adminGuard` 路由级保护。
- **⚡ 超级后门提权**：设计了特殊的注册彩蛋（注册账号为 `admin` 自动赋予最高管理员身份）。
- **📊 全息数据大屏**：为管理员在前端量身定制了最高级别的 `/admin` 专版界面，支持对违规玩家点击一次实现瞬间 `BAN` / `UNBAN` 状态控制。
- **⚙️ iOS 风格自定义难度**：实现了全屏 Modal 难度配置面板，内含从初级到专家的 7 级进阶难度，并且创新地支持了**基于滑块完全自定义**棋盘宽高与地雷分布，前后端联机计算同步解析生效。

---

## [Phase 4] 2026-05-24: 真实用户鉴权接入 (User Authentication)

### 新功能 (New Features)
- **🔐 JWT 状态持久化**：重构了 `AuthStore`（使用 Angular Signals），接通了后端已有的 `/api/v1/login` 与 `/api/v1/register`。
- **🛡 路由拦截保护 (Auth Guard)**：未持有效 Token 的匿名访客会被安全地挡在大门外，强制遣返至登录页。
- **🎨 酷炫毛玻璃鉴权页**：设计了两套极高颜值的 `/login` 与 `/register` 页面，包含流动的赛博极光动效（Indigo/Pink & Teal/Emerald），表单体验极度丝滑。
- **🆔 真名对战徽章**：将 WebSocket 联机的 `playerId` 修改为读取当前登录用户的正式 `username`。现在，所有的战局分数都会刻上真实的玩家名字！

---

## [Phase 3] 2026-05-24: 实时对战与同屏抢雷机制上线 (WebSocket PK Mode)

### 新功能 (New Features)
- **🚀 WebSocket 全双工引擎**：将后端的 Fiber API 层扩展为基于 `github.com/gofiber/contrib/v3/websocket` 的长连接模式。
- **🎮 扫雷多人 PK 模式**：游戏重制为“抢地雷拿分”机制。玩家间可实时同屏协作挖开安全区，当发现炸弹时，抢先插旗即可占领得分（并显示独家所有权 UI 徽章）。
- **📊 实时 Scoreboard**：界面顶端加入多玩家实时头像与动态记分牌，数据零延迟刷新。
- **🛑 冻结冷却机制**：任何误触炸弹或插错旗子的操作，都会导致该名玩家在 3 秒内处于无反应冻结状态。

### 重构与性能 (Refactors & Performance)
- **后端架构重构**：剥离单机算法，设立统一的 `GameEngine` 接口约束（涵盖 `InitGame`、`HandleAction`、`AddPlayer`、`GetState`），为后续添加各类棋牌和解密类游戏建立基架。
- **前端状态剥离**：移除了前端复杂的算雷逻辑，将原本的 `MinesweeperStore` 降级为纯粹的展示层，所有状态通过 `WebSocketService` 以 Signal 驱动流的方式一比一响应式渲染，大幅度减少了前端计算的包袱并彻底根绝作弊。

---

## [Phase 2] 2026-05-24: UI/UX 全面进阶与大厅路由建设 (App Shell & Theming)

### 新功能 (New Features)
- **🌐 游戏大厅 (Lobby)**：打造了高端感十足的深色系游戏大厅导航界面，实现了模块化应用的结构分离。
- **🌍 国际化系统 (I18n)**：上线 `I18nService`，内置中英文无感快速热切换，并将其嵌入顶部常驻 Navbar 导航栏中。
- **✨ 全局主题架构**：引入 `ThemeService` 和纯粹的 CSS Variables 管理模型，奠定了炫光、暗黑、白昼等多种美学设计的变幻基底。
- **🏆 震撼级胜利特效**：实现了当棋盘解开完毕时的胜利结算浮层，加入 `animate-gold-shine` 强光动效，提供极具爆发力和视觉冲击力的通关反馈体验。

---

## [Phase 1] 2026-05-24: 基础架构搭建与单机扫雷 MVP (Bootstrapping)

### 新功能 (New Features)
- **🏗 后端基石搭建**：采用 Go 语言 + Fiber 框架完成核心 HTTP API 层建设，并使用 GORM 连通本地 PostgreSQL (`x_game_db`)。
- **🔑 认证基础**：内置了 RESTful 标准的 `/api/v1/register` 与 `/api/v1/login` 接口，配套提供基本的 JWT 中间件签名校验。
- **🖼 前端框架确立**：完成 Angular 21 (Zoneless) + TailwindCSS v4 前端工程搭建。
- **🚩 扫雷单机原型**：初版的本地扫雷引擎，包含挖雷、插旗、自动展开（Flood Fill）与九宫格计分渲染逻辑，打通了 UI 组件与逻辑 Store 的数据交互。
