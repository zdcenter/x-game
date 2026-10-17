# Changelog

## [2026-10-17] - ⚔️ 全游戏通用电竞 PK 仪表盘 (GamePkHudComponent) 全矩阵覆盖与结算复仇流打通

### 🎮 彻底终结遗留老旧对战界面，全系游戏 100% 接入通用电竞 HUD
- **彻底根除遗留 `app-player-badge` 与 `hidden lg:block`**：
  - 针对此前仅部分游戏升级、其他游戏仍停留在旧版信息栏导致移动端被 `hidden lg:block` 吞噬、桌面端左右大面积空荡割裂的问题，展开全代码库地毯式升级；
  - **下落 2048 (`drop2048`)**：淘汰旧式卡片角标，全面接入 `<app-game-pk-hud>`，实时展示对战比分、状态与系列赛积分；
  - **数桥 (`hashi`)**：淘汰旧式角标，接入通用 HUD 并动态计算已建桥数与岛屿总容量百分比进度条（`store.bridges().length / totalTarget`）；
  - **水排序 (`watersort`)**：接入通用 HUD，深度解析试管纯色收拢状态并实时换算倒水完成度百分比与操作步数比较；
  - **连线拼图 (`connect`)**：消除仅展示对手单向徽章的缺陷，重构为双向电竞对垒 HUD，双翼实时呈现连线覆盖率对比；
  - **24点 (`math24` - 竞速与抢答)**：淘汰此前割裂的移动端悬浮 mini-hud 与桌面端独立 badge 方案，统一为全局通用 HUD，优雅支持答题冻结倒计时与题目完成度；
- **全系结算面板 (`app-game-result-overlay`) 仪式感与复仇闭环全覆盖**：
  - 为 `drop2048`、`hashi`、`watersort`、`connect`、`math24` 等所有游戏结算窗口全量补齐 `[isPkMatch]`、`[opponentInfo]`、`[pkSeriesScore]`、`[pkRoundFormat]` 以及 `(rematch)="handleRematch()"`，实现全平台统一的 Ready-Go 倒计时、电竞双翼战报大屏与败者一键发起复仇。

## [2026-10-17] - ✈️ PWA 离线畅玩体系与移动端手势触觉引擎重塑 (PWA Offline Gaming & Mobile Haptic Engine)

### 📦 生产级 PWA 离线服务工作线程重构 (`public/sw.js`)
- **彻底废除旧版自毁式 SW**：淘汰过去清空全部缓存并自注销的临时脚本，建立高韧性生产级 PWA Service Worker；
- **App Shell 与静态资源智能缓存**：
  - 核心静态资源（HTML、CSS、JS、字体、SVG 图标、多语言字典）采用 **Stale-While-Revalidate** 策略，即刻秒开，后台静默更新；
  - 页面导航请求采用 **Network-First + 离线 SPA 降级**，即使在飞行模式或地下车库无网络环境下，仍能瞬时唤醒应用并完全加载任意单机游戏；
  - 智能旁路 WebSocket 握手 (`/ws/`)、动态认证与管理员接口，杜绝干扰联机状态机与网络实时对战。

### 🔄 离线战绩队列与联网全自动补同步 (`OfflineSyncService` + `GameStatsService`)
- **无缝离线单机游玩**：
  - 严格遵循准则第 5 条（单机游戏 100% 运行在客户端内存），当用户离线断网时，结算请求不再抛出网络阻断异常，而是自动生成离线战报；
  - 成绩数据安全入队暂存至本地持久化队列 (`xgame_offline_stat_queue`)；
- **重连秒级自动补提交**：
  - 监听浏览器 `online` 恢复连接事件，全自动异步遍历本地离线队列，按序逐一同步至云端 `/api/v1/stats/:gameId`；
  - 同步完成后智能弹出轻量 Toast 提示：`离线战绩已自动同步到云端 ({count} 局)`，确保玩家在飞机、地铁等极端环境下的闯关记录绝不丢失。

### ✈️ 全局非侵入式离线状态胶囊 (`OfflineBannerComponent`)
- **智能感应网络状态**：
  - 深度嵌入全局统一视图 `<app-game-layout>`，一旦离线立刻在游戏控制条上方显现琥珀色毛玻璃胶囊横幅；
  - 动态展示 `✈️ 离线畅玩模式：单机游戏完全在本地运行，网络恢复后将自动同步战绩`；
  - 若已暂存未提交战绩，右侧高亮附带 `已暂存 N 局` 胶囊；连网同步中显示 `🔄 正在同步离线战绩...`。

### 📱 PWA 一键安装与 iOS 主屏幕快捷引导
- **多端安装 CTA**：
  - 在游戏顶部控制条中智能感知 `beforeinstallprompt` 事件，外露轻量 `📱 安装` 快捷按钮，支持一键保存为独立桌面/手机 App；
  - 针对 iOS Safari 环境，提供优雅的居中向导弹窗，图文分步指引用户点击底栏【分享 ⬆️】并选择【添加到主屏幕 ➕】。

### 📳 移动端手势防误触与四维触觉引擎全面落地 (`HapticService`)
- **四维语义化触觉模式扩展**：
  - `vibrateSwipe()` (10ms)：极度轻快微震，专为快速滑动与网格穿梭打造；
  - `vibrateSnap()` (20ms)：清脆机械吸附感，专为方块落槽、插旗与合并打造；
  - `vibrateCombo()` (`[18, 30, 24]`ms)：节奏级联脉冲，专为消除连击与多行清空打造；
  - `vibrateImpact()` (45ms)：实心重击，专为硬降与边界撞击打造；
- **全矩阵游戏手势与触感升级**：
  - **经典 2048**：棋盘搭载 `touch-none select-none`，彻底杜绝上下滑动时的手机页面橡皮筋滚动；滑动位移触发微震，方块合并与破纪录提供递进震动；
  - **华容道 (Sliding)**：单指滑动与点击推块均响应 10ms 触觉回馈，零延迟随手感而动；
  - **经典扫雷 (Minesweeper)**：移动端长按 400ms 插旗触发清脆吸附震感，点击翻开方块提供轻触反馈；
  - **俄罗斯方块 (Tetris)**：左右位移与旋转触发轻微段落感，快速下甩硬降瞬间触发 45ms 落地重击；
  - **方块消消乐 (Block)**：手指导引拾取触发轻震，松手落入棋盘精准触发卡槽吸附微震；
  - **六角消除 (Hexa)**：六边形拖拽放置与蜂窝对齐瞬间触发物理触觉咬合感。

## [2026-10-17] - ⚡ PK 对战全链路仪式感重塑：街机级开局倒计时 (Ready-Go) 与全屏粒子胜负结算/复仇弹窗 (Esports PK Ceremony & Rematch)

### ⚔️ 街机级 Ready-Go 开局倒计时仪式感重塑 (`GameStartingOverlayComponent`)
- **同心旋转能量环与脉冲震波**：
  - 倒计时数字背景新增顺时针与逆时针双层青蓝/紫罗兰虚线能量环 (`animate-spin`)；
  - 每一秒数字切换伴随全屏外扩高斯模糊脉冲光环 (`animate-ping`)；
- **Web Audio 纯合成电影级音效**：
  - 倒数 3、2、1 精准播放清脆电子脉冲音 (`countdown` 600Hz / 800Hz / 1000Hz)；
  - 归零或 GO 瞬间触发高规格自研合成器音效 `countdown_go`：140Hz 震撼低音下潜（Sub-bass Dive）搭配 C 大调明亮合成铜管三和弦（1046.5Hz、1318.5Hz、1567.98Hz），配合 `⚔️ BATTLE START!` 鎏金切角徽章，极度点燃玩家开局肾上腺素。

### 🏆 全屏粒子胜负结算与双翼对决战报 (`GameResultOverlayComponent`)
- **全屏双侧礼炮级联轰击**：
  - 胜利判定解绑单人模式限制，联机 PK 获胜瞬间触发连续 4 波双侧夹角 45° 彩带礼炮与星辉粒子漫天泼洒 (`fireVictoryConfetti`)，胜利成就感拉满；
- **1v1 双翼战报台 (PK Duel Summary Deck)**：
  - 智能呈现对战双方真实头像、昵称、👑 胜者皇冠与高亮 `WINNER 🏆` / `DEFEAT` 战况标签；
  - 顶部集成系列赛总比分牌 `(BO3: 2 - 1)` 与 `result.pk_vs_summary` 国际化文案；
  - 全面使用全局 CSS 变量（`--color-bg-card`, `--color-border-card` 等），严格告别硬编码暗色类，Light/Dark 主题无缝适配；
- **复仇弹窗与高能 CTA 引导**：
  - **战败者视角**：独家呈现紫罗兰/赤焰流光高对比度复仇按钮 **`⚔️ 发起复仇 (Rematch) [Space / R]`**，瞬间点燃逆风翻盘斗志；
  - **胜者视角**：呈现黄金烈焰 **`⚡ 再战一局 (Play Again) [Space / R]`** 荣耀守擂按钮；
  - **键盘极速重开支持**：支持 `Space` 与 `R` (`KeyR`) 瞬发触发复仇/重开请求，并在事件触发前自动检测聚焦输入框，智能规避打字冲突。

### 🎮 全矩阵游戏无死角落地
- 全面适配并赋能：**数织 (Nonogram)、经典扫雷 (Minesweeper)、俄罗斯方块 (Tetris)、滑动拼图/华容道 (Sliding)、经典 2048 (Classic 2048)、方块消除 (Block Puzzle)、六角消除 (Hexa Puzzle)、推箱子 (Sokoban)、关灯游戏 (Lights Out)** 等；
- 所有文案均收录于 `zh.json` 与 `en.json`，无任何硬编码英文或中文字符串。

## [2026-10-17] - ⚔️ 通用电竞级联机对战 HUD 仪表舱重塑 (Universal Esports PK Duel HUD Console)

### 🏆 彻底淘汰老式离散卡片与大片空白，构建全端自适应对战控制台
- **设计目标与痛点根治**：
  - 根治原先各游戏在联机对战时使用固定宽度 `app-player-badge` 导致的右侧大片空白（>180px 视觉断层）；
  - 根治此前部分游戏联机模式因硬编码 `hidden lg:block` 导致移动端/手机端无法实时看到对手进度的问题；
  - 告别仅有小头像与简陋 `0% PROG` 文字的粗糙界面，升级为街机/电竞级专业双翼对战控制台。
