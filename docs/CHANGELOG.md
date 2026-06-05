## [2026-06-04] WebSocket 房间系统大规模重构
# Changelog

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

## [Unreleased]
### Added
- **Google AdSense Integration**: 增加了全局的 Google AdSense 支持，并在前端封装了可高度复用的 `AdsenseComponent` 组件，便于在平台（如大厅、游戏结算等）各处无缝植入广告位，为商业化变现打好基础。
- **System Settings Module**: Added a new settings page in the Admin Dashboard to control global website configurations.
  - Added Site Maintenance mode toggle with custom message support.
  - Added Global Announcement banner for the game lobby.
  - Migrated Simulator toggle to the database-backed settings system.

### Changed
- Improved traffic simulator to randomize player counts and room creation times for a more natural look.
### Added
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
