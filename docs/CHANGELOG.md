# X-Game 更新日志 (Changelog)

> 早期历史版本详细日志已整理归档至 [docs/archive/CHANGELOG_archive.md](file:///home/zd/x-game/docs/archive/CHANGELOG_archive.md)。

## [v3.2.106] - 2026-10-29

### 数桥 (Hashi) 观战实时搭桥同步与经典 2048 PK 初始同盘生成机制 (Hashi Real-Time Spectator Bridge Sync & Classic 2048 PK Identical Initial Board)
- **核心痛点解决 (用户反馈：还有两个问题。就是桥梁这个游戏，观看着看不到实时效果，桥梁已经建好了，但是观看着那里看不到实时效果，看不到打的桥梁。这是一个游戏的问题。还有一个就是经典2048，他们两个人PK的时候，那个棋盘不一样。棋盘应该要一样的，首先发棋盘的位置应该是一样的，后面是不是一样那是另外一回事)**：
  - **根本原因深度剖析**：
    1. **数桥 (Hashi) 观战桥梁数据未上传与服务端结构缺失**：
       - 前端 `HashiStore.syncEngineToState()` 原先向服务端发送 `progress` 动作时仅携带 `{ action: 'progress', progress: this.bridges().length }` 桥梁数量，并未上传当前已连接桥梁坐标数组；
       - 后端 `SpeedPlayer` 仅包含 `Progress int`，未定义 `Bridges` 桥梁集合字段，广播给所有房间成员的快照中无任何桥梁数据；
       - 观战者进入房间后虽然初始化了岛屿，但由于未同步对战选手的桥梁集合，画面中呈现空岛屿无桥梁；且观战端未阻断 SVG 桥梁交互，观战者可误触点按；
    2. **经典 2048 PK 模式选手发牌盘面不一致**：
       - `SpeedEngine.AddPlayer` 中，每当新选手加入房间时，各自独立执行 `NewBoard(e.BoardSize)`，各选手在不同的纳秒时间戳下独立随机生成首批 2 个初始方块（数值与位置各自随机）；
       - 房主发送 `start` 动作开始对战时，未在服务端对战引擎中统一生成公共初始盘面，导致两名选手在对局伊始面对的是截然不同的初始数字与坐标布局，违背公平竞速竞技原则。
  - **体系化修复与增强**：
    1. **数桥毫秒级搭桥实时同步与导播无缝还原 (Hashi Real-Time Bridge Streaming)**：
       - 后端 `SpeedPlayer` 扩充 `Bridges interface{} json:"bridges,omitempty"` 字段；在 `progress` 与 `finish` 动作中实时接收选手提交的桥梁连接状态，并在重开时重置；
       - `HashiEngine` 补充 `exportBridges(): Bridge[]` 与 `loadBridges(bridges: any[])` 高效全量导入导出接口；
       - 前端 `HashiStore` 在选手每次搭桥变化或提交完赛时，自动附带 `bridges: this.engine.exportBridges()` 同步广播；
       - 观战者状态下，`HashiStore` 响应式监听导播焦点选手（`focusedPlayerId`），当选手的 `bridges` 更新时，毫秒级通过 `loadBridges` 重载引擎并同步渲染信号，呈现完全一致的实时搭桥动效；
       - 观战者端在 SVG 容器添加 `[class.pointer-events-none]="store.isSpectator()"`，并在组件交互方法中严格阻断观战者误触。
    2. **经典 2048 PK 绝对公平初始盘面生成 (Identical Fair Initial Board)**：
       - `classic2048.SpeedEngine` 结构体新增 `InitialBoard *Board` 权威基准；
       - 在游戏初始化与每名选手加入时，统一基于权威 `InitialBoard.Clone()` 初始化盘面；
       - 房主发送 `start`（开局）以及 `restart`（重开）动作时，由服务端统一生成一份全新公平基准盘面 `fairBoard := NewBoard(e.BoardSize)`，并深拷贝赋值给所有选手的初始盘面，确保双方在发牌起点上的数字大小、位置完全 100% 相同；后续随机生成则遵循各自操作推演。
    3. **自动化测试覆盖**：
       - 编写 `backend/internal/engine/hashi/speed_test.go`：验证 `TestHashiSpeedBridgesSync` 桥梁实时同步流；
       - 编写 `backend/internal/engine/classic2048/speed_engine_test.go`：验证 `TestClassic2048PKSharedInitialBoard` 双方初始棋盘 100% 同步一致性；
       - 全平台前后端单元测试与编译检查 100% 通过。

---

## [v3.2.105] - 2026-10-29

### 真·成语接龙 (Idiom) PK 建房与对战链路打通及全景双人神龙争霸观战模式 (Idiom PK Room Creation Fix & Full-Featured Spectator Mode)
- **核心痛点解决 (用户反馈：继续完善成语接龙的PK模式，包括观看模式。目前的话是成语接龙是建不了的，是PK不了的，是建不了房间的。你看一下是怎么回事)**：
  - **根本原因深度剖析**：
    1. **`app-game-layout` 的 `[store]` 动态三元表达式导致房间上下文丢失**：
       - `idiom.component.html` 中顶层使用了 `[store]="pkRoomId() ? pkStore : undefined"`；在尚未建房/入房阶段（`pkRoomId()` 为空字符串），`app-game-layout` 接收到的 `store` 为 `undefined`；
       - `GameLayoutComponent` 内部计算 `effectiveRoomMode()` 与 `effectiveRoomId()` 时 fallback 为单机模式，导致点击“创建房间”或进入大厅时无法正确触发 `<app-game-waiting-room>` 等候大厅展示，造成“建房无响应、无法进入房间”的现象；
    2. **动作参数缺失导致显式建房动作未透传**：
       - `idiom.component.ts` 的 `joinPkRoom` 方法在调用 `this.pkStore.joinRoom(...)` 时缺少第 9 项 `action` 入参；当通过大厅建房时，显式 `'create'` 参数未能向下传递至 `BaseGameStore.joinRoom`，导致 WebSocket 连接参数中缺失 `action=create`；
    3. **PK Arena 视图缺失等候室与全景 PK HUD 体系**：
       - 成语接龙原模板仅在 `pkStore.status() === 'playing'` 时渲染内容，未接入全平台统一的 `<app-game-pk-hud>`，且观战模式下无法观看神龙对决与战况信息；
       - 观战席未对选手输入小键盘进行阻断，且观战者在等候状态时处于无内容黑屏；
    4. **路由参数未解析观战与动作标识**：
       - 页面接收 URL queryParams 跳转时，未解析 `params['spectate']` 与 `params['action']`，导致从外部或大厅点击“观战”直接按普通参赛者逻辑连接。
  - **体系化修复与增强**：
    1. **全局无条件绑定 `[store]="pkStore"`**：
       - 规范成语接龙统一接入 `[store]="pkStore"`；当处于单机模式时（`currentRoomMode === 'single'`），`isAutoWaitingRoomVisible` 自动为 `false`，单机接龙完全离线在浏览器内存中运行（契合准则 5）；
       - 当触发联机建房或加入房间时，`pkStore.currentRoomMode` 切换为 `'speed'`，`app-game-layout` 全自动接管等候大厅（`<app-game-waiting-room>`）、3 秒倒计时与终局胜负结算；
    2. **动作参数全链路透明透传**：
       - 修复 `joinPkRoom` 准确向 `this.pkStore.joinRoom(..., finalAction)` 传递 `action`；
       - 完善 `ngOnInit` 的 `queryParams` 解析，支持从链接或大厅直接携参快速以观战者身份加入；
    3. **集成全功能 `<app-game-pk-hud>` 与双人对决导播切换**：
       - 导入 `GamePkHudComponent`，计算响应式 `myPlayerPkStats` 与 `opponentsPkStats`；
       - 实时展示双方选手神龙争夺胜场数、目标胜局（如 2/3 龙身）、错误失误次数（0/3）与 🔒 禁言状态；
       - 观战模式支持在顶部 HUD 点击任意选手头像进行导播锁定与视角切换（`👁️ 切视角` / `🎯 导播锁定中`）；
    4. **专为观战者定制的神龙争霸全景视界**：
       - 观战席状态下，自动隐藏触控小键盘，显示高格调“👁️ 观战视角：实时神龙战场播报”指示徽章；
       - 实时呈现两名选手的同台神龙接龙长链（`pkStore.chain()`），抢答成功时全场弹出弹跳胜利横幅与升调提示音；
       - 等候大厅阶段为观战者渲染“正在观战成语接龙对决 · 对局准备中...”呼吸光环看板，终局自动呈现场上冠军得主（`恭喜 {name} 获胜！`）。
    5. **全量单测与构建验证**：
       - 补充后端 `engine_test.go` 与 `spectator_test.go`（覆盖成语接龙 PK 房间创建与观战者隔离测试）；
       - 前端通过 `npx tsc --noEmit` 与全平台 8 大套件 30 项测试 100% 通过。

---

## [v3.2.104] - 2026-10-29

### 一笔画连线 (Connect) 全功能观战支持与全景对决视角切换 (Connect Real-Time Spectator View & Multi-Contestant Perspective Switching)
- **核心痛点解决 (用户反馈：现在已经可以建房间了，也可以在里面玩了。但是还是不能观看，其他人不能观看。只有一个像蒙版一样的“观战中，请等待其他玩家完成”，看不到棋盘。希望做成跟数独一样都可以观战)**：
  - **根本原因深度剖析**：
    1. **错误套用全屏阻断蒙版**：
       - `connect.component.html` 底部硬编码了 `<app-game-spectating-overlay *ngIf="store.isSpectator()">`；
       - 该蒙版是全屏磨砂高模糊弹窗，并居中显示“观战中，请等待其他玩家完成”，将底层的棋盘和对决界面完全遮挡；
    2. **连线轨迹数据未上报与广播**：
       - 原有对决机制中，选手绘制连线时仅向服务端发送 `{ action: 'progress', progress: filled }` 计数数字，并未上传当前盘面的管道连线路径；
       - 服务端 `SpeedPlayer` 仅记录了 `Progress` 与 `Finished`，观战者即便去除蒙版也只能看到初始无连线的空白棋盘，无法看到选手正在实时连线的过程；
    3. **观战者导播聚焦与选手切换未打通**：
       - 观战者点击顶部 HUD 切换观看选手时，前端没有将选手的走线状态载入本地渲染引擎。
  - **体系化修复与增强**：
    1. **彻底移除阻断蒙版并规范观战者操作权限**：
       - 移除 `connect.component.html` 与 `connect.component.ts` 中的 `app-game-spectating-overlay`；
       - 规范 `<app-connect-board [disabled]="store.status() !== GameStatus.Playing || store.isSpectator()">`，观战状态下完全展示全尺寸棋盘与实时连线，同时完全禁止观战端触控拖拽防误触；
    2. **服务端与客户端毫秒级路径同步 (Real-Time Paths Synchronization)**：
       - 后端 `SpeedPlayer` 结构体新增 `Paths` 字段；`HandleAction` 中在 `progress` 与 `finish` 动作中实时接收并存储选手的 `Paths`（对局重置时自动清理）；
       - `ConnectEngine` 封装高效 `exportPaths(): Record<number, Position[]>` 与 `loadPaths(pathsData: any)`，支持一键导出和还原连线路径；
       - 选手对局中在本地绘制走线时，自动导出 paths 并伴随 `progress` 动作毫秒级上报服务端；
    3. **与数独一致的无缝导播切视角体验**：
       - `ConnectStore` 新增响应式聚焦监听 `effect`：实时监听 `store.focusedPlayerId()` 与服务端玩家字典；
       - 当观战者进入房间或在顶部 HUD 点击任意对战选手（`👁️ 切视角` / `🎯 导播锁定中`）时，本地引擎自动无缝载入该选手最新的走线网格并触发实时重绘；
    4. **单测套件全面覆盖**：
       - 补充 `connect-engine.spec.ts` 针对 `exportPaths` 与 `loadPaths` 序列化与还原的单元测试，全平台 8 个测试套件 30 项测试 100% 通过。

---

## [v3.2.103] - 2026-10-29

### 一笔画连线 (Connect) PK 对战准备阶段棋盘空白修复与全格式端点坐标兼容 (Connect PK Empty Board Fix & Robust Coordinate Normalization)
- **核心痛点解决 (用户反馈：目前的一笔画连线（Connect），在准备PK的时候，看不到棋盘，棋盘是空的，没有棋盘)**：
  - **根本原因深度剖析**：
    1. **端点数据坐标格式不一致导致构造函数抛异常**：
       - 后端种子与数据库中 `endpoints` 存储格式为 `[{"color": 1, "p1": [x, y], "p2": [x, y], ...}]`（数组 `[col, row]`）；
       - 前端单机模式 `loadLevel()` 中手动进行了 `p1: { r: ep.p1[1], c: ep.p1[0] }` 的坐标转换，但 PK 模式下从 WebSocket 收到 `state.puzzle` 后，直接 `JSON.parse` 并传入 `new ConnectEngine(pDef)`；
       - `ConnectEngine` 构造函数尝试执行 `this.grid[ep.p1.r][ep.p1.c] = ep.color`。由于 `ep.p1` 是数组，`ep.p1.r` 为 `undefined`，导致 `this.grid[undefined]` 为 `undefined`，进而抛出 `TypeError: Cannot set properties of undefined (setting 'undefined')`；
       - 异常被 `effect` 内部 `catch (e)` 捕获，`this.localEngine.set(...)` 彻底中断执行，`localEngine()` 保持为 `null`；
    2. **模板严格受 `*ngIf="store.localEngine()"` 保护**：
       - `connect.component.html` 中棋盘容器 `<app-connect-board *ngIf="store.localEngine()"` 因引擎为 `null` 而完全不渲染，呈现出空容器；
    3. **PK 谜题监听刷新条件缺陷**：
       - 原逻辑使用了 `if (pDef && (!this.localEngine() || this.localEngine()?.width !== pDef.width))`。当单机预热或上一局与当前对局宽度相同时（如均为 5x5），`width !== pDef.width` 评估为 `false`，永久阻断新对局引擎实例化。
  - **体系化修复与增强**：
    1. **引入自适应端点与障碍物规格化函数 `normalizeConnectPuzzle` & `normalizePosition`**：
       - 在 `connect-engine.ts` 中抽象出通用规范化解析，兼容数组格式 `[c, r]`、对象格式 `{r, c}`、`{x, y}`、`{row, col}` 以及扁平色块格式；
       - `ConnectEngine` 构造函数自带自愈防御，实例化时自动调用规范化，并增加网格安全边界校验，确保绝对不抛出未捕获异常；
    2. **ConnectStore 统一对齐与重开状态自愈**：
       - PK 监听器与单机 `loadLevel` 统一使用 `normalizeConnectPuzzle`；
       - 移除脆弱的 `width !== pDef.width` 限制，精确依据 `pkLevelId` 与引擎存在性触发状态切换；
       - 实现 `protected override onResetLocalGameState()`，在 PK 再来一局/重开对局时无缝加载新盘面并触发视图刷新；
       - 在 `leaveRoom()` 时同步清理 `currentLevelId`；
    3. **后端与单元测试覆盖**：
       - 后端 `SpeedEngine.fetchPuzzle()` 补充对 `p.Blocks` 的安全序列化透传；
       - 新增前端 `connect-engine.spec.ts` 单元测试套件，全面覆盖 PK 负载格式解析与引擎实例化验证。

---

## [v3.2.102] - 2026-10-29

### 选关大厅与局内开房等候室展示修复与全端响应式路由校准 (In-Game Level Lobby PK Waiting Room Restoration & Route Normalization)
- **核心痛点解决 (用户反馈：首页大厅创建数独PK正常，但在游戏内选关大厅或单人游戏点击顶部PK建房时，其他玩家端大厅可见，但房主端无法进入等候大厅：数独直接显示单人棋盘无法开局，24点直接白屏)**：
  - **根本原因深度诊断**：
    1. **`GameLayoutComponent` 等候室展示条件包含过时单机大厅互斥检测**：`isAutoWaitingRoomVisible` 包含 `!this.isLobby`。当用户在数独、24点、推箱子、一笔画等关卡选择大厅（Level Select Lobby）时，组件向 `GameLayout` 传入 `[isLobby]="view() === 'lobby'"`。即使创建了联机 PK 房间，`!this.isLobby` 仍为 `false`，导致 `<app-game-waiting-room>` 等候大厅被错误阻断；
    2. **`isLobby` 属于普通 `@Input()` 属性而非 Signal**：`isAutoWaitingRoomVisible` 在 Angular Zoneless 响应式 `computed()` 中读取普通属性 `this.isLobby`，无法建立完整的响应式依赖链；
    3. **数独与24点不同表现的原因定位**：
       - **数独 (Sudoku)**：`handleCreateRoom` 中误将 `this.view.set('play')`，且模板中 `app-sudoku-pk-speed` 未检查 `store.status() !== GameStatus.Waiting`。当等待室被 `!isLobby` 阻断后，布局直接降级挂载了单人/PK棋盘，导致房主只能在棋盘上单机玩而没有等候大厅和【开始PK】按钮；
       - **24点 (Math24)**：模板内严格配置了 `@if (store.status() !== GameStatus.Waiting)`。因此当等候大厅被阻断时，内部盘面也没有满足渲染条件，最终呈现出一片完全空白的黑屏；
    4. **手持端顶部 PK 按钮路由缺失语言前缀**：`BaseGameComponent.navigateToPkArena()` 使用了硬编码的 `['/pk-arena']`，缺少 `/:lang` 路由前缀，导致被根路径通配符 `**` 拦截并重定向回首页大厅。
  - **全链路防御与体系化修复**：
    1. **`GameLayoutComponent` 引入自愈响应式大厅推导 (`isLobbyEffective`)**：
       - `isLobby` 改造为带信号支持的属性：`isLobbySignal = signal(false)`；
       - 推导 `isLobbyEffective = computed(() => this.isLobbySignal() && this.effectiveRoomMode() === GameMode.Single)`，**严格保证当进入联机模式（`Speed`/`Steal`/`Battle`/`Score`）时，`isLobbyEffective` 永远为 `false`**，彻底解除单人关卡大厅对联机等候室的拦截；
       - 更新模板内所有大厅样式与布局样式对齐 `isLobbyEffective()`，联机等待阶段保持标准游戏视口尺寸；
    2. **数独与24点等候室与状态流转彻底规范**：
       - `SudokuComponent` 中 `handleCreateRoom`、`handleJoinRoom` 与 `ngOnInit` 统一设置 `this.view.set('room')`，等候阶段绝不提前进入 `'play'`；
       - `sudoku.component.html` 增加 `&& store.status() !== GameStatus.Waiting` 守卫，杜绝等候阶段棋盘抢跑挂载；
    3. **选关型游戏（数独、24点、推箱子、一笔画、数桥）全面对齐规范**：
       - 统一绑定 `[isLobby]="view() === 'lobby' && store.currentRoomMode() === GameMode.Single"`（推箱子为 `showLobby() && store.currentRoomMode() === GameMode.Single`）；
    4. **路由跳转语言前缀自动补全**：`BaseGameComponent.navigateToPkArena()` 注入 `this.i18n.currentLang()`，标准导航至 `['/', lang, 'pk-arena']`。

---

## [v3.2.101] - 2026-10-29

### 推箱子PK选手看不见棋盘与24点PK观战者看不见卡牌双重修复 (Sokoban Contestant Board Visibility & Math24 Spectator Cards Restoration)
- **核心痛点解决 (用户反馈：1. 推箱子PK模式下，双方选手进入对战时看不到自己的棋盘（棋盘空白），而观战者反而能正常看到棋盘；2. 24点PK模式下，观战者完全看不到对战双方选手的卡牌和棋盘)**：
  - **推箱子 (Sokoban) 根本原因诊断与修复**：
    1. **本地引擎实例化条件判断失效**：在 `local-sokoban-engine.ts` 构造函数中，存在过于严苛的条件 `if (existingData && existingData.levelStr === this.levelStr)`。PK 对局开始时，`sokoban.store.ts` 传入的 `existingData` 包含服务端的 `board`、`moves`、`status`，但未包含 `levelStr`（为 `undefined`，而 `this.levelStr` 默认为 `''`），导致 `undefined === ''` 计算为 `false`！
    2. **选手盘面未灌入导致空白**：构造函数中既未进入 `existingData` 分支，也未进入 `else if (this.levelStr)`，导致 `this.board` 始终为空数组 `[]`；而 `myPlayerState` 优先读取 `pkLocalEngine().board`，造成对战双方选手的棋盘全呈空白；
    3. **为何观战者反而能看到**：观战者在 `sokoban.store.ts` 中直接走 `isSpectator()` 分支，旁路了 `pkLocalEngine` 直接读取服务端广播的 `state.players[targetId].board`，因而观战者能看到完整棋盘；
    4. **全方位健壮性修复**：
       - `local-sokoban-engine.ts` 构造函数放宽条件为 `if (existingData && (existingData.board || existingData.levelStr === this.levelStr))`，只要包含合法 `board` 即可直接深拷贝载入；
       - `sokoban.store.ts` 实例化时显式传入 `levelStr: ''`；
       - `myPlayerState` 增加双层防护：当 `pkEng` 棋盘行数为空时，自动兜底读取服务端 `state.players`；且大小写不敏感匹配玩家 ID；
       - 观战模式下为推箱子挂载导播视角胶囊，并阻断观战者键盘/触摸/点击误触走子。
  - **24点 (Math24) 根本原因诊断与修复**：
    1. **观战者缺失 Contestant 字典导致谜题判定为 null**：在 `math24.store.ts` 的 `currentPuzzle` 计算属性中，极速竞速模式（Speed Mode）仅通过 `const p = state.players[this.playerId()]` 获取选手进度。但观战者是中立观察者（如 `cctv`），根本不在 `state.players` 参赛选手中！导致 `p` 恒为 `undefined`，`currentPuzzle` 返回 `null`；
    2. **服务端键名不一致 (Steal 抢答模式)**：服务端 Go 结构体 `PKStealEngine.CurrentPuzzle` 的 JSON 序列化标签为 `currentPuzzle`，而前端原本只读取 `state.puzzle`，导致抢答模式中题目对象也为 `undefined`；
    3. **谜题未载入导致卡牌全空**：因为 `currentPuzzle` 为空，前端 `loadMultiplayerPuzzle` 永远不会被触发，`boardCards` 信号始终为空数组 `[]`，观战者所见的 3x3 棋盘中 4 张卡牌完全空白；
    4. **全方位健壮性修复**：
       - `math24.store.ts` 中在 Speed 模式下智能推导目标选手：若 `isSpectator()`，优先读取 `focusedPlayerId()`（导播焦点选手），若无则默认对齐首位选手；
       - `currentPuzzle` 兼顾 `state.currentPuzzle || state.puzzle`，完美覆盖抢答与竞速模式；
       - `Math24PkSpeedComponent` 与 `Math24PkStealComponent` 引入 `effectivePlayerId` 动态计算属性，观战模式下准确映射导播焦点选手的做题进度、卡牌阵列与 HUD 状态；
       - `Math24BoardComponent` 为观战者施加 `pointer-events-none` 保护并隐藏撤销/重置交互，底栏优雅呈现 `[👁️ 导播观战中 · 选手名称]` 紫色毛玻璃呼吸徽章。

---

## [v3.2.100] - 2026-10-29

### 根治观战者阻断房主开局故障与跨游戏换房观战者身份保活 (Spectator Game Start Blockade Fix & Cross-Game Reconnection Preservation)
- **核心痛点解决 (用户反馈：A房主和B选手准备好后，有C观战者在房间时，后端日志狂刷 `Cannot start game: player cctv is not ready`，导致游戏永远无法开始；且换游戏换房间后观战者被误当成参赛者)**：
  - **根本原因深度诊断**：
    1. **开局就绪检测误判**：服务端 `manager.go` 中的 `ActionStartGame` 仅判断 `if c.ID != r.Host && !c.IsReady`，**漏掉了 `!c.IsSpectator` 守卫**！因为观战者既不是房主也不会发送准备状态（`IsReady` 恒为 false），导致服务端将观战者误当作参赛选手，死锁拦截开局并持续输出报错；
    2. **对局人数阈值误判**：`if len(r.Clients) < 2` 粗暴统计全房间连接数，若只有 1 名房主和 1 名观战者亦会误判人数足够；
    3. **跨游戏切换注入选手引擎污染**：在房主调用 `ChangeGame` 迁移到新游戏时，旧代码直接 `for id := range r.Clients { eng.AddPlayer(id) }`，**将观战者也强行添加进新游戏引擎的 Contestant 列表**，导致引擎内部认为观战者是参赛选手；
    4. **前端跨游戏跟随重连观战身份偶发丢失**：前端 `WebSocketService` 接收到 `room_game_changed` 时，原本仅依赖瞬时参数推导 `spectating`，在异步回调或路由切换中有概率降级为普通 join。
  - **全链路防御与服务端严格过滤**：
    1. **开局就绪检查过滤观战者 (`manager.go: ActionStartGame`)**：
       - 精准统计非观战有效参赛人数 (`activePlayers`)，人数必须满足 `>= 2`；
       - 就绪检查严格增加 `!c.IsSpectator` 守卫：`if !c.IsSpectator && c.ID != r.Host && !c.IsReady`，彻底解放观战者，对手准备完毕后房主即可 0ms 瞬间开局；
    2. **跨游戏换房间引擎添加保护 (`manager.go: ChangeGame`)**：
       - 迁移新引擎时增加过滤：`if !client.IsSpectator { eng.AddPlayer(id) }`，杜绝观战者被误录入引擎选手位；
    3. **再来一局快路径过滤 (`manager.go: ActionRestartGame`)**：
       - 快路径自动准备与开局只对真实参赛选手生效，避免对观战者设置 `c.IsReady = true`；
    4. **前端重连身份百分百保活 (`WebSocketService.ts: GameChanged`)**：
       - 在 `setPendingJoin` 构造中加入 `|| this.isCurrentSpectator()`，确保跨游戏切换时观战身份绝对不降级；
    5. **自动化单元测试全覆盖 (`spectator_test.go`)**：
       - 新增 `TestSpectatorDoesNotBlockStartGame` 与 `TestSpectatorDoesNotBlockStartGameAfterChangeGame`，验证观战者在房间及跨游戏切换后均不会阻断对决开始，测试 100% 通过；
    6. **开局拒绝即时反馈与全语种 Toast 告警 (`manager.go & WebSocketService.ts`)**：
       - 当房间内仍有真实参赛选手未准备或总人数不足时，服务端不再单纯静默打印日志，而是向房主精准单播 `start_rejected` 消息（携带拒绝原因 `player_not_ready` 与具体未就绪选手 ID）；
       - 前端 WebSocket 网关捕获 `start_rejected` 事件后，动态联动多语言服务弹出 Toast 预警（如“无法开始: 玩家 XXX 尚未准备”或“无法开始: 需要至少2名玩家”），全量覆盖中、英、日、韩、德、法、西、葡 8 种语言，彻底解决房主疯狂点击开局却无反馈的困惑；
    7. **SSR 开发态 9 秒不稳定超时自愈 (`ssr-noop.interceptor.ts`)**：
       - 在 Node SSR 开发态（`isDevMode()`）下彻底拦截相对静态资源请求，避免 Vite Node 运行时对相对 URL 的 fetch 悬挂保持 `PendingTasks` 不释放；并在生产预渲染管线中为静态资源请求增加 3 秒 timeout 与 catchError 兜底，彻底根除 `Application did not stabilize within 9 seconds` 警告。

---

## [v3.2.99] - 2026-10-29

### 观战模式通用顶栏交互解封与双重退出机制 (Universal Spectator Handheld Header Unblock & Dual Exit Architecture)
- **核心痛点解决 (用户反馈：在观战模式下，顶部的导航返回、游戏规则、设置工具箱均无法点击，仅能点击最右上角的“退出观战”；用户习惯性点击左上角返回时以为卡死，体验割裂)**：
  - **根本原因深度诊断**：
    - `<app-game-layout>` 为了保护进行中对决的棋盘不被观战者误触/落子干扰，在包裹 `<ng-content>` 的外层舞台容器上施加了 `[class.pointer-events-none]="isSpectatorActive()"`；
    - 移动/平板手持端的所有 19 款游戏均将通用手持顶栏 `<app-game-handheld-header>` 投射在 `<ng-content>` 内；
    - `app-game-handheld-header` 原本未声明 `pointer-events-auto`，被外层 `pointer-events-none` 连坐封锁，导致左上角返回 `←`、玩法规则 `📖`、设置与全功能工具箱 `⚙️`（音效/震动/全屏/反馈）、调色盘 `🎨` 统统失去了鼠标与触屏点击响应。
  - **通用封装与三维交互优化**：
    1. **全局解除手持导航栏的事件封印 (`GameHandheldHeaderComponent`)**：
       - 在 `GameHandheldHeaderComponent` 宿主样式中增加 `pointer-events-auto`，全站 19 款游戏在手持/平板模式下全面恢复导航、规则与工具箱交互，同时棋盘区域依然保持 `pointer-events-none` 只读保护，完美兼顾“操作自由”与“防误触落子”；
       - 注入 `WebSocketService` 并内置 `effectiveIsSpectator` 响应式信号（自动响应 `ws.isCurrentSpectator()` 或 `@Input() isSpectator`）；
       - 观战模式下，左上角返回按钮视觉呈现轻奢柔和的 `text-rose-500` 与 `border-rose-500/40`，hover 提示（Tooltip）自适应切换为 `退出观战`，形成与顶部导播栏 `🚪 退出观战` 的双重视觉呼应；
    2. **返回逻辑与双重退出闭环 (`goBack()`)**：
       - 点击左上角返回按钮时直接派发 `back` 事件并触发 `BaseGameComponent.goBack()`，内部自动执行 `store.leaveRoom()` 向服务端发送退房报文、清空观战标识并平滑返回大厅，彻底终结“找不到退出按钮以为卡死”的体验痛点；
       - 顺带修复数独 Sudoku、24点 Math24、数桥 Hashi 在移动端联机/观战时点击返回误进入关卡选择大厅的问题，统一由 `goBack()` 自动判断并优雅退出联机房间；
    3. **局内操作按钮防护 (Hexa 等游戏)**：
       - 在六边形消除等游戏的顶梁中，对微笑重开按钮 `😊` 增加 `[disabled]="store.isSpectator()"`、`opacity-60 cursor-not-allowed` 样式与点击守卫，观战状态下仅作对局状态表情展示，杜绝观战者误触触发本地单机重开逻辑。

---

## [v3.2.98] - 2026-10-29

### 房主选择难度全员实时同步与 i18n 参数插值全局防御 (Host Difficulty Real-Time Synchronization & i18n Interpolation Fallback)
- **核心痛点解决 (用户反馈：房主选择了游戏难度，其他房客的游戏难度不会变化；切换提示出现未替换的变量 `{game}`)**：
  - **1. 根治房客等候室难度不同步缺陷**：
    - **根本原因诊断**：服务端通过 `RoomStateUpdate` 与 `GameChanged` 广播了最新 `r.Difficulty`，但前端 `WebSocketService` 接收到这两类消息时，仅将属性塞入局部变量，未将顶层 `msg.difficulty` 赋值给 `this.currentDifficulty` 信号与 `msg.state.difficulty`，导致 `BaseGameStore` 与 `GameLayoutComponent` 计算得到的 `effectiveDifficulty` 保持陈旧初始值，房客端的等候室徽章永久卡在原难度（如 `🔒 简单 (房主设定)`）；
    - **端到端响应式闭环同步**：
      1. 在 `WebSocketService` 中：接收到 `RoomStateUpdate` 与 `GameChanged` 消息时，强制更新 `this.currentDifficulty.set(msg.difficulty)` 及 `gameState` 内部的 `difficulty`；
      2. 在 `BaseGameStore` 中：响应式 `effect` 补充监听 `this.ws.currentDifficulty()`，全站 19 款联机游戏的 Store 自动实时同步房主选择的最新难度；
      3. 在 `GameWaitingRoomComponent` 中：增设响应式 `effect` 监听难度变化，房主一旦在单选胶囊条点击切换，房客端 `🔒 {{ getDifficultyLabel(difficulty) }} (房主设定)` 0ms 瞬间响应变更为最新难度；
      4. 在同游戏内切换难度时，优化 Toast 提示文案：精准展示 `游戏难度: 中等 ✓`，杜绝显示“房间已切换至游戏”。
  - **2. 根除多语言插值未替换露出 `{game}` 缺陷**：
    - **根本原因诊断**：Transloco 默认仅识别 `{{param}}` 双大括号插值，历史词条误写为 `{game}` 单大括号，导致插值失效、原样吐出 `{game}`；
    - **全局自愈与字典标准化**：
      1. 在 `I18nService.t()` 中部署正则自愈过滤器，同时兼容匹配并替换 `{{param}}` 与 `{param}`，杜绝任何未替换变量泄露给用户；
      2. 在中、英、日、韩、西、法、德、葡 8 种语言的字典中统一规范为 `{{game}}`。

---

## [v3.2.97] - 2026-10-29

### 跨游戏切换房间防销毁保活机制与跨游戏多语言名称解析 (Cross-Game Room Transition Survival & Dynamic Game i18n Resolution)
- **核心痛点消除 (用户问题复现：房主在换游戏如数织切扫雷时，对手被踢出并报错 `err_room_not_found`，前端控制台报 `Missing translation for 'game.minesweeper'` 与 `WS not connected, cannot send action {type: 'leave_game'}`)**：
  - **根本原因深度排查**：
    1. **前端卸载误触发退房**：房主发起跨游戏切换后，双方浏览器路由导航至新游戏，旧游戏组件（如 `NonogramComponent`）被 Angular 销毁。其 `ngOnDestroy` 盲目调用 `store.leaveRoom()` 向服务端发送 `ActionLeaveRoom` (`leave_game`) 报文并计划断开连接；
    2. **服务端切换期间空房误删**：服务端 `manager.go` 原有 `ActionLeaveRoom` 处理缺少切换期保护。当双方旧组件相继卸载并发送退房报文后，房间内有效人数降为 0 (`activeCount == 0`)，服务端直接执行 `delete(Rooms, roomID)`，在选手尚未完成新页面加载前瞬间将房间注销！导致访客进入扫雷连接 WebSocket 时被服务端抛出 `err_room_not_found` 并踢出；
    3. **切换保护窗口过短与引擎玩家误删**：原有 `isSwitchingGame` 判定仅预留 5 秒时间，在复杂页面渲染或网络波动下极易超时；且 `RemoveClient` 在旧连接断开时会误调用新引擎的 `RemovePlayer`；
    4. **多语言词条键名拼接错误**：前端 `WebSocketService` 接收到 `room_game_changed` 广播后，直接尝试解析 `game.${msg.game}`，而系统内所有游戏的标题国际化键名均规范注册在 `lobby.${gameId}`，导致控制台产生红字警告 `Missing translation for 'game.minesweeper'`。
  - **多层协同防御与房间保活机制**：
    - **前端 BaseGameStore 跨游戏切换防御**：在 `BaseGameStore.leaveRoom()` 中增加守卫，检测若 `crossGameJoin.pendingJoin()` 存在且房间号与当前房间一致 (`pending.roomId === currentRoom`)，明确识别为“正在跟随房间跨游戏迁移”，**绝对拦截并禁止发送 `C2SAction.LeaveRoom`，亦禁止断开连接与重置房间号**；
    - **后端 manager.go 30秒切换宽限期与防误删**：
      - 将 `isSwitchingGame` 宽限期从 5 秒大幅放宽至 30 秒，确保移动端及慢网速下页面加载安全；
      - 在 `RemoveClient` 中，若处于 `isSwitchingGame` 期间，禁止将玩家从新引擎中移出 (`!isSwitchingGame`)；当房间临时无人 (`isEmpty && isSwitchingGame`) 时，绝不立即注销房间，启动 30 秒重连等待协程；
      - 在 `ActionLeaveRoom` 与 `transferHost` 中增加 `isSwitchingGame` 判断，切换期间完全忽略旧组件卸载误发的离开房间请求，绝不意外转移房主或销毁房间；
    - **游戏名称多语言国际化规范解析**：在 `WebSocketService` 中通过 `GameRegistryService.getConfig(msg.game)?.titleKey` 准确获取游戏名称键名（如 `lobby.minesweeper`），完美消除 `Missing translation for 'game.minesweeper'` 报错；
    - **全链路单元测试覆盖**：在 `backend/pkg/ws/change_game_test.go` 中新增 `TestChangeGameCrossGameReconnect`，模拟房主切游戏后双方客户端断开并重连的全过程，验证房间始终存活且房主身份不发生变动，测试 100% 通过。

---

## [v3.2.96] - 2026-10-29

### 组队等候室切游戏/切难度全链路修复与多语言国际化补全 (Waiting Room Switch Game, Difficulty Guard & Full i18n Fix)
- **核心痛点解决 (用户反馈：组队大厅切换游戏用不了；扫雷等候大厅选择难度直接进入单机棋盘；全站游戏全面排查；缺失 i18n 键报错)**：
  - **1. 根治等候大厅切难度“误坠单机棋盘”问题 (Waiting Room Difficulty Switch Guard)**：
    - **根本原因诊断**：`<app-game-waiting-room>` 内部房主选择难度时派发 `(difficultyChange)` 事件，外层 `<app-game-layout>` 错误地调用 `onDifficultyChange` 将该事件冒泡抛给了外部页面模板（如 `minesweeper.component.html: (difficultyChange)="changeSingleDifficulty($event)"`）。而在扫雷等组件中，`changeSingleDifficulty()` 会无条件将房间模式切为单机模式 (`this.currentRoomMode.set(GameMode.Single)`) 并调用本地单机启动函数 (`this.store.startLocalGame(...)`)，导致等候室被瞬间销毁、直接进入单人棋盘；
    - **双层隔离防护**：
      1. 在 `GameLayoutComponent` 中将 `<app-game-waiting-room>` 的 `(difficultyChange)` 单独重定向至 `onWaitingRoomDifficultyChange()`，仅记录难度本地偏好，**绝不冒泡抛给外部单机难度监听器**；在 `onDifficultyChange` 中增加防护，仅在单机模式 (`effectiveRoomMode() === GameMode.Single`) 时才向上抛出事件；
      2. 全面排查全站所有游戏：在 `MinesweeperComponent`、`WatersortComponent`、`BlockComponent`、`SudokuComponent`、`ConnectStore`、`SokobanStore` 中全部增加防御守卫：若当前处于非单机模式或已在房间等待中 (`this.currentRoomMode() !== GameMode.Single || this.store.roomId()`)，立即拦截退出，杜绝单机重载逻辑干扰联机房间。
  - **2. 修复组队等候大厅“换游戏与设置失效”故障 (Waiting Room Game Switch & Edit Room Fix)**：
    - **根本原因 1**：`GameLayoutComponent` 的 `openChangeSettingsGlobal()` 原本判断 `if (this.currentRoomId)`，而在使用 `[store]="store"` 模式的游戏中，`currentRoomId` 输入项为 undefined，导致房主在等候室点击 `[⚙️ 设置]` 毫无响应。现已改为使用 `this.effectiveRoomId()`、`this.effectiveRoomMode()`、`this.effectiveDifficulty()`、`this.effectiveTarget()`，点击立即调起全局房间设置覆层；
    - **根本原因 2**：`GameWaitingRoomComponent` 此前底栏仅有 `[🚪 离开]` 与 `[⚙️ 设置]` 两个按钮，缺少直接的换游戏通道。现新增第三个高亮操作按钮 `[🎮 换游戏]`，注入 `GameSwitchService`，点击后直接呼出全站 19 款游戏的跨游戏选择弹窗；
    - **根本原因 3**：`GameSwitchService.executeSwitch()` 补全了向 WebSocket 发送消息时缺少的 `roomId` 字段 (`roomId: opts.roomId || this.ws.currentRoomId() || this.ws.gameState()?.roomId`)，保障后端快速准确命中当前房间。
  - **3. 全语言国际化 i18n 补齐 (Rule 2 Compliance)**：
    - 针对缺失的 4 个国际化键，全面补充至中、英、日、韩、西、法、德、葡 8 种语言的 `i18n/*.json` 文件中：
      - `common.cancel` (取消 / Cancel / キャンセル / 취소 / Cancelar / Annuler / Abbrechen / Cancelar)
      - `game.confirm_switch_game` (确认切换并开局 / Confirm & Start / 変更して開始 / 변경 및 시작 / Confirmar e iniciar / Confirmer et lancer / Bestätigen & Starten / Confirmar e Iniciar)
      - `game.select_difficulty` (选择难度 / Select Difficulty / 難易度を選択 / 난이도 선택 / Seleccionar dificultad / Sélectionner la difficulté / Schwierigkeit wählen / Selecionar Dificuldade)
      - `game.switch_pk_game_desc` (与对手无缝切换至其他游戏或难度，无需退出房间 / Seamlessly switch to another game or difficulty with your opponent without leaving the room...)
  - **4. 根除换游戏“房主对调”与权限混乱隐患 (Host Immutability & Host-Only Game Switch Guard)**：
    - **根本原因诊断**：服务端 `manager.go` 原本在处理 `ActionChangeGame` 时执行 `r.Host = clientID`，导致非房主选手（只要不是观战者）一旦发起换游戏就会将房主强行转移给对手；同时前端棋盘顶栏、HUD与结算界面未加 `isHost` 鉴权导致双方皆可点切游戏；
    - **服务端房主绝对稳定保障**：在 `backend/pkg/ws/manager.go` 中，增加房主权限硬核校验 `if clientID == r.Host`，非房主发送换游戏指令一律拦截拒执，并彻底移除 `r.Host = clientID` 转移逻辑，原房主身份全程连续、稳定不发生任何变动；
    - **前端各场景四维入口全面对齐房主鉴权**：
      1. 桌面端顶栏 (`GameLayoutComponent`)：增加 `effectiveIsHost()` 校验，非房主隐藏【🎮 换游戏】；
      2. 棋盘中央 HUD (`GamePkHudComponent`)：计算 `canSwitchGame = computed(() => enableSwitchGame && (isHost || myPlayer.isHost))`，仅房主展示【🎮 换】微型芯片；
      3. 手机/手持端工具箱 (`GameHandheldHeaderComponent`)：增加 `isHostEffective()` 校验，仅房主展示【🎮 更换对战游戏】；
      4. 结算界面 (`GameResultOverlayComponent`)：增加 `@Input() isHost` 校验，仅房主展示【🎮 更换对战游戏 / 调整难度】大胶囊；
    - **全量单元测试覆盖**：在 `backend/pkg/ws/change_game_test.go` 中补充房主换游戏成功且身份保持测试、对手换游戏被严格拦截且房主身份未变测试，测试 100% 绿色通过。
  - **5. 规范与质量验证**：
    - 前端 TypeScript 编译 `npx tsc -p tsconfig.app.json` 0 报错通过；
    - 后端 Go 单元测试 `go test ./...` 0 报错全绿通过。



### PK 对战全场景“一键无缝换游戏与换难度”系统 (PK In-Game & Result Screen Seamless Game & Difficulty Switch System)
- **核心痛点解决 (用户语音指令：“我们在PK的时候，不是出了一个结算界面吗？这个结算界面……很多是在结完算之后，再想玩其他的游戏。玩其他游戏的话，你根本就不知道如何选择，只能继续发起复仇，或者是再来一局……等于说只有退出房间，再新建其他游戏的房间，选择困难等等。所以说就是在两个地方需要改进：一个是在PK完之后的结算界面，要能实现选择其他游戏，包括其他难度。选了其他游戏，马上有其他难度的自动跑出来，可以选；还有一个就是说，在两个人PK的时候，在棋盘PK的时候，又想玩其他游戏不想玩当下的游戏了，在工具栏加上一个去切换游戏、去玩其他游戏的功能，包括选择。看怎么才能够合理布局，方便玩家使用，给一个相对的方案出来”)**：
  - **1. 痛点分析与闭环设计**：
    - 此前玩家在 PK 对决完或正在下棋时，如想更换另一款游戏（如扫雷玩累了想换数字华容道，或想提高难度），必须退出房间、返回大厅重新建房并重新拉人，流程繁琐、容易造成对手流失；
    - **全场景双重入口布局**：
      - **结算界面 (`GameResultOverlayComponent`)**：在胜利/失败/平局的【再战一局 / 发起复仇】正下方，增加极具视觉质感的【🎮 更换对战游戏 / 调整难度】大胶囊按钮，不打断原胜负总结的同时，提供最自然的换场通道；
      - **对战棋盘中 (PC 桌面端 & 手机手持端)**：
        - **PC 桌面端顶栏 (`GameLayoutComponent`)**：在 `header-right` 工具区为所有联机房间自动配备【🎮 换游戏】快捷按钮；
        - **手机/手持端顶栏 (`GameHandheldHeaderComponent`)**：在手持端 ⚙️ 下拉工具箱首项中，新增专属高亮的【🎮 更换对战游戏】项；
        - **对决中央抬头 (`GamePkHudComponent`)**：在 1v1 对决核心 VS 与计时器中央控制台，无论桌面端还是手机端，均内嵌【🎮 换】微型快捷芯片，对战期间随时可呼出。
  - **2. 游戏与难度选择弹窗 (`GameSwitchModalComponent`) 与服务 (`GameSwitchService`)**：
    - **全端响应式磨砂玻璃弹窗**：全局挂载于主模板 `<app-game-layout>` 底层，支持全站 19 款游戏 100% 自动覆盖；
    - **智能联动筛选**：顶部配备即时搜索栏（支持游戏中文名、英文名、拼音首字母过滤）；
    - **游戏卡片网格**：点击任意游戏卡片，立即展开高亮，下方**全自动即时跑出该游戏所支持的全部难度档位（简单/普通/困难/大师/地狱等）以及支持的联机对决模式（竞速 PK / 抢夺 PK 等）**，单选胶囊即点即切；
    - **一键确认切换**：点击【确认切换并开局】，自动携带目标游戏、所选难度与模式发起切换。
  - **3. WebSocket 全房间无缝迁移与房主智能继承 (Backend & Frontend Protocol)**：
    - **双向协议扩展**：后端 `manager.go` 支持 `action: "change_game"` 与 `type: "change_game"` 双向兼容匹配；当收到任意非观战参赛选手的换游戏指令时，自动将房主转移给发起人 (`r.Host = clientID`)，就地初始化目标游戏引擎 (`engine.ResolveEngine`) 并清空旧对局就绪状态；
    - **广播与跨游戏导航**：服务端广播 `domain.EventRoomGameChanged`，所有选手（包括对手与全体观战者）接收后由 `WebSocketService` 弹出友好的系统横幅通知，并通过 `CrossGameJoinService` 自动无缝路由跳转至新游戏页面，原房间号与参赛人员完全保留，直接原地开局；
    - **单元测试保障**：新增 `backend/pkg/ws/change_game_test.go` 针对 `ActionChangeGame` 协议及房主切换进行全覆盖回归测试，`go test ./...` 与 `npx tsc` 零报错通过。
  - **4. 严守开发准则 (Rules Compliance)**：
    - **Rule 1**：同步维护并更新 `docs/FEATURES.md` 与 `docs/CHANGELOG.md`；
    - **Rule 2**：8 种语言（中、英、日、韩、西、法、德、葡）全部抽离至 `assets/i18n/*.json`，弹窗与按钮严格采用全局 CSS 变量（`--color-bg-card`, `--color-border-card`, `--color-text-main` 等），完美支持 Light/Dark 主题无缝切换；
    - **Rule 4**：全端响应式适配，在手机端、平板与 PC 端弹性自适应，绝无横向滚动条或布局崩坏。

## [v3.2.94] - 2026-10-28

### 方块消除 (Block) 观战者棋盘“慢一拍/慢一步”彻底根治与全站19款游戏观战导播模式全面排查治理 (Block Spectator Latency Root Fix & Complete 19-Game Spectator Director Audit)
- **核心痛点解决 (用户语音指令 1：“俄罗斯方块和2048下落都正常了，但是方块消除还有一个小问题，就是观战的人显示的棋盘总是慢一度/慢一拍。等于说某个选手下了这个棋，在下另一个棋的时候观战者才看到前面的棋，总是慢一步，不是实时的”；用户语音指令 2：“还有刚才你解决了这个问题，是否其他游戏有些还没改的，或者没改好的，你看有这方面的问题吗？看一下其他游戏有没有这种问题”)**：
  - **1. 深度查明方块消除 (Block) 慢一拍的本质根因**：
    - 在 `BlockStore` 中，落子执行流程为：`this.engine.handleAction({ type: BlockActionType.Place, ... })`，引擎在放置完成后立即调用 `config.onSyncState()`；
    - 在原代码中，`onSyncState()` 映射为 `() => this.syncState()`，而 `syncState()` 从 Angular Signal `this.localBoard()`、`this.localScore()` 读取数据并向 WebSocket 发送 `C2SAction.Update`；
    - **致命时序差**：此时组件中的 `this.updateSignals()` 尚未执行！导致 `syncState()` 读取并打包给后端的始终是**上一步的旧 Signal 盘面与分数**；
    - 当选手下第 2 颗棋子时，触发的同步才将第 1 颗棋子的状态打包发出，导致观战端看到的棋盘永远“慢一步 / 慢一拍”，无法做到即时同步；
  - **2. 方块消除 (Block) 零延迟实时修复方案**：
    - `BlockStore.syncState()` 重构：直接提取引擎刚计算完成的权威最新快照 `const state = this.engine.getState()`，提取最新 `state.board`、`state.score`、`state.hand`，彻底摆脱 Signal 响应式延时；
    - `ensureEngineConfigured` 中的 `onSyncState` 补充执行 `this.updateSignals()` 与 `this.syncState()`；并在 `placeShape` 之后也保障立即推送，确保选手下棋第 0 毫秒观战端即刻收到并渲染最新棋盘；
  - **3. 全站 18 款其他游戏 PK 观战与状态同步地毯式排查与全面治理**：
    - **A. 2048下落消除 (Drop2048)**：排查发现 `syncState()` 中此前通过 Signal `this.board()` 遍历重构 7x5 矩阵，若引擎事件提前触发同样可能带来 1 帧落后。立即重构为直接遍历 `this.engine.board`，并在 `syncState` 开头强制同步信号，彻底杜绝下落消除的任何潜在延迟；
    - **B. 经典2048 (Classic 2048)**：
      - 排查发现 `classic2048.component.html` 遗漏了 `<app-game-pk-hud>` 的 `[isSpectator]`、`[focusedPlayerId]`、`(playerSelect)` 绑定；
      - `cells()` 为本地私有状态，观战者无本地对局导致观战时棋盘全白；
      - 治理：在 `Classic2048Store` 封装 `displayCells` 与 `displayScore` 响应式计算属性，观战时自适应解码聚焦选手的 `pkBoards[targetId].cells`；棋盘无缝切为导播选手第一人称视角；
      - `classic2048.component.ts` 的 `myPlayerPkStats` 与 `opponentsPkStats` 修复 `isMe: !this.store.isSpectator()`，键盘与触摸在观战下自动拦截；
    - **C. 一笔画连线 (Connect)**：
      - 补充 `connect.component.html` 中 `<app-game-pk-hud>` 缺失的 `[isSpectator]`、`[focusedPlayerId]`、`(playerSelect)` 绑定；
      - `connect.store.ts` 的 `opponents` 过滤条件更新为 `this.isSpectator() || p.id !== this.playerId()`，观战者可查看全体对战选手；
      - `connect.component.ts` 适配 `isMe: !this.store.isSpectator()`，杜绝观战者把自己作为选手加入排行榜；
    - **D. 水排序 (Water Sort)**：
      - 补充 `watersort.component.html` 中 `<app-game-pk-hud>` 缺失的 `[isSpectator]`、`[focusedPlayerId]`、`(playerSelect)` 绑定；
      - 解决观战下主视口试管空白问题：引入 `activePlayerId()` 智能解析导播目标，观战模式下 `myTubes()` 与 `opponentTubes()` 自动镜像聚焦选手与对手的试管状态；
      - 观战下 `onTubeClick` 自动安全拦截，防止观战误触倒水；
    - **E. 桥梁数织 (Hashi)**：
      - 补充 `hashi.component.html` 中 `<app-game-pk-hud>` 缺失的 `[isSpectator]`、`[focusedPlayerId]`、`(playerSelect)` 绑定；
      - `hashi.component.ts` 的 `myPlayerPkStats` 与 `opponentsPkStats` 精确适配 `isSpectator`；
    - **F. 数独抢分对决 (Sudoku Pk Steal)**：
      - 补齐 `<app-game-pk-hud>` 缺失的 `[isSpectator]`、`[focusedPlayerId]`、`(playerSelect)`；
      - 修复 `isMe: !this.store.isSpectator()` 与观战者选手列表过滤；
    - **G. 24点 (Math 24 竞速与抢夺模式)**：
      - `math24-pk-speed` 与 `math24-pk-steal` 同步补齐 `<app-game-pk-hud>` 缺失的 `[isSpectator]`、`[focusedPlayerId]`、`(playerSelect)`；
      - 修复 `isMe: !this.store.isSpectator()` 与选手列表完整显示。


### 方块消除 (Block) 联机空白盘面彻底根治、2048下落消除 (Drop2048) 与俄罗斯方块 (Tetris) 全面接入通用导播镜像与观战者隔离 (Block PK Board Display Fix, Drop2048 & Tetris Universal Spectator Director Mode)
- **核心痛点解决 (用户语音指令：“接下来一个个完善PK的时候的问题吧。第一个问题，方块消除现在是双方在PK建完房间选择PK的时候，棋盘是空的，而且底下的碎片也移动不了，等下我抓个图给你看。还有的就是进去的时候，观战房进去的时候看到的时候也是选择不了角色。等于说目前方块消除的是这个问题。然后就是剩下俄罗斯方块和那个2048消除，这两个的共同点呢，也是把自己玩家的信息也把它放到里面去了，和以前说的类似了，等于说要改版一下就是这个问题。还有那个2048的布局，在PK的时候也有些问题，等下可以把图发给你看，你把它完善一下。可以参考nonogram”)**：
  - **1. 深度查明根因**：
    - **A. 方块消除 (Block) PK 棋盘全白且下方手牌碎片不可落子根因**：
      - 前端 `BlockStore` 的 `board = computed(...)` 中此前写为 `st.players[this.playerId()].matrix || this.localBoard()`；
      - 在对战开始或玩家刚加入时，后端 Go 引擎初始化 `p.Matrix = [][]int{}`，JSON 序列化为 `[]`；在 JavaScript 中空数组 `[]` 为真值 (truthy)，导致表达式直接返回空数组 `[]`；
      - 棋盘单元格 `div` 数量变为 0，盘面呈现为一片大白方块，且因 DOM 中无任何落子格子，命中计算全线失效，下方碎片完全无法放置与移动；
      - 此外，方块消除原 PK 头部缺少 `[isSpectator]`、`[focusedPlayerId]` 与 `(playerSelect)` 绑定，观战员进入时无法选择角色导播；
    - **B. 2048下落消除 (Drop2048) 观战者列入参赛排行榜与右侧重影旧布局冲突**：
      - `drop2048.component.html` 遗留了早期的旧对战卡片列（第 326-340 行 `<!-- Opponents (PK Mode Extra Right Column) -->`），在右侧重复浮现 `admin 0`、`cctv 32` 小卡片，与顶部 `app-game-pk-hud` 严重撞车；
      - `app-game-pk-hud` 未绑定 `[isSpectator]`，导致观战者 `test` 被作为参赛选手 `myPlayer` 放入列表，使 1v1 对决被误判为 3 人对决并展示多人榜单 `🥈 test (我) 0`；
      - 观战模式下手机端底部仍显示 `◀ ▼ ▶ ⚡` 虚拟操作摇杆；
    - **C. 俄罗斯方块 (Tetris) 观战者身份错乱与观战盘面空白**：
      - `tetris.component.html` 同样未向 `<app-game-pk-hud>` 传递 `[isSpectator]`、`[focusedPlayerId]` 与 `(playerSelect)`；
      - 观战者视角下 `viewGrid` 仅提取了自身的空本地网格，未能实时镜像当前导播锁定选手的矩阵盘面。
  - **2. 架构重构与对标 Nonogram 升级方案**：
    - **A. 方块消除 PK 盘面健壮化与导播系统**：
      - `BlockStore.board` 重构：非观战者或单机模式下 100% 稳定直出 `this.localBoard()`（本地零延迟计算与放置），彻底杜绝空白盘面；观战模式下自适应提取当前锁定选手 `rawState.players[targetId].matrix`，若未同步则平稳兜底本地 10x10 网格；
      - `onGlobalStart` 中非观战者开局立即触发 `syncState()`，向后端主动同步初始化棋盘与手牌；
      - `<app-block-component>` 模板向 `<app-game-pk-hud>` 完整接入 `[isSpectator]`、`[focusedPlayerId]` 与 `(playerSelect)`；
      - 观战模式下，下方手牌槽智能隐藏并切换为极具质感的 `👁️ 导播观战中 · [选手名]` 提示栏，点击导播头像与标签可自由秒切选手；
    - **B. 2048下落消除右侧旧布局彻底清除与全景导播镜像**：
      - 彻底移除 `drop2048.component.html` 中冗余的右侧 `Opponents (PK Mode Extra Right Column)` 旧列表，消灭重复浮窗；
      - 后端 Go `drop2048` 引擎 `PlayerInfo` 与 `ActionPayload` 扩展 `Matrix [][]int` 字段，玩家每次合体与落子自动把 7x5 盘面同步并广播；
      - `Drop2048Store` 引入 `displayBoard` 计算属性：观战时将目标选手的 7x5 矩阵即时解码为 `DropBlock[]` 阵列，第一人称实时观摩选手下落合体动态；
      - 观战模式下屏蔽底部移动/速降虚拟按键，替换为居中导播状态栏；
    - **C. 俄罗斯方块观战导播盘面镜像与选手隔离**：
      - `tetris.component.ts` 的 `myPlayerPkStats` 与 `opponentsPkStats` 精准适配 `isSpectator`，将观战者彻底排除在对决 HUD 之外，恢复 1v1 纯净对称进度条与导播切换气泡；
      - `viewGrid` 接入实时导播镜像：观战时动态读取当前聚焦选手的 `target.matrix`，实现毫秒级方块堆叠全景呈现；
      - 观战模式下隐藏底部虚拟控制按钮并提供导播提示。

## [v3.2.92] - 2026-10-28

### 六边形消除 (Hexa) 观战导播模式棋盘实时同步与数独建房视界流转修复 (Hexa Spectator Real-Time Board Mirroring & Sudoku Lobby Transition Fix)
- **核心痛点解决 (用户语音指令：“目前的话，可以使用观看的，而且在PK的时候正常的是有数织是可以的，还有扫雷也可以观看，还有数字华容道也可以...但是我看数独是不能建房的，数独的话是有问题。那个六边形消除有什么问题呢，他们两个人可以PK，但是进去的时候，观战员进去的时候是看不到棋盘，看不到棋盘下的棋的，而且还把自己的身份也加进去了，所以说这个应该还是属于老的布局。你看下把六边形解决了吧，还有把六边形消除的观战模式给搞好了。如图所示，那个 test 就是观战者，它不必这个观战者其实没必要显示在上面。我点其他的话也看不到其他人的棋盘。你看下是怎么回事。可以参考nonogram”；文字指令：“可以参考nonogram”）**：
  - **1. 深度查明根因**：
    - **A. 数独建房无法进入等待室根因**：
      - 数独组件初始状态 `view` 被置为 `'lobby'`（用于单人选关），而 `sudoku.component.ts` 的 `handleCreateRoom` 与 `handleJoinRoom` 在创建/加入联机房间时漏掉了 `this.view.set('play')`；
      - 导致 `<app-game-layout [isLobby]="view() === 'lobby'">` 中 `isLobby` 始终为 `true`，触发基类逻辑强制隐藏 `<app-game-waiting-room>`，且页面模板仍停留于选关大厅，造成“建房无响应/进不去”现象；
    - **B. 六边形消除观战者身份错乱（观战者被列入榜单）**：
      - `<app-hexa-component>` 的模板未向 `<app-game-pk-hud>` 绑定 `[isSpectator]="store.isSpectator()"`、`[focusedPlayerId]` 与 `(playerSelect)`；
      - `<app-game-pk-hud>` 未能感知当前为观战模式，误将观战者 `test` 视为参赛玩家并置为 `myPlayer`，导致 2 位选手 + 1 位观战者被错误识别为 3 人局并呈现排名榜单 `🥇 test (我) 0`；同时 `effectiveDuel` 内部早期也缺少对观战者自身的二次过滤；
    - **C. 六边形消除观战棋盘空白（看不见选手落子）**：
      - 后端 Go 引擎 `PKScoreEngine` 及 `PlayerInfo` / `ActionPayload` 结构体仅传输了 `score` 与 `piecesPlaced`，未包含蜂巢盘面单元格数据 `cells`；
      - 前端 `HexaStore` 仅有本地单体计算 `localCells`，观战者自身不放置棋子导致盘面恒为空白，且切换导播焦点时无法提取目标选手的棋盘。
  - **2. 架构重构与对标 Nonogram 升级方案**：
    - **A. 数独生命周期流转修复**：
      - `sudoku.component.ts` 的 `handleCreateRoom`、`handleJoinRoom` 以及 `ngOnInit` 恢复待处理或重连时，统一触发 `this.view.set('play')`，无缝拉起 `<app-game-waiting-room>` 等待区；
    - **B. 后端 Go Hexa 引擎盘面实时状态同步**：
      - 在 `backend/internal/engine/hexa/types.go` 中引入 `HexCell` 结构体，并为 `PlayerInfo` 与 `ActionPayload` 扩展 `Cells []HexCell` 字段；
      - 在 `engine.go` 的 `HandleAction` 中，玩家每次落子（`update` / `move`）将盘面状态 `act.Cells` 存入内存玩家对象并向全体广播，对局重开时重置；
    - **C. 前端 Hexa 导播系统与响应式棋盘计算 (`HexaStore`)**：
      - 拆分 `localCells` / `localScore` 与响应式计算属性 `cells` / `score`；
      - 观战模式下，计算属性自适应聚焦 `focusedPlayerId`（若未显式指定则默认锁定第一位对手），从 `rawState.players[targetId].cells` 中直接提取目标选手的实时 61 格微晶宝石蜂巢阵列与分数，支持点击秒切；
      - `placePiece` 在对战落子时自动带上 `cells: this.engine.getState().cells` 同步给服务端；
    - **D. 全局 PK HUD 观战者彻底隔离与 1v1 纯净对决**：
      - 重构 `game-pk-hud.component.ts`，观战模式下强制过滤观战者自身 `me`，从候选选手中彻底剔除，使 2 位真实参赛选手（如 `player88` 与 `cctv`）精准激活 1v1 Duel 对战面板；
      - 导播锁定中的选手高亮金色聚光灯环绕，非聚焦选手提供 `[👁️ 切视角]` 按钮；
      - 棋盘下方交互卡槽在观战模式下智能替换为优雅的 `👁️ 导播观战中 · [选手名]` 状态提示栏，防止误触。

## [v3.2.91] - 2026-10-28

### 全平台联机 PK 游戏“开房PK”提示“房间不存在或已关闭”彻底根治与前后端动作对齐 (Universal PK Room Creation "Room Not Found" Eradication & Strict Action Alignment)
- **核心痛点解决 (用户语音指令：“现在除了那个数织这个游戏可以组队之外，其他游戏点击开...开房PK，会提示房间不存在或已关闭。你看下是什么问题？是后端重启了吗？你看下是怎么回事还是有问题没有考虑到？”)**：
  - **1. 深度查明根因 (为什么仅有数织可以组队，其他游戏全报“房间不存在或已关闭”)**：
    - **A. 前端动作覆盖致命 Bug (`action: 'join'` 误覆盖 `'create'`)**：
      - 在扫雷 (`minesweeper`)、数独 (`sudoku`)、俄罗斯方块 (`tetris`)、连珠对战 (`connect`)、六边形消除 (`hexa`)、数字华容道 (`sliding`)、下落2048 (`drop2048`)、五子棋 (`gomoku`)、密码破译 (`codebreaker`)、数桥 (`hashi`)、成语接龙 (`idiom`) 等游戏组件中，开发者此前在实现 `handleCreateRoom` 或通用的 `joinRoom` 内部辅助方法时，硬编码了 `this.wsService.setPendingAction('join')` 或者 `const action = isSpectator ? 'spectate' : 'join'; this.wsService.setPendingAction(action);`；
      - 导致当用户点击“创建房间”或“开房PK”时，本应发往后端的 `action: 'create'` 在最后一刻被强制篡改为了 `action: 'join'`；
      - WebSocket 连接建立时，客户端向后端请求以“加入已有房间”的身份加入尚未创建的新房间 ID，服务端在内存房间池中执行 `JoinRoom(roomID)` 立即返回 `err_room_not_found`，前端收到断开并弹出全局 Toast 警告：`房间不存在或已关闭。`；
    - **B. 为何数织 (Nonogram) 独善其身**：
      - 数织组件严格继承自基类 `BaseGameComponent` 且**未重写** `handleCreateRoom`，完全走基类的标准 `this.wsService.setPendingAction('create')` 流程，因此数织是全平台唯一创建房间动作不被二次篡改的游戏；
    - **C. 后端防护缺失 (Host 身份回退保护)**：
      - 后端 WebSocket 握手协议中，若前端误传 `action == "join"` 但连接者本身即为该房间的房主（`hostId == playerID`），后端原先直接硬性驳回断开连接，未进行房主容错自愈。
  - **2. 完整修复与多层防御闭环**：
    - **A. 前端基类与接口签名全面对齐 (`joinRoom(..., action?: string)`)**：
      - 在 `GameStore` 核心接口及 `BaseGameStore` 基类中，为 `joinRoom` 补充可选的动作参数 `action?: string`；内部智能计算 `const explicitAction = action || (isSpectator ? 'spectate' : '');`，杜绝内部自动将动作退化为 `'join'`；
      - `BaseGameComponent.handleCreateRoom` 显式向 Store 与 WebSocket 传入 `'create'` 动作；
    - **B. 修复所有游戏组件的 `handleCreateRoom` 与 `joinRoom`**：
      - 修复 `minesweeper.component.ts`：区分创建与加入动作，不再将 `'create'` 覆写为 `'join'`；
      - 修复 `sudoku.component.ts`、`tetris.component.ts`、`connect.component.ts`、`hexa.component.ts`：将 `setPendingAction('join')` 纠正为 `setPendingAction('create')`；
      - 修复 `sliding.component.ts`、`drop2048.component.ts`、`gomoku.component.ts`、`codebreaker.component.ts`、`hashi.component.ts`、`idiom.component.ts`：`joinRoom` 接受 `action` 参数并在创建流程中严密保证 `action: 'create'`；
    - **C. 房间生命周期服务强化 (`room-lifecycle.ts`)**：
      - `PendingJoinInfo` 增加 `isCreate` 与 `action` 字段，`consumePendingOrReconnect()` 恢复待处理或重连时正确还原 `action: 'create'`；
    - **D. 后端 Go WebSocket 网关房主兜底容错 (`backend/internal/handlers/ws/handler.go`)**：
      - 在 WebSocket 网关加入房间失败分支增加智能自愈：若客户端因网络或老旧缓存携带了 `action == "join"` 且查询 `domain.ErrRoomNotFound`，但校验到当前客户端即为房主本人（`hostId != "" && (hostId == playerID || hostId == "Host")`），服务端自动平滑降级创建房间并接入，彻底消除“房间不存在”拦截；
    - **E. 端对端自动化真实浏览器测试与截图留存**：
      - 调动真实浏览器对扫雷、数独等多个游戏点击“开房PK”/“创建房间”进行端对端回归测试；
      - 验证均 100% 毫秒级顺利创建并展示 `<app-game-waiting-room>`（等待大厅包含房主身份、难度选择与准备就绪状态），无任何“房间不存在或已关闭”报错，且全单机模式依然严格在客户端零服务端依赖运行（符合 AI 核心准则第5条）。

## [v3.2.90] - 2026-10-28

### 全平台联机 PK 游戏观战直接切入棋盘与组队等待界面彻底屏蔽修复 (Universal Direct Spectator Entry & Waiting Room Bypass Fix)
- **核心痛点解决 (用户语音指令：“我测试了扫雷，在PK的时候，我作为观战，观战方，进去的时候还是出现以前数织那个时候还没有解决的问题，就是点击观战的时候还是出现这个...那个组队的界面。所以你看下这个怎么...怎么解决？其他游戏，上面修改的游戏是否解决了？如果没解决，也一并解决。”)**：
  - **1. 根治观战模式误入组队等待界面痛点**：
    - **查明根因**：
      - **A. 身份透传截断**：部分游戏组件在 `joinRoom`、`handleJoinRoom` 与游戏专属 Store 子类重写 `joinRoom()` 时，未将 `isSpectator` 参数透传给 `super.joinRoom()`，导致 `BaseGameStore._isSpectator` 保持为 `false`，从而判定该连接为参赛选手而非观战者；
      - **B. 断线重连与旧 Session 覆盖**：`room-lifecycle.ts` 原先在页面刷新或带参跳转时，若 `sessionStorage` 存有历史普通玩家数据，会掩盖 URL 的 `spectate=true`，且 `PendingJoinInfo` 缺失 `isSpectator` 导致重连恢复时丢失观战标记；
      - **C. WebSocket 自动重连身份退化**：`websocket.service.ts` 的指数退避自动重连逻辑硬编码了 `'join'` 动作且未携带 `isSpectator` 参数，导致观战者发生微小重连时身份被强制降级为普通参赛者并挤入组队房间；
      - **D. 扫雷 Store 空指针安全缺陷**：`minesweeper.store.ts` 的 `myBoardData()` 对观战者（观战者在 `s.boards` 中无自身条目）返回 `null`，导致后续 `width`、`height`、`mines` 计算属性解引用爆出 `TypeError`，打断组件初始化；
      - **E. BaseGameComponent 状态感知与房间防重逻辑**：`BaseGameComponent` 原先只检查 `roomId` 是否一致，如果用户在观战与参战之间切换会因为 `roomId === event.roomId` 被短路拦截；
    - **解决方案**：
      - **全 17 款联机 PK 游戏 Store 统一无损签名**：全量对齐所有游戏 Store 子类（`sliding`、`block`、`tetris`、`codebreaker`、`gomoku`、`lightsout`、`hexa`、`connect`、`drop2048`、`watersort` 等）的 `override joinRoom` 签名，确保 `(roomId, mode, difficulty, hostId, target, password, bountyCoins, isSpectator)` 参数完整穿透至基类；
      - **统一基类计算信号与防重判定**：在 `BaseGameComponent` 中提供全局响应式信号 `readonly isSpectator = computed(() => this.store?.isSpectator?.() ?? false)`，并在 `handleJoinRoom` 中执行 `roomId` 与 `isSpectator` 状态双重比对；
      - **全生命周期精准溯源 (`room-lifecycle.ts`)**：`consumePendingOrReconnect()` 优先深度解析 URL 参数 `spectate=true` / `action=spectate`，并在 `sessionStorage` 中通过专用键名隔离参赛与观战信息，杜绝陈旧参赛缓存污染；
      - **WebSocket 重连协议全面保真**：重构 `websocket.service.ts`，自动重连时完整沿用初始连接的 `reconnectAction = isSpectator ? 'spectate' : (action || 'join')` 及 `isSpectator` 标记；
      - **扫雷等纯棋盘游戏全链路观战空值安全兜底**：`minesweeper.store.ts` 的 `myBoardData` 增加安全默认状态回退，所有尺寸与雷数计算属性添加可选链（Optional Chaining），从容支撑中立纯观战视角；
      - **端对端真实浏览器验证**：自动化真实浏览器会话测试验证通过，点击或直链进入观战直接呈现实时扫雷盘面与顶层 Universal Spectator Director Bar（导播条），`<app-game-waiting-room>` 100% 隐藏且棋盘呈现 `pointer-events-none` 防误触。


### 观战导播模式选手激活高亮显著化修复与第二批 PK 游戏（扫雷/推箱子/滑动拼图/点灯/数独）棋盘多路导播观战升级
- **核心痛点解决 (用户语音指令：“数织这个游戏已经看得到对方的那个棋盘了，而且效果还蛮好的。但是就是说在观看的那个用户，他那个视角啊，就是说他锁定的是哪个角色哪个角色，这个选的角色没有激活，比如说admin选的这个角色，但是它没有被激活的状态，比如说被锁定的状态不知道是哪个的，所以就不知道自己选择的是哪个的，所以这个要解决一下。解决好之后你看一下是否能够应用到其他游戏的，或者分批分批的游戏来，几个几个游戏的升级为这种可以观看的模式。”)**：
  - **1. 根治导播选中角色未激活与未知锁定状态痛点**：
    - **查明根因**：
      - **A. Zoneless 响应性缺失**：此前 `<app-game-pk-hud>` 内部虽然将玩家列表封装为 Signal，但 `isSpectator` 与 `focusedPlayerId` 仍为普通 `@Input`，在 Angular 19 Zoneless 模式下，当通过外部或顶栏变更焦点选手时，OnPush 策略未触发脏检查重绘，导致激活高亮无法即时更新；
      - **B. 用户名与选手过滤冲突**：原 `effectiveDuel` 与各组件的 `opponentsPkStats` 使用了 `p.id !== myId` 进行过滤。当观战者自身登录账号恰好为 `admin` 或与场上选手重名时，该选手被错误剔除，导致无法将 `admin` 作为参赛选手进行高亮锁定与棋盘拉取；
      - **C. 棋盘渲染边界漏判**：`nonogram.store.ts` 与 `tilematch.store.ts` 在提取目标玩家棋盘时使用了 `if (targetId && targetId !== myId)`，当观战账号为 `admin` 且锁定的选手为 `admin` 时触发了条件拦截，导致未能正确拉取棋盘数据；
    - **解决方案**：
      - **全响应式信号驱动**：`GamePkHudComponent` 的 `isSpectator` 与 `focusedPlayerId` 全面升级为基于 `signal` 的 Setter/Getter，并提供大小写鲁棒的 `isPlayerFocused(id)` 计算辅助函数；
      - **观战参赛选手全量保活**：在观战模式下，`effectiveDuel` 严密收集所有真实参赛者，绝不因为观战者用户名称与参赛者重名而漏滤；
      - **极醒目黄金导播聚焦视觉规范**：
        - **PC/平板端**：被锁定选手卡片自适应呈现 `bg-gradient-to-r from-amber-500/25 via-amber-500/10 to-transparent border-2 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.01]` 聚光灯金色光环，头像放大并外扩 `ring-4 ring-amber-400 scale-110 shadow-[0_0_12px_rgba(245,158,11,0.6)]`，上方悬浮跳动 `👁️` 镜头图标，右上角展现 `🎯 导播锁定中` 脉冲徽章；未选中的选手透明度优雅弱化为 60% 并附带显眼的 `[👁️ 切视角]` 交互按钮；
        - **移动端 (< sm)**：卡片采用双层琥珀色高亮描边 `border-2 border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/25`，并附带 `🎯导播` 徽章与金色头像环；
        - **顶栏导播栏 (<app-game-layout>)**：被选中的药丸按钮呈现 `bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-2 ring-amber-400 shadow-md scale-105` 伴随 `[锁定]` 标签与 `🎯` 动态图标；
      - **数织与羊了个羊棋盘穿透修复**：修正 `nonogram.store.ts` 与 `tilematch.store.ts`，观战模式下即使 `targetId === myId` 亦正常从 `players[targetId]` 提取棋盘并即刻渲染。
  - **2. 第二批联机 PK 游戏全面升级为实时多路导播观战系统**：
    - **扫雷竞速 PK (`minesweeper`)**：
      - `minesweeper.store.ts` 的 `myBoardData` 适配观战导播模式，观战者可随心切换选手，第一人称透视选中选手的当前排雷、旗帜与爆雷棋盘；
      - `<app-game-pk-hud>` 接入导播选手选择事件与锁定状态响应；
    - **推箱子竞速 PK (`sokoban`)**：
      - `sokoban.store.ts` 的 `myPlayerState` 支持观战第一视角镜像，观战者实时同步选中选手的箱子移动轨迹、走动步数与完成目标数；
      - 修复 `sokoban.store.ts` 的 `override joinRoom` 参数截断问题，确保 `isSpectator` 无损透传；
    - **华容道 / 滑动拼图竞速 PK (`sliding`)**：
      - `sliding.store.ts` 的 `myBoard` 支持导播镜像，观战者第一视角实时观看选手滑动拼板过程与已归位块数；
      - `otherPlayers` 与 HUD 绑定观战模式，支持一键秒切选手；
    - **点灯游戏竞速 PK (`lightsout`)**：
      - `lightsout.store.ts` 适配 `board` 与 `moves` 导播计算，观战者实时看到选手当前的网格亮熄状态与操作步数；
    - **数独竞速 PK (`sudoku`)**：
      - 后端 `sudoku/speed.go` 的 `SpeedPlayer` 结构体新增 `Board` 字段并在 `action == "progress"` 中接收并广播；
      - 前端玩家填数即时上报，`sudoku.store.ts` 为观战者提供实时数独盘面镜像效果，并自适应隐藏观战端的虚拟键盘。

## [v3.2.88] - 2026-10-28

### 联机对战导播视角各玩家棋盘实时同步与观战身份透传链条修复 (Spectator Real-Time Board Sync & Identity Chain Fix)
- **核心痛点解决 (用户语音指令：“如图这是我观战的这个界面，但是我切换的时候是看不到其他人的棋盘的任何内容。我想问一下是否你后端重启了没有，还是怎么样？他那个可以看得到每个玩家的具体进度，但是就棋盘是看不了的，你看如何解决这个问题”)**：
  - **1. 根治棋盘空白：实现各玩家实时棋盘数据服务端沉淀与广播同步**：
    - **查明根因**：此前在竞速（Speed）PK 模式下，各客户端在本地填格/翻牌后仅向服务端汇报进度百分比（`progress: 22%`），并未将各自的落子/填格状态（`grid` / `cards`）同步至服务端；服务端内存中无各玩家棋盘数据，因此观战者切入或切换导播视角时，只能获取到对手的进度百分比，棋盘显示为全白/未初始化；
    - **解决方案**：
      - **数织引擎 (`nonogram/engine.go`)**：在 `Player` 结构体新增 `Grid [][]int` 字段；`progress` 动作扩展接收 `grid` 并在服务端原子落库更新与全房间广播；
      - **数织前端 (`nonogram.store.ts`)**：玩家在点击或拖动填格时将 `newGrid` 随 `progress` 一同上报；重构 `grid` 响应式信号计算：当处于观战模式或导播对准特定选手时，动态提取 `players[targetPlayerId].grid` 实时渲染该选手的第一人称棋盘，切换选手瞬间切换其填格画面；
      - **羊了个羊引擎 (`tilematch/engine.go` & `tilematch.store.ts`)**：`Player` 结构体新增 `RemovedCards` 与 `SlotCards` 实时同步，导播视角可动态透视选中选手的台面剩余卡牌与 7 格收集槽；
  - **2. 修复跨端/选关/大厅进入时观战身份（`isSpectator`）丢失与三玩家 HUD 异常**：
    - **查明根因**：从 PK 竞技场或跨组件生命周期切入时，`room-lifecycle.ts` 的 `PendingJoinInfo` 未声明 `isSpectator` 字段，且 `consumePendingOrReconnect()` 未透传；各游戏 Store（如 `NonogramStore`、`SudokuStore`、`MinesweeperStore`）在重写 `joinRoom()` 时参数列表截断，丢弃了 `isSpectator` 参数，导致前端误认为当前用户是参赛选手；这触发了 `<app-game-pk-hud>` 把观战者本身算作选手，渲染出 `test (我)` 三人列表且隐藏了导播栏；
    - **解决方案**：
      - 在 `PendingJoinInfo` 与 `roomLifecycle` 补充 `isSpectator` 双向传递；
      - 全量修正所有游戏 Store 的 `override joinRoom()`，完整透传 `(roomId, mode, diff, host, target, password, bountyCoins, isSpectator)` 至基类；
      - 在 `<app-game-pk-hud>` 的 `effectiveDuel` 与 `allPlayersSorted` 中强化过滤：观战模式下严格将当前观战者从参赛选手列表中剔除，100% 呈现对阵双方的 1v1 顶栏对决与点击切换导播圈。
  - **3. 服务端已重新编译并无缝热重启**：
    - Go 后端服务已加载最新带有 `Grid` 与 `RemovedCards` 同步能力的编译版本并守护运行。

## [v3.2.87] - 2026-10-28

### 全平台联机 PK 房间通用“方案 1：导播视角切换”与实时观战系统 (Universal Spectator Director System)
- **核心痛点解决 (用户指令：“方案 1”；前期用户反馈：“1. 进入正在对局的房间直接被踢回并报错 game already started；2. 观战进入前提前播放了房间等待 BGM waiter_pk.mp3；3. 缺乏全局观战者视角与视角切换能力”)**：
  - **1. 后端 WebSocket 房间管理器多路观战原生支持 (`manager.go` & `handler.go`)**：
    - **旁路接入无缝穿透**：连接参数携带 `action=spectate&spectate=true`，客户端初始化标记为 `IsSpectator: true`；彻底解除正在对局（`StateStarting` / `StatePlaying`）的加入阻断（`game already started`），观战者可任意时刻实时切入观赛；
    - **对局席位隔离**：观战者不占用 2 人对局玩家槽位，不计入对战人数，不参与房主顺位继承（`transferHost` 仅在非观战玩家中流转），严禁触发 `Engine.AddPlayer`；
    - **只读操作安全网关**：服务端在 `HandleMessage` 针对观战者严格屏蔽发牌、落子、准备、重开、踢人、更换游戏、密码变更等对局操作，仅开放 Ping 心跳、发送弹幕 Emoji 与和平退出，防作弊与防扰赛；
    - **对局结束与房间生命周期自愈**：所有对战选手离开时，房间自动向所有观战者派发 `room_dismissed` 事件并关闭连接销毁房间，杜绝空挂；
    - **房间快照与大厅广播**：`RoomSnapshot` 及 `UnifiedStatePayload` 新增 `SpectatorCount` 与 `spectators: []string`，大厅卡片实时显示“👁️ 观战中 (X人)”。
  - **2. 前端 BaseGameStore & WebSocket 核心状态层升级**：
    - 在 `BaseGameStore` 抽象类统一抽象 `isSpectator` 响应式只读信号、`focusedPlayerId` 导播焦点选手 ID 信号，以及 `setFocusedPlayer(id)` 切换调度器；
    - **智能导播自动追踪 (Smart Director Auto-Follow)**：内置 Signal Effect 自动侦测对局双方，首次切入时优先对齐第一视角领先玩家或房主；当对局选手名单变更时，智能保活有效焦点，无缝平滑；
    - `joinRoom(roomId, password, isSpectator)` 接口全系扩展，统一支持单机大厅卡片点击【👁️ 观战】、私密房输入密码观战以及 URL 携带直达观战。
  - **3. 全局通用导播悬浮顶栏与视口防误触 (<app-game-layout>)**：
    - **专属导播顶栏 (Universal Spectator Director Bar)**：位于主对战上方，呈现动态绿色雷达脉冲灯、`正在导播: [选手名称]`、选手切换微立体胶囊药丸按钮组（可点击快速切镜头）、实时比分徽章以及【退出观战】极速返回大厅通道；
    - **棋盘交互只读屏蔽**：在 `isSpectatorActive()` 激活时，外层容器自动挂载 `pointer-events-none`，观战者无法在主棋盘上产生误点击或扰动任何卡牌与落子；
    - **杜绝等待室 BGM 误播**：在 `<app-game-layout>` 中将 `isAutoWaitingRoomVisible` 严格约束为 `!isSpectatorActive()`，进入正在进行的房间时彻底跳过等待室挂载，根除提前播放 `waiter_pk.mp3` 的刺耳体验；
    - **中立结算视界**：当游戏结束时，观战端不再显示误导性的“你输了 (You Lose)”，而是呈现“对局结束 - 恭喜 [获胜玩家] 夺冠！”，营造最佳竞技观赏体验。
  - **4. 对决面板全端无缝交互升级 (<app-game-pk-hud>)**：
    - 集成 `isSpectator`、`focusedPlayerId` 与 `(playerSelect)` 双向输出；
    - 针对观战视角智能解析出 `Player 1 vs Player 2`，两位选手的头像均支持鼠标悬停浮动并附带 `👁️ 导播` 高亮指示圈，点击即可直接切换导播第一人称镜头；
    - 全面适配 Nonogram、Tile Match、Gomoku、Minesweeper 等全站 19 款在线 PK 游戏。
  - **5. 国际化与轻量多语言覆盖**：
    - 完整接入 `i18n.service.ts`（中/英双语词条字典），严格使用全局 CSS 变量无缝适配 Light/Dark 双模主题。

## [v3.2.86] - 2026-10-28

### PWA 发现新版本无限循环弹窗根治与羊了个羊（Tile Match 3）顶部导航平台级融合及 PC 棋盘卡牌遮挡修复
- **核心痛点解决 (用户语音指令：“发现新版本，我点击立即更新之后，还是会弹出立即更新，就是那个立即更新的发现新版本一直存在，这是一个问题；还有的话，就是顶部这个导航，最好和其他游戏的顶部导航一样，而且还能够融入到这种顶部的背景颜色当中... 比如像这个羊了个羊，要和前面的那个游戏顶部导航一样，但是也是在游戏内部的，但是的话，那个背景色能够一样更加好啊。就是相当于是切入在这个棋盘上的，这样最好的。不然在PK的时候，你看这个顶部的那个那个返回键啊那个太大了，把那个玩家的PK信息给挤下来了，所以说把那个棋盘都给挡住了，特别是在PC端。移动端的话在平板上还没有这个问题，你看怎么解决一下。”)**：
  - **1. 彻底根治 PWA “发现新版本”无限循环弹出死循环**：
    - **查明根因**：在 `PwaUpdateService.onWorkerWaiting(worker)` 中，只要检测到存在处于 `waiting` 状态的 Service Worker（无论是多 Tab 打开、构建更新或后台预加载），代码原先均无条件调用了 `this.hasUpdate.set(true)`；在随后获取 `/version.json` 时，哪怕远程版本与当前本地运行版本 `environment.version`（如 `v2026.10.28.1041`）完全一致，提示窗依然会强行展示；当用户点击“立即更新”后执行页面重载（`window.location.reload()`），因本地 Service Worker 尚未注销或重新注册，再次无条件触发 `onWorkerWaiting`，造成玩家每次更新后依然死循环弹窗；且用户点击关闭按钮 `dismiss()` 时未记录已忽略版本，导致页面路由跳转或 90 秒心跳后再次重复弹出；
    - **解决方案**：
      - **版本一致性强校验**：重构 `onWorkerWaiting` 与 `checkForUpdate`，仅当远程获取的版本号非空且**严格不等于当前运行的环境版本**（`remoteVer && remoteVer !== environment.version`）时，才进一步判断是否提示用户；
      - **同版本静默接管**：若发现处于 waiting 的 Service Worker 版本与当前本地环境版本一致，自动发送 `SKIP_WAITING` 静默接管，保持 `hasUpdate = false`，绝不打扰用户；
      - **已应用与已忽略会话持久化**：点击“立即更新”`applyUpdate()` 与关闭“稍后”`dismiss()` 时，在 `sessionStorage` 写入 `pwa_dismissed_version` 与 `pwa_applied_version`，确保同一会话生命周期内绝不重复弹窗。
  - **2. 羊了个羊顶部导航风格平台级统一，毛玻璃半透融入大草坪背景**：
    - **查明根因**：原羊了个羊顶部按钮使用了早期硬编码样式的蓝色塑料方块（`.blue-gear-btn`，38x38px 带 3D 蓝色实心底座和厚重阴影），视觉与全平台通用的轻透胶囊微立体风格割裂；
    - **解决方案**：
      - 全新设计引入 `.sheep-nav-btn`：34px 圆角微立体毛玻璃通透材质（`bg-white/60 dark:bg-black/40 backdrop-blur-md`，搭配自然田园草坪深浅色细微边框与高光），完美融入大草坪棋盘背景（“相当于是切入在这个棋盘上的”）；
      - 统一平台级交互图标：返回键采用矢量 SVG 箭头、规则手册采用 📖 规范图标、右侧集成音效实时静音/开启切换与对战快捷重开，与全站 19 款益智游戏风格完美融合。
  - **3. PK 模式超紧凑顶部排布与 PC 桌面端棋盘卡牌遮挡根治**：
    - **查明根因**：此前 PK 模式下，顶部操作栏与 `<app-game-pk-hud>` 对战 HUD 呈双层堆叠，高度超过 110px，将主棋盘区域强行向下推挤；在 PC 桌面端由于整体草坪容器设定了固定高度，导致 `board-stage` 舞台被压缩或越界，最底层的卡牌（Y=5.0 的胡萝卜和铃铛）直接插入并被下方的卡通小木栅栏收集槽（`.wood-fence-tray`）严重遮挡一半；
    - **解决方案**：
      - **PK 顶栏极致紧凑重构**：将退出、规则、田园微立体房号胶囊与音效/重开按键精简收拢为 28px 高度的极简栏，紧密无缝衔接 `<app-game-pk-hud>`，将 PK 模式顶部总占用高度大幅压缩至 70px 以内，节省出 40px+ 的垂直舞台空间；
      - **PC 桌面端卡牌阵列与棋盘舞台几何调优**：优化桌面端卡牌步长（`stepY: 66, baseH: 76, originY: 8`）与舞台尺寸（`w-[420px] h-[450px]`，草坪高度微调至 `min-h-[680px] h-[760px] max-h-[95vh]`），使得最底层卡牌底部距离小木栅栏上方始终保留 30px+ 的自然呼吸草坪间隙，**彻底杜绝任何重叠遮挡**，全端（PC、平板、手机）均获得极其舒展协调的沉浸式竞技体验。
  - **4. 羊了个羊（Tile Match 3）大厅展示 SVG 图标 1:1 游戏棋盘风格重塑**：
    - **查明根因**：原先大厅展示图标采用了暗色调的橄榄绿草地与违和的卡通插画（吉祥物羊、气泡字、杂乱花瓣），与游戏内实际明媚清新、纯净淡雅的嫩绿草坪棋盘风格脱节；
    - **解决方案**：
      - **1:1 纯正清新田园色系**：采用与游戏棋盘完全一致的明媚草坪纯净渐变（`#c5f583` ~ `#a4e75a`）与真实点缀手绘小草苗（`#4d8525`）；
      - **经典白玉麻将牌与真实农场图腾**：严谨还原游戏内的 3D 墨绿厚边（`#3a7122`）象牙白牌身，绘制游戏核心的 5 大农场图案（🥕 胡萝卜、🔔 铃铛、🧤 蓝手套、🌿 绿叶、🐑 绵羊），并在底层精准呈现半透明遮挡暗影（Blocked Overlay），直观传达核心叠层玩法；
      - **标志性 7 格木栅栏卡槽与 3 连消除心流刻画**：细致还原圆头木桩与实木横梁，槽内已整齐摆放 2 张胡萝卜牌，第 3 格带有金光跳跃引导虚线，与上方正在选取的焦点胡萝卜金光呼应，生动定格“只差一张即刻三消”的经典时刻；
      - **底部 3 大经典天蓝道具按键**：精准绘制 📤 移出、↩️ 撤销、🔀 洗牌带 `+` 标的微立体天蓝按键；同时大厅图标缓存版本升级至 `?v=7`，确保跨设备即时生效。

## [v3.2.85] - 2026-10-28

### 羊了个羊（Tile Match 3）PK 模式卡牌图案农场题库对齐与 PK 专属微立体顶部导航/退出通道补全
- **核心痛点解决 (用户语音指令：“如图怎么PK的时候怎么变成那个问号了？是怎么回事？还有一个问题就是说，这个羊了个羊你在PK的时候就没有地方可以退出啊，没有这些，比如说以前的棋盘的顶部导航你都给省略了，你这个也要解决一下。”)**：
  - **1. 修复 PK 模式大量卡牌显示问号 `?` 问题（前后端题库字典 100% 严格对齐）**：
    - 查明根因：后端 `generator.go` 在生成卡牌时，`TileTypes` 数组原配置为水果系列（`banana`, `cherry`, `grape`, `lemon`, `orange`, `strawberry` 等），而前端原版羊了个羊 `TILE_EMOJIS` 字典为经典农场草地题材（`carrot`, `grass`, `glove`, `bell`, `wool`, `wood`, `cabbage`, `fire`, `bucket`, `scissors`, `milk`, `brush`, `sheep`, `corn`, `apple`, `mushroom`）；当卡牌图案不在前端字典中时，前端模板安全回退为红问号 `'❓'`，导致除匹配上的少量苹果外其余全部显示为问号；
    - 解决方案：将后端 `backend/internal/engine/tilematch/generator.go` 中的 `TileTypes` 完全对齐为前端标准的 16 种经典农场图案，所有卡牌即时完美渲染为生动立体的专属农场表情与图案；
  - **2. 补齐 PK 模式顶部微立体导航栏与退出房间/返回大厅通道**：
    - 查明根因：此前模板在非单人模式（`store.currentRoomMode() !== GameMode.Single`）下仅渲染了对战比分条 `<app-game-pk-hud>`，将原先单机模式的顶部导航条完全替换，导致缺少返回/退出按钮、规则手册按钮与房号信息，玩家在 PK 对决中无法主动退出房间；
    - 解决方案：在 PK 模式下补全精致紧凑的微立体田园对战顶部导航：
      - **左侧操作区**：提供【⬅ 返回大厅 / 退出房间】按钮（严格调用通用 `goBack()`，房主弹出解散确认弹窗，访客安全离开房间并返回大厅）与【⚙️ 规则手册】弹窗按钮；
      - **中间居中区**：白玉田园微立体胶囊展示当前对局房间号（`⚔️ 房号: #xxxx`）与实时赛制（`BO1 / BO3`）；
      - **右侧操作区**：终局时提供快捷【🔄 再来一局】对战重开按钮；
      - **下方紧凑联动**：内嵌双方选手头像、消除百分比进度条与实时大比分 HUD，全流程兼顾竞技感与操控自由度。

## [v3.2.84] - 2026-10-28

### 羊了个羊（Tile Match 3）PK 模式服务端权威牌局下发、对手进度实时同步与终局胜负结算全流程修复
- **核心痛点解决 (用户语音指令：“目前是可以开房了，而且倒计时都正常了。但是进入这个棋盘的时候，这个顺序不一样，比如说随机的每一个图形摆放位置不一样。类似就是图形的摆放位置不一样，你看这是怎么回事？还有另外一个就是说，这个进度有了，但是另外一边都没有进度体现。而且在一个赢完玩完之后，没有提示什么以胜利的东西，就是100%定在那里就没有用。等于说整个一个PK的过程的那些即时感、体验感，还有后面结算都没有。你看下这是什么问题？”)**：
  - **1. 彻底解决双人棋盘卡牌摆放顺序/图形不一致（后端单点权威牌局生成下发）**：
    - 查明根因：原先联机 PK 依然由客户端浏览器各自运行 PRNG 本地生成卡牌，因设备语言环境、时间差及浮点微小差异，极易导致双端生成的卡牌阵型和图案产生微差；同时违反项目核心开发准则第 5 条（“PK模式必须强制放在后端计算”）；
    - 解决方案：在 Go 后端引擎 `backend/internal/engine/tilematch/generator.go` 中完整实现几何拓扑阵型与 100% 可解卡牌生成算法 `GenerateCards`；在房主点击开始或再来一局时，后端统一下发整套权威卡牌数组 `Cards` 至 `state.cards`；前端 `LocalTilematchEngine` 提供 `loadCards` 直接同步挂载，**双端玩家对局牌面达到 100% 绝对一致、图案与层叠顺序毫无分毫差异**；
  - **2. 修复对手消除进度在 HUD 上未体现的问题（修复 C2S Action 派发契约）**：
    - 查明根因：前端在消除卡牌同步进度时，发送的 WebSocket 载荷字段为 `{ type: C2SAction.Move }` 漏掉了 `{ action: 'move' }`，导致后端 `manager.go` 无法提取 action 路由，引擎忽略了对战动作；且前端组件 `opponentsPkStats()` 存在 `p.progress` 降级兜底缺失；
    - 解决方案：修复前端 `syncPkProgress` 严格携带 `{ action: 'move', type: C2SAction.Move, delta, progress, finished }`；同时在 `opponentsPkStats()` 中完善双重提取逻辑 `p.progress ?? playersMap[p.id]?.progress ?? 0`，对局中双方卡牌消除时 HUD 对手进度条即时顺畅变动；
  - **3. 修复 100% 通关无结算提示与定格卡死问题（终局胜负裁定与结算弹窗全打通）**：
    - 查明根因：因 move 动作未被后端引擎接收，玩家达到 100% 时后端未能判定 `p.Finished = true` 与切换 `engine.StateFinished`；同时前端组件在非单人模式终局时未挂钩胜负音效与动效，且 `tilematch.store.ts` 的 `isVictory` 仅检查本地单机状态未同步后端胜者数组；
    - 解决方案：后端在收到 `Progress >= 100` 或 `Finished: true` 时立即完成胜者裁决并置状态为 `Finished`；前端 `isVictory` 统一结合 `winners` 判断；并在 PK 终局时触发彩带礼花喷射、成功触觉震动及调起 `<app-game-result-modal>` 胜利/惜败大比分与“再来一局”对战面板，大幅提升 PK 对决即时感与沉浸感。

## [v3.2.83] - 2026-10-28

### 羊了个羊（Tile Match 3）联机 PK 等候大厅恢复、跨端完全同构棋盘与对战卡槽防误清重构
- **核心痛点解决 (用户语音指令：“羊了个羊在PK的时候是有问题的：第一个情况就是说，新建房间的时候，没有等候大厅，所以这是一个问题；然后进入游戏的时候，他们的棋盘里面的内容不一样，这也是一个问题；还有的话就是在PK的时候也出现问题，等于说是那个槽，每次都是消的，这也是一个问题，你看下这些问题都是什么引起的？而且呢，你看其它游戏都没有这个问题，其它游戏PK的时候都是同一个棋盘，不会说是不同的那个棋盘的数字。”)**：
  - **1. 修复新建房间缺失等候大厅问题**：
    - 查明根因：此前模板上显式配置了 `[autoManageOverlays]="false"`，导致 `game-layout` 拦截了非单人等待室 `<app-game-waiting-room>` 的自动挂载；
    - 解决方案：移除该硬屏蔽属性，并在 `game-definitions.ts` 中将单机终局流转配置为 `{ winAction: 'auto_next', loseAction: 'board_overlay' }`；使得单机模式下通关与失败依然保持极致轻量、免弹窗打扰的心流体验，而联机 PK 模式则 100% 正常调起等候大厅（支持查看房号、就绪准备、房主启动与邀请）以及统一 3 秒对战倒计时；
  - **2. 彻底解决双人 PK 棋盘内容不一致问题（100% 跨端跨设备同构一致）**：
    - 查明根因：后端原先下发的纳秒时间戳（`UnixNano`）超过了 JavaScript 的 `Number.MAX_SAFE_INTEGER` 精度上限，且 `shuffleArray` 使用浮点数做 LCG 种子取模，导致 WebKit（iPad/iPhone Safari）与 V8（Chrome/PC）出现浮点微差，产生歧义派生；
    - 解决方案：
      - 后端 `tilematch/engine.go` 引入安全 32 位整型种子（`10000~99999`）与全局对齐时间戳 `GlobalStartAt`，并在 `GetState()` 中全网同步广播；
      - 前端 `LocalTilematchEngine` 的 PRNG 生成器与 `shuffleArray` 洗牌算法全部重构为严密受控的单流水纯整数 LCG，且在图案选取排序时加入稳定的 `localeCompare` 兜底，**保证任何设备、任何浏览器在相同 Seed 下派生出的卡牌种类、几何网格位置与层级叠放 100% 严格一致**；
  - **3. 修复 PK 对战时卡槽卡牌意外被清空的严重 bug**：
    - 查明根因：由于此前在 `onResetLocalGameState` 中将 `currentSeed` 赋为 `null`，导致对局中每次触发进度同步和接收到 `rawState` 广播时，`TilematchStore` 误判定为新回合，从而重新执行 `new LocalTilematchEngine()`，使玩家卡槽内已有的卡牌被意外重置抹除；
    - 解决方案：在 `TilematchStore` 中重构种子状态生命周期，严密约束仅在房间退回 `Waiting` 阶段才允许释放旧种子，在 `Starting` / `Playing` 期间严格锁定本局引擎实例与卡槽数据，卡牌入槽后只有达成 3 连消才会正常消除，彻底终结“卡槽牌每次都意外消失”的致命缺陷。

## [v3.2.82] - 2026-10-27

### 羊了个羊（Tile Match 3）全端多设备视觉比例深度重构与 6 列殿堂级大牌排布
- **核心痛点解决 (用户语音指令：“如图一，你看我的这个在平板下看到的那个那个卡片，就是一堆堆在中间。但是其他人做的是图二，看起来卡片很大，整体看起来非常协调。你看你要怎么做才能够像别人一样那么看起来舒服，而且专业……特别就是卡片的布局，在不同设备大小应该怎么匹配，而才不会显得小气。”)**：
  - **1:1 复刻原版 6 列全景神殿拓扑（告别 4 列局促小块与中间打堆）**：
    - 将底层网格坐标彻底升级为标准的 6 列宽域（`x: 0.0 ~ 5.0`，`y: 0.18 ~ 5.4`），完全打破以往仅 4 列（`1.2~4.8`）的窄小限制；
    - **顶部百叶窗滑轨副牌堆**：左右各 8 张卡牌水平阶梯延展（`x: 0.0..1.26` 与 `x: 5.0..3.74`），中间留出关卡指示胶囊，与原版经典界面 1:1 严丝合缝；
    - **6 列主殿堂 + 错位半步叠层 + 双子塔脊**：Layer 0（底座 28 张）贯通 6 列铺展；Layer 1（错位 23 张）按半步（`dx=0.5, dy=0.45`）压盖下层 4 张卡牌；Layer 2（脊峰 15 张）与 Layer 3/4（王冠顶珠）形成气势磅礴的 3D 立体纵深；
    - **单套阵型候选槽位全面扩增至 105~114 个**：彻底解决中后期（60 张、96 张）候选槽位不足导致的自适应微移重叠挤堆问题，每一张牌均有自然舒展的专属坐标；
  - **归一化 AABB 遮挡算法精度重构 (`OVERLAP_DELTA = 0.88`)**：
    - 将以往生硬的 1.8 粗暴遮挡阈值精细化重构为 0.88：相邻列（`dx = 1.0`）平整并列互不遮挡，半步错位（`dx = 0.5`）精准判定压盖 4 张底牌，滑梯副牌（`dx = 0.18`）逐张顺序开启，手感与规则自洽一致；
  - **全端视口容器与卡牌尺寸自适应科学匹配（彻底告别“小气与空旷荒野感”）**：
    - **桌面/平板端街机式黄金比例卡座 (`max-w-[460px] md:max-w-[480px] lg:max-w-[500px]`)**：终结此前平板和桌面将草坪拉伸至 896px (`max-w-4xl`) 导致的“海量空绿地环绕中间一小坨卡牌”的不协调感，将主容器锁定为典雅的街机微立体卡座；
    - **大牌面高清晰视觉呈现**：平板/桌面端卡牌尺寸放大至 `66px x 82px`（步长 64x72px，图标 36px），移动端卡牌尺寸校准为 `54px x 68px`（步长 54x62px，图标 28px），整盘卡牌横向占据舞台宽度的 92%~94%；
    - **棋盘、木栅栏与三道具栏等宽垂直贯通对齐**：卡牌总宽度（402px）、木栅栏卡槽（420px）与 3 个天蓝色道具大方块（420px）三点一线，上下左右留白紧凑舒展（12~16px 安全视距），视觉整体感与质感媲美甚至超越原生小程序！
  - **测试与文档全量达标**：
    - 前端 24 项单元测试 100% 跑通，`npm run build` 生产级打包成功。

## [v3.2.81] - 2026-10-27

### 羊了个羊（Tile Match 3）无尽爬塔进阶与 100% 保证有解生成体系
- **核心痛点解决 (用户语音指令：“玩了一下羊了个羊，第一关第二关第三关表达上有问题，会误导人；如果一直玩简单也是一直这样，棋盘棋子位置都不变，吸引力非常小……从18张开始每局增加，到达60张变成中级，到达96张变成地狱，并且一定要保证有解，换电脑也能记住进度……” )**：
  - **无尽爬塔阶梯递增机制（Endless Progression System，+3 张三消严格闭环）**：
    - 彻底破除“第 1 关/第 2 关/第 3 关”的伪关卡误导心智，建立真正的**自洽进阶阶梯体系**；
    - 从第 1 关（18 张牌，4 种图案）起步，每通关一局**严格递增 1 组三消（+3 张牌）**，保持消除游戏三张合一的数学物理守恒；
    - 动态梯度晋级：18~57 张对应【🌱 简单 · 休闲解压】，突破 60 张（第 15 关）触发神殿特效晋升【🐑 中等 · 经典神殿】，突破 96 张（第 27 关）晋升【🔥 困难 · 地狱大师】；
  - **4 大几何多形态拓扑阵型库与程序化动态生成（彻底终结“盘面一成不变”的枯燥感）**：
    - 告别以往写死静态单一坐标的僵化设计，全新构建 4 大经典阵型程序化模板生成器：
      1. **【神殿双翼 (Wings Temple)】**：左右密集滑梯副牌堆 + 中央错位大殿 + 四角独立迎客基石；
      2. **【层叠金字塔 (Stepped Pyramid)】**：大面积宽底座向中心层层聚拢梯田构型 + 四极迎客牌；
      3. **【四叶环岛 (Four Islands)】**：四角独立卫星辅堆簇拥中央繁华大岛；
      4. **【风车交错 (Rotating Cross)】**：十字纵横旋转枢纽核心叠层构型；
    - 引入 50% 概率水平镜像翻转（Flip-X）与 ±0.12 网格自然手绘微抖动（Jitter），每次重新开始都换一副绝不雷同的鲜活新盘面；
  - **100% 保证必定有解算法（Guaranteed Solvable Forward/Reverse Simulation Assignment）**：
    - 彻底摒弃纯随机分配导致的“恶心死局与无解废盘”；
    - 基于图论依赖拓扑（DAG），在卡槽严格裕度（<= 5格，留出充足容错空间）下进行正向通关模拟消除，将消除序列赋予卡牌；
    - **数学上 100% 确保每一局牌面绝对存在一条完全无需任何道具即可通关的最优路径**，给予玩家最健康、最爽快的挑战自驱力；
  - **PC 桌面端布局纵横比深度校准（彻底解决顶部切角与底部虚空问题）**：
    - **彻底终结顶部卡牌被 Header 遮挡切断**：将副牌堆与顶部卡牌的 Y 轴拓扑起点自 `0.15~0.2` 下移至安全舒适的 `0.8`；在 PC 端科学校准纵向步长与卡牌尺寸（宽 68px、高 82px、步长 60px），将全盘卡牌净高度严格收敛在 346px 内，确保棋盘舞台顶部拥有 50px+ 绝对安全视距，彻底消除卡牌被顶栏遮盖的严重缺陷；
    - **消灭底部过大虚空**：将 PC 端草坪容器高度优化为黄金比例 `h-[660px]`（适配 Header 60px + 棋盘 460px + 木栅栏 75px + 道具栏 65px），去除生硬的 620px 溢出舞台，实现上下四方严丝合缝、留白均匀典雅的视觉美感；
  - **白玉关卡胶囊与进度持久化升级**：
    - 顶部田园白玉微立体胶囊全面升级为：`🌱/🐑/🔥 第 N 关 · X 张牌`，并动态点亮 `🔥xN 连胜徽章`；
    - 下拉关卡选择器升级为全能进度看板，展示玩家的「🏆 历史最高纪录：第 N 关」，并提供快速直达（简单 18 张 / 中等 60 张 / 困难 96 张）与从第 1 关重开选项；
    - 本地与多端进度持久化（`xgame_tilematch_progress`），刷新页面或换端登录自动无缝继承挑战进度；
  - **多语言与规范严格遵照**：
    - 所有新增文本抽离至 `i18n.service.ts`（`tilematch.level_n`、`tilematch.tiles_count`、`tilematch.win_streak`、`tilematch.highest_record`、`tilematch.mode_easy/medium/hard` 等）；
    - 全套 24 项前端单元测试 100% 跑通。

## [v3.2.80] - 2026-10-27

### 全生命周期可配置终局流转系统（单游戏独立控制 + 全局继承插屏频控 + 母版级心流调度）
- **核心痛点解决 (用户语音指令：“每个游戏都可以控制游戏结束之后所做的事，是否出现结算单，是出现结算界面还是继续下一局；如果是自动下一关，是否弹出广告，用全局的还是每个游戏自己的……”)**：
  - **前后端统一数据模型支持 (`GameFinishFlowConfig`)**：
    - `backend/internal/domain/game_config.go` 与 `frontend/src/app/core/services/game-registry.service.ts` 扩展 `finishFlow` 配置模型；
    - 支持 `winAction`（`'modal'` 弹窗结算 / `'auto_next'` 极速自动下一关）；
    - 支持 `loseAction`（`'modal'` 弹窗结算 / `'board_overlay'` 盘面就地失败提示 / `'auto_restart'` 自动重开）；
    - 支持 `autoNextAdFreq`（`-1` 继承全局策略 / `0` 完全免插屏 / `>0` 指定连续通关局数后插播一次插屏）；
    - 支持 `autoNextDelayMs`（通关后倒计时，默认 1500ms 黄金心流间歇）。
  - **层级继承与广告频控策略 (`AdService` & `SettingsService`)**：
    - 全局新增 `ad_auto_next_frequency` 基础频控（默认 3 次通关触发一次插屏），可在后台广告管理中实时动态调整；
    - `AdService.tryShowAutoNextInterstitial(gameId, callback, customFrequency)` 实现级联优先级：游戏独立配置优先级高于全局配置；独立配置设为 0 时提供绝对免打扰纯净体验；
  - **母版极速心流调度器 (`GameLayoutComponent`)**：
    - 废除单游戏侵入式代码，在公用母版容器层统一调度；
    - 单机通关且配置为 `auto_next` 时，免除阻断性全屏黑色弹窗，自动浮现轻量通关胶囊（含“即将自动进入下一局...”与【⚡ 立即进入下一局】按钮）；
    - 倒计时归零或用户主动点击立即下一局时，自动完成广告频控校验，无缝切入下一局；
    - 失败配置为 `board_overlay`（如方块消除 Block 与六边形消除 Hexa）时，不弹全屏弹窗，就地在盘面展示 Game Over 并允许快速清盘重开。
  - **全平台架构彻底统一与契约标准化（消灭历史遗留代码，践行封装性与通用性准则）**：
    - **平台级终局契约规范化 (`GameStoreInterface` & `BaseGameStore`)**：在统一接口与基类中强制确立 `isVictory` 与 `isDefeat` 标准 Signal 契约。解谜通关游戏通关天然代表胜利，得分类死局游戏天然代表失败；子类可按需自定义，基类提供强大开箱即用推导；
    - **母版闭环延迟调度器 (`GameLayoutComponent`)**：母版自建 `isInternalModalReady` 黄金展示延时生命周期。无论哪个游戏进入 `Finished` 状态，母版 100% 自动托管计时、自动识别胜负、自动控制浮现，子游戏无需在自身组件内重复编写任何定时器；
    - **全站 15 款游戏遗留脏代码彻底消灭**：全面清理数织、数独、扫雷、推箱子、俄罗斯方块、24点、一笔画、下落2048、方块消除、六边形消除、密码破译等全部游戏中的私有 `showOverlay` 信号和 `setTimeout` 重复代码，实现真正的“零侵入、高内聚、通用标准统一”。
  - **管理后台体验革命：全景行内即改即生效看板 (`AdminGamesComponent`)**：
    - **彻底废除弹窗模式**：告别以往需挨个点击 19 次 “⚙️ Settings” 弹窗才能查看与修改配置的繁琐旧体验，全面升级为**全景数据表格看板 (Panoramic Inline Configuration Dashboard)**；
    - **一目了然掌控全盘**：19 款游戏的心流通关动作（极速下一关/弹窗）、失败动作、插屏频次、延时、多局制 PK 与上架状态全部整齐平铺展示，一眼即知哪些游戏配了自动下一关、哪些配了免插屏、哪些尚未配置；
    - **直接修改，直接生效 (Inline Auto-Save)**：所有下拉菜单、开关、数字框均支持行内就地修改；选择即存、失焦即存，配以轻量翠绿 `✓ 已生效` 呼吸徽章与 Toast 即时反馈，无需来回切换确认；
    - **全局指标与筛选搜索**：顶部集成总数、自动下一关、弹窗、免插屏统计卡片，支持按游戏名/ID 实时模糊搜索及标签快速过滤；
    - **移动端全景卡片自适应**：手机端自动折叠为全功能直调卡片，同样无需弹窗。
  - **羊了个羊 (Tilematch) 专属棋盘级 SVG 视觉资产升级 (`public/assets/games/icons/tilematch.svg`)**：
    - **1:1 还原经典真实棋盘**：依据游戏真实运行界面，手绘打造包含金字塔多层立体白玉卡牌（底层遮蔽暗影、中间交叠层、顶层高亮可点选牌）、鲜美胡萝卜/白菜/呆萌小羊经典图腾的棋盘模型；
    - **标志性 7 格木栅栏托盘**：底部精致雕琢木纹立柱、上下横梁与 7 个独立卡槽，并生动呈现已收集 2 张胡萝卜、第 3 格虚线引导消除的心流瞬间；
    - **首页与全站展示无缝对齐**：大厅卡片、房间等待室与实时动态浮窗全面统一使用专属矢量 SVG，彻底替代临时占位符号。
  - **管理后台 (Admin) 刷新退登问题彻底根治（双重持久化 + SSR 守卫豁免 + 根路由直通）**：
    - **核心痛点解决 (用户反馈：“进入后台刷新一次马上又重新让我登录，token 应该自动保存在本地，下次不用登录除非手动退出”)**；
    - **SSR 守卫误杀拦截彻底修复 (`admin.guard.ts`)**：增加 `isPlatformBrowser(platformId)` 检测。在 SSR 服务端渲染阶段，由于无 localStorage 访问权，放行至客户端进行真实校验，彻底终结了“服务端在没有 localStorage 时误判未登录而将页面重定向到 `/zh/login`”的致命缺陷；
    - **本地凭据强制同步 (`AuthStore.ensureLoaded`)**：守卫执行前首先调用 `ensureLoaded()`，从本地存储立即同步凭据，确保守卫执行瞬间 `token` 与 `currentUser` 绝对就绪；
    - **LocalStorage + Cookie 双重持久化 (`browser.util.ts` & `auth.store.ts`)**：登录时同时将 token 和 user 写入 `localStorage` 与 `document.cookie`（30天有效期），读取时支持 Cookie Fallback 兜底，即便在无痕模式或特殊隔离策略下依然高可用；登出时同步清除；
    - **服务端路由纯客户端渲染 (`app.routes.server.ts`)**：将 `admin/**` 与 `:lang/admin/**` 明确标注为 `RenderMode.Client`，避免管理后台在 SSR 服务端被错误预渲染；
    - **根级 `/admin/**` 路由原生直通 (`app.routes.ts`)**：在根路由级别直接注册 `adminRoute`，彻底解决侧边栏链接 `/admin/games` 刷新时因缺少 `:lang` 前缀坠入通配符重定向大厅的历史隐患。
  - **羊了个羊 (Tilematch) 槽位闪闪发光星星与多巴胺三消视觉升级（用户专属定制）**：
    - **槽位闪烁星星群 (Twinkling Star Sparkles)**：响应用户语音需求（“出现三个能够消除的时候，在那个槽里面每一个消除的槽搞一些闪闪的星星”），在发生三消的 3 个木槽位内实时激发多层动态五角星（✨ ⭐ 🌟 💫）与星辉火花粒子，错落升腾、360° 旋转闪烁，搭配槽底金色微光柱 (`slot-glow-pillar`) 与圆形冲击波光环 (`slot-star-burst-ring`)；
    - **卡槽金色流光脉冲 (`slot-cell-clearing`)**：触发消除的卡槽外框亮起耀眼金黄渐变高光与呼吸光晕，消除位置一目了然；
    - **三卡牌吸附合体消散 (`tile-clearing`)**：凑齐 3 个时卡牌不再生硬瞬间消失，左右两侧卡牌向中心槽位倾斜靠拢聚变（`tileMergeFromLeft` / `tileMergeFromRight`），中心卡牌弹跳放大后化作星芒隐去；
    - **多巴胺浮空连击大字与视听触共鸣**：升级全屏 Combo 勋章（`✨ 完美 3 消!`、`⚡ DOUBLE MATCH! x2`、`🌟 TRIPLE COMBO! x3`、`👑 SUPER MATCH! x4+`），配合高品质大三和弦升调琶音与成功触感震动，极大增强游戏爽感与多巴胺分泌。
  - **多语言与规范遵照**：
    - 补充 `game.auto_next_title`、`game.auto_next_btn`、`game.auto_restart_btn` 国际化文案，覆盖全球 8 种语言；
    - 严格遵循全局 CSS 变量、Tailwind 响应式规范以及松耦合架构。
- **质量保障**：
  - 前端类型校验 `npx tsc --noEmit` 0 错误；
  - 前端单元测试 7 个套件 23 项测试 100% 通过；
  - 后端构建与单元测试 `go test ./...` 100% 成功。

## [v3.2.79] - 2026-10-27

### 方块消除 (Block) 与六边形消除 (Hexa) 终局重开提示与棋盘清空机制修复（就地死局覆层 + 水合自愈 + 全局重开打通）
- **核心痛点解决 (针对用户反馈“方块消除和六边形消除失败后不提示重新开始、棋盘未清空”问题)**：
  - **Angular SSR 水合断裂根因解决 (NG0500 Error Fix)**：
    - 排查发现 Angular 21 Zoneless 与 SSR 客户端水合在 `<app-game-layout>` 动态棋盘插槽处出现节点错位（`NG0500: During hydration Angular expected a comment node but found <div>`），导致底层控制流（`@if (isAutoResultVisible())`）失效、弹窗无法挂载；
    - 在 `GameLayoutComponent` 装饰器中补充 `host: { 'ngSkipHydration': 'true' }`，跳过棋盘动态组件的水合冲突，彻底修复全局 19 款游戏的终局弹窗挂载能力。
  - **双保险终局重开机制 (Double-Layered Game Over & Restart System)**：
    - **第 1 层：盘面就地 Game Over 覆层 (In-Board Overlay)**：
      - 在 `block` 与 `hexa` 棋盘区域中央增加半透明毛玻璃覆层，一旦死局（无可用空间）立即浮现：显示 😵 状态图标、多语言“游戏结束”与“无可用放置空间”提示、最终得分与历史最佳胶囊、以及醒目的【🔄 重新开始 (Space / R)】按钮；
      - 点击按钮、点击覆层或按下快捷键（`Space`/`Enter`/`R`）均可一键触发新局；
    - **第 2 层：全屏结算浮层时序打通**：
      - 在 `block.component.html`、`hexa.component.html`、`drop2048`、`tetris`、`watersort`、`sudoku`、`math24`、`nonogram`、`sokoban`、`codebreaker` 的 `<app-game-layout>` 模板中补齐 `[showOverlay]="showOverlay()"` 信号绑定，确保 1.5 秒后全屏 `GameResultOverlay` 顺畅浮现。
  - **引擎级棋盘清空与重置保证 (Engine Clean Reset Guarantee)**：
    - `BlockStore.startLocalGame()` / `onSinglePlayerRestart()`：强制重置消除激光与连击触发器，`BlockEngine.initGame()` 将网格全量置零清空、重新派发 3 个手牌、重置得分为 0、清除 `isDead`，并清空本地已死局存档；
    - `HexaStore.startSinglePlayer()` / `onSinglePlayerRestart()`：强制清理消除定时器与高亮 Map，`HexaEngine.initGame()` 将全部 61 个蜂窝单元格全部重置为空（`filled: false`）、重新随机发牌、重置得分为 0、清除 `gameOver`。
  - **多语言与规范遵照**：
    - 新增 `game.no_moves_left` 国际化文案，并在全球 8 种语言（中、英、西、日、韩、葡、法、德）完整定义；
    - 严守全局 CSS 变量与 Tailwind 响应式规范，无任何硬编码颜色或文本。
- **质量保障**：
    - `npx tsc --noEmit` 0 错误；
    - `npm run test:unit` 7 个套件 23 项测试全部 100% 通过（新增 `BlockEngine` 与 `HexaEngine` 死局检测与棋盘清空专用单元测试）。

### 单机游戏心流自愈流转范式与绝境复活机制落地（羊了个羊免遮罩自动下一局 + 扫雷避雷护盾复活 + 广告频控接口全挂钩）
- **核心痛点解决 (用户语音指令全面落地实施)**：
  - **商业化与流转编排器 (`AdService`) 深度扩展**：
    - 新增 `tryShowAutoNextInterstitial(gameId, callback)`：维护各单机游戏的连续自动通关计数器，精准对齐后台配置 `ad_auto_next_frequency`（默认 3 次），达到阈值时平滑插播插屏广告并在关闭后自动进入下一局，未达阈值直接平滑推进；
    - 新增 `showReviveRewardedAd(gameId, onRevived, onDeclined)`：标准激励视频广告挂钩，支持扫雷踩雷、羊了个羊卡槽满时观看广告化险为夷，并在后台配置未开启或离线时宽容免广告直接复活；
    - 统一挂载至 `BaseGameComponent`（`this.adService`）与 `GameLayoutComponent`（`onResultRevive`），所有游戏天然具备复活与广告调度能力。
  - **羊了个羊 (TileMatch) 首发标杆**：
    - **通关 (Victory)**：彻底废除此前遮挡全屏的冷冰冰深色大弹窗，改为 0ms 多巴胺粒子礼炮 + 顶部轻量浮动通关胶囊（含耗时/步数）；1.5 秒黄金心流间歇后**自动保留当前所选难度（简单/困难）**，平滑随机生成一盘全新同难度题目；
    - **绝境复活 (Revive)**：卡槽满 7 格时不再弹阻断大黑屏，槽位变红并浮现轻量【⚡ 移出3张复活】（对接 `engine.revive()`，将前 3 张卡槽牌移入暂存区腾出活路）与【重开本局】双选项。
  - **扫雷 (Minesweeper) 避雷护盾复活机制**：
    - 接入原生 `engine.revive()`：踩雷时棋盘上方浮现轻量【⚡ 避雷护盾复活】气泡；
    - 用户点击复活时，踩爆的雷自动插旗锁定，全盘其他因失误翻开的雷毫发无损重回隐藏，玩家辛劳规划的心血盘面直接复活继续挑战！
  - **多语言与规范遵照**：
    - 同步扩充 `zh.json` 与 `en.json`，无任何硬编码文本，全端响应式完美适配。
- **质量保障**：
  - `npx tsc --noEmit` 0 错误；
  - `npm run test:unit` 5 个套件 20 项测试全部 100% 通过。

## [v3.2.77] - 2026-10-27

### 方块消除 (Block Puzzle) 与六边形消除 (Hexa) 棋盘与底端候选碎片紧凑距优化
- **核心痛点解决 (用户语音指令深度优化落地)**：
  - **方块消除 (Block Puzzle)**：
    - 针对用户提出“方块消融底下的三块碎片离棋盘太远了，最好在棋盘下方一小段距离，操作起来方便一些”的关键操作手感痛点；
    - 重构主游戏舞台布局架构：将此前分离的独立 `flex-grow my-auto` 棋盘容器与贴底 Hand Shapes 碎片槽合并为统一的紧凑级弹性容器组；
    - 棋盘与下方 3 块候选碎片槽之间采用舒适的 `gap-2 sm:gap-3`（8px~12px 间距），彻底消除了此前高达 150px~250px 的空旷割裂断层；
    - 动态限制棋盘自适应物理尺寸为 `min(calc(100vw - 16px), calc(100dvh - 200px), 500px)`，在保证整屏免滚动的极致体验下，手牌碎片紧随棋盘其后，用户触屏拖拽入盘的行程大幅缩短，手感丝滑、省力且完全不遮挡视野；
    - 手牌容器高度与碎片尺寸精细微调，内部垂直居中并增添磨砂玻璃底托，提升品质感与触控精准度。
  - **六边形消除 (Hexa Puzzle)**：
    - 同步将 Hexa 蜂窝棋盘与下方 3 块候选积木收拢至紧凑协同容器中，间距严格控制在棋盘正下方一小段距离，全线提升几何拼图消除类游戏的全端操作舒适度。
- **质量保障**：
  - `npx tsc --noEmit` 0 错误；
  - `npm run test:unit` 5 个套件 20 项测试全部 100% 通过。

## [v3.2.76] - 2026-10-27

### PWA 选关大厅导航自愈与全屏无边距对齐数织标杆 (24点、数独、推箱子、数桥、一笔画等)
- **核心痛点解决 (用户语音深度反馈落地)**：
  - **PWA 独立窗口下选关大厅无顶栏导航、无法返回首页致命缺陷彻底根治**：
    - 针对用户提出“24点、数独、推箱子等有关卡的游戏，在选关大厅没有导航，PWA 时返回不了首页”的关键问题；
    - 改造 `math24`、`sudoku`、`sokoban`、`hashi`、`connect`：
      - 在选关大厅与对局中统一启用 `<app-game-handheld-header>`；
      - 智能分层导航：在大厅状态下点击 `[⬅ 返回]`，直达全站首页 `['/', lang, 'lobby']`；在游戏对局中点击 `[⬅ 返回]`，平滑返回选关大厅；
      - 大厅状态下顶梁中央舒展展示 `[🎯 关卡选择]`，保证 PWA 沉浸模式下具备 100% 完整闭环的交互航标；
  - **全屏无边距彻底对齐数织 (Nonogram) 标杆体验**：
    - 针对用户提出“改的时候没有全屏，左右还有距离不是整张卡片，数织卡片左右没有距离整个屏幕就是一张棋盘”的核心痛点；
    - 将所有关卡类游戏的 `[immersive]` 属性升级为手持端无条件开启 `[immersive]="isHandheld()"`，彻底消除此前 `view() !== 'lobby'` 条件导致的非沉浸卡片式回退；
    - 移除选关大厅组件（`math24-lobby`、`sudoku-lobby`、`sokoban-lobby`、`hashi-lobby`、`connect-lobby`）在手持端的内层 `p-1` 外边距与卡片边框阴影，改为 `p-0` 与 `rounded-none border-0`，使整个大厅 100% 满屏贯通贴边；
    - 针对 `math24`、`lightsout` 棋盘在大屏端解除此前 `420px/440px` 过度保守的宽度限制，充分利用 iPad 宽阔屏幕实现舒适扩展。
- **质量保障**：
  - `npx tsc --noEmit` 0 错误；
  - `npm run test:unit` 5 个套件 20 项核心测试 100% 通过。

## [v3.2.75] - 2026-10-27

### 全站 19 款游戏手持顶梁组件化与体验大一统终极达成：全量覆盖第二批与第三批游戏
- **用户指令终极落地：全部剩余游戏顶部菜单与两翼极致靠边改造完毕**：
  - **第二批 5 款游戏 (推箱子、五子棋、一笔画连线、水排序、消消乐)**：
    - **推箱子 (`sokoban`)**：手持端仅在对局中开启 `[immersive]="isHandheld() && !showLobby()"`，接入 `<app-game-handheld-header>`，中央集成 `#关卡号` + `🦶步数` + `😊/😎` 笑脸重开 + `⏱️用时`；单机与 PK HUD 严格解耦；
    - **五子棋 (`gomoku`)**：手持对局接入全宽顶梁，中央内嵌黑白子当前落子方指示、步数统计、💡智能提示与🔄重开，棋盘优雅居中；
    - **一笔画连线 (`connect`)**：对局接入手持顶梁，中央展示关卡号、连线进度（X/Total）、覆盖率百分比、笑脸重开与用时；
    - **水排序 (`watersort`)**：手持端接入全宽顶梁，中央内嵌步数统计与笑脸重开，试管在剩余空间中自适应垂直居中；
    - **消消乐 (`tilematch`)**：彻底剔除手持端田园草坪 Header 的 `max-w-[420px]` 宽度束缚，升级为全宽贯穿，实现 iPad 上左右两翼极致靠边。
  - **第三批 5 款游戏 (24点、点灯逻辑、数桥、密码破译、真·成语接龙)**：
    - **24点 (`math24`)**：手持对局接入全宽顶梁，中央展示当前关卡号（#Level）、🎯目标 24 指示、笑脸一键下一题/重开与⏱️耗时计时，剔除棋盘内重复的 Level 徽章，棋盘主舞台优雅垂直居中；
    - **点灯逻辑 (`lightsout`)**：手持端接入全宽顶梁，中央融合 💡/🌑 模式切换胶囊（待处理灯数）、步数统计、笑脸重启与 ⚡ 进度百分比；彻底解耦单机胶囊与联机 PK HUD，杜绝单机误渲染对手进度；
    - **数桥 (`hashi`)**：手持对局接入全宽顶梁，中央内嵌 #关卡号、笑脸重启与⏱️计时器；手持端自动隐藏旧有重复的单机顶部栏，主 SVG 桥网舞台在剩余可用区域居中；
    - **密码破译 (`codebreaker`)**：手持端接入全宽顶梁，中央展示 🕵️ 猜测次数、表情重开（根据输赢动态变幻为 😎/😵/😃）与 🎯 最佳战绩（`XA`），主操作面板在 iPad 大屏下上下居中平衡；
    - **真·成语接龙 (`idiom`)**：手持端接入全宽顶梁，单机模式中央内嵌 🔥 连龙数、🐉 龙身长度、💡 仙术锦囊提示（带剩余次数）与 🔄 乾坤重置；PK 模式显示神龙争夺比分。
- **全站 19 款游戏 100% 达成手持顶梁标准化标准**：
  - 极左翼：`[⬅ 返回]` + `[📖 规则]` 紧贴最左侧；
  - 极右翼：`[⚔️ PK]` + `[⚙️ 全功能工具箱]` 紧贴最右侧；
  - 中央插槽：各游戏专属指示器与快捷操作，舒展宽敞；
  - 棋盘主舞台：在顶梁下方剩余空间保持 `my-auto justify-center` 垂直居中，大屏观感端庄大气。
- **质量保障**：
  - `npx tsc --noEmit` 0 错误；
  - `npm run test:unit` 全部 5 个测试文件 20 项测试 100% 通过。

## [v3.2.74] - 2026-10-27

### 手持顶梁组件化第一批推进：经典2048、下落2048、方块消除、六边形消除、俄罗斯方块全面接入并实现极致两极靠拢
- **核心用户反馈与视觉优化落地**：
  - **左右两翼极致靠边、中央空间舒展大方 (用户明确语音指示)**：
    - 针对移动/iPad 端顶部顶梁左右图标不够靠边、中间显得窄小的痛点，深度调整 [`frontend/src/app/shared/components/game-handheld-header/game-handheld-header.component.ts`](file:///home/zd/x-game/frontend/src/app/shared/components/game-handheld-header/game-handheld-header.component.ts) 的内边距体系：
      - 外层内边距调整为 `px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-3.5`；
      - 中央插槽容器改为 `flex-1 mx-1 sm:mx-3 min-w-0 flex items-center justify-center`；
      - 实现左侧 `[⬅ 返回]` + `[📖 规则]` 紧密贴靠屏幕最左侧、右侧 `[⚔️ PK]` + `[⚙️ 工具箱]` 紧密贴靠屏幕最右侧，留出最宽敞的核心操作与 HUD 空间；
  - **第一批 5 款游戏手持顶梁接入完毕**：
    - **经典 2048 (`classic2048`)**：在手持/平板开启 `[immersive]="isHandheld()"`，接入 `<app-game-handheld-header>`，中央承载分数（SCORE）、最佳纪录（BEST）与笑脸一键重开；PC 桌面端保持原有大卡片 HUD，全端无缝解耦；
    - **下落 2048 (`drop2048`)**：手持端接入全宽顶梁，中央内嵌当前分、等级（LV）、最佳纪录与笑脸重启，彻底解决 iPad 上单手操作时视线上移过高的问题；
    - **方块消除 (`block`)**：手持端接入全宽顶梁，中央展示当前得分、历史最高分与表情状态，桌面端保留原有单机现代卡片 HUD；
    - **六边形消除 (`hexa`)**：手持端接入全宽顶梁，中央融合得分、表情重开、最高分与 🎨 主题色盘切换按钮；
    - **俄罗斯方块 (`tetris`)**：手持端接入全宽顶梁，中央集成得分（SCORE）、表情重开、消除行数（LINES）、历史最佳（BEST）与 🎨 皮肤切换。
- **针对 iPad 实机反馈的双重关键修复**：
  - **组件满宽与紧贴屏幕最顶端根治**：
    - 为 [`GameHandheldHeaderComponent`](file:///home/zd/x-game/frontend/src/app/shared/components/game-handheld-header/game-handheld-header.component.ts) 添加宿主样式 `host: { class: 'w-full block shrink-0 z-30' }`，解决 Angular 默认 inline 导致的宽度收缩居中问题；
    - 在 [`GameLayoutComponent`](file:///home/zd/x-game/frontend/src/app/shared/components/game-layout/game-layout.component.ts) 中彻底去除手持沉浸态下的 `justify-center` 与 `items-center`，替换为 `justify-start`，确保顶梁绝对紧贴视口最顶端，不再垂直居中悬空；
  - **棋盘区域在顶梁下方剩余可用高度内优雅垂直居中**：
    - 针对经典 2048、六边形消除、俄罗斯方块等棋盘，在顶梁保持最顶端吸顶的同时，将下方的主舞台容器统一配置为 `flex-grow my-auto justify-center`，彻底告别“棋盘贴在天花板上、下方大面积空旷”的单薄感，实现大屏 iPad 端上下对称平衡的极佳观感；
  - **单机模式误渲染联机 PK 玩家条 (`cctv (我) 0%`) 彻底根治**：
    - 修复了 `hexa`、`block`、`classic2048`、`drop2048`、`tetris` 中由于 `@else` 逻辑漏洞导致的单机模式在手持端误把联机 PK 玩家对战条渲染出来的缺陷，严格隔离 `currentRoomMode() !== GameMode.Single` 判定。
- **架构底座高内聚沉淀**：
  - 在 [`frontend/src/app/core/utils/base-game.component.ts`](file:///home/zd/x-game/frontend/src/app/core/utils/base-game.component.ts) 统一注入 `DeviceService`，全站所有派生游戏组件自动具备 `isHandheld()` 响应式信号，无需重复注入；
  - 全流程通过 `npx tsc --noEmit` 静态类型检查与 5 个单测套件 20 项测试 100% 通过。

## [v3.2.73] - 2026-10-27

### 通用封装与平板视效飞跃：全局手持顶梁组件 (`GameHandheldHeaderComponent`) 封装及 iPad 端高度/按钮自适应加大大方美观
- **核心痛点解决 (用户语音与 iPad 实机反馈深度落地)**：
  - **平板端导航条过窄、下方大面积空旷、比例失调痛点根治**：
    - 针对用户提出“上面的导航感觉高度还是太窄了，平板下面还有很多空旷的地方，可以加大一点让它看起来更加大方美观，做成通用封装，其它游戏（数字华容道、扫雷、数织、数独）也是一样”的核心诉求；
    - 针对手持/平板设备进行全端比例重构，顶梁高度从原有单薄的 ~40px 显著升级：
      - 容器高度与内边距：升级为 `min-h-[50px] sm:min-h-[64px] md:min-h-[68px]`，`py-2 sm:py-3 md:py-3.5`，`px-3 sm:px-6 md:px-8`；
      - 左右交互操作按钮：升级为 `w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl`，图标 `h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6`（字号 `text-sm sm:text-lg md:text-xl`），触控更宽大端庄、视觉比例更饱满；
      - 中央游戏个性化 HUD：步数/雷数/计时胶囊同步升级至 `h-7 sm:h-9`（数显字号 `text-sm sm:text-lg`），经典笑脸重启按钮升级至 `w-7 h-7 sm:w-9 sm:h-9`，在 iPad 上与全新加大的顶栏相得益彰；
  - **核心准则第6条严格践行：高通用性组件封装 (`GameHandheldHeaderComponent`)**：
    - 新增独立组件 [`frontend/src/app/shared/components/game-handheld-header/game-handheld-header.component.ts`](file:///home/zd/x-game/frontend/src/app/shared/components/game-handheld-header/game-handheld-header.component.ts)；
    - **极左翼**：统一内置 `[⬅ 返回]` + `[📖 规则]`；
    - **极右翼**：统一内置 `[⚔️ PK]` + `[⚙️ 全功能工具箱]`（脑力金币余额直达、音效开关、触感震动、全屏沉浸、意见与 Bug 反馈 🐞）；
    - **中央插槽 (`<ng-content>`)**：各游戏按需注入专属指示器（难度飞梭轮盘、雷数/步数/计时/笑脸/关卡进度）；
    - **全站 4 款核心益智游戏首批全面接入**：**数字华容道 (Sliding)**、**扫雷 (Minesweeper)**、**数织 (Nonogram)**、**数独 (Sudoku)** 彻底剔除各自组件中数百行重复的内联 HTML 与工具箱 Signal 状态，实现 100% 架构收拢与视觉规范统一步调。

## [v3.2.72] - 2026-10-27

### 体验标准化持续覆盖：数独 (Sudoku) 与数字华容道 (Sliding) 全面升级“全宽贯穿顶梁”与“左右两极锚定”
- **核心优化落地 (对齐数织/扫雷标杆规范)**：
  - **数独 (Sudoku)**：
    - **移动手持端对局顶栏无缝一体化**：在对局视图 (`view() === 'play'`) 接入 `[immersive]="isHandheld() && view() === 'play'"`，隐藏冗余的全局大卡片 Header，由全宽顶梁替代；大厅选关视图 (`view() === 'lobby'`) 保持标准 Header；
    - **极左与极右锚定**：左侧 `[⬅ 返回选关]` + `[📖 规则说明]`，右侧 `[⚔️ 联机PK]` + `[⚙️ 全功能工具箱]`（脑力金币余额直达、音效、震动、全屏沉浸、Bug 反馈）；
    - **中央状态展布**：`[🎯 难度/关卡 ▾]` 原生轮盘 + `⏱️ 耗时计时` + `📝 填入格数 (X/81)` 紧凑而舒展；
    - **平板靠顶端庄吸附**：拔除 `my-auto` / `justify-center`，采用 `justify-start my-0 pt-0.5 sm:pt-1`，告别 iPad 居中下坠问题；
  - **数字华容道 (Sliding)**：
    - **全宽贯穿顶梁取代局促卡片**：彻底移除此前限定在 `boardSizePx()` 内的狭窄头部卡片，升级为 `w-full px-3 sm:px-5 md:px-8 py-1.5` 全宽顶梁；
    - **左右两翼舒适留白**：左侧 `[⬅ 返回大厅]` + `[📖 玩法规则]`，右侧 `[⚔️ 联机PK]` + `[⚙️ 全功能工具箱]`；
    - **中央状态舒展展布**：`[🎯 难度规格 ▾]` (3×3 / 4×4 / 5×5) + `🔄 步数` + `😃/😎 经典笑脸重启` + `⏱️ 耗时`，在平板和桌面端自动横向展开 (`sm:flex-row`)；
    - **全端精准解耦**：PC 桌面端保留外层 Header 与经典独立 HUD，手持端使用内嵌全宽顶梁，绝无双顶栏冲突；外层拔除 `my-auto`，消除垂直下坠。

## [v3.2.71] - 2026-10-26

### 沉浸式与多端工程学标杆扩展：扫雷与数织通顶栏全面进化为“全宽贯穿顶梁 (Full-Width Header)”与“左右两极锚定布局”
- **核心痛点解决 (用户语音与 iPad 真机反馈深度落地)**：
  - **平板/手持端顶部导航太窄、缩在屏幕中间痛点根治**：
    - 针对用户提出“在平板下顶部导航看起来太太太窄了，四个图标应该最左边在最左边，最右边在最右边，做成通用的最宽导航条”的明确诉求；
    - 彻底移除 `max-w-[500px]` 及棋盘内部 `min-w-fit` 的宽度束缚，导航条全面升级为 `w-full px-3 sm:px-5 md:px-8 py-1.5` 贯通屏幕两侧；
  - **左右两极精准锚定（两端舒适留白）**：
    - **极左翼**：`[⬅ 返回大厅]` + `[📖 玩法规则]` 紧贴最左侧黄金操作区，保留 `px-3 ~ md:px-8` 呼吸边距；
    - **极右翼**：`[⚔️ 联机PK]` + `[⚙️ 全功能工具箱]` 紧贴最右侧黄金操作区，保留相应呼吸边距；
    - **中央宽广弹性区**：
      - **扫雷**：`[🎯 难度规格 ▾]` 原生轮盘与 `[💣 剩余雷数] [😃 笑脸] [⏱️ 计时器]` 胶囊在手机端双层紧凑、在 iPad/平板宽屏上自动横向展开 (`sm:flex-row`)，舒展大气，再无局促感；
      - **数织**：将内嵌顶梁从单行提示 `min-w-fit` 内部解封，直接提升至全局顶层，与扫雷保持统一的全宽视觉范式；
  - **PC 桌面与手持端严格解耦，杜绝双顶栏**：
    - `<app-game-layout [immersive]="isHandheld()">`：手持端隐藏通用外层 Header，全宽顶梁无缝替代；PC 桌面端保持外层标准 Header，顶梁自动隐藏，绝不发生冲突；
  - **平板（iPad）靠顶端庄吸附，拔除居中下坠**：
    - 移除原本导致棋盘在 iPad 上掉到屏幕正中间的 `justify-center my-auto`，重构为 `justify-start my-0 pt-0.5 sm:pt-1`，顶梁增加 `sticky top-0 z-30` 始终吸顶；
  - **手机网格尺寸饱满自适应**：
    - 初级 9×9 棋盘自适应屏幕宽度（提升至 38~46px 饱满触控），消减左右过宽留白，点雷插旗畅快精准；
  - **自定义游戏弹窗（Custom Mode Dialog）闭环**：
    - 完整支持自定义宽、高、地雷数弹窗，方便玩家自由挑战高难度雷区。

## [v3.2.70] - 2026-10-26

### 全局质量与交互保障：右下角【🐞 意见与 Bug 反馈】全端常驻与双通道闭环（全站游戏统一标配）
- **核心痛点解决 (用户语音深度落地)**：
  - **右下角 🐞 反馈图标全场景常驻**：
    - 针对用户提出“右下角必须搞一个 bug 虫子图标，其它游戏也要搞”的关键诉求，彻底移除此前在 ZenMode / 全屏模式下的错误隐藏判定；
    - `<app-game-layout>` 提升反馈按钮至最高图层 `z-50`，搭配 `bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]` 与毛玻璃微立体圆钮，无论在移动端竖屏、iPad 还是桌面端均稳定悬浮于右下角安全区，绝不遮挡游戏核心棋盘；
  - **工具箱内嵌【双通道】触达**：
    - 除了右下角悬浮圆点外，在游戏顶部内嵌【⚙️ 设置】菜单中同步新增【🐞 意见建议与 Bug 反馈】直达入口，双通道无缝呼出 `FeedbackModal`；
  - **数织标杆验收完毕，扫雷 (Minesweeper) 等全站游戏一体化蓄势待发**：
    - 数织的“棋盘一体化集成顶梁”、“左二·中一·右二”布局、真实行提示加宽以及单调递增尺寸算法全部验收通过，正式就绪启动下一款经典游戏（扫雷）的顶部导航一体化改造。

## [v3.2.69] - 2026-10-26

### 体验与算法双重进化：数织 (Nonogram) 右上角【⚙️ 全功能工具箱】重塑与高难度棋盘跨度单调递增保障
- **核心痛点解决 (用户语音深度反馈)**：
  - **右上角按钮升级：从单一声音按键升级为【⚙️ 全功能设置与工具箱】**：
    - 针对用户提出“单一声音按钮意义不大、应集合脑力币与设置等 Web 端功能”的要求，将右上角按钮重塑为 `⚙️` 设置齿轮；
    - 轻触展开优雅毛玻璃功能菜单：
      - 🪙 **脑力金币余额与赚币指南**（点击直通 `CoinGuideModal` 兑换与规则）；
      - 🔊 **音效静音/开启** 切换；
      - 📳 **触感震动 ON/OFF** 切换；
      - 🧘 **全屏沉浸 / 禅模式** 切换；
      - 页面点击外部区域自动平滑收起，完美承载原本 Web 端的全套核心能力；
  - **棋盘尺寸比例革新：彻底根除“25x25 棋盘反而比 15x15 变小”的缩水 Bug**：
    - 修复此前单纯按视口高度切分导致高网格数（25x25）整体总跨度倒挂被压扁的数学缺陷；
    - 引入**单调非递减网格尺寸算法（Monotonic Non-Decreasing Span Guarantee）**：
      - 确保随着网格数量（难度）提升，棋盘物理总跨度（$w \times cellSize$）**严格递增**：
        - 手机移动端：5x5（300px）→ 10x10（320px）→ 15x15（345px）→ 20x20（380px）→ 25x25（450px 支持平滑查看）；
        - 平板与桌面端：5x5（320~480px）→ 10x10（400~600px）→ 15x15（450~675px）→ 20x20（500~720px）→ 25x25（575~750px）；
      - 25×25 棋盘整体气势恢宏、面积饱满，单格细腻精良，彻底告别缩水反差！

## [v3.2.68] - 2026-10-26

### 移动端人机工程学革新：数织 (Nonogram) 首发“棋盘一体化集成顶梁”（《羊了个羊》级原生定制沉浸体验）
- **核心痛点解决 (用户语音与真机反馈深度落地)**：
  - **问题一：棋盘宽度利用与左右大空白彻底消除**：
    - 重构 `cellSize` 计算体系，采用真实动态行提示像素估算 (`estRowHintWidth`)，替换以往粗糙的 `totalCols` 均摊算法；
    - 手机端边距由 32px 优化为仅保留 16px 安全呼吸边距，5×5 单元格尺寸由 49px 物理大幅提升至 **58px~64px (+30%)**，棋盘左右撑满屏幕 94% 可用宽度，左右大块空白彻底消除，视觉饱满震撼，点选极其轻松；
  - **问题二：PC 电脑端双顶栏重复彻底杜绝**：
    - 联动 `DeviceService.isHandheld()` 精准解耦：
      - **PC 电脑端**：棋盘内嵌顶梁通过 `@if (isHandheld())` 自动隐藏，保持外层标准的全局 GameHeader，绝不出现双顶栏重复；
      - **移动与平板端**：外层通过 `[immersive]="isHandheld()"` 隐藏笨重的大卡片式通用 Header，仅在棋盘顶部展示轻盈的一体化集成顶梁；
  - **问题三：平板 (iPad) 工具栏居中下坠问题根治，始终紧贴顶部**：
    - 彻底拔除导致垂直居中的 `sm:my-auto` 与 `sm:justify-center`，棋盘容器重构为 `justify-start my-0 pt-0.5 sm:pt-1`；
    - 集成顶梁增加 `sticky top-0 z-30`，在长屏与 iPad 上始终端庄驻留在屏幕最上方黄金操作区，绝不随棋盘掉到屏幕中间；
  - **“左二·中一·右二”黄金对称人机工程学布局**：
    - **左侧（双图标）**：【⬅ 返回】大厅按钮 + 【📖 玩法规则手册】弹窗按钮，左手拇指黄金触达区；
    - **中间（难度规格与关卡）**：【🎯 难度规格 ▾】毛玻璃胶囊（如 `简单 (5x5)`、`普通 (10x10)` 等），点击直接拉起移动端原生 Wheel Picker 滚轮选择器，联机对战时显示房间 PK 标识；
    - **右侧（双图标）**：【⚔️ 联机PK / 迎战】快捷入口 + 【🔊/🔇 快捷音效开关】，右手拇指轻松一触即达；
  - **禅模式配置校准**：
    - 修正 `ZenModeService.loadPreference()` 默认值为 `false`，杜绝用户初次进入或手持端默认切掉顶栏的问题。

## [v3.2.67] - 2026-10-26

### 移动端体验与全端布局重塑：顶栏标准化（返回/难度/手册/设置）与右下角悬浮按钮视觉瘦身（数织、扫雷等全站 18 款游戏）
- **核心痛点解决 (用户真机反馈)**：
  - **数织/扫雷等移动端顶部大块空白与无法选难度、无法返回根治**：
    - 修复此前手持端误将通用游戏 Header 隐藏导致没有【⬅ 返回】大厅按钮（PWA 独立桌面 App 严重迷失）、没有【🎯 难度选择】下拉、缺少【📖 规则手册】的问题；
    - 统一多端顶栏标准布局：左侧【⬅ 返回】+ 游戏标题，中间【🎯 难度选择】胶囊，右侧【📖 玩法手册】+【⚙️ 全局设置】；
  - **右下角悬浮按钮堆叠遮挡与误触根治**：
    - 彻底移除右下角原先堆叠的【📚 进阶攻略】和【🔗 分享游戏】大按钮，杜绝遮挡数织、扫雷等游戏右下角网格；
    - 【🐞 提交问题/反馈】按钮轻量化重构：尺寸精简为 32×32px，默认半透明（`opacity-60`），悬停/轻触激活，既保证用户反馈渠道通畅，又 100% 杜绝触控误触；
  - **数织 (Nonogram) 移动端首屏垂直流紧凑优化**：
    - 消除 5×5 等规格因 `my-auto` 垂直强制居中导致的顶部过高空白，调整为 `justify-start sm:justify-center my-0 sm:my-auto`，使棋盘紧随顶部 HUD 自然展开，手指操作黄金区触达极佳；
- **组件级解耦与全端适配**：
  - `GameLayoutComponent`：区分专属沉浸游戏（如《羊了个羊》）与通用益智游戏；
  - `GameHeaderComponent`：【📖 规则手册】按钮由 `hidden sm:inline-flex` 调整为全端常驻 `inline-flex`；
  - Vitest 算法单测 20 项全绿通过。

## [v3.2.66] - 2026-10-26

### 架构与 SEO 保障：PC 桌面端标准网页流与移动手持端真·全屏双模解耦（Google 爬虫 Mobile-First Indexing 与 AdSense 质量标准全端保护）
- **核心痛点解决 (用户商业与 SEO 核心关切)**：
  - **Google 移动优先索引 (Mobile-First Indexing) 保护**：Googlebot 默认优先以手机 UA 爬取网站，如果移动端使用 `@if` 抹杀规则正文，会导致爬虫抓取到“无实质内容 / 缺乏正文文本 (Thin Content)”并遭到严重降权；
  - **Google AdSense 广告承载与政策合规**：确保全设备在 DOM 中真实存在高价值原创玩法指南与结构化攻略文本，同时保障移动端与 PC 端广告位的正常曝光与可视度计算；
- **工业级全端双模智能解耦方案**：
  - **手持移动端与平板端 (Mobile & Tablet Handheld)**：
    - **首屏 100dvh 真·沉浸体验**：手持触控设备进入游戏首屏刚好铺满视口（100vw × 100dvh），青草地四周 0 白边、0 冗余外框，顶部隐藏全局导航栏，享受纯粹沉浸大视野；
    - **DOM 结构 100% 完整保留（Content Parity）**：页面向下允许自然顺畅微滑，棋盘下方完整排列《🎮 玩法规则与操作指南》（`#strategy-guide`）、进阶深度教程入口 (`/docs/tilematch`)、关联博客与全站页脚 Footer；
    - **草坪底部优雅直达锚点**：在非全屏手持端底部提供半透明毛玻璃胶囊（`📖 玩法规则与进阶攻略 ▾`），点击一键平滑滚动直达，兼顾玩家查阅与 Google 蜘蛛爬虫显式抓取；
  - **PC 桌面端（Desktop / Web Stream）**：
    - **默认保持标准可滚动网页流**：完整展示全站顶部导航栏 (`Puzzle PK` / 🏆 排行榜 / 📅 每日挑战 / 📖 规则文档 / 📝 博客 / 语言 / 主题 / 登录与好友)；
    - **游戏棋盘优雅居中大卡片**：以 `max-w-4xl mx-auto rounded-3xl shadow-xl border-4 border-[#4d8b2e]/40` 呈现，下方自然展示完整图文攻略与全站 Footer；
    - **主动全屏/禅模式 (Opt-in)**：PC 玩家若想获得纯净无干扰体验，可随时点击工具箱中的 🧘 全屏沉浸（Zen Mode）或按快捷键一键全屏；
- **平台级服务与组件多端联动协同（PWA 模式与 19 款游戏全量适配）**：
  - `DeviceService.isHandheld()` 联动 `MainLayoutComponent.isFullImmersion`、`GameLayoutComponent` 以及各个游戏模块；
  - **PWA Standalone 模式防迷失保障**：在通用 18 款游戏移动端中始终保留超轻量极简顶栏（高度约 44px），提供左上角【⬅ 返回大厅】（PWA 核心导航生命线）、游戏标题、右上角【📖 玩家手册】与【⚙️ 工具箱/设置】，杜绝独立桌面 App 模式下无法返回大厅的问题；
  - **舞台首屏 100dvh 与 0 侧边距满屏舒展**：通用游戏主舞台外边距由 `px-3` 精细优化为 `px-1`，消除多余灰框与大黑边，横向 100% 紧凑大视野，纵向占满剩余屏幕高度；
  - **专属沉浸顶栏（A类）与通用微型顶栏（B类）优雅并存**：自带原生个性化顶栏的游戏（如《羊了个羊》）传 `[immersive]="true"` 激活专属外观，其他 18 款游戏直接享受平台级全屏沉浸与完备导航；
- **全套 8 国语言补齐 `seo.docs.tilematch.*` 与模板标签闭合修正**：
  - 修复 `tilematch.component.html` 终局结算弹窗末尾丢失的 `@if` 闭合标签，彻底清除模板解析报错与组件 unused 误报；
  - 补充 `seo.docs.tilematch.title`, `seo.docs.tilematch.desc`, `seo.docs.tilematch.keywords` 至 `zh`, `en`, `de`, `es`, `fr`, `ja`, `ko`, `pt` 全部 8 种语言，Angular 513 个静态路由预渲染（Prerender）100% 成功。

## [v3.2.65] - 2026-10-26

### 国际化 (i18n)：补齐《羊了个羊》`lobby.tilematch.desc` 与 `seo.tilematch.keywords` 全球 8 国语言翻译
- **补全缺失的 i18n 键位 (准则第 2 条严格遵循)**：
  - 补充 `lobby.tilematch.desc`（大厅游戏卡片副标题与描述）；
  - 补充 `seo.tilematch.keywords`（SEO 路由元数据关键词）；
  - 同步补充 `tilematch.*` 全套关卡、技能及提示键位至全部 8 种官方语言 (`zh`, `en`, `de`, `es`, `fr`, `ja`, `ko`, `pt`)；
  - 验证全部 JSON 文件语法，确保零缺少、零报错，自动化单元测试全绿。

## [v3.2.64] - 2026-10-26

### 平台级架构：设备检测服务 (`DeviceService`) 创立与平板/移动端真·全屏沉浸及自适应卡槽重塑
- **平台级设备检测服务 (`DeviceService`，准则第3条、第6条通用封装)**：
  - **精准多维度设备识别**：结合 `WindowSizeService` 响应式视口信号、iPadOS 特殊 UA (`Macintosh` + `maxTouchPoints > 1`)、Android 平板、触控能力及屏幕断点；
  - **响应式计算属性**：提供 `deviceType()` (`mobile` | `tablet` | `desktop`)、`isMobile`、`isTablet`、`isDesktop` 与 `isHandheld`（手机与平板统称）；
  - 配套完善自动化单元测试 (`device.service.spec.ts`)，20/20 单元测试全绿；
- **移动端与平板端 (iPad / Tablet) 全局真·全屏沉浸打通**：
  - **联动全局 Navbar 隐藏**：在 `MainLayoutComponent` 中引入 `isFullImmersion` 计算属性，当 `LayoutService.isImmersiveGame` 或移动/平板手持设备处于游戏页时，彻底隐藏顶部 `Puzzle PK` 导航条与底部 Footer，容器消除任何默认边距与留白；
  - **消除平板端两侧巨大空白**：彻底移除了原先在中大屏上的 `sm:max-w-lg sm:mx-auto sm:rounded-3xl` 狭窄条带限制，平板下大草坪 100% 满屏无缝铺满（100vw × 100dvh），实现四周 0 白边；
- **《羊了个羊》卡槽、道具栏与棋盘大屏自适应变大与居中**：
  - **木栅栏卡槽自适应变大**：卡槽宽度由写死的 390px 升级为响应式 `w-full max-w-[390px] md:max-w-[560px] lg:max-w-[620px] mx-auto`，内槽高度自适应提升至 80px~86px，槽内白玉麻将牌与 Emoji 同步放大居中；
  - **道具栏自适应放大**：移出、撤销、洗牌 3 个天蓝微立体按钮在平板端放大至 86px × 86px，图标放大至 42px，间距自适应扩大并居中；
  - **棋盘舞台与卡牌自适应伸展**：平板端卡牌自适应扩大至 80×96（简单关 86×102），舞台扩大至 540×620，Emoji 放大至 46px~48px，大屏气派舒展。

## [v3.2.63] - 2026-10-26

### 羊了个羊 (Tile Match 3)：大牌面饱满铺展重构与清新白玉微立体关卡胶囊换装
- **卡牌尺寸放大与横向饱满舒展（告别萎缩空旷，棋盘近乎填满屏幕）**：
  - **彻底移除舞台萎缩缩放**：移除了棋盘容器上原有的 `scale-[0.66] xs:scale-[0.74]` 缩减限制，恢复 1:1 真实物理像素；
  - **单张卡牌尺寸大幅扩增**：基准卡牌从 54×64 扩大至 62×74（简单关更是达到 66×78），Emoji 图标放大至 38px，牌面大方、立体厚边突出、触控手感极佳；
  - **关卡棋盘横向饱满分布**：重构第一关与后续关卡布局，第一关由原先狭窄挤在一块改为左右展开（x 从 0.2 跨越到 5.8，横跨屏幕左右两翼），卡牌丰满铺满草坪，告别四周空荡；
- **顶部顶栏清爽化：去除冗余日期与黑色死板背景，升级为白玉微立体胶囊**：
  - **移除突兀纯黑背景与时间日期**：根据用户反馈，取消了顶部的 `- 10月26日 -` 和死黑色药丸药条及哑铃，还原清爽自然；
  - **全新清新白玉微立体关卡胶囊 (`.meadow-level-capsule`)**：象牙白与青草浅绿渐变底色，搭配森林绿加粗字样（如 `◀ 第 1 关 · 简单 ▶`）与橄榄绿微立体厚边投影，与背景大草坪及天蓝微立体方块按钮浑然天成；
  - 支持左右快速切关与点击唤起关卡抽屉，操控丝滑。

## [v3.2.62] - 2026-10-26

### 平台级架构：GameLayout 沉浸式真·全屏体系 (`[immersive]`) 创立与《羊了个羊》四周 0 白边满屏大草坪重塑
- **平台级通配沉浸模式规范 (`<app-game-layout [immersive]="true">`) 创立**：
  - **高扩展性通用封装 (准则第3条、第6条)**：在 `<app-game-layout>` 核心框架中内置 `[immersive]` 机制与响应式 `isImmersiveEffective` 计算属性；
  - **移动端与全屏 0 缝隙自适应**：沉浸模式下自动隐藏通用外部导航栏 (`<app-game-header>`) 与离线横幅，主容器移除全部默认 padding 与卡片外框 (`border-0 rounded-none bg-transparent shadow-none p-0`)，实现 100vw × 100dvh 全屏满铺；
  - **先在《羊了个羊》作为标杆应用，后续无缝推广至全部 19 款游戏**；
- **《羊了个羊》真·全屏大草坪体验与常用功能优雅原生化**：
  - **四周 0 白边、0 割裂感**：手机端与平板端进入即为 100% 满屏青草地，无任何外圈白色/灰色底色断层；
  - **左上角常用功能：【⬅ 退出全屏 / 返回大厅】+【⚙️ 玩法手册】**：采用经典天蓝微立体方块，一键便捷返回大厅或查阅攻略，轻便不抢戏；
  - **右上角常用功能：【⚔️ 开房PK】+【🔄 重新开始】**：原版天蓝微立体方块整合双剑与 PK 角标，随时一键跳转联机对决与房间创建；
  - **中间原版经典黑色胶囊与哑铃吊饰**：保持 `- 10月26日 · 第1关 -` 极简视觉与快速换关抽屉。

## [v3.2.61] - 2026-10-26

### 羊了个羊 (Tile Match 3)：1:1 原版经典田园全景美学重塑与无边界沉浸体验
- **告别矩形小盒子限制，拥抱无边界大草坪沉浸感 (Pastoral Meadow Immersion)**：
  - **彻底移除棋盘厚重深绿边框**：卡牌不再被拘束在小框里，而是像原版一样直接错落有致地自由悬浮在整片清爽、治愈的明媚嫩草地上；
  - **点缀手绘小草苗 (Hand-drawn Grass Deco)**：在四周自然散布原版同款的 SVG 简笔画小草芽，配合自然微风吹拂的田园松弛感；
- **1:1 原版标志性 Header 结构**：
  - **经典黑色日期胶囊与哑铃吊饰**：顶部居中展示原版标志性黑色药丸标签 `- 10月26日 · 第2关 -`，正下方悬挂经典的哑铃吊环（两端小球+横杆），并支持点击展开关卡切换或通过左右箭头无缝切关；
  - **原版微立体蓝色方形齿轮按键**：左上角设置与右上角重置均采用饱满的天蓝色圆角正方形方块（带深蓝立体底与黑色卡通描边）；
- **经典“羊角双耳”对称神庙与百叶窗排队牌堆**：
  - **顶部双耳百叶窗牌堆**：左右顶部各有一排密集横向叠放的副牌堆，露出麻将草绿立体条纹，最上层翻开变亮，消除后自动解冻下一层；
  - **白玉麻将牌拟真质感**：象牙白牌面、细腻外勾边、浓郁墨绿立体厚底（`box-shadow: 0 4px 0 #3a7122`），暗牌透视清晰而深邃；
- **1:1 原版卡通小木栅栏卡槽 (Wood Picket Fence Tray)**：
  - 两侧圆头立柱木桩、上下两根原木横木横贯、槽底泥土浅褐底板，卡牌整齐排列宛如小羊进栏；
- **1:1 原版 3 个亮天蓝色微立体大道具方块**：
  - 移出（黄色向上粗箭头）、撤回（黄色反向弯转箭头）、洗牌（黄色交叉双箭头），带圆黑底白加号 `+` 角标，回弹按压手感极度舒适。

## [v3.2.60] - 2026-10-26

### 羊了个羊 (Tile Match 3)：顶栏难度/关卡双向真联动与“田园牧歌”统一高级美学重塑
- **彻底理顺“难度下拉 vs 关卡按钮”的从属关系与响应式 Signal 修复**：
  - **关卡与难度严格 1:1 等价**：明确并统一逻辑定义：
    - **第 1 关 = 简单模式**（新手乐园，18 张牌）；
    - **第 2 关 = 中等模式**（羊群挑战，60 张牌，经典原版神殿大阵）；
    - **第 3 关 = 困难模式**（炼狱神殿，96 张牌）；
  - **修复顶栏永远卡在“简单”的响应式 Bug**：修复 `game-layout.component.ts` 中 `effectiveDifficulty` 优先从 store 的 Signal 读取。现在在内部点击“第 2 关”，顶部下拉框立即毫秒级同步变为“中等”；在顶部下拉框选“困难”，内部立刻自动跳切并重发“第 3 关”，彻底解开“简单里有没有三关”的困惑；
- **全套“田园牧歌”高级统一主题重塑（告别颜色脱节与刺眼撞色）**：
  - **告别中间突兀死板的大白框**：棋盘舞台全面换装为**清新阳光青草地（Pastoral Spring Meadow `#82cb50` 渐变）**，让卡牌真正宛如码在广阔青草场上，自然治愈；
  - **告别刺眼冰冷的电光蓝道具**：3 大道具全面换装为**暖金原木与麦香琥珀质感（Warm Amber & Gold）**，高光温润，立体凸起手感细腻；
  - **告别焦黑深沉的红木槽**：收集槽重塑为**阳光浅原木暖金栅栏（Warm Golden Oak）**，两侧圆头小木桩与横梁色泽明朗自然，与草地浑然天成；
  - **告别水泥死灰被挡牌**：被遮挡卡牌保留 `brightness(0.82) saturate(0.94)` 清爽通透微暗，图案一清二楚，层次分明，整体色彩高端协调、赏心悦目。

## [v3.2.59] - 2026-10-26

### 羊了个羊 (Tile Match 3)：正统原版经典神殿大阵、左右密集排队副牌堆与木质围栏收集槽重塑
- **废弃异形非对称方案，回归正统《羊了个羊》经典结构 (Classic Symmetrical Temple & Aux Decks)**：
  - **中央双塔凹字神殿主阵 (Symmetrical Temple Fortress)**：取消失真的“左厚右薄”非对称形态，采用居中对称的凹字双塔神殿布局（顶部中间下凹，两侧双塔耸立，中部丰满，底部双足支撑），层与层之间严格按 0.5 格错位咬合交叠；
  - **左右两侧横向密集排队副牌堆 (Left & Right Queue Decks)**：1:1 还原原版参考图中左下角与右下角的排队牌堆（每边 8~12 张紧密横向层叠），每张牌露出绿色的麻将立体侧边，仅最顶层 1 张高亮可点，拿走后下一张平滑解冻晋升，完美复刻玩家留副牌救急调配的经典战术体验；
- **全套经典原版视觉美学重塑 (Authentic Sheep Aesthetics)**：
  - **象牙白麻将立体卡牌 (Mahjong Tile Craftsmanship)**：纯净白玉牌面、微弱奶油内高光，配合翠绿底板立体厚边与真实物理压盖投影；
  - **下层通透微暗，告别黑煤炭与死灰羊头**：下层被压卡牌仅使用柔和自然微暗（`brightness(0.78)`），图案清晰可辨，便于玩家预判决策；
  - **木质围栏卡槽托盘 (Wood Fence Tray)**：7 格收集槽全面升级为经典的暖木色栅栏底座，带有两端圆头木立柱、横木围栏与凹槽虚线卡位；
  - **拟物立体道具栏按钮 (Classic Powerup Buttons)**：移出、撤回、洗牌 3 大按钮采用高饱和度蓝黄立体拟物设计，右上角配高亮提示角标；
- **纵向长方形舞台重构与空间利用率极致提升 (High-Density Portrait Stage)**：
  - **彻底告别空旷死板的大正方形框**：根据原版参考图的竖版黄金比例，将棋盘重塑为纯正的 **390px × 490px 纵向长方形长卷**；
  - **空间利用率突破 90%**：网格由中央窄区彻底扩展至 0~6 列与 0~8 行，从左边缘到右边缘、从顶部到底部均被卡牌整整齐齐地充实占满；
  - **左右排队副牌堆浑然一体**：左副牌堆紧贴左下角横向展开，右副牌堆紧贴右下角横向展开，与中央大殿无缝衔接，杜绝四周孤立留白；
  - **卡牌尺寸大气充盈**：微调卡牌基准尺寸为 `54px × 64px`，视觉饱满、紧凑舒适，完美呈现原版手游般的高度沉浸感。


### 羊了个羊 (Tile Match 3)：全盘深层封印暗牌（告别一览无余）与“真·空间位置错乱洗牌”
- **正统全盘封印暗牌机制 (Full-Board Sealed Mystery Cards)**：
  - **彻底解决“中间卡牌一览无遗”的痛点**：在第二关（羊群挑战）与第三关（炼狱神殿）中，凡是被压在下层被遮挡的卡牌（无论是中央主峰还是两翼长龙），**一律封印背对玩家（羊头羊纹立体卡背）**，完全杜绝提前透视；
  - **开局唯有顶层明牌翻开**：开局全场仅露头可点的顶层高光卡牌展示真实果蔬，绝大部分深渊底座均处于神秘封印状态；
  - **随移随翻，开盲盒快感倍增**：消除表面卡牌后，底下压着的封印卡牌瞬间触发 3D 翻转光效翻开揭秘，拨云见日，层次极其震撼。
- **真·空间坐标错乱洗牌 (Spatial Coordinate & Pattern Reshuffle)**：
  - **洗牌不仅换图案，更彻底重构位置**：点击洗牌道具（<kbd>3</kbd>）时，除打乱果蔬图案外，**将棋盘所有剩余卡牌的空间几何坐标 `(x, y)` 彻底错位打乱重置**；
  - **真实错位微散布**：每个坐标附加随机位移扰动（偏左一点、偏右一点、偏上一点、偏下一点），模拟荷官一把推散重洗的动态错乱洗牌感，杜绝死板固定的造型。

## [v3.2.57] - 2026-10-26

### 羊了个羊 (Tile Match 3)：正统“暗牌盲盒”封印、3D 翻牌揭秘、多变态随机拓扑与顶栏难度双向联动
- **正统“暗牌盲盒”机制全面落地 (Face-Down Mystery Blind Cards)**：
  - **告别下层卡牌全透明透视**：两翼流水长龙中被压在下层的卡牌以及深层主峰的核心底层牌，全面激活“反面暗牌”封印；
  - **拟真羊绒暗纹卡背**：盲盒暗牌在被遮挡时背对玩家，呈现精致的立体羊头浮雕印章（`🐑 羊`）与金色微暗纹，杜绝提前透视，完美复刻原版核心的“开盲盒未知悬念与刺激感”；
  - **极致 3D 翻牌揭秘动画 (`animate-flip-reveal`)**：一旦移开压在上方的卡牌、暗牌晋升为最外层时，瞬间触发优雅的 $180^\circ$ 3D 翻转光效，鲜艳果蔬瞬间亮相！
- **多变态随机几何拓扑与自然物理微散布 (Random Archetypes & Jitter)**：
  - **告别单一死板固定坐标**：各关卡重构为多种随机拓扑原型（如中等关“十字星芒堡垒 vs 双子神殿峡谷”、困难关“奥林匹斯巨型神殿 vs 八卦同心双环阵”），开局随机抽取，重开体验局局常新；
  - **自然物理微散布 (Physical Jitter)**：卡牌摆放引入 $\pm 0.06$ 逻辑微扰，模拟手工发牌的参差叠放错落感，自然生动。
- **顶栏通用难度下拉菜单与内部关卡按钮双向完全联动**：
  - 彻底修复 `app-game-layout` 顶栏难度下拉菜单未绑定 `(difficultyChange)` 导致切换无效的问题；
  - 顶栏下拉切换（简单/中等/困难）与内部关卡按钮（新手乐园/羊群挑战/炼狱神殿）实现毫秒级双向同步更新。

## [v3.2.56] - 2026-10-26

### 羊了个羊 (Tile Match 3)：正统错落空间拓扑、大气饱满视觉与丝滑“飞牌入槽”过渡动画
- **正统“羊了个羊”错落有致空间拓扑重构**：
  - **彻底告别呆板规整方阵**：彻底废弃各层平铺矩形网格，重构为符合原版精髓的“**中央错落主峰金字塔 + 左右两翼密集流水盲盒长龙 + 底部副栈**”三位一体立体空间架构；
  - **半格交叠咬合 (Staggered Half-Grid Occlusion)**：上层卡牌跨在下层 2~4 张卡牌接缝处，露出品字形/十字形下层边角，层次分明，若隐若现；
  - **两翼流水盲盒长龙 (Wing Serpent Stacks)**：左翼与右翼各排开 8~10 张微距纵向重叠的盲盒卡牌，仅最顶端高亮露头可点，每消一张自动解锁推进下一张，极具开箱探秘感；
  - **图案池大幅扩充**：新增西瓜 🍉、草莓 🍓、蘑菇 🍄、鲜桃 🍑，扩充至 16 种高辨识度田园果蔬元素；困难关图案数量提升至 14 种，关卡张数扩展至 96 张（严格 32 组 3 消），战术纵深与耐玩度大幅提升！
- **卡牌尺寸放大与大气饱满视觉重塑**：
  - 卡牌基准尺寸大幅放大至 `52px ~ 56px`（高 `62px ~ 66px`），图案 Emoji 放大至 `32px`，彻底解决“棋盘空旷、卡牌偏小、小家子气”的问题；
  - 全屏舞台自适应精确居中计算，四周呼吸留白恰到好处，拟物双层浮雕阴影质感全面升级；
- **极致多巴胺：飞牌入槽高级丝滑过渡动画 (Fly to Slot Animation)**：
  - 点击高亮卡牌时，精准计算起点视口矩形与卡槽目标槽位视口矩形，生成高层级飞行微实体；
  - 采用极富弹性的贝塞尔抛物线曲线 (`cubic-bezier(0.2, 0.85, 0.25, 1.1)`) 在 220ms 内飞入卡槽，无缝衔接卡槽弹跳就位动画与清脆音效，视听反馈淋漓尽致！
- **单元测试 100% 绿色通过 (`vitest`)**：
  - 覆盖全部三级难度 18 张、60 张、96 张卡牌的 3 的倍数校验、坐标唯一性校验与开局高亮判定。

## [v3.2.55] - 2026-10-26

### 羊了个羊 (Tile Match 3)：全面对齐数独级高标准与双层解耦文档架构
- **第一层：快速上手与全平台操作指南 (In-Game Quick Rules & Interactive Guide)**：
  - **核心机制与胜负法则**：全面详述 AABB 3D 空间叠层遮挡机制、底座 7 格托盘容量限制、同类图案智能聚类、3 消爆炸金光与 3 的整数倍可解性保障；
  - **全平台操作手势与快捷键表格**：完整列出鼠标选牌、键盘 <kbd>1</kbd>（移出 Stash）、<kbd>2</kbd>/<kbd>Z</kbd>（撤销 Undo）、<kbd>3</kbd>（洗牌 Shuffle）、<kbd>R</kbd>（一键重开）、<kbd>H</kbd>（玩法规则切换）对应功能说明；
  - **三大救命锦囊深度解析**：详述移出暂存架、撤销悔棋与随机洗牌的最佳战略触发时机；
  - **新手控槽四大军规 (FAQ)**：总结“3 格安全警戒线”、“不见第 3 张绝不下手”、“主攻深井金字塔、两翼留作配平钥匙”、“透视下一层”四大实战铁律。
- **第二层：7 章万字级深度战略攻略宝典 (`frontend/public/assets/games-docs.json`)**：
  - **第一章：拓扑结构与有向无环图 (DAG) 数学模型**：严谨论证 AABB 偏序依赖链与三倍数守恒定理；
  - **第二章：盘面三大区域解构与战略定位**：深度剖析主井金字塔核心区、四周环绕平铺副牌区与两侧盲盒副栈的战略分工；
  - **第三章：绝不暴毙的“控槽四大军规”**；
  - **第四章：三大锦囊神技的精算级使用时机**；
  - **第五章：实战残局手把手推导示范**；
  - **第六章：多人实时 PK 竞速心法 (同种子同构博弈)**；
  - **第七章：高频疑难解答 (In-Depth FAQ)**。
- **彻底修复第一关坐标堆叠死锁 Bug 并重构关卡几何体系**：
  - **根本诱因根除**：排查并彻底拔除了历史算法中在第一关强行将剩余 5 张牌全量塞入同一坐标 `(2, 2, layer: 2)` 的严重 Bug（导致玩家点击顶层移走卡牌后原地出现完全重叠的同类图案卡牌，且身下 13 张底层牌永远无法解锁）；
  - **全新双子星开阔金字塔架构**：第一关重构为 18 张牌对称双峰拓扑，开局即拥有 6 张未受遮挡的高亮卡牌；移走顶层卡牌后下一层 0ms 完美解除遮挡解锁，消除节奏行云流水；
  - **第二关与第三关金字塔拓扑升级**：全面采用严密分层几何拓扑，自适应绝对居中对齐，杜绝任何死锁穿模。

## [v3.2.54] - 2026-10-26

### 经典爆款益智游戏：羊了个羊 (Tile Match 3 / 叠层三消 - `tilematch`) 正式上线！
- **极度分泌多巴胺的高品质视听体系与拟物卡牌微立体设计**：
  - **3D 拟物浮雕微立体卡牌**：精心调校的象牙白玉质感高光倒角与内阴影；未压盖卡牌浮凸微翘起高亮，鼠标悬停上浮微弹跳；被遮挡卡牌灰暗滤镜下沉，点击受阻时触发拟真物理晃动动画 (`tileShake`) 与沉闷碰撞音效；
  - **7 格托盘智能聚类与 3 消金光爆裂**：入槽同类型卡牌智能聚拢排列，凑满 3 张瞬间爆发升调琶音 (`match`) 与金色星芒粒子；
  - **连击梯级爆发与多巴胺浮空文字**：连击 (Combo x2/x3/x4+) 触发火苗徽章与屏幕中心炫彩流光评价（`GREAT! 🌟` $\to$ `FANTASTIC! ⚡` $\to$ `UNBELIEVABLE! 💥` $\to$ `GODLIKE! 🔥`）；
  - **危机心跳警示**：卡槽 $\ge 5$ 格时卡槽边缘泛起红色脉冲警示光圈与心跳警示音 (`slot_full`)；
  - **三大锦囊神技**：移出暂存架 (`Stash`)、悔棋撤销 (`Undo`) 与打乱棋盘图案 (`Shuffle`)。
- **纯客户端单机引擎与 AABB 遮挡算法 (`tilematch-engine.ts`)**：
  - **多层错位半格堆叠与 AABB 碰撞检测**：逻辑单元精确计算重叠遮挡，底层牌在上层牌移出瞬间 0ms 自动激活解除遮挡；
  - **必有解法则保证**：全场所有图案卡牌数量严格为 3 的整数倍，内置新手、进阶金字塔挑战与炼狱三大难度；
  - **Vitest 核心算法单测 100% 覆盖 (`tilematch-engine.spec.ts`)**：覆盖遮挡判定、卡槽聚类消除、卡槽溢出判负与三大道具使用。
- **联机多人 PK 模式 (`backend/internal/engine/tilematch/engine.go`)**：
  - 服务端统一分配随机数种子 (`Seed`)，双人对战生成同构方块矩阵，公平比拼消除消除竞速与手速；
  - 继承 `BaseEngine`，支持标准 3 秒倒计时、BO3/BO5 多局胜负与中途认输裁决。
- **全平台响应式与设计系统规范遵守**：
  - 零硬编码颜色，严格遵循全局 CSS 变量，Light/Dark 主题无缝切换；
  - 完整接入 `zh.json` 与 `en.json` 国际化辞书；
  - 移动端、平板与桌面端全尺寸适配，无横向溢出。

## [v3.2.53] - 2026-10-26

### 一键新增游戏脚手架体系 (One-Click Game Scaffolder CLI: `npm run gen:game`)
- **全新脚手架工具落地 (`frontend/scripts/generate-game.js`, `package.json`)**：
  - **核心目标**：彻底消灭重复创建 8 个样板文件与逐一手动绑定的繁琐劳动，实现“积木式代码组装”；
  - **命令语法**：`npm run gen:game <game_id> [中文名] [图标Emoji]`；
  - **30 秒全量端对端自动化装配清单**：
    1. **后端 Go 引擎**：自动生成 `backend/internal/engine/<id>/engine.go`（预置 `BaseEngine`、倒计时与多局胜负制）；
    2. **后端包引用注入**：自动在 `backend/cmd/api/engines_gen.go` 注入空白导入；
    3. **前端本地引擎**：自动生成 `store/<id>-engine.ts`（0ms 纯客户端单机引擎）；
    4. **前端算法单测**：自动生成 `store/<id>-engine.spec.ts`（无缝衔接 `vitest`）；
    5. **前端 Store 状态机**：自动生成继承 `BaseGameStore` 且具备防幽灵契约的 `<id>.store.ts`；
    6. **前端组件骨架**：自动生成继承 `BaseGameComponent` 与 `<app-game-layout>` 黄金编排器的 `<id>.component.ts/html/css`；
    7. **全局枚举与路由注入**：自动更新 `game.model.ts` 与 `game-definitions.ts`；
    8. **双语与 SEO 注入**：自动向 `zh.json` 与 `en.json` 注入标题与 SEO 描述。
  - **开发者体验提升**：开发者无需手写任何样板代码，只需专注于在 `<id>-engine.ts` 中填入核心棋盘算法。
- **文档全面同步**：
  - 更新 [`docs/HOW_TO_ADD_GAME.md`](file:///home/zd/x-game/docs/HOW_TO_ADD_GAME.md)，将一键脚手架作为推荐的首选路线图。

## [v3.2.52] - 2026-10-26

### P3 阶梯：代码底座工程加固 (Architecture Hardening: Anti-Ghost State Contract & Vitest Algorithmic Suite)
- **统一防幽灵状态生命周期契约 (`BaseGameStore.resetLocalGameState`)**：
  - **核心痛点解决**：以往各游戏临时视觉状态（如扫雷乐观插旗 `optimisticFlags`、高亮选中、动画触发器）分散在各组件自管，容易在跨局或重新匹配时漏清；
  - **底座统一治理**：在 `BaseGameStore` 注入标准 `resetLocalGameState()` 调度体系，子类只需实现 `onResetLocalGameState()` 钩子；
  - **四大生命周期自动触发**：
    1. 房间状态进入 `Waiting`（等待室/重赛等待）或 `Starting`（3秒倒计时开始）；
    2. 任何模式下调用 `startGame()`；
    3. 任何模式下调用 `restartGame()`；
    4. 玩家离开房间 `leaveRoom()`；
  - 从框架级彻底闭环，杜绝任何跨局幽灵状态与老旧盘面数据泄露。
- **核心算法轻量单元测试套件落地 (`vitest.config.ts`, 3 Suites, 11 Tests 100% Pass)**：
  - **扫雷引擎核心算法测试 (`minesweeper-engine.spec.ts`)**：
    - 验证网格尺寸与未翻开状态初始化；
    - 严苛验证“首点 100% 必不中雷法则（First-Click Safe Rule）”；
    - 验证周围雷数计算、空白格 Flood-fill 连锁蔓延展开、插旗拦截以及胜负终局判定。
  - **经典 2048 引擎测试 (`classic2048-engine.spec.ts`)**：
    - 验证 4x4 网格初始化（随机 2 个初始方块）；
    - 验证同胞方块滑动碰撞合并、得分倍增与步数自增；
    - 验证无限步撤销（Undo）的历史快照精准回滚。
  - **推箱子引擎测试 (`local-sokoban-engine.spec.ts`)**：
    - 验证字符地图解析与人物坐标寻址；
    - 验证推箱入库（目标点 `*` 判定）与通关检测；
    - 验证实体墙壁碰撞阻挡与动作撤销（Undo）。
- **全站构建验证**：
  - 生产构建 `npm run build` 0 报错通过，497 条静态路由预渲染 100% 成功。

## [v3.2.51] - 2026-10-26

### P1 阶梯：局内多巴胺视听反馈爆发式升级 (Juice & Dopamine Game Feel: Cascade Ripple & Combo Escalation)
- **扫雷大面积开阔水滴波纹音效与微弹跳入场 (`minesweeper.sound.ts`, `cell.component.css`, `minesweeper.component.ts`)**：
  - **晶莹水滴琶音 (`playMinesweeperCascade`)**：针对空白格连锁展开（Flood Fill，单次揭开 $\ge 3$ 格），合成轻灵多重水滴琶音（C5/E5/G5/C6/E6/G6），多米诺式依次滑过高频音阶，带来极度解压的听觉多巴胺；
  - **连锁节拍震感**：单次翻开大片雷区时自动触发节奏震感 (`vibrateCombo`)；
  - **物理级微弹跳入场 (`msCellRevealPop`)**：为翻开的数字格子引入 0.16s 弹性入场微动效（Scale 0.92 $\to$ 1.04 $\to$ 1），大面积展开时呈浪花波纹弹开质感，兼具 `prefers-reduced-motion` 保护。
- **经典 2048 连击梯次升调与浮空连击炫彩文本 (`classic2048.component.ts`, `classic2048.component.html`, `classic2048.component.css`)**：
  - **Combo 连击追踪器**：局内滑动并在 2.2 秒内连续合并方块时自动累积 Combo（1 至 8 层），超过 2.2 秒自动冷却；
  - **音阶梯次上升 (Pitch Escalation)**：合并音效频率随 Combo 动态按半音/全音递增（$f = 440 \times 1.059463^{2 \times combo}$），形成 Do-Re-Mi-Fa-Sol 音阶爬升心流，2 连击以上叠加空灵金属清鸣；
  - **得分胶囊实时 Combo 徽标**：连击激活时顶栏得分胶囊动态显示 `🔥 {n}x COMBO` 呼吸光晕；
  - **三级浮空连击文本与粒子动效 (`c2048-combo-float`)**：高连击及大数字合并时棋盘上方瞬发弹射向上浮空微光文字（`✨ COMBO` / `⚡ SUPER` / `🔥 UNSTOPPABLE` / `🌟 1024+`）；
  - **局内即时破纪录高光时刻 (Live High Score Moment)**：在局内得分突破个人最佳的瞬间，即时弹射金色 `👑 NEW RECORD!` 徽章并伴随胜利震感。
- **方块消除 (Block) 破纪录即时仪式感加固 (`block.component.ts`)**：
  - 在局内消除突破个人历史最高分的一瞬间，触发金色 `👑 NEW RECORD!` 浮空字与全屏星芒礼花反馈。
- **全站构建验证**：
  - 生产构建 `npm run build` 0 报错通过，497 条静态路由预渲染 100% 成功。

## [v3.2.50] - 2026-10-26

### 扫雷 PK 乐观插旗残留排查根治与全益智游戏单机再来一局生命周期重塑 (Minesweeper PK Flags Leak & Single-Player Restart Fix)
- **扫雷 PK 第二局“满屏红旗”根本原因与彻底根治 (`minesweeper.store.ts`)**：
  - **原因定位**：扫雷为了联机对战获得 0ms 极速响应，前端引入了 `optimisticFlags` 信号进行本地乐观插旗回显；然而在第一局结束、进入第二局（或多轮 BO3/BO5、点击再来一局 Rematch）时，后端给玩家分发了全新生成的空白棋盘，但前端 `optimisticFlags` 从未被清空为 `{}`；导致计算属性 `board = computed(...)` 依然保留了上一局所有插旗坐标，在第二局新棋盘刚开局时全量覆盖在空白格子上，形成开局“布满红旗、雷都标好、剩余雷数显示错误”的幽灵旗帜现象。
  - **根治疗法**：
    1. 在 `MinesweeperStore` 构造函数新增状态监听 `effect`，一旦房间进入 `Waiting`（等待中/等待重赛）或 `Starting`（3 秒倒计时），立即无痕清空 `optimisticFlags.set({})`；
    2. 新增空白棋盘检测：一旦后端下发 `revealed_cnt === 0` 且处于 `playing` 的新一局棋盘，立即核对并清空残留旗帜；
    3. 在 `startGame()`, `restartGame()`, `startLocalGame()`, `joinRoom()`, `leaveRoom()` 全生命周期函数中显式清空 `optimisticFlags.set({})`。
- **扫雷单机模式“无法下一局、还是上一局老棋盘”根本原因与彻底根治 (`minesweeper.store.ts`, `minesweeper.component.html`)**：
  - **原因定位**：单机模式下点击弹窗“再来一局”或按 `R` 键触发 `store.startGame()` 时，原实现仅粗暴赋值 `engine.status = GameStatus.Playing; engine.startAt = Date.now();`，**完全未调用 `engine.initGame(...)` 重新生成棋盘**；导致本地引擎依然保留上一局已经全部翻开、插旗或爆炸的旧格子和旧步数，棋盘完全无法刷新。
  - **根治疗法**：
    1. 在 `MinesweeperStore.startGame()` 中判断单机模式时，若引擎已存在，根据当前难度规格（`width, height, mines`）重新调用 `engine.initGame(...)` 或 `initTutorialBoard()` 生成全新随机雷区矩阵；
    2. 重置 `revealedCnt = 0`、`isMinesPlaced = false` 并清空乐观标记；
    3. 在 `minesweeper.component.html` 显式补齐 `(restart)="handleRestart()"` 与 `(rematch)="handleRematch()"`，打通快捷键与按钮事件流。
- **全站 18 款游戏单机与联机状态全面巡检**：
  - **独特性分析**：`optimisticFlags` 幽灵旗帜仅扫雷独有（其他游戏均由状态驱动或在后端/引擎内部完整重锚）；
  - **连带加固数独与数织**：数独（`sudoku`）与数织（`nonogram`）同样加固了 `playAgain` 行为，数独单机自动推进至下一关或重置当前题，数织在终局点击再来一局时强制调用 `initSinglePlayer(diff, true)` 生成全新谜题，彻底杜绝单机卡在老盘面的可能。
- **构建质量验证**：全站通过 `npm run build` 严苛生产构建，497 条静态路由预渲染 100% 成功。

## [v3.2.49] - 2026-10-26

### 极速畅玩体验闭环：全平台触觉震感注入、桌面端全局快捷键体系与通关多巴胺微动效 (Haptics, Desktop Hotkeys & Victory Celebrations)
- **P1: 全平台触觉震感全面覆盖 (Universal Physical Haptics Feedback)**：
  - 将语义化触感反馈 (`vibrateLight`, `vibrateMedium`, `vibrateSnap`, `vibrateSuccess`, `vibrateError`, `vibrateCombo`) 深度注入全站核心益智游戏：
    - **扫雷 (`minesweeper`)**：点开格子触发轻触感、标旗触发中触感、中雷失败触发低沉震动、扫雷通关触发礼炮级震感；
    - **推箱子 (`sokoban`)**：人物走步触发微震感、推箱到位触发清脆抓握震动 (`vibrateSnap`)、通关胜利触发欢庆震感；
    - **五子棋 (`gomoku`)**：落子棋盘精准吸附微震感、胜利与战败反馈清晰可辨；
    - **经典 2048 & 下落 2048 (`classic2048`, `drop2048`)**：方块滑动/下落轻震、合并爆破中震、$\ge 128$ 及多重连击触发连续强震 (`vibrateCombo`)、终局失败沉浸震感；
    - **成语接龙 (`idiom`)**：选字上屏与回退擦除触发清爽触感、接龙延展成功触发确认震动、每 5 连击及 PK 胜利触发胜利震感；
    - **密码破译 (`codebreaker`)**：数字按键输入/回退轻震、猜想提交吸附震感、密码破解成功触发欢庆反馈；
    - **数织涂色 (`nonogram`)**：0ms 极速划线轻震、长按切换涂色/标叉中震、全盘拼图揭晓触发胜利礼花；
    - **俄罗斯方块 (`tetris`)**：方块横移/旋转/下落轻触、硬降下落硬核冲击感 (`vibrateImpact`)、消行 Combo 震感、升级与 Tetris 4行消强力反馈；
    - **水排序 (`watersort`)**：试管选定、倒水吸附确认、管子色液倒满理顺触觉强化；
    - **数独 (`sudoku`)、24点 (`math24`)、数桥 (`hashi`)、六边形消除 (`hexa`)、点灯 (`lightsout`)** 全量齐备主机级物理触感。
- **P2: 桌面端全局快捷键体系 (Desktop Keyboard Fluency: Esc / R / Z / U / H)**：
  - 在 `BaseGameComponent` 内置集中式全局键盘事件拦截器 (`handleGlobalKeydown`)，自动跳过 `input` / `textarea` / `select` 与可编辑元素：
    - **`Esc` 键**：快速关闭规则弹窗 (`showRules.set(false)`) 或收起移动端折叠导航，支持物理轻震感反馈；
    - **`R` 键**：单机模式或结算界面一键秒开新局，免去键鼠长距离位移与微型按钮点击；
    - **`Ctrl+Z` / `U` 键**：全局一键撤销（自动探查并安全调用底层 Store 或组件的 `undo()` / `canUndo()`）；
    - **`H` 键**：全局一键索取智能锦囊提示（自动桥接 `applyHint()` 或 `useHint()`）；
    - **子类友好重写与保护机制**：提供 `protected onKeyDown(event: KeyboardEvent): boolean` 钩子，支持自带方向键控制的游戏（俄罗斯方块、下落2048、推箱子等）优先消费特定按键，绝不冲突。
- **P3: 通关胜利“多巴胺”微动效 (Instant Victory Celebrations)**：
  - 在 `BaseGameComponent` 封装 `celebrateVictory()` 标准方法，解耦于滞后弹出的结算模态框：
    - 在玩家消除最后一个方块、拼成完整图画、解开最后一道题目的**第 0 毫秒**，瞬时触发屏幕左右双侧礼炮粒子迸发（Dopamine Confetti Cannon Burst）与胜利震动；
    - 完全适配 SSR 静态导出环境，内置 `prefers-reduced-motion` 无障碍防晕眩保护，带来即时满足的多巴胺奖赏感。
- **构建质量与测试**：
  - 修复五子棋组件类型导入与比对，全站通过 `npm run build` 严苛构建，497 条静态路由预渲染 100% 成功。

## [v3.2.48] - 2026-10-26

### BaseGameComponent 极简基类升级与全站 18 款游戏核心类深度瘦身 (BaseGameComponent DX Overhaul & Universal Cleanup)
- **`BaseGameComponent` 核心基类架构强化 (`base-game.component.ts`)**：
  - **默认 `playerId` 推导机制**：将原抽象 `abstract get playerId()` 升级为开箱即用的默认实现，自动从 `AuthStore` 读取当前登录用户名或游客 ID（`authStore.currentUser()?.username || authStore.guestId || 'Guest'`），所有子类免除重复声明；
  - **通用服务全局内聚托管**：将 `authStore`、`router`、`toast` / `toastService`、`audio` / `audioService`、`haptic`、`leaderboardService`、`gameRegistry`、`timerService` 统一收归基类注入；
  - **通用常量与模版工具全局可用**：内置 `GameDifficulty`、`GameStatus`、`GameMode`、`Math = Math`、`math = Math` 以及国际化快捷访问器 `get t()`，无需在各个子类模板中反复定义；
  - **开箱即用状态信号**：内置 `showRules = signal(false)` 与 `showOverlay = signal(false)`，统一控制逻辑；
  - **触觉反馈快捷调用（Haptic Shortcuts）**：内置 `vibrateLight()`、`vibrateMedium()`、`vibrateHeavy()`、`vibrateSuccess()`、`vibrateError()`、`vibrateSnap()`、`vibrateImpact()` 等语义化触感方法，零代码开销赋予全游戏细腻打击感。
- **全站 18 款游戏 TypeScript 逻辑类全面瘦身**：
  - 彻底清理全部 18 款游戏组件内部重复手写的枚举、服务注入、`playerId` getter 与状态信号，消除上千行冗余类代码；
  - 全站代码完全符合 `noImplicitOverride` 严苛编译器检查，通过 `npm run build` 严苛构建，497 条路由预渲染成功。

## [v3.2.47] - 2026-10-26

### 游戏基础框架架构跃迁：GameLayout 自动编排器集成与全站 18 款游戏极简重构 (GameLayout Auto-Orchestrator & Full 18-Game Migration)
- **`<app-game-layout>` 智能生命周期编排升级 (`game-layout.component.ts`)**：
  - 新增 `[store]="store"` 一键注入能力，将原本散落在各个游戏模板中的通用业务逻辑全面内聚收敛；
  - **自动接管联机等待房间**：处于非单人 `Waiting` 且非大厅选关视图时，全自动渲染 `<app-game-waiting-room>`，准备、取消准备、开始游戏、改设置、踢人等事件由框架底层闭环；
  - **自动接管 3 秒倒计时覆层**：进入 `Starting` 状态时，自动挂载 `<app-game-starting-overlay>` 与全局音效倒计时；
  - **自动接管终局结算浮层**：进入 `Finished` 状态时，自动挂载 `<app-game-result-overlay>`，自动判定胜负称号、联机比分、经验值动效、复活与再来一局/解散回调；
  - **100% 绝对向后兼容**：保留插槽自由度，兼容特殊观战浮层 `<app-game-spectating-overlay>` 与拖拽悬浮层。
- **全站 18 款现有游戏全面完成极简重构 (100% Complete Migration)**：
  - **已全部迁移**：`lightsout`、`sliding`、`minesweeper`、`connect`、`codebreaker`、`math24`、`nonogram`、`sokoban`、`sudoku`、`tetris`、`watersort`、`hexa`、`block`、`classic2048`、`drop2048`、`gomoku`、`idiom`、`hashi`；
  - **模板平均瘦身 40%~60%**：彻底清理各个组件内部手写的等待房间、倒计时覆层、结算覆层标签与冗余导入，消除数千行重复样板代码；
  - **零打包报错验证**：全项目通过 `npm run build` 严苛生产构建，497 条预渲染静态路由 100% 成功生成。
- **开发体验与新游戏效率跃迁 (DX Evolution)**：
  - 同步更新 `docs/HOW_TO_ADD_GAME.md` 与黄金标准模板，新增益智游戏开发工作量直降 70%，开发者仅需专注于实现游戏独有的棋盘/画布。

## [v3.2.46] - 2026-10-25

### 方块消除磁吸容错范围扩大、数字连线真实棋盘级图标重塑与文档体系轻量化维护 (Block Snap Radius Expansion, Connect Board-Accurate Icon Reborn & Docs Lightweighting)
- **方块消除磁吸容错范围大幅放宽 (`block.component.ts`)**：
  - 针对玩家反馈“吸附力要求对得太准、容错性低”问题，将原先单一格子判定升级为以目标点为中心约 1.65 格距离的全向格点探测；
  - 玩家拖拽方块在棋盘附近游走时，只要靠近合法落点即可平滑、灵动地“磁性吸附”，并触发细腻触觉震动 (`haptic.vibrateLight()`)，彻底根治像素级微调疲劳。
- **数字连线大厅 SVG 图标 100% 契合真实棋盘 (`connect.svg`, `lobby.component.html`)**：
  - 彻底推翻与游戏无关的抽象几何光圈，100% 忠实还原游戏内真实 5x5 棋盘规格；
  - 真实刻画深色底板、空格中心灰色方块点、40px 标准正交圆角管道与 1~5 号彩色数字宝石圆形端点，图标与游戏内界面严密呼应，版本更新至 `?v=6`。
- **玩家反馈与管理端 API 接口全局环境解耦修复 (`admin-feedback.component.ts`, `feedback.service.ts`)**：
  - 修复原本管理后台及反馈弹窗中硬编码相对路径 `/api/v1/...` 导致线上向 Web 前端域名 `www.puzzlepk.com` 发起请求而 404/看不到反馈数据的问题；
  - 规范接入 `environment.apiUrl`，自动根据生产环境映射至独立后端服务 `https://api.puzzlepk.com:8443/api/v1`，彻底恢复玩家反馈提交与后台列表审查。
- **文档与维护体系轻量化 (`CHANGELOG.md`, `FEATURES.md`)**：
  - 归档历史冗余长文至 `CHANGELOG_archive.md`，将 `CHANGELOG.md` 精简保持在最新 8 个版本内；
  - 重构 `FEATURES.md` 为清晰易读的系统架构、公共组件规范与 18 款游戏功能矩阵，大幅降低后期维护负担与解析耗时。

## [v3.2.45] - 2026-10-25

### 方块消除触控左上防遮挡偏移、经典2048设计系统全面统一与数字连线大厅专属炫彩极光SVG图标重铸
- **方块消除触屏左上方盲操与手部防遮挡优化 (`block.component.ts`)**：将触屏拖拽偏移调整至左上方象限（`fingerOffsetX = shapeWidth + 14`，`fingerOffsetY = shapeHeight + 36`），手指不再遮挡积木及目标落点。
- **经典 2048 视觉与交互全面接入平台标准设计系统 (`classic2048.component.html`, `classic2048.component.ts`, `classic2048.component.css`)**：
  - 接入全站通用 `<app-game-score-capsule>`，包含当前分、主题快速切换（经典/霓虹/极地）、步数计时及一键重开，右侧展示个人最佳与全网最高纪录；
  - 棋盘容器与空单元格全面接入全局 CSS 主题变量与圆角阴影体系，移除硬编码泥土色边框；
  - 接入标准紧凑型 `<app-game-toolbar>`，统一撤销（Undo）与重开体验。

## [v3.2.44] - 2026-10-25

### 移动端抽屉导航交互重塑、数字华容道即开即玩体验根治与方块消除触感磁吸虚影升级
- **移动端顶栏汉堡菜单右侧抽屉化 (`MainLayoutComponent`, `styles.css`)**：将原居左全屏式菜单重构为靠右停靠的滑动抽屉（`w-[300px] sm:w-[340px]`），贴合右手大拇指舒适操作区。
- **数字华容道单机即入即玩 (`sliding.component.html`, `sliding.store.ts`)**：彻底移除历史遗留的单机 Waiting 状态模糊遮罩与“开始游戏”按钮，进页即处于 Playing 状态，0ms 瞬间可推。
- **方块消除触觉磁吸与醒目虚影 (`block.component.html`, `styles.css`)**：新增 `.block-ghost-cell` 主题色高对比白虚线轮廓与微光呼吸脉冲，拖拽吸附瞬间触发轻微震感反馈。

## [v3.2.43] - 2026-10-25

### 全平台益智游戏难度本地持久化与记忆自愈体系升级
- **全平台标准化持久化工具 (`browser.util.ts`)**：新增 `getSavedDifficulty` 与 `setSavedDifficulty` 工具，兼容多历史键名；
- **全单机游戏难度记忆与关卡大厅联动**：数字华容道、点灯逻辑、推箱子、24点、连连看、方块消除、五子棋、扫雷、数独等全线实现单机难度本地记忆。

## [v3.2.42] - 2026-10-25

### 成语接龙大厅国风祥龙接龙专属 SVG 图标重铸与平板/宽屏全端字阶体验飞跃
- **国风祥龙 SVG 图标重塑 (`idiom.svg`)**：深宫茜红暗纹底板搭配金边祥云，腾飞翠玉金鳞祥龙护卫龙珠，串联立体浮雕骨牌；
- **平板端/宽屏大号字阶与触控区域升级**：放大顶部控制栏、神龙轨迹成语字号及四字插槽至 3xl~5xl。

## [v3.2.41] - 2026-10-25

### 全游戏工具栏“提示”按钮体验统一与广告逻辑解耦
- **提示按钮全站统一与文案纯净化**：移除“看广告提示”，全站工具栏统一为金色 💡 “提示”；
- **客户端 0ms 瞬间求助**：解除激励视频等待，点击直接派发 `hintApplied`，解题提示瞬间生效。

## [v3.2.40] - 2026-10-25

### 全站 PK 实时竞技性能风暴：经典 2048、推箱子、点灯逻辑与扫雷客户端乐观更新
- **0ms 极速滑动与硬件加速**：经典 2048、推箱子、点灯逻辑等全面引入客户端乐观更新，手势触发瞬间本地完成计算，消除网络往返粘滞感。