- **全新独立高复用通用组件 `GamePkHudComponent` (`app-game-pk-hud`)**：
  - **1v1 双翼对称竞技台 (Symmetrical Duel Console)**：
    - **我方翼舱 (Left Wing)**：发光渐变头像环、房主王冠 👑、"我"身份标识、大字号等宽百分比/分数、青蓝霓虹动态斜纹进度条（带流光动效与荧光端头）；
    - **中心对决枢纽 (Center Hub)**：
      - 黄金/赤焰渐变切角徽章 `⚔️ VS`；
      - 赛制与大比分显示（多轮赛自动识别并渲染 `BO3` / `抢3胜` 与系列比分 `1 - 0`）；
      - 实时对决时钟：精准展示对局已用时 `⏱️ 00:04`；
      - 动态差值指示舱 (Lead/Lag Delta)：实时自动计算两名玩家的进度差或分值差，智能展示 `🟢 +25% 领先`、`🔴 -15% 落后` 或 `⚪ 持平`；
    - **对手翼舱 (Right Wing)**：对称镜像排版，玫粉/紫罗兰对决强调色渐变条，清晰洞察对手实时操作。
  - **3+ 多人房间自适应排行榜网格 (Leaderboard Grid)**：
    - 当房间超过 2 人时，自动平滑无损降级为 1~4 列自适应卡片网格，展示名次徽章（🥇/🥈/🥉/#4）、玩家信息、紧凑进度条与指标，容器充满无白边。
  - **手机端极速微缩条 (Mobile Streamlined HUD)**：
    - 在 `< 640px` 手机屏幕上自适应转换为 44px 紧凑双条 HUD（双方微缩头像、比分、中间 VS 徽章与对向流光进度槽），手机玩家一目了然且绝不挤占垂直棋盘空间。
- **首批接入与全游戏全面落地 (Comprehensive Multi-Game Rollout)**：
  - **数织 (Nonogram)**：彻底替换旧版两端孤立卡片，完整接入全局 `myPlayerPkStats` 与 `opponentsPkStats`；
  - **推箱子 (Sokoban)**：接入通用 PK HUD，对称展示步数 `🦶 24`、用时与目标箱子归位进度；
  - **扫雷 (Minesweeper)**：支持「竞速模式 (Speed)」与「同盘抢雷 (Steal)」，动态切换剩余雷数 `💣`、抢占得分 `⭐` 与失误计数 `❌`；
  - **华容道/滑动拼图 (Sliding Puzzle)**：实时计算并对比双方数字拼图归位百分比与移动步数 `🔄`；
  - **经典 2048 (Classic 2048)**：对称展示双方实时得分与盘面最大合成方块 `🏆 Max Tile`；
  - **俄罗斯方块 (Tetris)**：电竞双翼展示双方下落消除总行数 `≣ LINES` 与对战积分；
  - **方块消消乐 (Block Puzzle)**：实时展示摆放消除积分与存活/淘汰状态；
  - **六角消除 (Hexa Puzzle)**：动态展示消除得分与即时连击倍率 `🔥 COMBO`；
  - **数独 (Sudoku Speed & Steal)**：竞速模式展示 81 格排查进度百分比 `(N/81)`，抢夺模式展示抢占得分；
  - **移动端全面解封**：彻底移除此前在多个游戏中针对移动端直接隐藏对战信息的 `hidden lg:block`，无论手机、平板还是桌面均能无死角查看对手动态。
  - 严格遵循全局 CSS 变量（`--color-bg-card`, `--color-border-card` 等），Light/Dark 主题无缝适配；所有提示与状态文本统一由 `i18n.service.ts` 字典驱动。

### 🚪 解决联机进房遮挡体验：PK 抽屉与黑色毛玻璃蒙层全自动闭合 (Auto-Close PK Drawer on Join)
- **问题根因定位**：从游戏内右上角打开“PK 竞技场”呼出右侧抽屉面板后，点击“加入房间 / 重新进入 / 创建房间”时，虽然底层已切换至联机等待大厅，但抽屉的 `isPkDrawerOpen` 状态未自动复位为 `false`，导致右侧抽屉面板持续驻留、全屏黑色半透明蒙层 (`bg-black/50 backdrop-blur-sm`) 持续模糊遮挡正中央的等待大厅；
- **全链路自动收起机制**：
  - 在 `GameLayoutComponent` 中：在 `handleJoinRoomFromLobby`、`handleCreateRoomFromLobby`、`quickCreatePkRoom` 以及 `ngOnChanges(currentRoomId)` 中统一自动调用 `togglePkDrawer(false)`；
  - 在 `BaseGameComponent` 中：`handleJoinRoom` 与 `handleCreateRoom` 中同步调用 `this.gameLayout.togglePkDrawer(false)`，即使二次点击已在房间的“重新进入”也能立即秒关抽屉并呈现等待大厅；
  - 玩家点击加入或创建房间的瞬间，抽屉平滑滑出视野，黑色遮罩立即清除，双翼等待大厅一览无余地呈现在中央。


### 🕹️ 告别老式头像占位，接入街机级三联 HUD 仪表舱 (Modern Triad HUD Console)
- **单人模式彻底重构顶部信息栏**：
  - 彻底淘汰原先遗留的通用 `app-player-badge` 玩家卡片（带多余的 "G HOST" 游客头像与暗色边框）；
  - 升级为与棋盘 460px 宽度严格等宽垂直对齐的现代化街机控制台；
  - **三联数据卡舱 (Triad Stats Cards)**：
    - **当前得分 (SCORE)**：加粗渐变大数字，搭配动态 `+Score` 浮动微动效；
    - **👑 最高纪录 (BEST)**：集成 localStorage 离线持久化与历史破纪录追踪，高亮皇冠徽章激励挑战；
    - **⏱️ 用时与 🔄 步数卡**：精炼紧凑上下双行排版，提供精准解题节奏数据；
  - **右上角快捷重开 (Quick Restart)**：紧凑胶囊按钮支持一键清空重来，无需等待游戏结束。

### 🎨 三套极高质感主题一键随心换 (3 Distinct Selectable Themes)
- **顶部胶囊式主题分段选择器 (Theme Selector Pill)**：
  - **🪵 原木经典 (Wood Classic)**：复刻经典 2048 原汁原味的温暖陶土与象牙暖色调，深浅模式细腻适配；
  - **⚡ 微晶霓虹 (Cyber Neon)**：深邃黑曜石棋盘底槽，搭配电竞级青蓝、紫罗兰、荧光绿高透晶体方块与霓虹辉光；
  - **🧊 极地冰晶 (Glacier Ice)**：深海极地冰蓝棋盘与高光冰霜方块，配合白金晶莹文字与冷光倒角；
  - **本地持久化记忆**：所选主题自动记忆在 `localStorage`，刷新页面或重新进入无缝保持玩家偏好。

### 🔊 动作音效与动态手感强化 (Dynamic Motion & Audio Feedback)
- **平滑动画与合成手感**：
  - 新增 `c2048-tile-pop` 脉冲弹性缩放动效，当合成新方块时触发柔和弹跳；
  - 集成 `AudioService`：键盘滑动或触控滑动播放轻快滑动音效，数字碰撞合成触发清脆连击音效；
  - 单人模式取消繁琐的“开始对战”全屏阻断遮罩，进入页面即可即刻滑动开局；
  - 全流程多语言国际化支持（中文、英文及全部多语系字典）。

## [2026-10-17] - 📐 布局架构大一统：推箱子、数字连线与成语益智全面重塑迁入通用 GameLayoutComponent

### 🧩 告别遗留“左中右”老式割裂架构，接入全局自适应游戏舞台 (Unified Layout Migration)
- **推箱子 (Sokoban)**：
  - 彻底淘汰原先遗留的左侧 SEO 侧边栏与右侧静态大厅面板；
  - 升级为通用 `<app-game-layout>` 架构：顶部集成一体化玻璃拟态游戏标头（带关卡进度、返回与规则弹窗）；
  - **棋盘顶部 HUD 仪表舱重塑（单行对齐）**：将此前垂直堆叠成两行的“大厅按钮”、“移动步数”和“用时计时”深度重构为**单行水平 HUD 控制台**，左右对齐 520px 棋盘宽度（左侧为带关卡徽章的“选关大厅 #N”快捷按钮，右侧为步数与时间双仪表胶囊），释放超过 60px 纵向高度，棋盘获得更充裕的显示尺寸与居中呼吸感；
  - 保留单人选关大厅 (`app-sokoban-lobby`) 与经典推箱子推子棋盘，中央舞台空间提升 60%，专注无打扰；
  - 联机房间面板重塑为按需呼出抽屉，规则指南与 SEO 模块沉淀至棋盘正下方。
- **数字连线 (Connect)**：
  - 彻底移除了遗留的 3 栏“左中右”布局，接入统一 `<app-game-layout>` 标准；
  - 标头动态响应当前难度关卡信息与模式指示，集成“返回关卡大厅”快捷按钮；
  - 整合单人关卡切换器与选关面板 (`app-connect-lobby`)，棋盘居中呈现，消除一切多余嵌套边框；
  - 右侧大厅统一由标准抽屉呼出，保持平台全端风格一致。
- **成语益智 (Idiom)**：
  - 彻底移除了遗留的 3 栏左侧常驻 SEO 栏与右侧大厅面板，消除各个子视图内冗余重复的 `<app-game-header>`；
  - 使用统一 `<app-game-layout>` 统领 4 大视图（极速填空 PK、成语主大厅、填空闯关学习模式、每日成语猜词 Wordle）；
  - 标头根据当前子视图自动切换副标题、主题渐变色与动态图标（Wordle 绿色渐变/🟩，填空紫色渐变/📖，PK 闪电/⚡）；
  - 右侧操作区动态展示词汇掌握量统计、每日猜词人数、难度切换与战绩比分；
  - 深度成语文化解析与解谜攻略下移至底部，构建统一美观、自适应且对未来维护一次改动全局生效的高可维护性架构。


### 🎮 按键操控与防浏览器滚屏修复 (Controls & Scroll Lock Fix)
- **彻底根治按键滚屏 Bug (Page Scroll Prevention)**：
  - 移除了棋盘组件原先未经事件拦截（未调用 `event.preventDefault()`）的底层按键监听；
  - 在主页面统一挂载全局 `@HostListener('window:keydown')`，严格拦截 `ArrowDown`、`KeyS`、`Space`、`ArrowLeft`、`ArrowRight` 等游戏按键的默认浏览器行为（`event.preventDefault()` 与 `event.stopPropagation()`），保证在任何屏幕与浏览器中按向下键或空格键绝对不会触发页面滚动条下拉；
