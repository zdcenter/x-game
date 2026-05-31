# 开发者指南：如何向 X-Game 中添加一款新游戏

本指南详细记录了向 X-Game 平台接入一款新游戏（例如一款全新的多人对战/单机小游戏）的全流程，并汇总了我们在开发前期和重构过程中踩过的坑与注意事项。

为了保证前后端数据的一致性、确保对战大厅平滑切换、以及个人成就等通用系统能正常工作，请严格按照以下步骤进行操作。

---

## 一、后端 (Backend)

后端需要实现游戏的核心逻辑，并在引擎层面接管房间的调度。由于 X-Game 采用了高度抽象的 `GameEngine` 接口，新游戏主要只需实现该接口。

### 1. 增加基础配置
- **数据库/初始化配置**：如果平台通过数据库或常量维护游戏列表（如 `gm_game_configs`），请为新游戏添加一条记录（例如 `id: "newgame", name: "New Game", is_active: true`）。
- **难度与模式支持**：明确该游戏支持的难度（如 `easy`, `medium`, `hard`）和模式（如 `single`, `pk_speed`, `pk_score`）。

### 2. 实现 GameEngine 接口
在 `backend/internal/engine/<newgame>/` 目录下创建你的引擎代码（例如 `engine.go`）。
你需要实现 `engine.GameEngine` 接口：
```go
type GameEngine interface {
    Init(room *domain.Room) error
    Start() error
    ProcessAction(playerID string, action map[string]interface{}) error
    GetState(playerID string) map[string]interface{}
    CheckGameOver() bool
}
```
**🚨 防坑指南：**
- **PK 模式下的 CheckGameOver**：在竞速或抢分模式下，切记需要在这个函数里对比所有玩家的状态，并且当有人胜利时，通过 WS Manager 向房间发送 `game_over` 广播。
- **状态同步 (GetState)**：每次客户端进行操作（如翻开卡片、消除方块）后，WebSocket Manager 都会自动调用每个玩家的 `GetState`，所以你需要确保该方法返回的数据是脱敏且最新的。

### 3. 注册到 WebSocket 管理器
修改 `backend/pkg/ws/manager.go` 中的 `InitRoom` 函数：
```go
switch room.GameID {
    case "minesweeper":
        // ...
    case "newgame": // <- 新增的路由
        if room.Mode == "pk_speed" {
            room.Engine = newgame.NewSpeedEngine()
        } else {
            // ...
        }
}
```

---

## 二、前端 (Frontend)

前端的集成步骤相对繁琐，需要注意的地方较多。因为前端涵盖了路由、UI、WebSocket 连接以及本地化等内容。

### 1. 建立组件与路由
- 创建新模块 `frontend/src/app/features/games/<newgame>/`
- 在 `app.routes.ts` 中注册路由 `games/newgame`，并配置好 SEO Metadata。

### 2. 状态管理 (Store)
使用 Angular Signals 的 `signalStore` 创建独立的状态管理文件，例如 `newgame.store.ts`。
**必需的状态包括：**
- `currentMode`: 标识当前是 `single`（单机）还是联机。
- `currentDifficulty`: 当前难度。
- `bestTime` / `bestScore`: 如果有单机成绩，请务必在初始化时从 `GameStatsService` 获取历史最佳并存入 Signal。
- WebSocket 的收发管理：利用 `WebSocketService` 接收服务端下发的状态。

### 3. 核心游戏组件 (Component)
创建 `newgame.component.ts`。你的组件最好继承或参考现有的游戏组件生命周期：

**🚨 关键流程与防坑指南：**
- **连接 WebSocket**：当进入多人模式时，必须调用 `ws.connect()`。
  - ⚠️**深坑警告**：`ws.connect` 的参数必须与后端严丝合缝！特别是 `mode` 和 `difficulty` 参数！此前在 Tetris 中曾错误地将 `game` 变量传给了 `mode`，导致后端无法正确初始化对应的引擎，前端也等不到发车倒计时！
  ```typescript
  // ✅ 正确示例
  this.ws.connect('newgame', roomId, playerId, mode, difficulty, hostId);
  ```
