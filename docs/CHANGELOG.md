# X-Game 更新日志 (Changelog)

> 早期历史版本详细日志已整理归档至 [docs/archive/CHANGELOG_archive.md](file:///home/zd/x-game/docs/archive/CHANGELOG_archive.md)。

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