- **分立软降 (Soft Drop) 与硬降 (Hard Drop) 核心动作**：
  - **向下键 (`↓` / `S`) -> 软降加速落子 (Soft Drop)**：在 `Drop2048Engine` 中实现独立步进下落（逐步加速或连续下落），每步伴随清脆位移音效，触碰障碍或底槽时立即平稳着陆；
  - **空格键 (`SPACE`) -> 硬降直落到底 (Hard Drop)**：瞬间直落至投影目标行，触发着陆波纹与触觉震动反馈；
  - **左右键 (`← →` / `A D`)**：精准在 5 列网格间换列移动。

### 🕹️ 双翼电竞街机控制台重塑 (Dual-Wing Arcade Console & HUD)
- **顶部极简毛玻璃胶囊 HUD (Glass Capsule HUD)**：
  - **金色金星得分 (Score ⭐)**：醒目展示当前得分，配合优雅渐变数字；
  - **关卡徽章 (LV)**：动态展示当前速度等级，达到连击时触发脉冲火焰徽章（`🔥 xN`）；
  - **皇冠纪录 (Best 👑)**：实时比对并展示个人最高得分记录；
- **左翼控制台 (Left Wing Console)**：
  - **等级进度卡**：大字体展示关卡与升级进度条；
  - **PC 快捷键指南卡**：直观展示键盘操作指引（`← →` 左右移动、`↓ / S` 软降加速、`SPACE` 硬降直落）；
- **右翼控制台 (Right Wing Console)**：
  - **NEXT 独立预览舱**：高清晰度立体 3D 晶体方块预览即将落下的数字方块；
  - **AFTER 预判舱**：紧凑预览再下一个数字方块，给予玩家充裕规划深度；
  - **连击火焰指示卡 (STREAK 🔥)**：动态追踪连续合成连击数；
- **中央矩阵棋盘纯进化 (Clean Matrix Frame)**：
  - 彻底移除了原先棋盘内部被方块重叠遮挡的模糊英文文字水印；
  - 剔除了容易导致渲染模糊的 `scale-[1.25]` CSS 变换，采用原生响应式单元格尺寸（PC 64px / 平板 58px / 手机 54px），画面极致细腻锐利；
- **全端与移动端触控适配 (Mobile Controls & Swipes)**：
  - 手机端顶部精简展示等级与双重 NEXT 胶囊；
  - 手机端底部提供专用虚拟操控按键（`◀` `▼` `▶` `⚡`），支持滑动手势（左右滑换列、下滑软降、急速下甩硬降），全设备丝滑游玩。

## [2026-10-17] - 🧱 俄罗斯方块视觉纯净化与复活高能消融重塑 (Tetris Pure Focus & Revive Dissolve FX)

### 🧹 消除位移残留与暗色反光尾影 (Tail Smear & Shadow Elimination)
- **彻底根除方块位移拖影（Motion Smearing & Ghosting Elimination）**：
  - **移除了网格单元格多余的 CSS 延迟过度（`transition-all duration-75`）**：在传统下落和左右快速移动时，方块更新实现 100% 毫秒级零延迟瞬切，彻底杜绝方块离开后因 75ms 渐隐延迟形成的“暗色拖尾/模糊残影”；
  - **净化晶体倒角向外扩散的投影（Drop Shadow Cleanup）**：剔除方块原先向下方与四周辐射的外部黑雾阴影（`0 2px 4px rgba(0,0,0,0.35)`），仅保留纯内嵌立体倒角，避免向下方未填充区域投射暗色遮罩；
  - **棋盘底槽扁平纯净化**：移除了 `.tetris-empty-slot` 的内凹反光与多重阴影，防止空单元格顶部高光与位移产生伪反光重影；
  - **底部着陆虚影优雅适配 (Landing Ghost Only)**：
    - 仅当方块与底部着陆点相距较远（$\ge 2$ 格）时，才在最底部展示轻量半透明的着陆参考边框；
    - 绝不在方块贴身 1 格内生成任何伪尾影，且虚影完全不带 3D 棱光白亮反光条（`.tetris-solid-cell::after`），视觉干净清爽。

### ✨ 全新重塑单机复活“高能消融”特效 (Energy Dissolve & Vaporize Rebirth)
- **告别拖沓漫长的碎块爆米花，升级为 550ms 殿堂级能量消融**：
  - **激光消融光幕扫描 (Laser Dissolve Beam)**：复活时在危机区域顶部唤出一道炽烈青白/金黄色的水平激光能量光波，平滑向下横扫净化堆积过高的危险方块；
  - **微晶消解与热光斑升华 (Cell Dissolve & Melting FX)**：被光幕扫过的方块瞬间泛起强能量耀斑（`brightness(3.2)`），晶体质感随之向内熔解消隐（`.tetris-dissolving-cell`）；
  - **升华微尘粒子 (Dissolve Embers)**：方块消融时向上释放数十颗轻盈浮动的微光星尘粒子，呈现物质被高能气化升华的梦幻质感；
  - **定制升华音效 (Web Audio Dissolve FX)**：配合带通滤波高能激光扫掠与空灵上滑音和弦；
  - **平稳沉降重构**：消融完成后，未消融的存量方块整齐平稳沉降到底部基盘，为玩家腾出开阔安全空间，无缝恢复游戏。

## [2026-10-17] - 🧱 俄罗斯方块 (Tetris Pro) 殿堂级重铸：双翼电竞街机控制台、3D 微晶方块与激光消融震撼打击感

### 🕹️ PC 端双翼电竞街机布局 (Grand Dual-Wing Arcade Console)
- **彻底告别 PC 端单薄局促感，重塑沉浸电竞舞台**：
  - PC 端采用宽阔对称的 **双翼机甲控制台（Dual-Wing Arcade Console）** 布局，居中矩阵主棋盘宽阔大气，左右对称；
  - **左翼 · 暂存与操作核心 (Left Wing)**：
    - **HOLD 暂存舱**：内嵌 4x4 高清晶体舱位，支持快捷键 `[C]` / `[Shift]` 或点击即时交换暂存块；当锁定无法交换时自动呈现微暗锁定态；
    - **LEVEL 核心仪表盘**：电竞数字大字呈现关卡等级，配备实时速度刻度条；
    - **PC 快捷键指南卡**：直观展示键盘按键映射（`← →` 移动、`↑ / Z` 旋转、`↓` 软降、`SPACE` 硬降直落、`C` 暂存换块）。
  - **右翼 · 预判与连击核心 (Right Wing)**：
    - **NEXT 预览队列舱**：呈现 Primary Next（大尺寸高清预览）+ Secondary Queue（接下来第 2、第 3 个方块微缩排布），让高阶玩家拥有充分策略预判空间；
    - **STREAK 连击卡**：实时连击火焰计数器（`🔥 STREAK xN`）。

### 🎨 棋盘与微晶宝石材质重塑 (Arcade Matrix & Crystal Jewel Blocks)
- **矩阵深渊凹槽底座 (Recessed Slot Matrix)**：
  - 终结原先粗糙的灰白平板，升级为深邃沉浸的 3D 内凹立体格子（`.tetris-empty-slot`），带有微弱暗网格内阴影与金属边框；
- **次时代 3D 棱光高光晶体 (3D Crystal Bevel Reflection)**：
  - 全系方块采用微晶倒角、顶部 35% 镜面反射光斑（`.tetris-solid-cell`）与立体阴影；
  - **Ghost Piece（落点投影）**：升级为主题色霓虹发光虚线与呼吸微光（`.tetris-ghost-cell`），落点极度精准显眼；
- **首创自由主题调色板切换 (Chroma Crystal / Amber Gold / Cyber Ice)**：
  - 支持玩家在 **💎 霓虹水晶 (经典7色电竞宝石)**、**👑 皇家琥珀 (高贵暗金纯色系)**、**🌊 赛博极冰 (未来冷调冰蓝纯色系)** 间一键无缝切换，本地自动持久化存储。

### ⚡ 0.18s 极速激光消融与全屏绝杀横幅 (Laser Clears & Epic TETRIS Burst)
- **180ms 黄金消除过渡动效**：
  - 告别行瞬间消失的生硬生冷感，满行时触发白热激光横扫（`.tetris-clearing-cell`）与爆裂晶屑粒子；
  - 180ms 之后行平滑坍缩掉落，节奏紧凑爽脆，完全不阻碍手速；
- **⚡ TETRIS! 4行绝杀爆屏横幅**：
  - 当打出 4 行消行（TETRIS）时，屏幕中央弹出震撼的金色炫彩闪电大字横幅与全屏微震！
- **电影级合成音效进阶 (Dynamic Harmonics Web Audio)**：
  - `hardDrop`：超低频 55Hz~32Hz 机械重击爆鸣；
  - `hold`：轻快变幻滑音；
  - `clear`：分级和弦（1行清脆、2行明亮大三和弦、3行辉煌和弦、4行 TETRIS 震撼低音轰鸣 + 晶体碎裂白噪 + 华丽大和弦四重奏）。

### 📱 移动端自适应与掌机虚拟按键 (Mobile Ergonomics)
- 移动端自动将 HOLD 与 NEXT 优雅整合至棋盘上方左右两侧；
- 棋盘占据屏幕中心黄金视野，提供直观的掌机触控虚拟操作栏（左移、右移、旋转、软降、硬降直落），同时 100% 兼容原生顺滑手势滑动。


### 🚀 消除体验痛点根治与动画提速 (Snappy Clear & Zero Delay)
- **告别 750ms 拖沓卡顿，实现 220ms 极速爆破坍缩**：
  - 彻底重构消融状态机：将消除超时从沉闷迟滞的 750ms 压减至 **320ms**，消除动画时长提速至 **220ms**；
  - 级联消除波纹微延迟由 25ms 压缩至 **12ms**，整行/整列消除如同激光横扫，爽脆利落，手感丝滑跟手；
  - 消除动画升级为高光亮白暴击膨胀（`scale(1.26)`）+ 极速坍缩消散（`cubic-bezier(0.16, 1, 0.3, 1)`），消除瞬间凹槽立刻露出。
- **微晶宝石材质与主题随心切换 (Jewel Shader & Theme Toggle)**：
  - **方块质感跃迁**：全系方块增加内倒角微晶高光（`box-shadow: inset 0 1.5px 2px rgba(255,255,255,0.75)`）与微立体边框，告别平淡塑料片感；
  - **首创自由主题调色板切换**：顶部控制台内嵌调色板按钮，支持在 **💎 微晶幻彩**、**👑 琥珀流金**、**🌊 深海冰晶** 间一键无缝切换，本地自动持久化；
  - 底座凹槽增加细腻内阴影与圆角设计，深浅色主题自适应。
