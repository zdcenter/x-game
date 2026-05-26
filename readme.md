# 全栈益智游戏平台开发蓝图

## 项目概述

本项目旨在构建一个现代化的全栈益智游戏平台。用户将能够通过浏览器访问平台，登录注册，浏览各种益智游戏，与好友组队游玩，并在排行榜上竞争。平台将支持多种游戏类型，并提供社交互动功能，营造一个充满趣味和挑战的游戏社区。

## 技术栈选型

### 1. 前端技术栈
- **框架**: angular21 (最新angular, 使用signal)
- **语言**: TypeScript
- **样式**: TailwindCSS


### 2. 后端技术栈
- **语言**: Go
- **ORM**: Gorm
- **框架**: fiber v3
- **认证**: JWT
- **实时通信**: WebSocket

### 3. 数据库
- **主数据库**: PostgreSQL

### 4. 部署
- **前端**: Vercel / Cloudflare Pages
- **后端**: Docker (使用 Docker Compose 管理)

## 项目结构

### 前端目录设计 (Angular 21 + Signals + Tailwind)
- 前端采用基于 Feature 的结构，全面拥抱Signals。在游戏场景中，Signals 的细粒度更新对于渲染高密度的网格（如 30x16 的高级扫雷）具有压倒性的性能优势。
frontend/
├── src/
│   ├── app/
│   │   ├── core/                   # 核心单例服务与拦截器 (只在应用初始化加载一次)
│   │   │   ├── auth/               # JWT 鉴权状态 (推荐用 signal 存储 currentUser)
│   │   │   └── interceptors/       # HTTP 请求头追加 token 等
│   │   ├── shared/                 # 纯 UI 组件与工具 (不包含业务逻辑)
│   │   │   ├── ui/                 # 封装好的 Tailwind 质感组件 (如毛玻璃卡片、按钮)
│   │   │   └── cdk/                # 针对 Angular CDK 的指令封装 (拖拽、弹窗控制)
│   │   ├── features/               # 业务特性模块 (按游戏隔离，懒加载)
│   │   │   ├── lobby/              # 大厅、排行榜、设置界面
│   │   │   └── games/
│   │   │       └── minesweeper/    # 扫雷业务边界
│   │   │           ├── components/ # 木偶组件 (Dumb Components)
│   │   │           │   ├── grid/   # 负责渲染二维网格 (接收 Signal inputs)
│   │   │           │   └── cell/   # 单个格子的样式展示
│   │   │           ├── store/      # ★ 核心状态管理 (使用 Angular 21 Signals)
│   │   │           │   └── minesweeper.store.ts # 管理盘面、剩余雷数、计时器
│   │   │           └── minesweeper.component.ts # 智能组件，连接 WS 和 Store
│   │   ├── app.component.ts        # 根组件
│   │   ├── app.config.ts           # 替代原 module，配置路由、HttpClient 和动画
│   │   └── app.routes.ts           # 全局路由配置 (在这里配置懒加载)
│   ├── assets/                     # 静态资源 (音效、图标)
│   ├── styles/                     # 全局样式
│   │   └── main.scss               # 引入 Tailwind base/components/utilities
│   └── index.html
├── tailwind.config.js              # 配置深色模式和响应式断点
└── angular.json
- 设计亮点：
  - Signals 驱动的 Store： 在 minesweeper.store.ts 中，你可以使用 signal<Cell[][]> 来存储盘面。当玩家点击一个格子，底层逻辑更新这个 Signal 后，Angular 21 会极其精准地只更新那一个产生变化的 Cell 组件的 DOM，这对于游戏体验至关重要。
  - 高度模块化： features/games/minesweeper 是一个完全自洽的文件夹。未来开发新游戏，直接复制这个结构模板即可。

