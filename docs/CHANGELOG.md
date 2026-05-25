# X-Game 更新日志 (Changelog)

本文档专门记录项目从起步到当前所有里程碑的变更、新功能上线以及重要重构轨迹。

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