- **轻奢悬浮 HUD 与多巴胺视听 (Modern Glass HUD & Cinematic Audio)**：
  - 废除原先单调生硬的粉色框和红色数码管，升级为微透毛玻璃流光胶囊（金星分数徽章、连击火焰能量条、王冠最佳纪录）；
  - 接入电影级 Web Audio 合成音效：超重低音轰鸣（Sub-bass Boom）+ 清脆水晶爆裂（Crystal Shatter）+ 动态升调纯净琶音；
  - 消除时弹出发光赞美浮空条（`✨ CLEAR!`、`⚡ DOUBLE CLEAR!`、`💥 TRIPLE CRUSH!`、`👑 BLOCK MASTER!`），配合 36 颗全屏爆裂星芒火花粒子喷泉。

## [2026-10-17] - 💎 六边形消除殿堂级升级：微晶宝石美学、碎钻爆炸粒子与电影级打击音效 (Hexa Jewel Overhaul & Crystal Explosion)

### 🎨 视觉美学与色彩体系重塑 (Aesthetics & Color System)
- **色彩设计破局（单一优雅 vs 和谐微晶自由切换）**：
  - 彻底终结过往红绿蓝粉塑料贴纸般的杂乱马赛克感，精选 6 种色彩和谐的 **💎 微晶宝石色调 (Chroma Crystal)**；
  - **首创自由主题调色板切换**：顶部控制台内嵌调色板按钮，玩家可一键在 **💎 微晶幻彩 (Chroma Crystal)**、**👑 琥珀流金 (Royal Amber Gold - 纯净单一轻奢单色系)**、**🌊 深海冰晶 (Ocean Ice - 冰川冷调单色系)** 之间随心秒切，本地自动持久化；
- **施华洛世奇切面水晶材质 (Crystal Facet Reflection)**：
  - 所有方块单元格升级为双层渲染结构：不仅拥有高饱和柔和渐变底色，顶部还带有 **45° 玻璃微晶高光切面折射 (Facet Highlight)** 与晶莹反光棱线，无论备选区、拖拽中还是棋盘上，均展现出温润剔透的真实宝石质感；
  - 棋盘底座升级为立体微凹卡槽（`Permanent Inset Slot`），深浅色主题自适应，宛若奢华宝石首饰托盘。
- **告别生硬数码管，升级轻奢悬浮 HUD (Modern Glass Dashboard)**：
  - 废黜突兀的红框黑底生硬数字，重构为微透毛玻璃流光胶囊：当前得分金星徽章、动态连击火焰能量条（`🔥 2x COMBO` / `⚡ MEGA 4x`）、最佳纪录王冠徽章。

### 💥 爆炸打击感与视听多巴胺狂飙 (Explosion Blast & Cinematic Audio)
- **六方位晶钻物理爆碎粒子 (Crystal Shards Blast)**：
  - 消融发生时，不仅拥有中心极速光爆环，每个被消除的六边形向周围 6 个对称轴高速喷射出 6 颗高亮碎钻星芒粒子（`hexa-shard-spark`），飞溅、旋转、衰减消散，呈现满屏璀璨晶屑飞掠的极致打击感！
- **电影级合成音效全面重铸 (Sub-bass Impact & Crystal Shatter)**：
  - **落槽音 (Place)**：升级为清脆解压的微点击瞬态（Transient Pop）+ 短促温润微晶吸附声；
  - **爆炸消融 (Clear)**：42Hz~95Hz 超重低音冲击波（Sub-bass Boom）+ 高频带通白噪模拟水晶瞬间碎裂的爽脆脆响（Crystal Shatter）+ D大调纯净水滴琶音（随连击数动态爬升八度），给玩家带来欲罢不能的心流爽感！
- **电竞级赞美浮空条与多阶震屏 (Juicy Praise Banners)**：
  - 根据消除行数与 Combo 数动态触发 `✨ CLEAR!`、`⚡ DOUBLE CLEAR!`、`💥 TRIPLE CRUSH!`、`👑 HEXA GODLIKE!`，伴随 32 颗全屏流星粒子喷泉。

## [2026-10-17] - ⚔️ 联机等待大厅双翼对决大屏与扫码互通重构 (PK Waiting Room Grand Battle Arena)

### ✨ 新功能与重构 (Features & Redesign)
- **告别 PC 狭窄压抑，升级至宽阔大屏 (Grand Duel Arena Layout)**：
  - 将原本限制在 512px (`max-w-lg`) 狭窄管道的等待大厅，全面重构扩展至最高 1024px (`max-w-4xl xl:max-w-5xl`) 的电竞级对决大屏，在大屏幕下视野宽阔、左右对称、气势磅礴。
- **PC 端双翼功能分区架构 (Dual-Wing Layout on PC)**：
  - **左翼 · ⚔️ 双人对决擂台 (Combat Arena)**：
    - 房主与挑战者采用大尺寸对立战术舱布局，配有高品质头像、段位称号、动态高光准备光环（绿光已就绪 / 金光房主就绪）与金属质感微动效 `VS` 徽标。
    - 挑战者空席状态下，以极具呼吸感的高级玻璃拟态虚位以待，提供一键 `👥 呼叫在线好友` 与 `🔗 复制邀请链接` 两个明确动作，彻底剔除原本三处重复堆叠的混乱按钮。
  - **右翼 · 📡 邀请互通与对局操作台 (Gateway & Match Controls)**：
    - **跨端秒连卡**：高清单色二维码面对面扫码（支持手机微信/系统相机秒进房间），搭配带即时复制动效的邀请链接按钮。
    - **对局操作控制台**：房主专属的全局呼吸渐变 `[ ⚔️ 开始对决 ]` 大能量键（未就绪时禁用并附带贴心提示），以及对称的 `[ 🚪 退出房间 ]` 与 `[ ⚙️ 切换游戏/设置 ]`。
- **全端响应式与全主题变量适配 (100% Responsive & CSS Vars)**：
  - 移动端（手机/iPad）自动优雅收敛为垂直流式卡片，零横向滚动条，触控舒适；
  - 严格使用全局 CSS 变量（`var(--color-bg-card)`, `var(--color-bg-main)`, `var(--color-border-card)`），深浅色主题无缝切换；
  - 全新补充房间号一键复制、对决擂台席位等多语言词条，严禁硬编码。

### 📝 文件变更
- `frontend/src/app/shared/components/game-waiting-room/game-waiting-room.component.html` — 全面重构等待大厅双翼对战大屏与操作台
- `frontend/src/app/shared/components/game-waiting-room/game-waiting-room.component.ts` — 新增房间号与链接复制动效信号
- `frontend/src/assets/i18n/zh.json` & `en.json` — 补充等待大厅多语言词条

## [2026-10-17] - 🏆 游戏结算成就大面板与社交 PK 邀请舱重构 (Game Result Overlay & PK Challenge Deck Redesign)

### ✨ 新功能与重构 (Features & Redesign)
- **宽阔大气的成就荣誉大屏 (Grand Achievement Dashboard)**：
  - 解除原有 448px (`max-w-md`) 逼仄单薄的垂直管状布局，扩展至最高 680px (`max-w-xl sm:max-w-2xl`) 的控制台级成就荣誉卡片，消除原本“稀疏空洞、小家子气”的视觉痛点。
  - 顶部集成大面积环境光晕（胜利金黄 / 惜败紫红）与动态 3D 浮雕荣誉徽章（👑 胜利皇冠 / 🏆 连胜奖杯 / 🛡️ 不屈之盾），并搭配新纪录高光标签与胜利粒子动效，显著强化通关仪式感。
- **高对比多维战绩矩阵 (Multi-dimensional Performance Matrix)**：
  - 摒弃单调的一维文本堆砌，重构为 2~3 列玻璃拟态高对比数据方阵（用时、步数/操作、最终得分、命中率/评级），核心战绩指标一目了然、层次分明。
- **RPG 等级与经验成长舱 (RPG Level & XP Progression Bar)**：
  - 结算弹窗内直接外露玩家等级与动态 XP 进度条（如 `Lv.3 (+50 XP)`），直观呈现经验累计动效与距离下一级的百分比，给予玩家极强的心流正反馈与长线成就感。
- **社交裂变与好友 PK 挑战舱 (Social Challenge & PK Arena Deck)**：
  - 针对联机与竞技属性，新增专属的“向好友发起挑战”功能区：
    - **一键复制挑战邀请链接**：自动附带专属对战邀请参数，好友点击即可直达该游戏发起同难度复仇/挑战，并在界面显示即时复制成功动效反馈。
    - **一键直达联机竞技场 (PK Arena)**：若该游戏支持联机对战（如五子棋、扫雷、数独、推箱子等），一键跳转至该游戏的实时对战大厅，大幅促进单机流量向联机 PvP 转化。
- **极速重开与对称操作工具条 (Instant Replay & Balanced Tool Deck)**：
  - 主操作按钮强化为超大“再来一局”能量键，外露键盘 `Space` / `R` 极速重开快捷键提示。
  - 底部工具条重构为对称三联卡：`[ 📋 复制战报 (Wordle等专用) ]`、`[ 📤 分享战果 ]` 与 `[ 🚪 返回大厅 ]`，各模块各司其职，大方得体。
- **棋盘去嵌套与页面合为一体 (Seamless Board Stage)**：
  - 彻底移除了数织 (Nonogram)、数独 (Sudoku)、华容道 (Sliding Puzzle)、2048、桥梁谜题 (Hashi)、24点等游戏中残留的二次嵌套暗黑内盒（`backdrop-blur-xl border rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-y-auto`）及其右侧难看的独立垂直滚动条。
  - 棋盘舞台直接自然融入页面整体舞台中，呼吸感极大提升，告别“小窗口嵌入式 (iframe-like)”生硬感。
- **全局结算弹窗解除容器绑架 (True Global Viewport Overlay)**：
  - 移除了游戏舞台与父级容器中的 `backdrop-blur-xl` 与 `overflow-hidden`，并为结算组件配置 `:host { display: contents; }`，彻底解决结算弹窗被困在棋盘小黑盒内部导致滚动和顶部奖杯被裁切的问题，升级为覆盖全浏览器视口的大气全局模态。