### 后端目录设计 (Go + Fiber v3)
后端采用轻量级的领域驱动设计 (DDD) 变体。核心原则是：Fiber 只是一个 Web 传递机制，游戏的核心逻辑（Engine）绝不能与 HTTP/WebSocket 请求强绑定。
backend/
├── cmd/
│   └── api/
│       └── main.go                 # 程序入口：初始化数据库，注册 Fiber v3 路由
├── internal/                       # 核心业务逻辑（对外部包不可见）
│   ├── domain/                     # 1. 领域模型 (核心 structs)
│   │   ├── user.go                 # User, Room, Session 等与 PG 映射的模型
│   │   └── error.go                # 全局自定义错误类型
│   ├── engine/                     # 2. 游戏引擎层 (纯 Go 逻辑，无外部依赖)
│   │   ├── engine.go               # 定义 GameEngine 接口
│   │   └── minesweeper/            # 扫雷的具体算法实现
│   │       ├── board.go            # 雷区生成、泛洪展开算法
│   │       └── validator.go        # 胜负判定逻辑
│   ├── repository/                 # 3. 数据持久层 (PostgreSQL 交互)
│   │   └── pg_session_repo.go      # 处理 JSONB 存档的存取
│   ├── handlers/                   # 4. 传输层 (Fiber v3 Handlers)
│   │   ├── rest/                   # 处理标准 HTTP 请求 (如登录、获取排行榜)
│   │   └── ws/                     # WebSocket 处理器 (多人房间同步)
│   │       ├── room_manager.go     # 管理不同房间的并发连接
│   │       └── client.go           # 单个玩家的 WS 连接封装
├── pkg/                            # 可复用的公共组件
│   ├── config/                     # 环境变量与配置加载
│   ├── logger/                     # 统一日志处理
│   └── response/                   # Fiber 统一 JSON 响应格式封装
├── docker-compose.yml              # 用于本地快速拉起 PostgreSQL 数据库
└── go.mod


## 平台高扩展性设计

为了保证未来能够轻松加入“数独”、“俄罗斯方块”或“连连看”等其他益智游戏，架构上需遵循高内聚低耦合的原则：

### 1. 后端接口与引擎解耦
- **统一的 WS 消息协议**: 定义标准的 WebSocket 消息格式结构（如 `{"action": "click", "payload": {"x": 1, "y": 2}, "game": "minesweeper"}`）。框架层只负责消息的路由和广播，具体的 `payload` 解析交给各个游戏的 `GameEngine` 接口实现类。
- **抽象 GameEngine 接口**:
  ```go
  type GameEngine interface {
      InitGame(options interface{}) error
      HandleAction(playerID string, action string, payload []byte) (GameState, error)
      CheckGameOver() (bool, []string) // 返回是否结束，以及获胜者ID
  }
  ```
  未来添加新游戏，只需在 `internal/engine/` 下新建目录并实现此接口，无需改动外层 WebSocket 逻辑。

### 2. 数据库设计的包容性
- **灵活的游戏记录 (JSONB)**: 对于不同的益智游戏，其“游戏过程”、“存档状态”和“结算数据”各不相同。建议在 PostgreSQL 中设计通用的 `game_records` 和 `game_sessions` 表，将具体游戏状态存储在 `JSONB` 类型的字段中。

### 3. 前端动态加载与注册机制
- **微内核/插件化路由**: 在 Angular 中，`features/games/` 下的每个游戏作为独立的模块，通过懒加载引入。在 `Lobby` 中维护一个游戏注册表配置，新增游戏只需在配置中添加元数据（图标、名称、路由路径）。
- **统一的 Game Room 容器组件**: 封装通用的房间组件（包含聊天、玩家列表、准备状态），中间的核心游戏区域作为 `<router-outlet>` 动态加载具体的游戏组件。

## 功能模块规划

### 1. 用户系统
- 注册、登录、密码重置
- 个人资料管理 (头像、昵称)
- 好友系统 (添加、删除、状态)

### 2. 游戏中心
- 游戏列表展示 (分类、搜索)
- 游戏详情页
- 游戏房间创建与加入
- 实时游戏逻辑 (WebSocket)

### 3. 实时系统
- 房间内聊天
- 游戏状态同步
- 实时通知

### 4. 排行榜
- 全服排行榜
- 好友排行榜
- 个人成就

## 开发步骤 (扫雷 MVP 链路打通方案)

我们将整个开发链路分为四个里程碑阶段，以扫雷（单人模式计入排行榜）作为首个 MVP，最快速度跑通全栈流程。

