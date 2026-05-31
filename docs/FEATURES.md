# X-Game 核心功能清单

本文档汇总了 X-Game 项目当前已开发实现的所有核心功能模块与技术亮点。

## 1. 基础架构体系 (Infrastructure)

### 后端技术栈 (Go + Fiber)
- **高性能框架**：基于 Fiber v3 构建轻量级、超快速的 HTTP 与 WebSocket 服务。
- **持久化层**：GORM + PostgreSQL 驱动，实现了完善的数据迁移与用户状态落盘。
- **环境变量化**：集成 `joho/godotenv` 支持本地 `.env` 热替换，并预留了 Docker 化与配置中心的支持。

### 前端技术栈 (Angular 21 + TailwindCSS v4)
- **Zoneless 无区化渲染**：全盘采用 Angular 21 最新的 Signals 响应式特性，性能极致优化，告别 `zone.js` 的性能损耗。
- **现代美学 UI**：结合 TailwindCSS v4 的原子化 CSS 特性，实现了全面现代化、毛玻璃（Glassmorphism）、微动画（Micro-animations）、金色脉冲光晕等具有震撼视觉的高级游戏界面。
- **路由懒加载**：实现了核心游戏大厅（Lobby）与具体游戏页面（Minesweeper）的独立路由控制与分离渲染。

---

## Available Games (核心游戏矩阵)

- **Minesweeper (扫雷)**
  - Modes: Single Player (首击必空), PK Speed (异盘竞速), PK Steal (同盘抢雷)
- **Sudoku (数独)**
  - Modes: Single Player (3 difficulties), PK Speed
- **Sliding Puzzle (数字华容道)**
  - Modes: Single Player (3x3 to 6x6), PK Speed
- **Hexa Puzzle (六边形消除)**
  - Modes: Single Player (无尽模式), PK Score
- **Tetris Battle (俄罗斯方块)**
  - Modes: Single Player (无尽马拉松), PK Attack (异盘乱斗 / 发送垃圾行)
- **Gomoku (五子棋)**
  - Modes: Single Player (AI挑战 - Easy/Medium/Hard), PK Classic (经典对战)
- **Codebreaker (1A2B 密码破译)**
  - Modes: Single Player (3/4/5 位数难度练习), PK Speed (同屏竞速破译)

## Personal Records & Global Achievements (个人记录与成就系统)
- **Persistent Local Records**: Tracks best time, best score, play count, and win rate across all single-player game modes.
- **Global Achievements Profile (`/profile`)**: A unified, centralized dashboard displaying all historical personal records.
- **In-Game Display**: Real-time display of the player's personal best inline within the game interface to promote engagement.

## UI/UX Design System (UI/UX 规范)

- **全局状态隔离**：通过依赖注入（DI）与 Signals 双向绑定实现了纯前端状态管理的强隔离。
- **无缝多语言切换 (I18n)**：`I18nService` 支持中文（zh-CN）与英文（en-US）的瞬时热切换，不刷新页面即刻更新全站文案。
- **动态主题系统**：`ThemeService` 提供 Light / Dark 等系统级别的主题色轮换，结合 CSS 原生变量（CSS Variables）映射到 Tailwind 工具类中，实现高级的夜间护眼与酷炫竞技模式的流转。

---

## 2.5 跨游戏通用功能体系
- **全局竞技大厅 (Global Arena Lobby)**：在平台首页提供汇总的竞技大厅面板。PC端以侧边栏常驻，移动端以抽屉弹层呼出；玩家能够直观看到所有游戏的活跃房间和在线玩家，并支持跨游戏直接加入房间对战，大大提升对战效率和社区活力。
- **综合包厢模式 (Party Room Mode)**：为了提供最好的朋友开黑（Party）体验，我们的房间设计不再死板地绑定于某一款游戏。玩家聚在一个房间里后，**房主可以随时更改房间设置，无缝切换到其他游戏或难度**。后端会自动热重载新的游戏引擎，并通过广播带领房间内所有玩家集体、平滑地转场到新的游戏界面，真正实现了“一个房间，玩遍全站”的派对体验。
- **动态竞技房间**：每款游戏内部也有独立大厅。玩家可创建房间、调整难度模式、邀请在线玩家。支持跨设备的双人实时对战和计分同步。

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
- **核心游戏调度接口 (`GameEngine` Interface)**：
  - 标准化 `InitGame`（初始化）、`HandleAction`（处理点击）、`GetState`（拉取状态快照）等生命周期钩子，为未来无限扩增新的益智类游戏（例如数独游戏）铺平了底层架构。

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
  - 前端路由与组件中，对战模式统一抽象为泛用的 `pk_steal` 与 `pk_speed`。
  - 后端 Engine Factory 自动通过统一 `gameId` 和 `mode` 反射生成游戏实例。
- **全端响应式界面与大厅交互 (Responsive Drawer Panel)**：
  - 各类游戏全面适配桌面与移动端 UI 体验。移动端大厅抽屉（Drawer）不会由于 CSS 冲突自动常驻遮挡游戏区域；关闭逻辑保证精准恢复游戏棋盘视觉，`flex` 布局受抽屉状态（`isMobileSidebarOpen`）严格控制，彻底告别移动端样式穿透带来的操作障碍。
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
  - 各个游戏的模式命名强制使用公共常量规范：同盘抢分模式统一后缀为 `_pk_steal`，异盘竞速模式统一后缀为 `_pk_speed`。前端使用通用的 `GameLobbyPanelComponent` 组件即可零代码获得大厅列表、建房弹窗和模式匹配的支持。