- **单项战绩轻巧胶囊化 (Compact Stat Capsule)**：
  - 针对数织等仅有用时指标的游戏，自动收缩为优雅小巧的数据高光胶囊（`⏱️ 时间 70:16`），不再占据庞大纵向空间，布局更加紧凑协调。
- **移除结算底端推荐，极致净化弹窗 (Removed Recommendations Hub)**：
  - 根据体验反馈彻底移除结算面板下方的“你可能也喜欢”多余游戏轮播卡片，消除了横向滚动条与布局冗余，使结算弹窗高度极致收敛，保持整体界面的干净整洁与专注感。
- **全站多主题色遮罩自适应 (Theme-Aware Overlay Backdrop)**：
  - 将结算遮罩层硬编码的 `bg-black/75` 全面重构为全站 CSS 主题变量 `bg-[var(--color-overlay)] backdrop-blur-md`。在浅色主题下呈现温润透气的 30% 柔和微光蒙版，在深色主题下呈现 70% 沉浸深色，彻底解决在浅色模式下出现突兀黑洞卡片的不匹配违和感。
- **解除 main 容器层叠限制，全屏自由居中**：
  - 移除了 `game-layout` 中 `<main>` 容器的 `z-10` 与 `transition-all`，使结算层在根层叠上下文中以 `z-[100]` 完全覆盖包括顶部导航与游戏标题在内的整个浏览器视口，结合 `m-auto` 彻底根除顶部荣誉徽章被截断的显示缺陷。

### 📝 文件变更
- `frontend/src/app/shared/components/game-layout/game-layout.component.ts` — 移除舞台容器的 backdrop-blur 与 overflow-hidden，释放全屏 fixed 定位
- `frontend/src/app/features/games/nonogram/nonogram.component.html` — 移除多余内嵌黑盒与垂直滚动条，棋盘全面融入页面
- `frontend/src/app/features/games/sudoku/sudoku.component.html` — 移除内层嵌套黑盒
- `frontend/src/app/features/games/sliding/sliding.component.html` — 移除内层嵌套黑盒
- `frontend/src/app/features/games/classic2048/classic2048.component.html` — 移除内层嵌套黑盒
- `frontend/src/app/features/games/hashi/hashi.component.html` — 移除内层嵌套黑盒
- `frontend/src/app/features/games/math24/math24.component.html` — 移除内层嵌套黑盒
- `frontend/src/app/shared/components/game-result-overlay/game-result-overlay.component.html` — 解决单指标巨大占位、优化顶部奖杯边距
- `frontend/src/app/shared/components/game-result-overlay/game-result-overlay.component.ts` — 添加 `:host { display: contents; }`
- `frontend/src/assets/i18n/zh.json` & `en.json` — 补充结算界面与挑战邀请多语言词条


### ✨ 核心增强 (Enhancements)
- **博客-游戏双向深度闭环内链**：
  - **博文底端实战竞技网关 (Interactive Practice Gateway)**：全面将 17 篇深度策略攻略与对应游戏建立精确映射字典（涵盖五子棋、数独、扫雷、数织、俄罗斯方块、推箱子等全矩阵）。博文底部新增极具视觉冲击力的实战演练卡，提供 `[ 🕹️ 单人试玩 ]` 与 `[ ⚔️ 实时对战 (PK Arena) ]` 双 CTA 按钮，实现“深度学习 → 立即实战”的高粘性转化闭环。
  - **精选相关深度攻略推荐 (Related Masterclasses)**：每篇博文末尾智能推荐 3 篇相关领域的策略文章卡片，包含阅读时间、分类标签与直达链接，大幅增加页面停留时间并降低跳出率，为 Google AdSense 审核提供极佳的站内导航与高权重内容互联（E-E-A-T）信号。
  - **游戏内页攻略导流卡 (Game Layout Guide Callout)**：补齐所有 18 款游戏的专属深度攻略映射，在棋盘下方 SEO 说明区末尾新增专属的“进阶战术指南”卡片与一键直达完整攻略按钮。
- **全站多语言与规范加固**：
  - 新增实战演练与攻略推荐相关的中英文多语言词条（`blog.interactive_practice_badge`, `blog.cta_play_pk`, `game.guide_callout_title` 等），严禁硬编码。
  - 严格使用全局 CSS 主题变量与响应式断点（`sm:`, `md:`）。
- **🐛 修复玩法规则弹窗教程链接 404 问题**：
  - 修复 `game-rules-modal.component.ts` 底部“📖 查看详细通关教程与高分技巧”由于硬编码 `[href]="'/docs/' + gameId"` 缺失当前语言前缀导致的整站 404 无法访问问题，重构为带多语言前缀的 Angular `[routerLink]="['/', i18n.currentLang(), 'docs', gameId]"`。

### 📝 文件变更
- `frontend/src/app/shared/components/game-rules-modal/game-rules-modal.component.ts` — 修复规则弹窗底部通关教程链接的前缀 404 缺陷
- `frontend/src/app/features/blog/blog-post/blog-post.component.ts` — 映射 17 篇攻略至具体游戏，新增实战双 CTA 与相关策略推荐
- `frontend/src/app/shared/components/game-layout/game-layout.component.ts` — 补齐 18 款游戏攻略映射并新增底部完整攻略导流卡
- `frontend/src/assets/i18n/zh.json` & `en.json` — 补充实战引导与攻略推荐多语言词条

## [2026-10-17] - 🎯 游戏内页宽屏沉浸聚焦与极速复开重构 (Game Layout Focus Arena & Fast-Replay)

### ✨ 新功能与重构 (Features & Redesign)
- **宽屏沉浸聚焦主战场 (Focus Arena)**：解除游戏棋盘被左侧 SEO 文本与右侧常驻房间列表夹击的狭隘布局。将棋盘视口最大宽度扩展至 1400px，全平台 15+ 款益智游戏（扫雷大棋盘、数独、华容道、数织等）获得宽阔舒展的居中舞台，告别拥挤逼仄感。
- **一体化操作控制台条 (Unified Action Console Bar)**：在棋盘上方整合难度选择器、联机模式指示、`⚔️ 找人PK`、`👥 邀请好友`、`💡 玩法规则` 等快捷操作，界面对称雅致，操作链路一目了然。
- **智能联机对战抽屉 (Smart PK Drawer)**：将冷清尴尬的右侧常驻房间列表重塑为按需呼出的侧滑抽屉。单机模式下界面纯净零打扰，需要联机对战时一键唤出，移动端与桌面端实现逻辑与视觉大统一。
- **键盘极速重开快捷键 (Instant Replay Shortcuts)**：全局支持键盘 `Space`（空格键）与 `R` 键极速再来一盘，通关或结算状态下无需鼠标横跨屏幕点击，一键重开，极大提升核心玩家的爽感与局数留存。
- **底部 SEO 与深度策略指南专区 (Bottom Strategy & SEO Section)**：将桌面端左侧的 SEO 长文与移动端底部 SEO 整合迁移至游戏画布正下方，卡片式呈现，带有专属攻略博客链接与 FAQ。既 100% 留存搜索引擎抓取权重，又彻底解放游玩视野。

### 📝 文件变更
- `frontend/src/app/shared/components/game-layout/game-layout.component.ts` — 核心游戏通用布局重构
- `frontend/src/assets/i18n/zh.json` & `en.json` — 补充游戏内页快捷键与策略专区多语言词条

## [2026-10-17] - 🎮 首页大厅极简化与短链路重构 (Lobby Modernization & Quick Action Engine)

### ✨ 新功能与重构 (Features & Redesign)
- **极简沉浸式全宽布局**：解除桌面端常驻冷启动"在线大厅"右侧栏对视口的强行压缩，重塑为响应式全宽流体网格布局（Poki / Steam 式现代游戏库）。在线对战大厅改为按需抽屉模式或顶部直达，消除冷启动"零房间"的心理负面暗示。
- **短链路转化三联卡 (Quick Action Triple Deck)**：
  - **每日挑战聚光灯 (Daily Spotlight)**：首屏直接外露当天精选挑战游戏与一键开局。
  - **双人竞技场直通卡 (Instant PK Arena)**：突出真人对战特性，1 步直达 `/pk-arena` 快速匹配与建房。
  - **随便来一把 (Lucky Pick)**：提供"手气不错"随机开局功能，降低选择困难症门槛，提高用户启动率。
- **分类筛选胶囊与即时搜索 (Category Filter & Live Search)**：
  - 支持 `全部`、`🔥 热门榜`、`⚔️ 实时联机PK`、`🔢 数字推理`、`🧩 空间拼图` 5 维动态过滤，内置实时本地搜索框，秒级过滤定位游戏。
- **游戏卡片 CTA 转化重构 (Direct-Action Game Cards)**：
  - 剔除无意义的"已就绪"等视觉杂音标签。
  - 卡片底部增加模式直达分流双按钮：`🕹️ 单人试玩` 与 `⚔️ 实时对战`，链路从原先的 3~4 步缩短为 1 步直达指定玩法。
- **内容动线优化 (Content-First & SEO Friendly)**：
  - 将平台说明与大段 SEO 文本移至游戏网格下方，保证搜索引擎抓取权重的完整留存，同时让真实玩家打开页面第一眼即可开始游玩。
- **界面细节与多语言多主题优化**：
  - 优化顶部导航退出登录按钮样式，从突兀红框改为雅致悬停变色。
  - 新增所有交互文本的完整 i18n 键值，严格遵循全站 CSS 变量与全端响应式断点规范。

### 📝 文件变更
- `frontend/src/app/features/lobby/lobby.component.html` — 全面重构页面结构与卡片动作条
- `frontend/src/app/features/lobby/lobby.component.ts` — 新增分类过滤、实时搜索、短链路直达与随机游戏逻辑
- `frontend/src/app/core/layouts/main-layout.component.ts` — 优化顶部导航栏操作按钮视觉质感
- `frontend/src/assets/i18n/zh.json` & `en.json` — 补充大厅改版相关的多语言词条

## [2026-09-27] - 🎨 Nonogram 棋盘 PC 端布局优化 (Nonogram Board PC Layout Fix)

### 🐛 修复 (Fixes)
- **Nonogram 棋盘垂直居上对齐**：将棋盘从垂直居中 (`m-auto`) 改为垂直居上 (`mx-auto mt-2`)，与其他游戏保持一致。修复 PC 端棋盘被推到视口下方、需要滚动才能看到的问题。
- **游戏结算弹窗固定定位**：将 `game-result-overlay` 从 `absolute inset-0`（相对父容器）改为 `fixed inset-0`（相对视口），并将内容从垂直居中 (`m-auto`) 改为顶部偏移 (`mt-8 lg:mt-12 mb-auto`)。修复当游戏棋盘内容较高时，结算界面被推到视口下方需要滚动才能看到的问题。此修复惠及所有游戏。