### 第一阶段：基础设施与基础后端 (后端主导)
**目标**：搭建骨架，跑通接口与数据库。
1. **项目初始化**：初始化 Go + Fiber v3 项目结构，配置 Docker Compose 拉起 PostgreSQL。
2. **用户系统 API**：实现基础的注册、登录（JWT），以及数据库模型 (`User`)。
3. **扫雷核心引擎 (纯逻辑)**：在 `internal/engine/minesweeper` 下实现纯 Go 的扫雷算法（生成雷区、泛洪展开算法、胜利/失败判定）。*注：此时不涉及任何网络和数据库。*

### 第二阶段：前端基建与单机扫雷 (前端主导)
**目标**：跑通 Angular 21 与 Signals 的极速渲染。
1. **项目初始化**：使用 Angular 21 和 TailwindCSS 搭建前端目录，配置路由。
2. **公共 UI 与状态**：封装基础组件（按钮、弹窗），实现 `auth.store.ts` (基于 Signal)。
3. **扫雷前端实现 (单机版)**：在 `features/games/minesweeper` 中利用 Angular Signals 实现扫雷盘面渲染、左键挖雷、右键插旗。验证细粒度更新性能。

### 第三阶段：WebSocket 联机与房间系统 (全栈联调)
**目标**：打通双向通信，实现“大厅 -> 房间 -> 游戏”链路。
1. **后端 WS Manager**：实现 `Room` 和 `Client` 结构，处理用户的连接、加入房间、准备等操作。
2. **扫雷引擎接入 WS**：将用户的点击操作通过 WS 发送给后端，后端引擎计算后广播 `GameState` 给房间内所有玩家（如：玩家A触雷，所有人看到游戏结束）。
3. **前端 WS 联调**：前端封装 WebSocket Service，监听后端状态变更并更新 Signal Store，替换第二阶段的单机逻辑。

### 第四阶段：数据持久化与排行榜 (收尾)
**目标**：闭环游戏生命周期。
1. **结算数据入库**：游戏结束后，后端记录耗时、胜负情况至 PostgreSQL，利用 JSONB 存储扫雷的特定统计。
2. **排行榜 API 与展示**：提供排行榜 HTTP 接口，前端在大厅页面展示扫雷高分榜。



# X-Game AI 核心开发准则
作为本项目的 AI 编码助手，你在编写或修改代码前必须绝对遵守以下四大准则：
1. **项目说明书同步更新**：每完成一个新功能，必须自动修改 `docs/FEATURES.md` 和 `docs/CHANGELOG.md`，保证文档和代码同步。
2. **多语言与多主题**：禁止硬编码任何新增的 UI 文本，必须抽离到 `i18n.service.ts`；禁止硬编码任何颜色样式（如 bg-slate-900），必须严格使用全局 CSS 变量，确保 Light/Dark 主题无缝切换。
3. **高可扩展性设计**：保持前后端松耦合。新增游戏必须实现后端的 GameEngine 接口并新建前端的独立路由模块，绝不可将独立游戏逻辑侵入公共组件。
4. **全端响应式适配**：编写的任何 UI 必须使用 TailwindCSS 的响应式前缀（sm:, md:, lg: 等）以完美适配手机、平板和桌面端，不能出现横向滚动条等布局崩坏。
5. **游戏代码逻辑**：任何单机游戏（单机扫雷）运行在客户端（浏览器）的内存中，前端计算，不经过服务器。服务器仅处理房间管理和计分。因此单机游戏不存在“服务器性能瓶颈”或“数据库IO”的问题。开发时可以完全本地化运行，仅在需要排行榜或跨设备存档时才连接后端。PK模式必须强制放在后端计算


lsof -ti :3001 | xargs -r kill -9

# 数独 Sudoku
## 模式：单人模式
- 前端计算，运行在浏览器内存中。
- 难度分不同, 生成数独的时候生成一个Id


## 模式：多人联机模式

1. 同盘抢分模式 (Steal Mode)：

- 所有人看着同一个数独残局。
- 谁填对一个数字，谁加 1 分；填错一个数字，扣分并被“冻结” 3 秒（类似扫雷的踩雷惩罚）。
- 最后棋盘填满时，谁的总分高谁赢。这种模式极具竞争性和压迫感！
2. 异盘竞速模式 (Speed Mode)：

- 所有人发到完全相同的一盘数独（各自独立）。
纯粹比拼手速和脑力，谁第一个 100% 正确填完，谁就直接胜利（类似现在的扫雷竞速）。