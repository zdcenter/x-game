# X-Game 更新日志 (Changelog)

> 早期历史版本详细日志已整理归档至 [docs/archive/CHANGELOG_archive.md](file:///home/zd/x-game/docs/archive/CHANGELOG_archive.md)。

## [v3.2.5] - 2026-10-23

### iPad / 平板 PWA 切后台恢复视口冻结与棋盘异常缩小根治 (iPad PWA Background Resume & Viewport Calibration Fix)
- **iPadOS PWA 切后台再切回导致棋盘异常缩小致命缺陷根治 (Viewport Shrinking on Resume Bugfix)**：
  - **核心病因破案**：在 iPadOS PWA（Standalone 全屏模式）下，用户切回桌面或呼出多任务管理时，WebKit 内部截取缩略图快照时向全局派发了瞬态的缩小尺寸（被误判为手机视口 `<640px`）；当用户从桌面再次点开应用切回前台时，系统画面恢复了全屏，但 WebKit **不会向 window 自动派发 resize 事件**，导致全局响应式尺寸 Signal 长期滞留在缩小的快照数值中，数字华容道（从 720px 缩为 366px）、2048、俄罗斯方块等棋盘严重缩小居中；
  - **切后台伪事件过滤与防污染**：`WindowSizeService` 在监听全局 `resize` 及 `visualViewport.resize` 时增加 `document.hidden` 判定，若应用处于后台隐藏状态，坚决丢弃快照产生的瞬态错误尺寸，防止污染全局单例；
  - **多重系统级生命周期监听与阶梯式重绘刷新**：
    - 新增 `visibilitychange`（从后台切回前台 `document.visibilityState === 'visible'`）、`pageshow`（bfcache 恢复）、`focus`（窗口重获焦点）、`orientationchange`（屏幕横竖旋转）及 `visualViewport.resize` 多重监听；
    - 针对 iOS 切回前台存在的 200~300ms 系统缩放展开动效，引入阶梯式延时校准机制（立即、50ms、150ms、300ms、500ms），并在尺寸变动时触发强制 DOM 重排（`document.body.offsetHeight`）与派发标准全局 `resize` 事件；
- **进退游戏路由导航尺寸主动纠偏 (Route Navigation & BaseGameComponent Auto-Calibration)**：
  - **路由切换主动校准**：`WindowSizeService` 深度订阅 Angular 路由 `NavigationEnd` 事件，用户在游戏、大厅与首页之间任意进退跳转时，100% 自动重新测量并刷新最新视口几何尺寸；
  - **游戏生命周期前置保护**：在所有游戏基类 `BaseGameComponent.ngOnInit()` 中注入并触发 `scheduleMultiRefresh()`，确保无论是冷启动、热启动还是中途进入任意游戏，棋盘首帧渲染始终准确契合平板大屏；
- **扫雷 PWA 模式长按插旗放手后红旗消失缺陷彻底根除 (Minesweeper PWA Long-Press Ghost Click Bugfix)**：
  - **核心机制破案**：在 iPad / 移动端 PWA（Standalone 全屏模式）下，玩家长按格子 320ms 成功打上红旗后，手指抬起时 WebKit 仍会合成派发带延迟的 `click`（MouseEvent）或 `contextmenu` 事件；原先代码未对触屏产生的合成幽灵点击进行彻底阻断，导致该点击事件再次命中“点击已标旗格子安全取消”逻辑，造成“按下去看见旗子、手一松旗子又被拔掉消失”的致命交互缺陷；
  - **三重立体化触控隔离防御**：
    1. **触屏幽灵点击物理阻断**：记录触屏交互时间戳（`lastTouchTime`），任何触控后 500ms 内到达的合成 `click` 或模拟 `contextmenu` 事件一律丢弃拦截，绝不误触；
    2. **长按状态精确锁定**：引入 `isLongPressTriggered` 严格状态机，长按插旗完成后，放手（`touchend`）绝对静默返回，绝不执行短按判定；
    3. **TouchCancel 状态延时复位**：针对 iOS PWA 长按后偶发的系统级 `touchcancel` 进行 400ms 延迟复位，杜绝状态提前置空导致的事件穿透。
- **移动端与 PWA 后台切回及路由跳转自动热更新检测 (PWA Foreground Resume & Route Update Check)**：
  - **切回前台双重网络稳态探测**：针对移动端从后台或桌面切回时网络（Wi-Fi/蜂窝）存在的 500~1500ms 重连延时，引入阶梯式探测（立即 0ms 探测 + 1.5 秒网络稳定复查），杜绝刚唤醒时网络错误导致检测失效；
  - **路由切换实时探测**：深度订阅 Angular `NavigationEnd` 事件（10 秒防抖），玩家在进出游戏或返回大厅时自动向 Cloudflare 探测最新版本元数据；
  - **全客户端无感更新弹窗**：放宽更新提示限制，无论运行在 PWA 独立桌面模式还是手机浏览器，一旦云端部署新版本，均自动弹出高光优雅的【发现新版本，立即更新】快捷悬浮胶囊，无需用户手动上滑杀后台冷启动。
- **PWA 更新提示横幅全端居中与版本号深度呈现 (PWA Update Prompt Layout & Version Display Fix)**：
  - **核心缺陷破案**：排查并彻底解决在手机端（特别是在 iOS Safari / Standalone PWA 模式下）更新提示卡片因 `left-1/2 -translate-x-1/2` 搭配 CSS Keyframes 动效产生变换矩阵覆盖冲突、导致弹窗严重向左偏移、被屏幕左侧边缘严重截断、按钮挤压错位的视觉缺陷；
  - **全端自适应弹性居中与手势安全区避让**：
    - 外层重构为 `fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] flex justify-center px-3 sm:px-4 pointer-events-none` 顶级全宽居中容器，杜绝任何 `transform` 负偏移引起的截断；
    - 适配 iPhone 底部 Home 指示条安全距离（`safe-area-inset-bottom`），桌面端及手机平板均绝对水平居中，左右留足呼吸安全边距；
  - **更新说明版本号深度联动 (`pwa.update_desc_with_version`)**：
    - 针对 Service Worker `onWorkerWaiting` 事件发生时未及时拉取 `/version.json` 导致版本号空白的问题，在生命周期中加入自动异步抓取远程构建元数据逻辑，确保 `newVersion` 即时命中；
    - 文本说明中无缝带入最新版本号（如：`新版本 v2026.10.23.0821 已就绪，点击立即更新`），便于用户清晰得知本次更新发布的精确发布时间点；
  - **严苛遵守多主题规范**：全面剥离硬编码背景色与文字色，采用 `var(--color-bg-card)`、`var(--color-border-card)`、`var(--color-text-main)` 等全局 CSS 变量，确保 Light/Dark 主题无缝切换并全覆盖 8 种国际化语言（`zh`, `en`, `es`, `ja`, `ko`, `pt`, `fr`, `de`）。
- **六边形消除与方块类游戏手机端顶部得分 HUD 规整重构 (Hexa & Block Mobile HUD Layout Refactor)**：
  - **根治手机窄屏错位与散乱堆叠**：排查并彻底解决 `GameScoreCapsuleComponent` 在手机竖屏（`<640px`）窄宽下因 `flex-wrap` 导致左侧大卡片、右上零散悬浮小按钮、右下参差挤压双纪录的凌乱视觉痛点；
  - **双行秩序美学与对称栅格重组**：
    - **第 1 行（核心主行动行）**：左侧通透呈现【🔶 得分 8,245】主视觉卡片，右侧水平对其排列功能按钮组（`🔄 重开`、`🎨 主题切换`、`🔥 Combo 连击胶囊`），两端齐平，高光对称；
    - **第 2 行（全宽对称双纪录栅格）**：下方以 `grid grid-cols-2` 1:1 等宽平铺【👑 个人最佳】与【🏆 全网纪录】双胶囊，圆角与高度完全统一，告别高低不平与悬空断层；
  - **全屏与桌面端无缝保留**：在平板及桌面端（`>=640px`）保持单行通栏左-中-右三段式优雅展开，兼顾全端适配体验。

---

## [v3.2.4] - 2026-10-21

### 扫雷取消标旗防误踩炸雷修复与全服动态游戏胜负战报同步 (Minesweeper Unflagging Safety & Global Activity Win/Loss Integration)
- **扫雷取消插旗误触点开雷区缺陷根除 (Minesweeper Flag Safe Toggle Bugfix)**：
  - **移动端长按取消插旗后误触发开雷彻底解决**：排查并彻底根治在触摸屏上长按插旗单元格取消标旗时，`touchend` 触发后由于 `this.touchFired` 标志位未能阻止浏览器默认行为，导致浏览器在 300ms 后补发合成 `click` 事件、误将已被解除标记的格子以 `reveal`（翻开）方式点击并触发雷区爆炸失败的致命缺陷；
  - **PC 端与移动端直接点击已插旗格子安全取消**：在 `onLeftClick` 与 `onTouchEnd` 中加入状态防护，当玩家点击处于 `Flagged` 状态的格子时，统一安全切换插旗状态（取消标旗并伴随触觉微震），绝不触发翻开操作；
  - **联机 PK 服务端 `SpeedEngine` 插旗校验同步支持取消**：修复后端在收到已插旗格子的 `flag` 动作时误报 `cell already processed` 的问题，允许在对战模式下正常取消插旗并同步棋盘状态。
- **全服即时动态（全服动态）新增游戏通关胜利与挑战失败战报 (Live Activity Game Win/Loss Broadcast)**：
  - **胜负全服即时播报**：无论是单机闯关还是多人 PK 对战，在玩家达成通关胜利（`game_win`）或遗憾失误失败（`game_lose`）时，实时将战报发布至全服即时动态跑马灯（`LiveActivityTicker`）；
  - **专属视觉标签与高光图标**：通关胜利专属呈现 `🎉` 图标与“通关胜利”徽章，展示所用时间（秒）或得分；挑战失败专属呈现 `💥` 图标与“挑战失败”徽章；
  - **全链路防刷屏与多重防重保护**：`LiveActivityService` 增加 4 秒防重节流与同局唯一性校验，确保战报精准投递；
  - **冷启动与拟真交通发生器全面适配**：后端拟真交通模拟器同步接入 `game_win` 与 `game_lose` 动态事件，保证离线与冷启动大厅动态真实感；
  - **全球 8 国语言全面适配**：所有胜负动态徽章与动态描述文本均已提取至 8 种语言字典，无任何硬编码。

---

## [v3.2.3] - 2026-10-21

### 俄罗斯方块电竞级对战攻防与垃圾行互轰标杆落地 (Tetris Battle Offensive & Counterplay Engine)
- **iPad / 平板端紧凑 3 列布局重构与截断消除 (Tablet 3-Column Ergonomic Layout)**：
  - **4列降为 3列，彻底消除左侧 HOLD 裁切**：解决 iPad 竖屏宽度（768~820px）下 4 列横排导致的容器挤爆与左侧暂存卡片（HOLD）截断痛点；
  - **对手小棋盘垂直整合至右翼底部**：充分利用平板纵向（垂直高度）充裕的优势，将原本独立占一列的对手棋盘无缝嵌入到右翼（RIGHT WING）连击卡片下方，实现【右上：NEXT 预览舱】$\to$【右中：连击 STREAK】$\to$【右下：对手小棋盘】的紧凑纵向排列；
  - **左翼精简与主盘尺寸自适应**：移除平板不需要的桌面操作说明，左翼宽度收紧至 `w-24 sm:w-28 lg:w-32`；限制平板端主盘最大高度为 600px（宽 300px），三列总宽仅 580px，居中呈现，左右各留 100px+ 舒适白边，彻底杜绝横向滚动条。
- **连续局/重开对局下落循环中断缺陷根除 (Rematch Drop Loop Engine Fix)**：
  - **彻底破案赢家第二盘不自动下落 Bug**：排查并修复上一局胜利未死亡的一方因 `status` 残留 `Playing` 导致第二局房间进入 `Playing` 时被条件跳过 `onGlobalStart()` 的隐蔽缺陷；
  - **强制权威状态流转**：在 `TetrisEngine.stop()` 时显式重置为 `Finished`，并在 `TetrisStore` 引入基于进入 Playing 事件的权威检查（`!this.engine.isRunning`），确保无论是输家还是赢家，每一轮对局开始均 100% 触发全新随机方块序列与下落定时器。
- **结算界面返回大厅无阻直达 (Settlement Overlay Lobby Exit & Clean Dismissal)**：
  - **房主结算离场免除二次确认弹窗干扰**：修复在对战已经结束（`GameStatus.Finished`）的结算弹窗中点击“返回大厅”时，因误调解散弹窗或被覆盖导致无法跳转的问题；对战结束后点击退出将直接解散房间（`dismissRoom`）、彻底清理房间信号与本地断线重连缓存并瞬间导航回大厅；
  - **大厅路由语言前缀健壮性修复**：修复 `BaseGameComponent.navigateToLobby()` 中通过 `url.split('/')[1]` 取语言前缀时在部分路由下误取为 `'games'` 导致跳转到不存在的 `/games/lobby` 失败的根本问题，现统一使用 `i18nBase.currentLang()` 安全回退；
  - **退出动作剥离插屏广告阻塞**：在 `GameResultOverlayComponent.handleLeave()` 中移除对插屏广告的等待包装，确保玩家点击“返回大厅”时百分之百立即响应离开，不再因广告加载延迟或超时阻碍用户退出。
- **消完/战毕即时结算与掉线判负机制 (Instant Settlement & Disconnect KO Resolution)**：
  - **PK 对战结算弹窗零延迟渲染**：在 `tetris.component.ts` 中彻底拆除 PK 模式下结算弹窗不必要的 500ms `setTimeout` 及可能被后续 WebSocket 广播状态更新中断的 `onCleanup` 定时器清理机制，对局一经决出胜负立即同步挂载结算弹窗，彻底杜绝“消完方块/对手死后画面卡住不弹结算”的问题；
  - **服务端玩家局中离线/中途退出即时判负**：修复 Go 后端 `PKAttackEngine.RemovePlayer()` 在 `StatePlaying` 状态下忽略玩家离场处理的严重隐患；当对手中途退赛或连接断开时，自动标记其 `Finished = true` 并立即触发 `checkGameEnd()`，向仍在坚守消行的存活玩家立即授予 KO 胜利并广播结算。
- **不规则阻碍型垃圾行生成重构 (Irregular Garbage Rows with 2~3 Holes)**：
  - **杜绝送分型单列通孔**：彻底废除同一列单孔垃圾行（原先所有垃圾行共用同列留空，导致防守方只要等一根长条 I 即可一口气全消反刷分“送分”）；
  - **独立随机 2~3 个留空空洞**：每行升起的垃圾行独立随机留出 2 到 3 个不同列索引的空洞，呈现错落有致、犬牙交错的真正战术障碍，要求防守方必须灵活摆放多个方块填补，恢复垃圾行的核心压迫感。
- **对战结算界面与多局比分系统闭环 (Match Settlement Modal & Multi-Round Series Fix)**：
  - **根除局中早夭偷步重开 Bug**：排查并彻底解决 `TetrisStore` 中因 Signal 状态联动导致玩家出局后未等服务端判定即误判重开、从而跳过结算弹窗的严重缺陷；
  - **后端 `PKAttackEngine` 接入多局制与胜局记录**：服务端支持 `Target`（局数目标）与 `Wins`（胜局统计字典），KO 胜负裁定后正确累积胜局并在顶栏 HUD 及结算弹窗展示系列比分（如 BO3 下的 `1:0`、`1:1`）；
  - **结算弹窗（Game Result Overlay）即时浮现**：对局结束 500ms 内即时弹出结算面板，呈现胜负战报、胜场比分、经验金币奖励及再战（Rematch）入口。
- **严重满行判定缺陷修复 (Garbage Line Clearing Bugfix)**：
  - 彻底修复 `TetrisEngine` 中由于 `cell !== Tetromino.GARBAGE` 导致的垃圾行哪怕被完全填满也绝对无法消除的逻辑漏洞；现在只要整行无留空，垃圾块与常规方块同等消除并产生能量。
- **动态阶梯攻击力生成法则 (Attack Power Hierarchy)**：
  - **双行消除 (Double)**：发动 1 行垃圾攻击；
  - **三行消除 (Triple)**：发动 2 行垃圾攻击；
  - **四行消满 (Tetris)**：发动 4 行强力垃圾轰炸！
  - **连续 Tetris 暴击 (Back-to-Back Tetris)**：若连续两次消除均为 Tetris，额外追加 +1 行暴击攻击力；
  - **全盘清空核弹 (Perfect Clear Wipe)**：打出极限全盘清空额外追加 +4 行毁灭级垃圾打击；
  - **连击压制 (Combo Multiplier)**：Combo $\ge 2$ 时根据连击段位额外附加 1~3 行连击威慑。
- **战术预警能量条 (`Garbage Meter`)**：主棋盘左侧新增 20 格垂直双色告警槽（黄/红），受到对手攻击时平滑入队预警，伴随脉冲呼吸光效与待升行数（`⚠️ +N`）；移动端同步在顶部状态栏呈现灵动红光告警胶囊。
- **全方位电竞级视听战场多巴胺 (Esports Combat Audio & Visual FX)**：
  - **高保真 Web Audio 纯合成对战音效**：激光攻击破空音（`attack`）、护盾格挡双音（`counter`）、底盘齿轮轰鸣（`garbage`）；
  - **攻击光束与受击预警浮动文字**：发动攻击时棋盘绽放横向 `attack-laser-anim` 高能激光波束；
  - **对手视窗危急红光预警 (`⚠️ CRITICAL`) 与 KO 即时判定**：对手堆高超过 14 行时对手卡片自动触发红光呼吸警报与 CRITICAL 标签；1v1 中对手一旦顶死出局，存活玩家立即获得 KO 胜利。

---

## [v3.2.2] - 2026-10-21

### 首页空间精简、多人竞技场升级与全服难度多语言适配 (Hero Streamline, Multiplayer Arena & I18n Polish)
- **游戏难度全语种本地化与防生词穿透机制 (`diffLabel` & I18n Aliases)**：
  - **彻底修复原始未翻译键裸露缺陷**：排查并彻底解决全服动态（`LiveActivityTickerComponent`）、在线玩家状态卡片（`GamePkLobbyComponent`）以及模式徽章（`GamePkModeBadgeComponent`）中出现 `game.difficulty_medium`、`game.difficulty_easy` 等原始未翻译键名的问题；
  - **多层鲁棒解析与前缀清洗**：自动剔除 `game.difficulty_` / `game.diff_` 前缀，优先检索游戏专属难度键、标准难度字典及多语言别名；
  - **8 种语言全面扩充与字典托底**：在全部 8 国语言（中、英、日、韩、西、法、德、葡）中补全 `game.difficulty_easy`、`game.difficulty_medium`、`game.difficulty_hard`、`game.difficulty_expert`、`game.difficulty_master` 等全系别名，设置严格的兜底字典，确保任何语种下均永不暴露 raw key。
- **首页空间紧凑化与视觉减负 (Homepage Hero Whitespace Elimination & SEO Optimization)**：
  - **彻底移除沉冗的静态标语与副标题**：针对平板和桌面端中间大面积空白的体验痛点，彻底移除“终极脑力竞技场”及“从逻辑推理到空间解谜...”冗余大段静态文字，同时保留无障碍与搜索引擎专用的 `<h1 class="sr-only">` 规范结构；
  - **三大行动卡黄金首屏展示**：收紧容器间距，三大行动卡（🎯 每日任务、⚔️ 多人竞技场、🎲 随便来一把）无缝上移，消除空洞感，大幅释放首屏视口高度，平板及手机无需翻屏即可饱览核心游戏列表。
- **每日任务卡片平板排版与对齐重构 (`DailyChallengeBannerComponent`)**：
  - 彻底重构每日任务卡片为与竞技场卡片、随机选游戏卡片完全一致的纵向弹性卡片体系（`h-full flex flex-col justify-between p-3 sm:p-4`）；
  - 解决平板（`md:grid-cols-3` 宽度约束下）原水平排版导致的严重横向拥挤与“完成每日挑...”文本截断问题；
  - 完整呈现任务标题、连续打卡天数（🔥 2天）、任务进度徽标（2/3 或 ✓ 全部完成）、多行描述说明、彩色渐变进度条以及微拟物暗纹水印（🎯）与倒计时，三卡高度与视觉节奏严丝合缝。
- **全服动态赛博电竞高光中枢升级 (`LiveActivityTickerComponent`)**：
  - **全宽沉浸式电竞流光外框**：由局促的短胶囊升级为平铺通栏的电竞级流光战报中枢，采用微发光高亮荧光绿边框（`border-[#0fd228]/25`）与玻璃拟态渐变背景（`from-[#0fd228]/10 via-[var(--color-bg-card)] to-[#0fd228]/5`），顶部贯穿极细 `#0fd228` 高能导光条；
  - **动态呼吸高亮电光绿 LIVE 联通状态胶囊**：精准采纳定制高亮荧光绿 `#0fd228` 脉冲雷达波纹（`bg-[#0fd228]/10 border border-[#0fd228]/40 text-[#0fd228] shadow-[0_0_12px_rgba(15,210,40,0.25)]`），带有高光霓虹核心点（`shadow-[0_0_8px_#0fd228]`），极大提升视觉明锐度与活跃感；
  - **类型专属高光状态标签**：根据动作类型自适应高对比色彩标签（🏆 极速战报/破纪录、⚔️ 对决开房、⚡ 荣誉突破、🎮 挑战中）；
  - **浮雕游戏微标与头像光环**：引入 3D 浮雕游戏图标容器与渐变光环头像，附带页码指示器（如 `1/12`）与“⚡ 互动挑战”快捷按钮，极大提升社区临场感与竞技感。
- **消除类游戏超线性多排爆发与多巴胺连击计分重构 (Elimination Super-linear Multiline & Combo Multiplier Overhaul)**：
  - **六边形消除 (`HexaEngine`)**：
    - 告别单调扁平的线性计分（原 `lines * 10`），引入**超线性指数级阶梯放大**（1线: 100 分，2线: 350 分 [$3.5\times$]，3线: 900 分 [$9\times$]，4线: 2000 分 [$20\times$]，5线+: 3500+ 分）；
    - 放置基础分提升至 5 分/格，连续步数消除连击倍率按 `1 + (combo - 1) * 0.5` 滚雪球倍增；新增全盘清空大满贯奖励（`isAllClear` +1500 分）；
    - 浮动得分动效升级支持 `🌟 PERFECT BOARD CLEAR!`、`👑 MEGA CLEAR!`、`💥 TRIPLE CRUSH!`、`⚡ DOUBLE CLEAR!` 等高冲击动态提示；
  - **方块消除 (`BlockEngine`)**：
    - 行列消除重构为超线性多线爆发模型（1行/列: 100 分，2行/列: 360 分 [$3.6\times$]，3行/列: 800 分 [$8\times$]，4行/列: 1600 分 [$16\times$]，5行/列+: 3000+ 分）；
    - 引入连续消行回合连击累进乘数（`Combo 1: 1.0x, Combo 2: 1.5x, Combo 3: 2.0x...`），大幅增强憋大招收益；新增全屏清空 +1500 分大满贯彩蛋；
  - **俄罗斯方块 (`TetrisEngine`)**：
    - 消除得分基准升级为标准高能阶梯（Single: $100\times \text{level}$，Double: $300\times \text{level}$，Triple: $600\times \text{level}$，Tetris: $1200\times \text{level}$ [$12\times$ 终极收益]）；
    - 新增全盘无残留 Perfect Clear 极限全清大奖（$+2000 \times \text{level}$），连击奖励由 50 提升至 75 分/Combo；
  - **下落2048 (`Drop2048Engine`)**：
    - 新增同回合连续下落连锁追加奖励（`chainBonus`），当单次落子引发 $\ge 2$ 次重力下落连锁时，每多一层额外奖励基础分 $25\%$ 的爆炸加成；
    - 新增全盘清空 +2000 分大满贯奖励。
- **竞技场卡片重命名升级为「多人竞技场」 (Rebranded to Multiplayer Arena)**：
  - 针对项目支持多人与家庭亲子对弈的平台定位，首页行动卡 2 全面由“双人竞技场”升级为“多人竞技场”（Multiplayer Arena / マルチ対戦アリーナ / 멀티 배틀 아레나 等），描述同步更新为“在线多人与亲子实时对决，比拼手速与脑力！”，全面适配 8 国语言。

### 竞技大厅在线玩家生态与首页全服动态中枢 (Online Players Presence & Homepage Live Hub)
- **竞技大厅在线玩家列表动态化与即时互动系统 (`GamePkLobbyComponent`)**：
  - **动态感知游玩与对决状态**：告别单调枯燥的纯文字列表，实时呈现玩家精细状态（“🟢 空闲中 · 随时可迎战”、“🎮 正在挑战 [图标] 连连看 · 高级”、“⚔️ 正在与【对手】激战 俄罗斯方块”）；
  - **三维快捷互动操作栏**：
    - **「⚔️ 邀请PK」**：针对空闲玩家一键秒发专属房间邀请；
    - **「🎮 同款挑战」**：针对单机闯关玩家一键开启同款游戏与相同难度，同台比拼得分；
    - **「👁️ 围观观战」**：针对激战对决玩家支持快速观战或围观；
    - **「👏 喝彩点赞」**：一键为正在游戏或对决的玩家点赞喝彩，释放全屏流光彩带，对方即时收到加油 Toast；
- **首页 (Homepage Lobby) 全服动态跑马灯与氛围中枢 (`LobbyComponent`)**：
  - 将 `<app-live-activity-ticker>` 全景接入平台首页黄金顶部，与全局公告跑马灯、热门榜单协同呼应，让用户进入网站第一秒即刻感受到火热的在线气氛与真实玩家动态；
  - 彻底修复动态轮播中游戏名称缺省、双大括号参数未解析（`正在挑战 难度`、` 分钟前`）的边界缺陷，全面统一全语种字典插值。

### 消除类益智游戏炫彩闪光与高光粒子动效重磅升级 (Dazzling Elimination Flash & Beam Engine)
根据玩家反馈（“消除时绚丽闪一下”），全面重构消除类三剑客（下落2048、六边形消除 Hexa、方块消除 Block）的消除与合成视觉反馈体系，赋予更强烈的多巴胺暴击与清晰的消除感知：
- **下落2048 (`Drop2048`)：爆闪高亮与冲击波涟漪 (Incandescent Merge Flash & Shockwave Ring)**：
  - **白光耀斑爆闪覆盖层 (`merge-flash-white`)**：方块合并瞬间触发 100% 极纯白光高光耀斑（Incandescent White Flash），并在 0.35s 内平滑绽放淡出；
  - **向外扩散冲击波光环 (`merge-shockwave-ring`)**：合并点向四周极速喷射 32px 半径的高能光环，极具穿透力；
  - **核心星芒反光闪耀 (`merge-sparkle-center`)**：中心绽放 45° 旋转的白金星芒（`✦`），大幅增强数值翻倍的成就感；
  - **360° 真实全向爆裂火花**：修复常规合并粒子速度缺失缺陷，引入物理径向散射计算（`tx`, `ty`），配合 3.2 倍高亮对比度 `.merge-pop` 动效；
- **六边形消除 (`Hexa`)：钻石切面爆闪与十字星芒光刃 (Hexa Diamond White Flash & Star Glint)**：
  - **纯白消融晶体耀斑 (`hexa-white-flash`)**：六边形满线消除瞬间，触发纯白高光耀斑覆盖，伴随 1.28x 饱满缩放与强漫反射辉光；
  - **核心十字星芒射线 (`hexa-star-glint`)**：消融中心迸发高速自旋旋转的高速十字星芒刃与聚焦点，视觉层次细腻耀眼；
  - **消融波光环与碎钻粒子**：将外圈扩散冲击波（`hexa-burst-ring`）半径扩充至 25px，结合 6 方位飞溅的高速碎钻晶体，让整行/整斜线消除如流光划过；
- **方块消除 (`Block`)：整行/整列激光横扫与宝石闪耀 (Row/Col Laser Beams & Gem Flash)**：
  - **整行整列激光高能横扫 (`block-laser-beam-h` / `block-laser-beam-v`)**：消除行/列判定瞬间，沿消除轴线激射出高能白青/金色激光光柱，贯穿整盘，带来震撼的街机打击快感；
  - **宝石方块 5 倍极亮纯白闪耀 (`block-clear-cell`)**：消除格子升至 5 倍 Incandescent 亮度与双重投射光晕（`box-shadow: inset 0 0 24px #fff, 0 0 32px #fff, 0 0 55px amber`），像珠宝瞬间爆碎；
  - **炫光星芒火花双重光晕**：全屏爆裂星芒增加双层光环（`box-shadow: 0 0 10px currentColor, 0 0 20px #ffffff`），粒子在飞溅过程中如同流星火花般划过夜空。

### 数织 (Nonogram) 核心手感与沉浸解谜深度革新 (Nonogram Crosshair & Precision Drag Engine)
- **动态黄金十字参考线 (Crosshair Focus & Clue Highlighting)**：
  - 手指轻触或鼠标悬浮任意单元格时，当前整行与整列自动渲染高可见度且柔和的光带，单元格中心高光聚焦；
  - 顶部对应的列提示组与左侧行提示组联动加亮高亮显示，彻底解决大中盘面（10x10、15x15、20x20）中频繁数错格、看花眼、看偏提示组的核心痛点；
- **0ms 极速响应触控与直线防滑锁定 (Zero-Lag Tap & Linear Drag Lock)**：
  - 彻底移除以往移动端 300ms 长按检测延迟，实现与电脑端一致的 **0ms 即刻着色**，操作响应干净利落；
  - 拖动连续绘制时引入智能轴向锁定（Linear Axis Clamping）：当手势移动超过 6px 时自动识别并锁死为水平或垂直方向，在当前笔画中杜绝手指抖动划入邻行/邻列的尴尬误触；
- **提示数字自动划线与进度感知 (Auto-cross Completed Clues)**：
  - 引入 `completedRows` 与 `completedCols` 响应式算法，当某行/列当前填涂结果已完全符合提示时，对应的数字自动划线变灰（Strikethrough），解题进程一目了然，减少 60% 冗余眼部心智负荷；
  - 棋盘底栏新增实时完成度进度指示条（`X/N 行完成`、`Y/M 列完成`）；
- **经典实心纯黑填色与极简体验回归**：
  - 完整保留玩家最习惯的经典纯黑色实心填色质感（`var(--color-text-main)`），格子填满无内部空隙，保证像素连贯自然；
  - 彻底去除震动与闪光特效，仅保留十字光标定位与行列完成画斜杠划线两大核心功能。

### 全服即时动态墙与单机在线气氛中枢 (Live Activity Ticker & Presence Hub)
- **零开销纯内存架构与单机计算原则守恒 (Zero-Overhead Presence Stream)**：
  - **单机游戏前端计算原则严格坚守**：单机游戏（扫雷、数独、推箱子等）计算逻辑 100% 保持在浏览器内存中运行，不增添任何服务端计算或数据库 IO 瓶颈；
  - **轻量状态上报与全服环形缓存 (Ring Buffer)**：玩家在进入单机游戏或通关创下高分时，由客户端在前端生命周期内异步发送轻量 WebSocket 状态包（`report_activity`）；服务端以固定容量环形队列保存在内存中，并广播至对战大厅；
  - **拟真流量冷启动无缝平替**：当全服初启动或夜间低峰期活跃记录较少时，交通模拟器（`traffic.go`）自动注入 10~15 条带真实时间偏移的拟真动态，确保大厅永远具备热闹、鲜活的游玩气氛；
- **全屏响应式跑马灯与深度互动弹窗 (`LiveActivityTickerComponent`)**：
  - **沉浸式动态条**：置于 PK 竞技大厅及移动端顶部，展现呼吸绿灯、用户头像、游戏图标、动态文案与相对时间，每 4.5 秒平滑翻页；
  - **三维互动闭环 (Interactive Action Modal)**：
    - **「🎮 同款挑战」**：直接进入对应游戏并自动选定相同难度；
    - **「⚔️ 发起 PK 挑战」**：秒级创建对应游戏的双人联机房间，并触发全局对战广播与雷达；
    - **「👏 为 TA 点赞」**：向对应玩家发送点赞喝彩并激活动态纸屑动效，单机玩家即时收到温馨的加油 Toast；
- **多语言与主题完备规范**：新增文案全面抽取至中、英、日、韩、西、法、德、葡 8 种语言字典，严格遵循全局 CSS 变量与 Tailwind 响应式排版。

### 下落2048 (Drop 2048) 字体自适应与多巴胺核心机制革新 (Drop 2048 Font Scaling & Dopamine Flow Engine)
- **多位数溢出与撑开格子根治 (Dynamic Font Scaling & Zero-Overflow Layout)**：
  - **按位数梯级自适应缩放**：引入 `getBlockFontSize(val)` 动态算式，根据数字位数智能梯度缩放字体尺寸：
    - 1~2位（2~64）：`cellSize * 0.40`
    - 3位（128~512）：`cellSize * 0.31`
    - 4位（1024~8192）：`cellSize * 0.22` 并设置 `-0.04em` 紧凑字距
    - 5位（16384~65536）：`cellSize * 0.175`
    - 6位及以上（131072+）：`cellSize * 0.15`
  - **强力视界防撑开约束**：在 `.block-3d` 样式中强制注入 `overflow: hidden; max-width: 100%; white-space: nowrap; line-height: 1; padding: 0 2px; box-sizing: border-box`，彻底根除高分大数字（如 2048/4096）将网格单元格横向撑开挤压变形、数字溢出边缘的严重视觉缺陷；
  - **Next / After 预告舱防溢出同步**：为桌面侧边舱与移动端顶部的 Next/After 预览方块引入 `getPreviewFontSize(val, sizePx)`，确保 3 位与 4 位预告数字在微型预览舱中始终居中、完美契合。
- **产出与下落节奏重构——多巴胺持续分泌闭环 (Cadence & Dopamine Mechanics)**：
  - **黄金下落节奏曲线 (Golden Flow Cadence)**：
    - 彻底废除原后期 150ms 导致反应不暇盲目死亡的过激极速曲线，重构为阶梯温和递进节奏（Lv 1 1600ms $\to$ Lv 10+ 保底 750ms），确保玩家即便在高等级也有足够时间观察盘面与规划战术；
    - **险境减速救场机制 (Danger Zone Soften)**：当任意列堆叠高度触碰顶部警戒线（`r <= 1`）时，自动放缓 300ms 下落速度，给玩家留出宝贵的极限微操救场窗口；
  - **满血复原经典高饱水晶质感调色板与 3D 立体倒角高光 (3D Candy Gemstone Visuals & Refined Late Tiers)**：
    - **沿用前期极具吸引力的经典鲜亮色彩**：彻底摒弃暗淡惨浅的灰色系，完整沿用深受喜爱的糖果宝石亮色（2 鲜活红、4 翡翠绿、8 阳光金、16 宝石蓝、32 霓彩紫、64 炽焰橙、128 金蜜橙、256 极光青碧、512 皇家紫、1024 绯红宝石、2048 流光金）；
    - **满血重塑 3D 水晶高光与倒角阴影**：恢复 `inset 0 3px 0 rgba(255,255,255,0.42)` 晶莹高光条、`inset 0 -4px 0 rgba(0,0,0,0.35)` 物理倒角与 `0 5px 12px` 悬浮阴影，方块立体通透、光彩夺目、充满让人想捏想点击的触感爽感；
    - **后期超大数字去刺眼专项重构 (4096+)**：彻底剔除刺眼的荧光死绿（#76FF03），将后期极值方块重塑为华贵紫水晶（4096）、深海冷翡冰蓝（8192）、丝绒玫瑰石榴红（16384）、尊贵墨玉翠绿（32768）等殿堂级华彩宝石；发光光晕收敛至 30% 柔和本色环境光，杜绝向外漏光刺眼。
  - **数字增长曲线平缓化与悠长过渡机制 (Smooth Drop Progression & Anti-Explosion Spawner)**：
    - **基石小数字稳固占据主力 (70%~90%)**：纠正因活跃窗口过度激进导致中后期“天降大数”跳级通关的失衡问题。确立核心规则：小数字（2, 4, 8）无论在任何阶段均占据 70%~90% 的基础发牌比率；
    - **严禁高位大数直接空降**：大数（128、256、512、1024、2048 等）绝对禁止直接从天而降，必须由玩家通过规划一步步层层递进合成，彻底恢复 2048 连锁合成的阶梯成就感；
    - **长线平滑的 bonus 解锁曲线**：
      - 盘面 `< 128`：纯粹 2 (55%)、4 (35%)、8 (10%)；
      - 盘面 `< 512`：极微概率解锁 16 (6%)，2 和 4 依旧占 80%；
      - 盘面 `< 2048`：解锁 32 (4%)，小数字 2, 4, 8 依然坚挺占 88%；
      - 盘面 `< 8192`：解锁 64 (3%)，小数字 2 依旧保留（占 30%），杜绝突变；
      - 盘面 `>= 8192`：最低位才极平稳提升至 4，顶级 bonus 仅为 128 (2%)；
    - **节制理性的智能顺风发牌**：智能补牌概率收敛至温和的 20%，且发牌严格限制在当前合法发牌候选池区间内，绝不越级空降高位大数；彩虹万能块间隔调整为 36 次，避免泛滥。
  - **连击指数级得分与阶梯里程碑音效加成 (Exponential Combo Multiplier)**：
    - 连击消除加入梯级倍率系统（1.0x $\to$ 1.5x $\to$ 2.2x $\to$ 3.2x $\to$ 4.5x $\to$ 6.0x），并在达成 1024/2048/4096 极值合成时追加专属里程碑丰厚积分；
    - 连击浮动文本全面升级为街机风赞叹词（如 `GREAT! 🔥 +384 (×2)`, `AMAZING! ⚡ +864 (×3)`, `LEGENDARY! 👑`），极大强化视听与多巴胺正反馈。

---

## [v3.2.1] - 2026-10-20

### 移动端顶栏与对战大厅全景体验深度优化
- **经典扫雷移动端触控交互重构与缩放平移体系落地 (Minesweeper Mobile Touch, Pan & Dynamic Zoom System)**：
  - **触控争夺与画面抖动根治 (CDK Drag Conflict Removal)**：
    - 彻底移除扫雷棋盘外层的 `@angular/cdk/drag-drop` (`cdkDrag`) 包装。原实现中 `cdkDrag` 的 CSS `transform: translate3d` 与外层容器的浏览器原生平移滚动发生激烈冲突，导致移动端滑动时坐标双重累加、棋盘疯狂抖动（Jittering）与落点严重错位（Misalignment）；
    - 改造为纯净的高性能硬件加速容器滚动（`-webkit-overflow-scrolling: touch`、`overscroll-contain`、`touch-action: pan-x pan-y pinch-zoom`），并结合 `m-auto min-w-fit` 弹性居中方案，初级小棋盘自动全向居中，高难度大棋盘（如 30x16 困难与 30x24 大师）顺畅全向滑动，杜绝 flex 居中时的边缘裁切缺陷；
  - **触控点击判定与长按插旗防抖优化 (Touch Precision & Gesture Slop)**：
    - 将单格触控的移动容差由极苛刻的 `8px` 提升至符合人体工程学的 `16px`，杜绝指腹轻微按压变形被误判为平移拖拽而导致点击失效（"没有用、没有效果"）；
    - 增加多指触控（`touches.length > 1`）即时取消判定，双指手势绝不触发任何误翻开或误插旗；
    - 彻底重构触控生命周期与状态重置，触控结束即时清理所有锁定标志，根除因滑动惯性或拖拽残留导致的“要等四五秒才能点击”的假死锁问题；
  - **移动端多级网格缩放与双指捏合缩放支持 (Responsive Cell Sizing & Pinch-to-Zoom)**：
    - 引入基于 CSS 变量 `--ms-cell-size` 的响应式动态缩放体系（22px ~ 52px），避免 CSS transform 矩阵缩放导致的子像素点击偏移与锯齿模糊；
    - 在顶部操作栏新增优雅的紧凑型缩放胶囊（`[-] 100% [+]`），并适配 8 国多语言与明暗主题；
    - 棋盘容器内置流畅的原生双指捏合缩放（Pinch-to-Zoom）手势监听，支持毫秒级平滑无级放大缩小；
    - 单机难度切换时根据屏幕宽度与棋盘行列智能预设黄金初始尺寸（简单 38px/42px、中等 32px/36px、困难 26px/30px），开箱即享最佳视界。
- **管理后台与在线用户真实客户端 IP 穿透与 Nginx 反向代理配置修复 (Real Client IP Proxy Trust & Nginx Forwarding)**：
  - **Go 后端反向代理信任激活**：在 `cmd/api/main.go` 中为 Fiber v3 实例配置 `TrustProxy: true`、`TrustProxyConfig: { Loopback: true, Private: true }` 与 `ProxyHeader: fiber.HeaderXForwardedFor`，解决 Fiber 默认不信任反向代理头而直接返回 TCP 远端地址（`127.0.0.1`）的问题；
  - **WebSocket 多级 IP 解析与 CDN 回退机制**：在 `internal/handlers/ws/handler.go` 中封装 `getClientIP` 解析器，依次按 `c.IP()` $\to$ `CF-Connecting-IP` (Cloudflare) $\to$ `X-Real-IP` (Nginx) $\to$ `X-Forwarded-For` 多重兜底，确保在本地测试、云原生集群、以及开启 CDN 场景下均能稳定获取访客真实公网 IP；
  - **Nginx 反代配置规范化 (`deploy/nginx/puzzlepk.conf`)**：补齐 `CF-Connecting-IP` 透传及 Cloudflare 节点网段 `set_real_ip_from` 与 `real_ip_header` 配置，根治管理后台在线用户列表中全部显示 `127.0.0.1` 的问题。
- **好友对决邀请胶囊点击失效与递归锁死根治 (Friend Duel Challenge Banner Fix & Infinite Recursion Prevention)**：
  - **死递归根除**：排查并彻底根治点击「⚡ 应战」与「✕ 关闭」时触发的无限递归调用崩溃（`RangeError: Maximum call stack size exceeded`）。在 `ToastService.dismissInvite()` 中调整状态清理次序，执行 `this.activeInvite.set(null)` 前置与安全守卫，杜绝回调函数二次调用 `dismissInvite()` 形成的调用环；并在 `UiOverlayComponent` 中封装 `acceptInvite` 与 `dismissInvite` 独立防腐方法；
  - **局内迎战直连与多游戏路由流转优化**：优化 `FriendService` 中跨游戏加入逻辑，在玩家已在目标游戏页面或局中时，通过 `BaseGameComponent` 的 `crossGameJoin` 响应式 Signal 机制实现原地无感切换与自动进房；五子棋（Gomoku）补齐 `handleJoinRoom` 与 `handleCreateRoom` 重写逻辑并支持 `room.id` / `room.roomId` 多态映射，切入联机对局时自动重置本地单机 AI 引擎；
  - **交互层级与多语言规范化**：将对决胶囊提升至 `z-[100000]` 并显式声明 `pointer-events-auto`，杜绝任何全屏遮罩层的穿透拦截；并将「邀请你对决！」、「应战」、「关闭」全面接入 8 国多语言翻译字典（`game.invite_duel_title`、`game.accept_duel`、`game.close`），杜绝模板硬编码。
- **新游戏接入规范全面重构与现代化体系落地 (`HOW_TO_ADD_GAME.md`)**：
  - 彻底清理陈旧过时的文档内容（如废弃的 python 脚本、过时的本地手写路由等），全面重写为适应 v3.2+ 架构的**权威新增游戏开发指南**；
  - 提炼核心架构哲学与开发红线（单机前端算、联机后端算，后端基于 `BaseEngine`，前端继承 `BaseGameStore` + `BaseGameComponent`）；
  - 规范化 7 步接入流：从 Go 后端引擎 `init()` 与 `go generate` 自动依赖注入，到 Angular 21 Zoneless Signals 状态层、黄金组件模板、`GAME_DEFINITIONS` 自动路由装配、多语言和静态资产的全景落地模版。
- **移动端顶栏空间极大释放与头像/退出收纳 (Mobile Topbar Spacing & Drawer Integration)**：
  - 小屏设备（`< sm`）将用户头像、用户名及退出登录按钮收纳至折叠汉堡抽屉菜单（`isMobileMenuOpen`），并在抽屉顶部展示精美的新增用户卡片（头像、用户名、身份标签及一键退出/登录）；
  - 顶栏仅保留 Logo、对战雷达胶囊、金币药丸与汉堡按钮，释放 120px+ 关键横向宽度，彻底消除窄屏下站点 Logo 与对战雷达胶囊的挤压重叠。
- **对战雷达胶囊切换为高活力翡翠绿 (Vibrant Emerald Live Battle Beacon)**：
  - 将 `LiveBattleBeaconComponent` 的雷达脉冲光环（Radar Ping Wave）与徽章配色由琥珀橙升级为充满生机与高可见度的翡翠绿（Emerald/Green），更清晰地传达“当前有活跃对战房间等待加入”的实时在线感。
- **PK 等候大厅移动端触控滑动解锁与紧凑化布局 (PK Waiting Room Mobile Touch Scrolling & Compact Layout)**：
  - **触控锁死修复**：在 `GameLayoutComponent` 中将舞台容器原有的硬编码 `touch-none` 改进为条件化：在等候大厅状态（`status === GameStatus.Waiting`）下动态启用 `touch-pan-y` 与 `overflow-y-auto`，彻底解决手机端在等候大厅时因触控拦截导致无法上下滑动、底部按钮被裁切无法操作的难题；
  - **移动端元素紧凑化**：等候大厅卡片与玩家对战槽位（Pods）在移动端由 `min-h-[220px]` 精简至 `min-h-[140px]`，头像与 VS 图标尺寸自适应缩小，右侧二维码卡片边距紧凑化，确保开始对战、准备、退出按钮在手机视口内完整可见或轻松滑动触达。
- **积分对决中途淘汰提前离场与观战机制 (Early Defeat Graceful Exit & Spectating in Score PK Matches)**：
  - 针对六边形消融（Hexa）、经典2048、方块拼图（Block）、下落2048、俄罗斯方块等积分 PK 游戏，当一名玩家提前因无法落子而淘汰、对手仍在进行游戏时：
    - 在结算覆盖层中提供极其显眼的 **「🚪 退出对局 (去玩其他游戏)」** 按钮，无需枯等对手结束即可即时优雅离开房间返回大厅游玩其他游戏；
    - 提供 **「👁️ 观战对手 (等待结算)」** 选项：点击后结算面板自动最小化收起为顶部悬浮吸顶胶囊（Floating Spectator Pill），完全不遮挡棋盘，玩家可实时观赏对手的走子和得分，并随时可通过吸顶胶囊恢复结算或一键退出；
    - 彻底修复当房主先被淘汰时因 `showLeave` 逻辑缺失导致被卡死在等待界面的死锁问题。
- **移动端顶栏对战胶囊防重叠排版与弹窗全屏防截断修复 (Mobile Navbar & Beacon Popover Optimization)**：
  - **移动端顶栏空间释放与重叠修复**：小屏设备（`< sm`）将主题切换和语言下拉从顶部密集控制区收纳至汉堡抽屉菜单（`isMobileMenuOpen`），释放 80px+ 关键宽度，彻底杜绝 `Puzzle PK` 站点 Logo 与对战雷达胶囊互相挤压重叠的视觉 Bug；
  - **对战卡片浮层居中与防左侧截断**：将 `LiveBattleBeaconComponent` 展开面板在移动端重构为 `fixed left-3 right-3 top-14`，彻底解决原有 `absolute right-0` 在窄屏下导致卡片左半部分超出视口截断 200px+ 的严重排版 Bug，房间标题、房主、难度与「立即迎战」按钮 100% 居中完整可见；
  - **局内迎战点击穿透与同游戏直连修复**：
    - `GameHeaderComponent` 头部右侧控制区提升至 `z-30 relative`，中央标题区设为 `z-10`，根治移动端中央区域不可见透明边距覆盖右侧导致“房间状态点不了”的层级拦截；
    - 将 `GameLayoutComponent` 顶栏外层卡片的 `overflow-hidden` 调整为 `overflow-visible`，彻底防止弹窗和气泡被父级容器无情切除；
    - 局内「⚡ 迎战」按钮改由 `onQuickJoinTargetRoom` 经由 `joinRoom.emit` 直接原地加入房间，避免旧逻辑走路由刷新导致的断连失效；配合 `BaseGameComponent` 的响应式 `effect` 监听，实现同款游戏房间秒级原地直连。
- **移动端/平板专注沉浸与触控防误触手势终极重构 (Immersive In-App Zen Mode & Touch Containment)**：
  - **彻底告别系统级全屏弹窗**：触控设备（iPadOS、iOS Safari、Android 平板/手机）上彻底停用 `requestFullscreen()` 原生接口，改为纯净 CSS 应用内沉浸全屏 (`100dvh` + 智能隐藏主站顶栏与页脚)；从根本上根除系统级“向下轻扫即可退出全屏”烦人弹窗，且屏幕边缘划动不再被系统拦截拉出地址栏；
  - **全景手势锁定与防页面滚动抖动**：
    - 专注模式下将外层页面滚动容器由 `overflow-y-auto` 动态切换为 `overflow-hidden`，彻底杜绝整页晃动；
    - 游戏舞台区域与 `body.zen-mode-active` 全局注入 `touch-action: none`、`overscroll-behavior: none` 与 `user-select: none`，消除在数字华容道、连线、数织、方块等拖拽棋盘时误触页面滚动或橡皮筋下拉刷新的手势冲突；
  - **实时对战雷达胶囊常驻 (Live Battle Beacon in Game Header)**：
    - 将全站对战雷达组件直接集成至 `GameHeaderComponent` 右侧；
    - 彻底解决专注模式隐藏全局导航栏导致“看不到对战房间/好友约战”的痛点：只要全站有任何玩家开房，顶栏对战胶囊即刻亮起金色呼吸脉冲（如 `⚔️ 1`），单机专注游玩中一键即可原地展开微型对战列表快速迎战，无需退出游戏；
  - **智能默认与轻量引导气泡 (Smart Default & 1-Time Gentle Discovery Tooltip)**：
    - 进入游戏默认启用应用内专注沉浸模式（无视觉噪音、棋盘最大化），离开游戏返回大厅时自动无缝还原全局导航栏；
    - 针对首次进入游戏的玩家，在全屏按钮旁展示温和轻巧的微交互提示气泡（“💡 已开启防误触专注模式（可随时切换）”），4秒后平滑淡出，不给用户造成操作负担；
    - 全面覆盖 8 国语言翻译（`game.zen_mode_tip`）并严格遵循 CSS 变量主题规范。
- **数织 (Nonogram) 大网格 (15x15+) 平板/桌面端右侧截断与视口排版彻底修复**：
  - **动态单元格尺寸精确推导**：重构 `cellSize` 响应式算法，将外层 `GameLayout`、舞台卡片和数织容器的真实边距（移动端 32px、平板 80px、桌面 100px）精确纳入扣除，并精确标定行提示多数字宽度占用（`rowHintEq = maxRowHints * 0.62 + 0.6`），从根本上避免单格宽度偏大导致的累计溢出；
  - **弹性居中溢出截断 Bug 彻底根除**：将外层 flexbox 容器升级为 `items-stretch + m-auto` 配合 `min-w-fit`，彻底解决浏览器在内容超出视口时双向对齐裁剪左/右侧边缘的顽疾；无论在 iPad 竖屏、横屏还是小屏手机上，网格始终清晰可见且支持平滑左右滚动，第 15 列及边缘边界线 100% 完整显示；
  - **行提示紧凑排版**：精细优化行提示字号 `clamp(11px, calc(var(--cell-size) * 0.44), 26px)` 与右侧内边距，减少水平空间侵占。
- **数字华容道 (Sliding Puzzle) 平板与桌面端棋盘及滑块尺寸全面升级**：
  - **打破旧版 440px/500px 尺寸硬上限**：此前 3x3 限制在 440px、4x4 限制在 500px，导致在 iPad/平板上操作时两侧留有大片空旷黑边，滑块过小；现重构 `boardSizePx` 响应式计算，平板端动态扩展至最高 **720px**，桌面端最高 **760px**；
  - **滑块与操作质感大幅提升**：在 iPad 820px 屏幕上，3x3 棋盘单块尺寸提升至 ~220px，4x4 提升至 ~165px，配合 `font-black font-mono` 粗体字型及 `md:rounded-2xl` 圆角，指尖触控和滑动更加轻松饱满；
  - **全局组件联动适配**：顶部步数/计时卡片与底部辅助工具栏与新棋盘尺寸自动保持 `max-width` 等宽对齐，视觉比例和谐协调。
- **数字连线 (Connect / 一笔画连线) 移动端底端截断与多端自适应终极修复**：
  - **移动端 Safari 底端遮挡 Bug 彻底根治**：
    - 排查发现 iOS WebKit Safari 在 `aspect-ratio` 容器嵌套子元素 `h-full` 时存在未扣除内边距与边框的高计算偏差，导致底端第 8 行圆点溢出 10px~15px 并被卡片下边缘横切；
    - 现由外部向连线棋盘直接透传显式像素高度 `[style.height]="boardWidthPx()"`，内部卡片升级为 `flex flex-col` 配合网格容器 `flex-1 min-h-0`，使上下左右内边距（移动端 12px、平板 16px）100% 绝对对称精确扣除；
    - 端点球体占比由 84% 优化至 `w-[80%] aspect-square`，在网格内部留出 10% 充裕的四周呼吸空间，圆点底端无论在 iPhone、iPad 还是桌面端绝不再出现任何边缘遮挡；
  - **棋盘尺寸全端扩展**：打破原 520px/580px 硬编码上限，平板端允许动态扩展至最高 **720px**（桌面端最高 **760px**），大幅减少平板左右两侧空旷距离，底部控制工具栏同步保持等宽宽敞排版。
- **俄罗斯方块 (Tetris) 与下落2048 (Drop2048) 平板/大屏竖向视野全面加长与空间扩展**：
  - **俄罗斯方块 (Tetris) 大屏街机化重构**：
    - 针对长屏幕与平板电脑打破原先 `max-h-[720px]` 限制，引入 `boardHeightPx` 动态响应式高度计算，平板端棋盘高度直接放宽扩展至 **860px**（桌面端最高 **880px**），在 1:2 黄金比例下棋盘宽度同步大幅扩展至 **430px**（单格尺寸由 30px 跃升至 43px，尺寸增幅超 40%）；
    - 控制台中央垂直居中（`items-center`），左右翼仓（HOLD 仓与 NEXT 仓）同步加宽自适应（`w-32 lg:w-40`），在大屏与平板上展现出震撼大气的殿堂级街机框体视觉；
  - **下落2048 (Drop2048) 平板大屏尺寸翻倍扩充**：
    - 彻底废除旧版固定 `64px` 单格硬编码，改为联动视口与长屏高度动态推导 `cellSize`（平板端单格直接自适应扩展至 **96px~102px**）；
    - 整个游戏盘高度由原先狭窄的 `478px` 跃升至 **~737px**（宽度同步提升至 529px），方块数字字号由 28px 动态放大至 42px，下落、堆叠与碰撞合成的操作视界翻倍扩充，彻底解决平板上“又小又短”的痛点。
- **矩阵翻转类游戏全平台尺寸体系联动 (Lights Out & Sokoban)**：
  - **熄灯游戏 (Lights Out)**：同步解除 420px~480px 限制，平板端棋盘支持扩展至 **720px**，大尺寸拟物灯泡视觉冲击力与点击触感大幅增强；
  - **经典推箱子 (Sokoban)**：同步将平板端最大宽度放宽至 **720px**，仓库俯瞰视野更开阔，方向键与触控更加清晰易辨。
- **PWA 更新提示策略优化（策略 A：区分普通网页与桌面独立客户端）**：
  - **普通网页静默更新**：针对普通电脑与手机浏览器标签页访问场景，彻底关闭“🚀 发现新版本”更新弹窗，由 Service Worker 在后台静默预缓存最新资源，用户下次打开或按 F5 刷新自动生效，不再打扰正在游玩或操作的用户；
  - **桌面独立应用专注提示 (`isStandalone`)**：仅当用户以“添加到主屏幕/桌面安装”的 PWA 独立窗口模式（Standalone / Fullscreen）运行时，才显示更新提示弹窗，方便无浏览器地址栏与刷新按钮的独立客户端一键应用新版本。
- **管理后台全站用户档案多维排序与快捷切换工具条 (`AdminComponent`)**：
  - **核心排序维度全覆盖**：全面支持管理员按**脑力值 (`brain_coins`)**、**等级 (`level`)**、**经验值 (`xp`)**、**注册时间 (`created_at`)**、用户名 (`username`) 及用户编号 (`id`) 自由升降序排列；
  - **快捷排序胶囊工具条 (Quick Sort Action Bar)**：在搜索栏下方新增响应式快捷排序按钮组（🕒 注册时间、🧠 脑力值、👑 等级、⭐ 经验），点击一键切换排序，再次点击快速反转升降序，带有清晰的高亮底色与状态徽标（如 `↓ 最新`、`↑ 最早`、`↓ 高→低`、`↑ 低→高`）；
  - **表格表头交互与独立排序强化**：将“等级与经验”表头升级为可独立点击排序的精细交互组件（可分别点击“等级 ↕”和“经验 ↕”单独排序并高亮当前字段）；脑力值与注册时间列增设醒目排序指示，支持直接点击表头排序；
  - **完善多语言体系**：新增所有排序字段与操作文案均严格抽离至 `zh.json` 与 `en.json`，确保 Light/Dark 主题无缝适配。
- **数值与经济配置：支持单机与 PK 失败时的经验值及脑力币自定义配置 (`AdminXpConfigComponent` & 后端经济/XP引擎)**：
  - **解决失败仍获经验痛点**：彻底根除此前单机/PK失败仍固定发放 2 XP / 5 XP 的硬编码逻辑，使失败时的收益与惩罚完全转为管理员后台配置驱动；
  - **脑力币失败配置上线**：新增 `coins.solo_defeat`（单机闯关失败，默认 0 🪙）与 `coins.pk_defeat`（真人 PK 失败，默认 0 🪙），管理员可在后台按需自定义；
  - **XP 等级引擎动态化与失败配置**：重构 `service.CalcEventXP` 从数据库 `system_settings` 动态读取配置，支持 `xp.single_win`（单机通关胜利，5 XP）、`xp.single_defeat`（单机挑战失败，0 XP）、`xp.pk_win`（PK 获胜，15 XP）、`xp.pk_defeat`（PK 失败，0 XP）的实时热更新；
  - **前后台结算无缝联动**：失败时若经验或脑力币为 0，前台结算面板不再展示误导性奖励胶囊，实现数值逻辑的严谨自洽。
- **五子棋 (Gomoku) 界面与对弈体验全面革新：全端大盘响应式适配与对战 HUD**：
  - **大屏空间利用率彻底优化 (iPad / 平板 / 桌面)**：打破旧版固定 `600px` 宽度限制，通过 `WindowSizeService` 动态计算当前可用视口高度与宽度，支持棋盘自适应扩展至最高 `880px`（在 iPad Pro 1032x1376 及高分屏上尺寸提升超 45%），留白大幅缩减，视野恢弘大气；
  - **全功能对弈状态 HUD (Battle Status HUD)**：在棋盘顶端新增一体化对弈信息栏，黑白双方玩家卡片（头像、持子标识、实时执子呼吸光环、AI思考动画）、当前手数字徽标、一键重新开始按钮（快捷键 `R`）以及单机 AI 智能锦囊按钮；
  - **拟物棋子与沉浸式动态微交互**：新增高精度径向渐变拟物棋子质感（黑棋玉石质感微光、白棋温润层次高光与阴影）、落子弹性轻微下沉动画 (`animate-stone-drop`)；
  - **智能提示与高对比最后一手指示**：单机模式引入 `AI 锦囊 (Hint)` 辅助，点击或按键盘 `H` 键即可通过内置 AI 引擎计算最优落点并呈现金色脉冲光圈 (`animate-hint-pulse`)；重构最后一手指示器，由原先肉眼难辨的 1.5px 小红点升级为扩散声呐雷达圈 (`animate-sonar-ripple`)；
  - **连五获胜高光线**：五子连珠获胜时，自动点亮五颗致胜棋子并赋予呼吸金色辉光 (`animate-winning-glow`)，让胜负一目了然；
- **六边形消除 (Hexa) 与下落2048 (Drop2048) 局终失败状态持久化彻底修复**：
  - **根除失败后重入仍弹失败的恶性闭环**：排查并彻底修复此前在六边形消除中闯关失败（Game Over）后直接点击返回大厅、再次进入游戏时依然加载已死亡棋盘并重复弹出“游戏失败”遮罩的体验问题；
  - **严格终局存档生命周期**：
    - `HexaStore` 与 `Drop2048Store` 在单机判定失败的一瞬间主动清除本地存档（`storageRemove`），且在写入逻辑中严防已死亡棋盘（`gameOver: true` 或 `isDead: true`）被写入本地存储；
    - 读取校验层全面加固：若检测到本地残留已终局或非 Playing 状态的存档，自动丢弃清理并返回 `false`，强制初始化全新开局棋盘，确保玩家无论以何种途径退出再进，都能即刻体验全新的游戏局面；
    - 联动 `leaveRoom()` 与组件生命周期 `ngOnDestroy()` 建立双重安全拦截，彻底杜绝死局幽灵存档。
- **项目大规模代码清理、仓库瘦身与基类统一架构重构 (Large Scale Optimization & Architecture Unification)**：
  - **前后端冗余文件与历史编译产物全面清理（瘦身超 270MB）**：
    - 彻底清除后端根目录下累积的历史二进制执行文件（`backend/api`, `api_bin`, `main`, `server`, `tmp_api`, `tmp_bin`, `x-game-api`）与历史测试数据库（`db.sqlite`, `x-game.db`）；
    - 将散落在后端根目录的维护工具脚本统一整理归档至 `backend/scripts/tools/`，清理全部一次性旧调试测试脚本；
    - 前端彻底清除 Angular 原生过时 i18n 文件（`messages.xlf`）、备份文件（`sudoku.store.ts.bak`）及一次性调试迁移脚本；
    - 建立健全 `.gitignore` 与 `backend/.gitignore` 规则，严禁二进制与临时数据库二次提交；
  - **`BaseGameStore` 单机断点续玩与终局清理统一生命周期引擎**：
    - 将单机游戏的本地存盘、恢复与销毁逻辑深度抽象并收拢进 `BaseGameStore` 核心层（`enableSinglePlayerSave`, `getSinglePlayerSaveData`, `restoreSinglePlayerSaveData`, `saveSinglePlayerProgress`, `loadSinglePlayerProgress`, `clearSinglePlayerSave`）；
    - **基类全局防卫**：任何游戏进入 `Finished` 终局、执行重开 `restartGame` 或离开房间 `leaveRoom` 时，基类 100% 自动抹除本地存档；读取时增加通用安全过滤，自动清除已死亡/已结算的幽灵存档，实现“改动基类一处、全站游戏统一受益”；
    - `HexaStore`、`Drop2048Store`、`BlockStore`、`NonogramStore` 全面完成接入与样板代码精简；
  - **响应式棋盘尺寸工具统一化**：
    - 全面推广 `boardSizePx` 响应式视口扣除工具函数，统一五子棋、点灯逻辑、华容道等游戏的平板大屏自适应尺寸逻辑；
- **方块消除 (Block Puzzle) 完整音效生态修复与 Web Audio 物理合成升级**：
  - **根除单机续玩无音效缺陷**：排查并彻底解决玩家反馈“方块消除没有音效”的深层根因：此前当玩家刷新或中途重新进入游戏时，由于通过本地存档（`block_save`）恢复游戏，`BlockEngine` 未被配置音频回调 `onSound`，导致引擎落子与消除时未向前端发送任何音效事件；
  - **引擎生命周期与回调持久化**：新增 `BlockEngine.configure` 并统一抽象 `ensureEngineConfigured`，无论全新开局、单机断点续玩还是 PK 全局开局，100% 自动装配音频与连击消行回调；消行时将连击数直接透传给音效系统；
  - **丰富方块全生命周期拟物音效**：
    - `pickup`（拾起方块）：新增 520Hz→780Hz 微弹高频瞬态晶润声，提升拖拽指尖交互质感；
    - `place`（落子入槽）：清脆高频微敲击（2.2kHz BPF）+ 宝石下沉温润共鸣（240Hz→140Hz）；
    - `clear`（爆炸消融）：超重低音能量轰鸣（95Hz→42Hz）+ 碎钻水晶爆裂爆破 + D大调繁星上扬琶音 + 2 连击以上金属微鸣；
    - `error`（无效落点回弹）：180Hz 柔和低音弹性回弹提示；
    - `gameover`（终局无子可下）：幽雅下行三连音（A4→F#4→D4）；
  - **Web Audio API 规范加固**：全面补齐频率与增益包络 automation 前的 `setValueAtTime` 预设，杜绝部分移动端或桌面 WebKit 内核因直接调用 `exponentialRampToValueAtTime` 导致的音频静默或报错；
- **扫雷 (Minesweeper) 移动端长按插旗触控体验精细化重构**：
  - **根除长按做标记时格子“压下又弹回”缺陷**：解决移动端在长按做雷标记时方块因 CSS 伪类 `:active` 导致深度下凹、插旗抬手后又被动弹起的体验瑕疵（插旗非排雷，长按压下会造成即将踩雷的误导感）；
  - **指针设备按压精准隔离**：将 `.ms-cell-unrevealed:active` 的深度凹陷效果严格限制在 `@media (hover: hover) and (pointer: fine)` 鼠标精确设备中（PC 鼠标左键点击依然保持经典凹陷，右键插旗不凹陷）；
  - **移动端触控逻辑自洽**：
    - **长按做雷标记**：按住格子时保持稳固的 3D 浮雕凸起质感（不凹陷），360ms 判定达成时直接在凸起方块上插旗并伴随震动反馈，松手丝滑利落，绝无下压与弹回抖动；
    - **快速点击排雷**：短触抬手判定为快速点击，瞬间将方块翻开为下凹的平盘质感（`.ms-cell-revealed`），实现“仅快速点开时下去，长按标记不压下”的极致手感；
    - **防误触与滑动优化**：已插旗格子加入 `.ms-cell-flagged` 锁定保护，移动端滑屏拖拽超过 8px 自动释放长按判定，杜绝浏览地图时的误插旗；
- **数织 (Nonogram) 平板/移动/PC 全端大盘自适应与提示数字高质感重构**：
  - **根除 iPad 与大屏棋盘过小、留白过大问题**：排查并彻底解决玩家反馈“iPad 与移动端数织棋盘太小、四周留有巨大空隙”的深层根因：此前 `cellSize` 计算中为 5x5、10x10 等常见难度设置了过小的硬编码 `maxSize`（5x5 仅 76px、10x10 仅 62px），导致哪怕在 iPad Pro（820x1180 / 1024x1366）或高分屏桌面端，5x5 棋盘总宽被死死卡在不到 380px，浪费过半屏幕；
  - **全端动态饱满自适应计算**：重构 `NonogramComponent.cellSize`，综合视口高宽与行/列提示等效占比，移动端紧凑贴合（5x5 达 58px 无缝居中）、iPad 满盘沉浸扩展（5x5 达 110px 棋盘近 700px 饱满居中）、PC 最大扩展至 880px，彻底告别“小格缩在正中间四周全是空隙”；
  - **提示数字（数织数字）显著放大与层级排版升级**：
    - 列提示数字字号上限由 16px 大幅解禁至 `clamp(11px, calc(var(--cell-size) * 0.46), 28px)`，行提示字号上限由 18px 解禁至 `clamp(12px, calc(var(--cell-size) * 0.5), 30px)`；
    - 升级为 `font-mono font-black` 高辨识度等宽黑体，搭配适度字间距（`mr-1.5 sm:mr-2.5`）与行间距，告别数字挤成一团或细小模糊的缺陷，一眼看清提示规则。

---

## [v3.2.0] - 2026-10-19

### 核心重构与品牌升级
- **认证流程优化与注册闭环即时登录**：
  - **精简认证通道**：彻底移除登录与注册弹窗/页面中的“游客直接游玩”按钮及 Or 分割线，避免潜在用户分流，显著提升平台正式会员注册转化率；
  - **注册成功友好反馈与大厅自动跳转**：后端 `/register` 接口在创建用户后直接签发 JWT Token 并返回完整用户档案；前端注册成功后自动存储身份凭证，弹窗展示友好欢迎提示（“🎉 注册成功！欢迎加入益智游戏PK网”），并秒级自动跳转至游戏大厅，无需二次手动登录。
- **管理后台用户档案库深度重构：资产全局透视与高性能分页 (`AdminComponent`)**：
  - **会员资产全局统观**：用户管理表格新增「脑力币」专属资产列（配合 `<app-coin-icon>` 高精拟物矢量金币与千分符金额呈现）与「等级经验」列（`LV.X` 胶囊徽标 + `XP` 计数），管理员可清晰掌握全站会员的资产分布与活跃等级；
  - **服务端高性能分页机制**：重构前后端接口，后端基于 PostgreSQL `Count` 与 `Limit/Offset` 实现标准分页（默认每页 15 条，支持 10/15/25/50 自由切换），前端构建响应式分页条（显示区间、总条数、页码指示器与翻页操作），彻底根除全量数据一次性加载的性能瓶颈；
  - **实时玩家账号搜索**：集成账号模糊搜索栏与回车直搜功能，支持一键清空与精准检索。
- **全游戏快速重开与全局 PC 键盘快捷键生态 (Usability & Instant Restart Ecosystem)**：
  - **核心痛点深度解决**：针对益智类单机游戏（如数字华容道、数独、点灯逻辑、数织、俄罗斯方块、下落2048、六边形消除等）玩家在开局不顺或刷榜时频繁需要一键快速重开的需求，全面重构全站游戏的快速重开交互通道；
  - **统一 UI 快速重开通道**：
    - **数字华容道 (`Sliding Puzzle`)**：在头部 MOVES 与 TIMER 之间黄金中槽内嵌笑脸即时重开按钮（`😎/😃`），点击 0 延迟秒重置；
    - **扫雷 (`Minesweeper`)**：原有笑脸重置按钮全面保留，增加键盘即时重置响应；
    - **俄罗斯方块 (`Tetris`)**：单人模式顶栏 HUD 新增即时重开按钮（旋转动态回馈），并在 GameStatus 为结束/就绪时支持一键重开；**全面取消空格键硬降 (Hard Drop) 触发的全屏/棋盘剧烈晃动震颤动画 (`tetris-shake`)**，彻底消除视觉模糊、晃动与眩晕感，带来极致顺滑稳定的拼搭手感；
    - **下落2048 (`Drop2048`)**：单人分数胶囊中央槽位新增即时重开按钮；
    - **六边形消除 (`Hexa`) & 方块消除 (`Block`)**：在宝石分数胶囊内新增即时重开胶囊按钮，消除需频繁返回大厅才能重玩的摩擦阻力；
    - **连连看 (`Connect`)**：在单人信息条右侧计时器旁直接内嵌即时重开微型按钮；
    - **点灯逻辑 (`LightsOut`) & 水排序 (`WaterSort`)**：在步数指示胶囊旁直接内嵌即时重开按钮；
  - **全系 PC 键盘快捷键闭环**：
    - `R` 键：全系支持在单机模式下按下 `R` 键秒级快速重开（覆盖扫雷、俄罗斯方块、数字华容道、推箱子、2048、下落2048、数独、点灯、数织、连连看、六边形消除、方块消除、水排序、数桥）；
    - `Z` 键：支持推箱子、2048、数织、数独的一键撤销 (Undo)；
    - `WASD / 方向键`：全向支持数字华容道推块、推箱子走位、2048滑动、数独单元格焦点切换与高亮选区移动；
    - `H` 键：支持点灯逻辑、连连看、数织、数桥的一键智能提示；
    - `Space / 模式切换`：扫雷支持 `Space`/`F` 切换插旗/排雷，数织支持 `Space`/`X` 切换填色/标叉，数独支持 `Space`/`N` 切换草稿笔记模式；
- **Cloudflare Pages 与手机桌面 PWA 即时更新体系 (`PwaUpdateService` & `PwaUpdatePromptComponent`)**：
  - **根本解决桌面 Web App 缓存滞后**：针对用户将网页“添加到手机桌面”（Standalone PWA）后，由于 Service Worker 静态强缓存和手机系统后台进程休眠快照导致前端部署后数天无法刷新的痛点，打造闭环即时更新检测体系；
  - **构建版本自动化打标 (`generate-version.js`)**：每次构建自动将时间戳版本注入 `version.ts`、输出 `public/version.json`，并动态替换 `public/sw.js` 中的 `CACHE_NAME`（通过脚本字节物理变动强制 Cloudflare CDN 与客户端浏览器触发 SW 更新周期）；
  - **Cloudflare Pages 边缘防缓存标头保障 (`_headers` & `functions/[[path]].js`)**：对 `/version.json` 与 `/sw.js` 强制注入 `Cache-Control: no-cache, no-store, must-revalidate`，确保边缘节点与浏览器永远抓取最新版本；
  - **手机切屏自检与前台唤醒 (`PwaUpdateService`)**：监听 `visibilitychange` 事件，每当用户从手机桌面点击图标切回应用时秒级触发线上版本比对，同时配合 3 分钟轮询与 SW 状态监听；
  - **全局微拟物更新胶囊 (`PwaUpdatePromptComponent`)**：检测到新版本时在底部弹出毛玻璃流光胶囊（“🚀 发现新版本！点击立即更新”），点击后向 SW 发送 `SKIP_WAITING`、清空过期 CacheStorage 并无缝硬重载，8 种语言 100% 国际化适配。
- **多难度动态棋盘平板自适应与全屏专注模式全局垂直居中**：
  - **全屏专注 (Zen Mode) 全局垂直居中校正**：排查并彻底解决各子游戏（数织 Nonogram、点灯逻辑 Lights Out、数字华容道 Sliding Puzzle、连连看 Connect、推箱子 Sokoban、数独 Sudoku、扫雷 Minesweeper、2048、方块消除 Block、五子棋 Gomoku、数桥 Hashi）外层包裹容器误用 `justify-start` 导致专注模式隐藏顶栏时棋盘向上挤压偏移的痛点，统一重构为与六边形消除 (`Hexa`) 完全一致的 `justify-center my-auto` 弹性模型，无论在常规模式还是全屏沉浸专注模式下，游戏卡片与棋盘始终保持屏幕视口绝对纵向居中；
  - **点灯逻辑 (`LightsOutComponent`)**：重构原本固定的 420px 棋盘容器为 `boardSizePx` 动态计算属性，3x3 (420px) 到 8x8 (740px) 随难度平滑扩展，在平板端（768px~834px）高阶关卡充分利用屏幕宽度，彻底消除两侧宽大空白；
  - **数字华容道 (`SlidingComponent`)**：引入 `WindowSizeService` 与 `boardSizePx` 响应式计算，剔除硬编码 `500px` 限制，8x8/7x7/6x6/5x5 分级阶梯自适应（最高 740px），步数/计时头部与底部操作栏与棋盘同宽自适应对齐；
  - **连连看 (`ConnectComponent`)**：突破原先 `max-w-xl` (576px) 狭窄瓶颈，基于关卡宽度（8x8 至 14x14）动态计算 `boardWidthPx`（最高 760px），关卡状态栏、未闭合连线提示条、棋盘容器与工具栏协同联动拉伸；
  - **推箱子 (`SokobanComponent`)**：打破原本 `540px` 的固定限制，依据地图长宽行列数动态计算 `boardDimPx`（最高 740px），关卡选关条、步数/用时 HUD 与棋盘精准对齐。
- **数织 (Nonogram) 平板与高阶网格大棋盘视口自适应重构 (`NonogramComponent`)**：
  - **根除历史幽灵侧边栏扣减**：彻底剔除计算中早已废弃的 260px~360px 左右抽屉留白扣减，回归中央卡片舞台真实可用物理空间 (`Math.min(vw, 1400) - containerPadding`)；
  - **行列提示真实文本宽度精准测算**：废弃原本将提示区粗暴估算为 10.4 格（200px+）的溢出模型，基于当前行与列实际最大数字数量（`maxRowHints` / `maxColHints`）精准计算提示所占格当量（`0.42 * S` / `0.46 * S`），为棋盘网格释放超 150px 的黄金横向像素；
  - **大师 (25x25) 与专家 (20x20) 极佳平板触控体验**：平板端（iPad / Android Pad，宽 768px~834px）大师 25x25 格子尺寸从原先过小的 20px 跃升至 **24px~26px**（网格可视面积暴增 **56%**），横向饱满占据卡片宽度的 98%，消除左右空旷留白；同时竖向严格受控（总高 < 950px），配合 `clamp` 字体平滑缩放，实现零溢出、全屏沉浸、指尖轻松点按。
- **全站结算面板「返回大厅」通用封装与全局统一 (`app-game-result-overlay`)**：
  - **组件内部通用封装**：重构 `GameResultOverlayComponent`，新增 `canShowLeave` 智能计算属性（默认在非房主解散场景下全量开启返回大厅），并在 `handleLeave()` 中封装无监听安全路由回跳大厅（`/{lang}/lobby`），杜绝因上层遗漏配置导致按钮消失或失效；
  - **消除六边形消除与方块消除缺陷**：彻底修复六边形消除 (`Hexa`) 因漏传 `[showLeave]` 导致按钮缺失的问题，以及方块消除 (`Block`) 误设 `!== GameMode.Single` 导致单机模式隐藏按钮、且 `leave` 未触发 `goBack()` 路由跳转的痛点；
  - **全站其余游戏死角全面肃清**：排查并修复五子棋 (`Gomoku`)、点灯逻辑 (`LightsOut`) 与数独 (`Sudoku`) 单人通关结算中相同的原因导致的返回大厅按钮隐藏，全站 18 款游戏结算界面交互逻辑实现 100% 统一规范。
- **全站品牌升级**：全站名称升级为**“益智游戏PK网”**（英文：Puzzle PK），完成全站 33 处文案、SEO 元数据（OpenGraph / Twitter Card / JSON-LD）、大厅展示及多语言国际化对齐。
- **顶栏大一统与空间释放**：消除各子游戏原本占用的次级 Action Console Bar，将其无缝整合至主顶栏 `<app-game-header>`；三段式布局实现难度胶囊绝对居中，为全平台 18 款游戏直接释放 50px 垂直操作空间。
- **规则指引体验优化**：规则按钮图标升级为标准书本图标 (`Heroicons book-open`)，弹窗采用统一的多语言规则卡片。
- **文档体系瘦身**：归档冗长历史日志，重构 `CHANGELOG.md` 与 `FEATURES.md` 为极简高可用架构，日常开发实行轻量化记录。
- **大厅卡片大视觉重构**：缩减封面四周冗余留白提升 40% 插画主体，右上角热度下移至标题行并列，左上角联机标微型化，扫雷等游戏介绍纠偏为纯粹竞速对决。
- **大厅移动端首屏高度压缩**：收紧移动端 Hero 标题排版并隐藏小屏装饰标语，将 3 张入口卡片重构为「每日任务（通栏）+ 竞技场与随机游戏（双列并排）」，首屏直接节省 180px 高度，游戏卡片首屏即见。
- **大厅骨架屏加载态 (Skeleton Screen)**：新增与卡片尺寸严格对齐的 80% 比例脉冲骨架屏，平滑过渡数据加载期，彻底消除布局抖动 (CLS)。
- **SVG 矢量图标无损瘦身**：基于 SVGO 对全站 18 款游戏 SVG 图标进行无损压缩，剔除冗余 XML 与编辑器元数据，各图标体积优化 20%~55%。
- **全站统一金色脑力币矢量图标组件 (`CoinIconComponent`)**：
  - 彻底解决 Apple 设备（iOS iPhone / iPadOS / macOS Safari）将原生 Emoji `🪙` (U+1FA99) 渲染为灰暗微型古铜币的系统字体兼容性痛点；
  - 打造高精细 3D 拟物矢量组件 `<app-coin-icon>`，内建外环倒角金属流光渐变、内陷盘面、环状点阵齿轮边框、立体五角星浮雕与顶部弧形镜面高光，提供 `xs/sm/md/lg/xl` 自适应预设与动态尺寸；
  - 全量替换全局主顶栏、游戏内顶栏、脑力币规则弹窗 (`CoinGuideModal`)、结算浮动收获气泡 (`XpGainBadge`)、结算大面板、智能提示按钮、自建房赏金设置及个人中心商城，实现全平台统一璀璨金币视觉；
  - 同步清洗 8 种语言资源文件中嵌入的原生金币 Emoji，统一格式化为本地化文案。
- **PK 竞技大厅头部渐变与高对比度重构 (`game-pk-lobby.component.html`)**：
  - **消除浅色模式泛白发灰遮罩**：修复旧版直接在浅色卡片上叠加 `bg-gradient-to-r from-rose-900/20 to-violet-900/20` 导致的泛白、浑浊粉灰感，调整为与主题卡片背景原生融合 (`bg-[var(--color-bg-card)] dark:bg-gradient-to-r dark:from-rose-950/30 dark:to-violet-950/30`)；
  - **活跃房间与在线玩家微标高反差胶囊化**：将原本悬浮且对比度极低的淡浅紫与淡薄荷绿字体重构为独立微型胶囊徽章（微光动态光点 + 高饱和度加粗深紫色/深绿色字体 + 自适应半透明背景框），在亮色与暗色模式下均获得极佳的 WCAG 可读性；
  - **通用头部工具栏图标与代币药丸锐利化 (`game-header.component.html`)**：移除工具栏按钮的 `opacity-75` 模糊淡化，代币药丸采用自适应高对比金色字体与更清晰的分割边框。
- **全屏专注模式路由感知与偏好记忆重构 (`ZenModeService`)**：
  - **大厅顶栏绝对保全**：重构 `isZenMode` 为路由与偏好联合计算信号 (`computed(() => this.isGameRoute() && this.zenPreference())`)。修复此前在游戏内开启专注模式后退出到大厅导致顶部 Logo、脑力币余额与用户头像隐藏的问题，确保大厅、排行榜、每日任务及个人中心始终完整展示顶栏导航；
  - **游戏内专注偏好记忆 (`localStorage`)**：用户在游戏内切换全屏专注状态将即时持久化至本地存储，退出到大厅时顶栏正常呈现，当玩家再次进入任意游戏时，系统自动无缝恢复全屏沉浸专注状态，无需重复手动点击；
  - **全屏生命周期安全退回**：离开游戏路由时若处于浏览器原生全屏状态，服务自动安全退出原生全屏，恢复常规窗口浏览体验。
- **游戏顶栏移动端防遮挡优化**：重构 `DifficultySelector` 为双态自适应胶囊（移动端简洁呈现如「🎯 简单」，桌面端展开全称如「🎯 简单 (5x5)」），并优化顶栏 flexbox 左右权重，在 360px 极窄屏幕下与「⚔️ PK」按钮保持充裕间距，彻底消除重叠。
- **平板端 (iPad / Tablet) 顶栏与游戏头部防重叠重构**：
  - **主站全局导航栏断点优化 (`main-layout.component.ts`)**：将顶部横向 4 项图文导航链接由 `lg:` 提升至 `xl:` (1280px) 断点展示，平板端（iPad Mini 768px、iPad Air 820px、iPad Pro 1024px/1032px）自动收敛至全屏侧滑抽屉汉堡菜单，避免导航链接与语言、主题及用户信息相互挤压叠盖；
  - **游戏子头部 (`app-game-header`) 弹性流重构**：彻底消除平板端对难度选择器的硬性绝对居中 (`md:absolute`)，调整为移动与平板端自适应弹性居中 (`mx-auto`)，仅在超宽桌面端 (`xl:absolute`) 开启屏幕绝对居中；
  - **PK 动作按钮自适应微型化 (`game-layout.component.ts`)**：开房 PK 与邀请对决按钮在平板与小屏端自适应为紧凑版「⚔️ PK」和「👥 邀请」，大桌面端展开全称；
- **结算与通关双重奖励收获浮动气泡 (`app-xp-gain-badge` & `CoinService`)**：
  - **经验值 + 脑力币并列浮空动效**：重构 `XpGainBadgeComponent` 为双重奖励动效胶囊，通关或结算时同时弹出紫蓝流光「✨ +10 XP」与金色流光「🪙 +5 脑力币」；
  - **错峰优雅淡出机制**：XP 气泡在 2.3 秒先行淡出，脑力币气泡在 2.6 秒随之淡出，形成极具节奏感的视觉收获正反馈；
  - **全链路结算收敛 (`GameStatsService.submitStat`)**：统一在数据上报服务层中自动拦截结算响应，原子化触发 `showCoinGain`、`showXpGain` 及账户实时脑力币变动，覆盖单机闯关与 PK 竞技全站 18 款游戏；
  - **关卡类游戏与每日挑战后端贯通**：补齐 `puzzle.go`（数独、24点、推箱子等）及 `daily_challenge.go` 结算时的脑力币自动发放与落库。
- **扫雷去嵌套与操作手感升级**：彻底消灭扫雷棋盘旧式卡片套娃边框与阴影，实现与全站舞台无缝融合；新增手机端「⛏️翻开/🚩插旗」双模切换胶囊，华容道与2048滑动锁死原生下拉防误触。
- **渐进式阶梯转化体系 (方案 B)**：
  - **单机模式零门槛**：单机游戏 100% 免注册，前端内存本地计算，全面保障 SEO 自然流量沉淀。
  - **竞技开房会员特权门禁 (`AuthModalService`)**：主动发起 PK 开房、进入双人竞技场时智能唤起特权弹窗，展示天梯排位、战绩档案与专属约战，支持携带 `returnUrl` 登录后原位回跳。
  - **受邀客态友好体验**：未登录用户通过好友链接可直接作为临时 Guest 应战切磋，局内标明「👀 游客试玩模式 (不计排位胜点)」。
  - **对决结算高光转化暴击**：PK 结算面板定制游客胜利黄金认领卡（「🎉 击败对手！+25 胜点待认领，立即注册入库全服天梯榜」）与战败复仇卡，精准抓住胜负心理实现最高转化率。
  - **多语言与无感适配**：文案全量抽离至 8 国语言文件，严格采用全局 CSS 变量与全端响应式排版。
- **管理员登录与路由守卫重定向优化**：
  - 管理员账号登录后若未携带来源地址，系统自动重定向至管理后台实时大厅 (`/:lang/admin/realtime`)，杜绝管理员登录后误跳大厅导致的“登陆未生效”假象；
  - 增强 `adminGuard`，未登录用户访问 `/admin` 时保留原始访问目标，并携带 `returnUrl` 规范重定向至登录页；已登录非管理员用户重定向至大厅；
  - 修复 `authInterceptor` 中 401 报错时缺少语言前缀的旧式硬编码路由问题。
- **配置驱动脑力币经济系统与管理调控中心 (Live Config-driven Economy)**：
  - **后端配置驱动引擎 (`service.GetEconomyConfig`)**：脑力币产出（简单+2/中等+5/困难+10/专家+18/大师+25、PK获胜基础奖励）、道具动作消耗（提示-20、复活-50、连胜冷冻卡-100）及单机每日获取上限（80币）全量收敛至 `system_settings` 数据字典，绝无硬编码，随 `/api/v1/settings` 动态下发；
  - **管理后台可视化调控中心 (`/admin/xp-config`)**：管理后台升级为「数值与代币经济配置」，提供「🪙 脑力币经济系统」与「✨ 经验值等级体系」双标签页，支持对 10 项核心代币产出及消耗参数进行在线调整，一键持久化保存即刻生效，无需重启重构；
  - **前台「脑力币规则与收支指南」手册 (`CoinGuideModalComponent`)**：点击主站顶栏或各游戏顶栏 `🪙 {{ coins }}` 胶囊一键唤起规则指南弹窗，动态展示如何赚取（各难度通关阶梯收益、防刷币每日上限、PK胜局、每日任务）与如何消费（免广告提示、复活、防断签保护卡、商城装扮），数值 100% 绑定后台最新配置；
  - **局内操作动态明码标价**：`HintButtonComponent` 与 `GameResultOverlayComponent` 彻底告别旧式硬编码，根据后台最新配置动态呈现提示按钮文案与复活按钮扣减单价；
  - **注册初始赠币可调控与默认归零 (`coins.register_bonus`)**：彻底剔除旧版用户注册默认赠送 100 币的写死逻辑，将初始赠币纳入后台可配置体系（默认值归零），确保新玩家必须通过实际解谜闯关与对决赚取脑力币，杜绝脚本刷初始币；
  - **8 国语言国际化与全端响应式**：新增 32 条多语言词条（zh/en/ja/ko/es/pt/fr/de），严格遵循全站 CSS 变量与移动端适配规范。
- **局内高频爽感消耗体系 (方案 1)**：
  - **免广告秒开智能提示**：单机游戏内 `HintButtonComponent` 智能感知脑力币，有币时点击一键扣除脑力币秒出核心解法，无需忍受 30 秒激励广告，金币不足时无缝 fallback 到广告；
  - **防手滑即时复活双轨制**：游戏失败结算面板新增「⚡ 消耗脑力币原地复活」与「📺 看广告复活」双轨选项；
  - **通关收益显性化循环**：通关与PK获胜即时结算入库，伴随金色飘字动效；
- **积分悬赏擂台赛体系 (方案 2)**：
  - **自定义悬赏开房与改房**：自建房与房主改房设置面板支持配置「擂台悬赏金额」（友好切磋 0 币 / 50 币 / 100 币 / 200 币），余额不足时智能拦截并提示引导；
  - **大厅流金色悬赏标识**：跨游戏房间列表与卡片流实时渲染金色流光徽章 `🪙 赏金擂台: {{ bounty }} 币`，加入前进行余额门禁校验；
  - **胜者通吃与抗通胀抽水销毁**：胜者赢得双倍押注奖池的 90%（系统抽水 10% 销毁以对抗通胀），负者全额罚没押注，逃跑或掉线由后端裁决罚没；
  - **结算面板高光奖金暴击**：PK 结算面板与顶栏全自动联动，以金色流光奖池条清晰展示独揽奖金净收益与实时余额同步；
  - **全链路架构解耦与状态贯穿**：Go WebSocket 广播层与 REST 结算接口原子打通 `bountyCoins` 仲裁链路，前端 `BaseGameStore` 与 `GameResultOverlayComponent` 高度封装、零侵入适配全站 18 款游戏。

---

## [v3.1.0] - 2026-10-18

### 实时联机与电竞交互体系
- **全域开房感知与即时应战**：构建 Navbar 对战呼吸徽标、首页等待卡片流、局内右下角挑战胶囊三大触点，实现跨页面毫秒级应战转化。
- **联机对战模式规范化**：解密类统一为“同题竞速对决 (`speed`)”，消除类统一为“存活积分对抗 (`score`)”，对弈类统一为“经典对抗 (`battle`)”；改房面板智能隐藏冗余单选框。
- **数据流与并发鲁棒性**：重构 Go WebSocket 广播层玩家数组协议；前端 `BaseGameStore` 统一 `roomPlayers` 信号，杜绝 Map/Slice 混合类型异常。

---

## [v3.0.0] - 2026-10-15

### 架构演进与体验升级
- **大一统组件基类**：引入 `BaseGameComponent` 与 `BaseGameStore`，统一接管 18 款游戏的生命周期、多局胜负制与房间事件。
- **现代美学与去嵌套**：全面清除棋盘多重套娃黑盒与局部滚动条，采用 CSS 变量适配深浅双色主题与毛玻璃效果。
- **全端响应式与 PWA**：基于 TailwindCSS v4 与 Angular 21 Signals 无区化架构，完美适配移动端、平板与桌面端。