### 📝 文件变更
- `frontend/src/app/features/games/nonogram/nonogram.component.html` — 移除条件式 `m-auto` / `mx-auto` / `mt-2` class 绑定，统一使用静态 `mx-auto mt-2`
- `frontend/src/app/shared/components/game-result-overlay/game-result-overlay.component.html` — `absolute` → `fixed`，`m-auto` → `mt-8 lg:mt-12 mb-auto mx-auto`


## [2026-09-25] - 🚀 SEO 增长引擎：FAQ 富摘要 + Wordle 分享 (SEO Growth: FAQ Rich Snippets + Viral Share)

### ✨ 新功能 (Features)
- **FAQ Schema 结构化数据 (FAQPage JSON-LD)**：`SeoService` 新增 `extractFaqPairs()` 方法，自动从游戏页 `seo_desc` HTML 中解析 FAQ 问答对，注入 `FAQPage` JSON-LD 到 `<head>`。Google 搜索结果将展示展开式 FAQ 富摘要，大幅提升搜索点击率。支持 `FAQ`、`常见问题（FAQ）` 等中英文标签格式自动识别。
- **全游戏 FAQ 覆盖**：为原本缺少 FAQ 的 12 款游戏（block / codebreaker / connect / hashi / hexa / idiom / lightsout / math24 / nonogram / sokoban / tetris / watersort）在 en.json + zh.json 中补充了 5 个高搜索量 FAQ 问答，现全 18 款游戏均具备完整 FAQ 内容。
- **Wordle 风格文字分享 (TextShareService)**：新增 `TextShareService`，游戏结束后可一键复制 emoji 格式战绩摘要到剪贴板。每种游戏有独特的 emoji 模板（扫雷/数独/2048/俄罗斯方块等各有专属格式）。结果弹窗新增醒目的"📋 Copy Result"按钮，带"已复制 ✅"视觉反馈动画。

### 📝 文件变更
- `frontend/src/app/core/services/seo.service.ts` — 新增 FAQ Schema 注入 + `extractFaqPairs()` + `removeJsonLd()` 方法
- `frontend/src/app/core/services/text-share.service.ts` — 新增 Wordle 风格文字分享服务
- `frontend/src/app/shared/components/game-result-overlay/` — 新增 Copy Result 按钮 + TextShareService 集成
- `frontend/src/assets/i18n/en.json` — 12 款游戏新增 FAQ + text_share i18n keys
- `frontend/src/assets/i18n/zh.json` — 12 款游戏新增 FAQ + text_share i18n keys

## [2026-09] - 🔍 AdSense 过审优化：内容优先策略 (AdSense Approval Optimization: Content-First Strategy)

### ✨ 新功能 (Features)
- **首页"为什么选择 Puzzle PK"价值主张板块**：在游戏列表之前新增平台介绍区块（4 大特色：脑力训练 / 多人对战 / 寓教于乐 / 8语言），全 8 语言 i18n 覆盖，提升审核员首屏内容价值感知。
- **首页内容区块重排**：SEO 文案区块从游戏列表下方移至上方，确保审核员和爬虫优先看到有实质内容的文字信息。

### 🐛 修复 (Fixes)
- **Footer 硬编码文本国际化**：`探索` / `经典益智游戏说明` / `开发博客` 三处 `currentLang() === 'zh'` 三元表达式替换为 `i18n.t()` 调用，新增 `footer.explore` / `footer.game_guides` / `footer.developer_blog` 翻译 key（8 语言）。
- **Navbar 硬编码文本国际化**：桌面端和移动端导航栏的 `攻略文档` / `开发博客` 共 4 处硬编码替换为 `nav.docs` / `nav.blog` 翻译 key（8 语言）。

### ⚠️ 重要变更 (Important)
- **广告位临时禁用**：`lobby_banner` 和 `lobby_bottom` 两个广告组件在 AdSense 审核通过前暂时注释掉（HTML 注释），避免空白/报错广告位给审核员负面印象。审核通过后取消注释即可恢复。

## [2026-08] - 📰 博客扩容：6 篇新文章上线 (Blog Expansion: 6 New Articles)

### ✨ 新功能 (Features)
- **博客从 11 篇增至 17 篇**：通过 `scripts/import_blog_posts.js` 将 6 篇原创策略文章（sliding-puzzle-strategy / hexa-puzzle-strategy / block-puzzle-strategy / lights-out-puzzle-guide / classic2048-strategy / hashi-bridges-strategy，各 en ~2000 词 + zh 完整翻译）导入生产库（id 12-17），sitemap 由 448 增至 **496 URLs**。
- **游戏页"阅读完整攻略"内链全覆盖**：`RELATED_GUIDES` 映射扩展至 15 款游戏，6 款新文章对应游戏（sliding/hexa/block/lightsout/classic2048/hashi）自动出现攻略入口。
- **export-blog.js 空语言跳过**：构建导出时跳过无内容的语言对象（前端回退英文渲染），避免空对象导致非英语页面空白；index.json 生成改为安全处理缺失语言。
- **6 篇新文章多语言翻译（进行中）**：并行翻译流水线补齐 es/ja/ko/pt/fr/de，与其余 11 篇对齐。

## [2026-08] - 🔍 Google 搜索合规优化：结构化数据与爬取质量 (Search Compliance: Structured Data & Crawl Quality)

### 🐛 修复 (Fixes)
- **移除伪造评分（政策红线）**：游戏页 WebApplication JSON-LD 中原有的伪随机 `aggregateRating`（4.5-4.9 虚构评分 + 虚构评分数量）已删除——Google 结构化数据政策明令禁止虚构评分，可能触发人工处置，影响搜索排名与 AdSense 审核。
- **软 404 彻底修复（三次迭代）**：边缘函数对未知路径（如 `/en/nonexistent`、`/en/blog/不存在文章`）原返回 200 + 大厅壳（软 404，低质量信号）。修复过程中发现关键事实——**Cloudflare Pages 的 `env.ASSETS.fetch` 对缺失路径永不返回 404，而是返回 200 + SPA 壳**，因此无法用 `status === 404` 判断。最终方案：请求页面的 `index.html` 与根壳（26KB）做 Content-Length 对比（长度不同即真实页，零开销），长度相同再读 body 确认；缺失页仅对 login/register/profile/pk-arena/admin 客户端路由返回 SPA 壳，其余返回真实 404（`Cache-Control: public, max-age=300`）。经本地 19 项模拟 + 线上 32 项实测全部通过。
- **8 语言 inLanguage/og:locale 修正**：此前 es/ja/ko/pt/fr/de 页面全部错误标记为 en-US/en_US，现按 `LANG_LOCALES` / `LANG_OG_LOCALES`（新增于 i18n.service.ts）正确映射（es-ES、ja-JP、ko-KR、pt-BR、fr-FR、de-DE 等）。

### ✨ 新功能 (Features)
- **BreadcrumbList 结构化数据**：游戏页/攻略页/博客页/法律页新增面包屑 JSON-LD（首页 > 分类 > 页面），`setJsonLd` 支持多 schema 共存（各自独立 script id）。
- **游戏页→相关博客内链**：game-layout 新增 `RELATED_GUIDES` 映射（9 款游戏对应已发布攻略文章），游戏页左侧与移动端底部 SEO 版块新增"📖 阅读完整攻略"入口（八语言 `game.read_guide`），强化内链与内容深度。

## [2026-08] - 🚀 阶段三：内容管线与收录加速 (Phase 3: Content Pipeline & Indexing)

### ✨ 新功能 (Features)
- **博客创作管线**：新增 `scripts/import_blog_posts.js` —— 读取 `content/blog_new/{slug}.json`（API 同构 snake_case 格式），通过 `POST /api/v1/admin/blog/posts` 批量导入生产库（需 ADMIN_TOKEN，支持 --dry-run）；新文章目录已产出 6 篇原创策略文章（sliding / hexa / block / lightsout / classic2048 / hashi，en + zh 双语）。
- **IndexNow 收录加速**：运行 `scripts/submit_indexnow.js`，448 条 sitemap URL 已提交至 api.indexnow.org（Bing/Yandex 即时收录；Google 由 sitemap 收录）。
- **游戏页 FAQ 增补**：为最薄的 6 款游戏（sliding / minesweeper / sudoku / classic2048 / drop2048 / gomoku）seo_desc 追加 FAQ 章节（en + zh，每款 5-6 组问答），提升内容深度与富媒体结果机会。
- **AdSense 重提检查清单**：新增 `docs/ADSENSE_RECHECK.md` —— 部署 → GSC → 等待 → 重提全流程指南，含部署后验证命令与关键页抽查清单。

### ⚠️ 重要提醒 (Important)
- **线上版本仍缺阶段二内容**：当前线上站点已含阶段一修复与作者卡片，但 connect/nonogram 新文案、About 扩充、博客多语言翻译尚未生效——旧版 export-blog.js 在构建时用仅含 en/zh 的生产库覆盖了博客文件。**必须用最新仓库代码重新构建部署**（新版 export-blog.js 已带空值保护）。

## [2026-08] - 📚 阶段二：内容深化与 E-E-A-T 补强 (Phase 2: Content Deepening & E-E-A-T)

### ✨ 新功能 (Features)
- **游戏页 SEO 文案补齐（connect/nonogram）**：`game.connect.seo_desc` 原为全站缺失（8 语言均为 0 字），新增约 450-650 词完整文案（玩法、规则、五种难度、制胜技巧、模式介绍）；`game.nonogram.seo_desc` 由 75 词扩至 500+ 词（Picross 规则、边缘重叠法/两端计数法等核心策略）。8 语言同步更新。
- **About 页充实（8 语言）**：`legal.about.content` 由 258 词扩至约 450-550 词，新增"我们提供什么"（18 款游戏清单）、"每日挑战与排行榜"、"联系我们"（support@puzzlepk.com + 48 小时回复承诺）、"隐私与安全"等章节，强化 E-E-A-T 信号。
- **博客作者简介区块（E-E-A-T）**：博客文章底部新增"Puzzle PK Team"作者卡片（八语言 `blog.author_bio` / `blog.author_more`），链接至 About 页，配合 JSON-LD Organization 作者标记提升可信度。