- **引入共用弹窗机制**：
  - `<app-game-result-overlay>`：处理单机和 PK 模式的游戏结束画面（需传入 `[stats]` 显示用时/分数）。
  - `<app-game-rules-modal>`：游戏规则弹窗。
  - `<app-room-lobby>`：房间等待大厅。
  **注意**：在引用这些组件时，一定要传正确的 `[gameId]="'newgame'"`！

### 4. 接入“全局成就”与“排行榜”等关联面板
为了让平台显得统一，我们需要把新游戏适配进已有的全局面板中：

- **Lobby 面板 (`lobby.component.ts`)**：
  - 更新 `getGameEmoji(id)` 和 `getGameModes(id)` 方法，为新游戏指定 Emoji 和支持的模式数组。
- **Profile 成就主页 (`profile.component.ts`)**：
  - 更新 `getGameEmoji` 方法。
  - 如果新游戏是基于“时间”挑战的，需要在 `isTimeGame(gameId)` 函数中返回 `true`，以确保在成就页面中正确显示 `BEST TIME` 格式，而不是 `BEST SCORE`。
- **Admin 设置面板 (`admin-games.component.ts`)**：
  - 如果新游戏有特定的规则配置，也需要在这里加入特殊的处理分支。

### 5. 纯净的前端 UI/UX 规范
在编写新游戏的 UI 模板（HTML/CSS）时，必须绝对遵守以下美学和兼容性规范：

- **禁止硬编码颜色**：不要使用如 `bg-slate-900` 这样的硬编码颜色！必须使用全局 CSS 变量（如 `bg-[var(--color-bg-main)]`, `text-[var(--color-accent-from)]` 等），以确保**亮色/暗色主题 (Light/Dark Mode)** 能够无缝且优雅地切换。
- **国际化必须抽离 (i18n)**：禁止在 HTML 模板里直接写中文或英文！请在 `core/i18n/<newgame>.translations.ts` 中维护字典，然后在模板里用 `{{ i18n.t('newgame.xxx')() }}` 渲染。
- **响应式适配 (Responsive)**：使用 TailwindCSS 前缀（`sm:`, `md:`, `lg:`）确保游戏在手机、平板和桌面端上都能正常展示，绝对不允许横向滚动条或布局崩坏。
- **单机最佳记录展示**：在单机模式的游戏主界面（例如计分板或计时器下方），如果用户拥有最佳记录且数值 > 0，应当醒目地展示出 `👑 BEST: ...`（参考华容道/六边形的实现）。

### 6. 更新功能文档
- 确保修改 `docs/FEATURES.md` 和 `docs/CHANGELOG.md`，将新游戏的发布记录和特色列入其中。

---

## 总结清单 (Checklist for adding a new game)
- [ ] 后端 DB 种子 / Config 已加入新游戏。
- [ ] 后端已编写对应的 Engine 并实现了接口。
- [ ] 后端 WS Manager `InitRoom` 已做好分支映射。
- [ ] 前端 `app.routes.ts` 已加入新路由。
- [ ] 前端已实现 `signalStore` 并处理了单机和联机两种状态。
- [ ] 前端调用 `ws.connect` 参数完全一致（特别是 mode 字段）。
- [ ] 前端使用了 CSS 全局变量，未硬编码颜色。
- [ ] 前端新增了多语言配置（中/英）并在模板中全部使用 i18n 获取。
- [ ] 前端在单机模式主界面展示了“👑 BEST”。
- [ ] 更新了 `lobby`、`profile` 等相关模块里的硬编码 Emoji 和模式枚举。
- [ ] 前端已使用 `@if(currentRoomMode() === 'pk_speed')` 判断逻辑正确集成了 `<app-game-result-overlay>` 和 `<app-room-lobby>`。