### 📝 内容 (Content)
- **博客多语言翻译补齐**：5 篇此前仅 en/zh 有真实翻译、其余 6 语言回退英文原文的博客文章（1a2b-bulls-cows、benefits-of-multiplayer-educational-games、sudoku-benefits、sudoku-for-kids-a-beginners-guide、why-math24-is-the-best-brain-training-game-for-kids）通过并行翻译流水线补齐 es/ja/ko/pt/fr/de 六语言，消除"多语言重复内容"对 AdSense 审核的负面影响；`minesweeper-logic` 的 pt/fr/de 同步补译。
- **export-blog.js 空值保护**：`scripts/export-blog.js` 构建时会从生产 API 拉取博客内容并覆盖 public 静态文件，而生产库仅维护 en/zh——现增加 gap-fill 逻辑：DB 字段为空/缺失时保留本地已有翻译，非空 DB 值仍然优先，杜绝构建把已翻译的多语言内容冲掉。

## [2026-08] - 🌐 AdSense 合规修复：低价值内容拒审专项 (AdSense Compliance Fixes)

### 🐛 修复 (Fixes)
- **页脚法律链接死链修复（AdSense 拒审主因）**：页脚 About Us / Privacy Policy / Terms of Service / Contact Us 与 Cookie 弹窗内的隐私政策链接原指向 `/pages/*`（未预渲染，Googlebot 抓取到 0 文字的空壳页面并回退中文默认标题，属典型"低价值内容"信号），统一改为指向已预渲染的 `/legal/*` 路由；边缘函数对存量 `/pages/*` 请求 301 重定向至 `/legal/*`，杜绝爬虫空页与重复内容。

### ✨ 新功能 (Features)
- **可预渲染的 Contact 页（/legal/contact）**：八语言新增 `legal.contact.title/content`（含 support@puzzlepk.com 邮箱、Twitter 与 48 小时回复承诺）与 `seo.legal.contact.title/desc/keywords`（独立 TDK）。`SeoService` 对 `/legal/contact` 使用专属标题描述，不再复用 "Legal & Privacy Policy" 泛用标题；`generate-sitemap.js` 将 `legal/contact` 纳入 sitemap 与 Angular SSG 预渲染列表（448 个 URL），补齐 AdSense 审核所需的 E-E-A-T 联系信号。
- **/docs 攻略中心首页补全**：`/docs` 原本仅渲染 "Loading documentation..." 空壳（对爬虫仅 5 个词，属低价值页面），现改为真实攻略中心页——H1 + 八语言介绍段落 + 全部游戏攻略卡片网格；移除"自动跳转到第一款游戏"的客户端重定向，使 `/docs` 成为可索引的常驻页面。
- **/daily 每日挑战页补全 SEO 文案**：新增八语言 `daily.seo_intro` 介绍段落（每日挑战玩法、奖励与连胜机制），消除该页对爬虫仅 86 词的内容单薄问题。

## [2026-07-10] - 🎨 视觉反馈与震动增强 (Juiciness Enhancement)

### ✨ 新功能与视觉增强 (Features & UI Enhancements)
- **全局 Haptic 震动引擎**：新增 `HapticService` 并通过统一接口接入各大游戏。推箱子、数独、数字华容道、Math24等游戏在消除、碰撞、错误时增加了不同力度的震动反馈。
- **动态屏幕抖动 (Screen Shake)**：为多款游戏引入基于 TailwindCSS 的 `.animate-shake` 特效。现在在数独填入冲突数字、推箱子撞墙、Math24算错时，整个棋盘会产生真实的震动反馈。
- **浮动加分特效 (Floating Text)**：新建全局 `FloatingTextService` 及遮罩组件，为俄罗斯方块、Drop2048 等游戏集成华丽的 COMBO 浮动文字特效，为成语连对引入 "🔥 连对 ×N!" 的震撼视觉反馈。
- **结算撒花升级 (Enhanced Confetti)**：重构了 `game-result-overlay` 的撒花逻辑，新增“打破记录 (New Record)”时的专属金色大爆炸特效。
- **修复 Lightsout 棋盘偏移**：修复了关灯游戏 (Lightsout) 棋盘在大屏设备下未水平居中偏左的问题，为其增加了 `mx-auto` 智能居中约束。

## [2026-07-10] - 🎨 视觉反馈与震动增强 (Juiciness Enhancement)

### ✨ 新功能与视觉增强 (Features & UI Enhancements)
- **全局 Haptic 震动引擎**：新增 `HapticService` 并通过统一接口接入各大游戏。推箱子、数独、数字华容道、Math24等游戏在消除、碰撞、错误时增加了不同力度的震动反馈。
- **动态屏幕抖动 (Screen Shake)**：为多款游戏引入基于 TailwindCSS 的 `.animate-shake` 特效。现在在数独填入冲突数字、推箱子撞墙、Math24算错时，整个棋盘会产生真实的震动反馈。
- **浮动加分特效 (Floating Text)**：新建全局 `FloatingTextService` 及遮罩组件，为俄罗斯方块、Drop2048 等游戏集成华丽的 COMBO 浮动文字特效，为成语连对引入 "🔥 连对 ×N!" 的震撼视觉反馈。
- **结算撒花升级 (Enhanced Confetti)**：重构了 `game-result-overlay` 的撒花逻辑，新增“打破记录 (New Record)”时的专属金色大爆炸特效。
- **修复 Lightsout 棋盘偏移**：修复了关灯游戏 (Lightsout) 棋盘在大屏设备下未水平居中偏左的问题，为其增加了 `mx-auto` 智能居中约束。

## [2026-08-03] - 🐛 Bug Fixes & SEO Optimization

### 🐛 修复 (Fixes)
- **SEO 优化 (Meta Description)**：修复了 `lobby.component.html` (大厅) 页面中存在多个 `<h1>` 标签的问题，通过响应式 TailwindCSS 类合并了移动端与桌面端的标题，提升了搜索引擎抓取友好度。
- **SEO 优化 (全局 TDK 扩充)**：编写检测脚本全面排查了中英文所有的页面标题和 Meta Descriptions。将 `login`、`register`、`admin`、`profile`、`daily` 等系统页面以及 `classic2048`、`math24`、`hashi`、`watersort` 等多款游戏页面的过短标题和描述进行了长尾词扩充，确保英文描述均 > 60 个字符，中文描述信息量大幅增强。经系统级排查，当前全站已**不存在任何重复的 Meta Description**。


## [2026-07-10] - 🎨 视觉反馈与震动增强 (Juiciness Enhancement)

### ✨ 新功能与视觉增强 (Features & UI Enhancements)
- **全局 Haptic 震动引擎**：新增 `HapticService` 并通过统一接口接入各大游戏。推箱子、数独、数字华容道、Math24等游戏在消除、碰撞、错误时增加了不同力度的震动反馈。
- **动态屏幕抖动 (Screen Shake)**：为多款游戏引入基于 TailwindCSS 的 `.animate-shake` 特效。现在在数独填入冲突数字、推箱子撞墙、Math24算错时，整个棋盘会产生真实的震动反馈。
- **浮动加分特效 (Floating Text)**：新建全局 `FloatingTextService` 及遮罩组件，为俄罗斯方块、Drop2048 等游戏集成华丽的 COMBO 浮动文字特效，为成语连对引入 "🔥 连对 ×N!" 的震撼视觉反馈。
- **结算撒花升级 (Enhanced Confetti)**：重构了 `game-result-overlay` 的撒花逻辑，新增“打破记录 (New Record)”时的专属金色大爆炸特效。
- **修复 Lightsout 棋盘偏移**：修复了关灯游戏 (Lightsout) 棋盘在大屏设备下未水平居中偏左的问题，为其增加了 `mx-auto` 智能居中约束。

## [2026-07-24] - 🤝 全新社交体验：深度社交与关系链 (Friends System)

### ✨ 新功能 (Features)
- **好友申请与管理**：全平台覆盖的好友申请机制，支持在排行榜、游戏结算等任意场景一键发送申请，并提供悬浮面板实时接收、同意或拒绝。
- **实时在线状态感知**：依托于底层高性能的 WebSocket 事件循环系统，当好友列表中的玩家上线、下线时，界面中的状态将实时无缝更新（亮起绿色在线指示灯）。
- **一键开黑快速邀请**：在任意 PK 大厅或对局中，玩家可以直接打开好友列表，向在线好友发送专属的高优房间邀请，极大地提升了玩家间的社交粘性。
- **全局悬浮面板管理**：精心设计的全局右下角悬浮好友控制面板，支持独立展现“好友列表”和“请求列表”，随时随地掌握社交动态。
## [2026-07-23] - 🏆 核心功能增强：小游戏 PK 模式段位积分系统 (Rating Leaderboard)

### ✨ 新功能 (Features)
- **PK 段位积分 (Rating) 引入**：为所有的 PK 对战模式新增了段位积分体系。新玩家初始积分为 1000 分，赢得一场比赛可获得 25 积分，输掉一场比赛扣除 15 积分（最低降至 0 分）。
- **动态积分排行榜**：更新了全局大厅中的排行榜界面。当玩家在下拉框中选择任意 PK 模式时，排行榜将自动切换其视图，原先的“最佳成绩/用时”将会变为极具竞技感的 **“积分 (Rating)”** 与 **“胜率 (Win Rate)”** 列。
- **全端翻译与国际化适配**：同步新增中英双语词条，对“积分 (Rating)”与“胜率 (Win Rate)”的展现进行了全面 UI 适配与字体渲染优化。

## [2026-07-19] - 🧩 数织 (Nonogram) 扩充高阶难度与极致小屏适配

### ✨ 新功能与适配优化 (Features & UI Enhancements)
- **扩充专家与大师难度**：为数织 (Nonogram) 游戏新增 20x20（专家）和 25x25（大师）两大高难度棋盘。后端生成引擎与前端联机系统均已同步支持。
- **极致小屏响应式适配**：针对新增的巨型棋盘，重构了手机端 `cellSize` 的计算下限（从 28px 降低至 20px）。不仅使大棋盘能尽最大可能在小屏幕上显示完整，同时在超出屏幕时允许完美的平滑全向滚动（支持玩家长按画格，不与滚动冲突），确保任何尺寸的设备都能流畅体验。

## [2026-07-10] - 🎨 视觉反馈与互动增强 (Juiciness & Social)

### ✨ 新功能与视觉增强 (Features & UI Enhancements)
- **阅后即焚文字聊天 (Room Text Chat)**：新增游戏内纯净聊天室功能！在 PK 房间内，左下角新增悬浮且自动隐藏的文字聊天模块，完美融入沉浸式游戏布局。消息采用 100% 内存分发广播，刷新即自动销毁，零数据库开销且彻底告别违规封号烦恼。
- **大厅快捷约战喊话 (Lobby Quick Phrases)**：在“对战大厅”面板的 PK 按钮旁新增快捷约战（💬）系统。玩家可快速发送“有人来切磋一下吗？”、“谁敢来挑战我”等预设安全喊话至大厅公屏。当作为房主发送时，公屏喊话将自动带上 `[加入房间]` 按钮，组局效率翻倍！
- **实时对战表情与嘲讽 (Emoji & Taunt Broadcasting)**：新增局内实时互动系统！在任何 PK 房间中，玩家点击头像上的气泡图标，即可发送如 😂、😡、😎 或“Too slow!”等快捷语。表情会以精美的 CSS 动画形式在发送者头像上方飘起并自动消散，极大提升了对战过程中的乐趣与火药味（底层通过 WebSocket 房间级广播实现，零延迟且无状态入侵）。
- **全局 Haptic 震动引擎**：新增 `HapticService` 并通过统一接口接入各大游戏。推箱子、数独、数字华容道、Math24等游戏在消除、碰撞、错误时增加了不同力度的震动反馈。
- **动态屏幕抖动 (Screen Shake)**：为多款游戏引入基于 TailwindCSS 的 `.animate-shake` 特效。现在在数独填入冲突数字、推箱子撞墙、Math24算错时，整个棋盘会产生真实的震动反馈。
- **浮动加分特效 (Floating Text)**：新建全局 `FloatingTextService` 及遮罩组件，为俄罗斯方块、Drop2048 等游戏集成华丽的 COMBO 浮动文字特效，为成语连对引入 "🔥 连对 ×N!" 的震撼视觉反馈。
- **结算撒花升级 (Enhanced Confetti)**：重构了 `game-result-overlay` 的撒花逻辑，新增“打破记录 (New Record)”时的专属金色大爆炸特效。
- **修复 Lightsout 棋盘偏移**：修复了关灯游戏 (Lightsout) 棋盘在大屏设备下未水平居中偏左的问题，为其增加了 `mx-auto` 智能居中约束。

## [2026-07-08] - 🎨 全系游戏深度重构：标准化 `app-game-layout` 与 UI 适配优化

### ✨ 架构重构与优化 (Architecture & Optimization)
- **公共布局组件深度封装**：为了彻底消除 18 款游戏之间顶部 Header、SEO 版块和外层容器的冗余代码，我们深度重构并完善了 `app-game-layout` 公共布局组件。它现在不仅支持了通过 `@ContentChild` 或直接投影无缝接管游戏内视图，还完全封装了“模式、难度、关卡”等元信息的响应式渲染逻辑，真正做到了“只要引入一个标签，自动拥有全套顶级电竞级大厅布局”。
- **全系 15 款游戏全面接入标准化布局**：将包括《扫雷》、《数独》、《俄罗斯方块》、《六角消除 (Hexa)》、《2048 (Classic/Drop)》、《华容道》等在内的 15 款核心游戏，其模板底层全部替换为 `<app-game-layout>`。大幅精简了各个 `.component.html` 文件的体积，实现了 HTML 代码的终极复用。
- **动态难度/模式联动显示修复**：修复了在部分没有多难度选择的游戏（如 Gomoku, Hexa, Drop2048 等）中，顶部 Layout Header 不显示当前默认难度的问题。现在所有游戏只要在初始化时绑定了 `[currentDifficulty]`，即便下拉框被隐藏，依然能居中高亮展示当前的“难度/关卡”信息。
- **移动端棋盘防溢出机制**：修复了《逻辑拼图 (Nonogram)》在手机等小屏幕设备上因为“提示数字”过多导致棋盘撑破屏幕出现水平滚动条的 Bug。重构了 `cellSize` 的计算公式，通过略微提升留白冗余度与缩小可用宽度（`availW`），确保 100% 完美适配任何屏幕尺寸，告别横向滚动。
- **SEO 残留代码清理**：清理了《华容道 (Sliding)》和《逻辑拼图 (Nonogram)》因历史遗留导致的移动端双重 SEO `<div class="block lg:hidden">` 残留，让 `app-game-layout` 真正成为单一真相来源 (SSOT)。

## [2026-07-08] - 🌐 补充大厅多语言翻译与核心游戏 SEO 深度优化

### ✨ 修复与优化
- **多语言适配**：为大厅界面的“最新指南”区域补充了 `lobby.latest_guides` 和 `lobby.view_all_blogs` 中英双语词条。为全局顶部导航栏 (Navbar) 与底部页脚 (Footer) 补充了 `Docs` 和 `Blog` 的响应式入口，确保移动端隐藏顶部、保留底部的优雅折叠体验，并重写了游戏内返回文档的按钮，改为无缝 `routerLink` 路由并自动附带当前多语言前缀（解决刷新 Bug）。
- **SEO 深度优化 (AdSense 合规)**：
  - 大幅扩充了流量最高的前十六款核心游戏专属 SEO 描述文本（中英双语），新增了“高阶解题/对弈技巧”与“独创多人联机玩法”等实质性高质量原创内容，单游戏文本量提升至近 600 字。
  - **主页大厅 (`/lobby`) 底部 SEO 深度重构**：删除了原来的一句简短介绍，全面替换为包含“平台简介、核心免费游戏介绍、独创多人对战玩法、免下载/PWA/轻广告特性”等超过千字的高质量长尾关键词文章（支持中英双语切换，HTML 渲染）。
- **隐私政策合规 (AdSense 合规)**：全面排查并确认《隐私政策》已完全包含 Google AdSense 及 DoubleClick Cookie 的必要披露声明。统一了隐私政策、服务条款及关于页面中的品牌名称为 `Puzzle PK`。

## [2026-07-02] - 🌉 新增游戏《桥梁谜题》(Hashi)

### ✨ 新功能 (Features)
- **硬核日式逻辑谜题《桥梁 (Hashi)》上线**：支持纯粹的单机解谜模式，锻炼空间连通推理能力。
- **全自动题库生成算法**：深度集成了 `bridges-generator` 生成算法，自动根据网格大小与岛屿数量生成具备唯一解的错落分布题库，涵盖四大难度级别：初级 (7x7)、中级 (10x10)、高级 (15x15)、专家 (20x20)。
- **动态 SVG 连线系统**：使用 SVG 原生渲染岛屿和桥梁（支持单桥/双桥无缝切换），提供极致清晰的响应式体验。
- **纯前端极速引擎**：单机模式完全在前端客户端计算，支持双击切换桥梁状态及严格的图论连通性检验。
- **游戏结算与留存体系对接**：已接入全局的选关大厅与结算，支持后台 PuzzleRepo 提供题库数据存储。

## [2026-07-02] - 🧩 新增游戏《一笔画连线》(Connect)

### ✨ 新功能 (Features)
- **经典一笔画益智游戏《Connect》上线**：支持经典的单机选关模式，共有 800 道精选关卡。
- **霓虹赛博质感界面**：结合 SVG 的 filter 阴影和 TailwindCSS，实现带有霓虹发光材质的彩色管道连线系统。
- **纯前端极速交互**：单机模式完全在前端客户端计算逻辑，支持鼠标拖拽与触摸滑动流畅画线。
- **游戏结算与留存体系全面对接**：已接入全局的选关大厅与结算 `app-game-result-overlay`，通关后支持展示耗时、发放 XP 及游戏重新开始/下一关功能。

## [2026-06-30] - 🐛 数织 (Nonogram) PK 模式核心 Bug 修复

### 🐛 Bug 修复 (Bug Fixes)
- **大厅玩家列表崩溃修复**：修复了在数织的 `GameWaitingRoomComponent` 等候室中，因为未正确提取玩家对象导致 UI 崩溃、无法正常显示进入房间玩家的致命 Bug。
- **同盘抢分（Steal）模式数据同步修复**：修复了在进入数织抢分模式后，前端并未接收和同步服务端棋盘 (`rawState.board`)，从而导致玩家看到空棋盘无法游玩的问题。
- **竞速（Speed）模式进度计算修复**：修复了进度百分比在初始状态下因为分母 (`totalFilled`) 为 `0` 而导致计算出 `Infinity` 的严重逻辑错误。

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
### Fixed
- **SEO Optimization**: Fixed identical meta description issues reported by Bing. `docs` tutorial pages now have distinct, dynamic meta descriptions from `games` pages, and the `pk-arena` route now uses its own dedicated SEO keywords instead of inheriting from `lobby`.
- **MIME Type Error (Cloudflare Pages)**: Resolved a strict MIME type checking error ("Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html") caused by Cloudflare Early Hints preloading relative chunks. Added `baseHref: "/"` to `angular.json` to force absolute paths.
- **Build Budgets**: Increased Angular initial bundle size budget in `angular.json` to fix `bundle initial exceeded maximum budget` build failures.
- **I18n (Internationalization)**: Abstracted hardcoded Chinese texts in `game-lobby-panel` and `docs` components into translation JSON files across all 8 languages.

### Added
- **Classic 2048**: Added the classic 4x4 sliding 2048 game with single-player and speed PK modes.
- **Game Seed Workflow**: Replaced manual DB seed step with automatic `backend/update_games.py` script generation.

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

### Added
- **Hashi (Bridges)**: Added Multiplayer PK Speed mode (竞速模式). Players can now create rooms and compete to solve Hashi puzzles first.

## [Unreleased]
### Fixed
- **SEO Optimization**: Fixed identical meta description issues reported by Bing. `docs` tutorial pages now have distinct, dynamic meta descriptions from `games` pages, and the `pk-arena` route now uses its own dedicated SEO keywords instead of inheriting from `lobby`.
- **MIME Type Error (Cloudflare Pages)**: Resolved a strict MIME type checking error ("Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html") caused by Cloudflare Early Hints preloading relative chunks. Added `baseHref: "/"` to `angular.json` to force absolute paths.
- **Build Budgets**: Increased Angular initial bundle size budget in `angular.json` to fix `bundle initial exceeded maximum budget` build failures.
- **I18n (Internationalization)**: Abstracted hardcoded Chinese texts in `game-lobby-panel` and `docs` components into translation JSON files across all 8 languages.

### Added
- **社交系统**: 新增局内表情互动系统 (In-game Emotes)，支持在对局中发送气泡表情包。
- **匹配系统**: 新增快速随机匹配系统 (Quick Matchmaking)，玩家可一键匹配进入随机房间。
