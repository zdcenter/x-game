# 新增游戏开发标准指南 (How to Add a New Game)

本指南旨在规范 X-Game 项目中新增游戏的开发流程。基于现有的高可扩展架构（前端 `BaseGameComponent` + 后端 `BaseEngine`），开发者只需关注游戏本身的核心逻辑，即可零成本获得房间大厅、WebSocket 通信、断线重连、跨游戏跳转等一系列基础设施的支持。

---

## 一、 后端开发规范 (Backend)

### 1. 创建游戏引擎包与自动注册
在 `backend/internal/engine/` 目录下新建你的游戏目录（例如 `backend/internal/engine/tetris/`）。
你的对战类游戏引擎必须 **强制嵌入（embed）** `engine.BaseEngine`。这会自动继承并发锁 `Mu`、生命周期状态 `State` 和广播通道。

并在 `init()` 函数中向全局工厂注册，命名规范遵循：`游戏名_模式名`：
```go
package tetris

import "github.com/x-game/backend/internal/engine"

type PKStealEngine struct {
	engine.BaseEngine // 必须嵌入！免费获得 Mu, State, Broadcast
	// 定义你的游戏特有状态
	Players map[string]*PlayerState
}

func init() {
	engine.Register("tetris_pk_steal", func() engine.GameEngine { return &PKStealEngine{} })
}
```
然后在 `backend/cmd/api/main.go` 中空白导入该包（`_ "github.com/x-game/backend/internal/engine/tetris"`），使注册逻辑在程序启动时自动执行。这彻底避免了侵入和修改 `pkg/ws/manager.go`。

### 2. 实现 `GameEngine` interface
你需要实现以下核心方法：
- `InitGame(options interface{}) error`：初始化游戏参数与棋盘配置。
- `AddPlayer(playerID string)`：玩家加入房间时触发。
- `RemovePlayer(playerID string)`：玩家彻底离开房间时触发（注意：由于我们支持断线重连，只有在游戏未开始时，引擎框架才会主动调用此方法。若游戏进行中掉线，数据会被保留）。
- `HasPlayer(playerID string) bool`：判断玩家是否存在。
- `HandleAction(playerID string, actionType string, payload []byte) (interface{}, error)`：处理玩家具体操作（如点击、落子等）。
- `GetState() interface{}`：返回要广播给客户端的当前游戏状态。

**🚨 后端防坑指南：**
- **PK 模式下的 CheckGameOver**：在竞速或抢分模式下，切记需要在这个函数里对比所有玩家的状态，并且当有人胜利时，通过 WS Manager 向房间发送 `game_over` 广播。
- **状态同步 (GetState)**：每次客户端进行操作（如翻开卡片、消除方块）后，WebSocket Manager 都会自动调用每个玩家的 `GetState`，所以你需要确保该方法返回的数据是脱敏且最新的。

---

## 二、 前端开发规范 (Frontend)

### 1. 建立游戏目录
在 `frontend/src/app/features/games/` 下创建新游戏目录（例如 `tetris/`）。

### 2. 状态管理 (Store) 的 Signals 规范 🚨 极其重要！
新建 `tetris.store.ts`，基于现有的 `WebSocketService` 获取 `gameState()`。
在编写前端的 `<game>.store.ts` 时，必须使用依赖于 `this.ws.gameState()` 信号的 `computed` (派生计算信号) 来接收并同步对局状态，**切勿使用 `effect()` 并在其中通过副作用强行 `set` 状态信号**！

- **原因**：由于 WebSocket 接收是非 Zone.js 托管的异步任务，而在 `effect` 中反向写入本地状态信号极易导致 Angular 变更检测失效，从而出现“房主看不到房客”、“状态不同步”等致命 bug。
- **最佳范式**：
  - 定义本地识别的私有信号（如 `localBoard = signal(...)`），用于处理单机模式下的即时计算。
  - 定义只读的 `computed` 信号，根据当前是 `single` 还是 PK 模式，自动路由并返回本地状态或全局 WS 状态：

```typescript
// 1. 获取全局 raw 状态
private rawState = computed(() => this.ws.gameState());

// 2. 声明派生计算信号
board = computed<number[][]>(() => {
  if (this.currentMode() === 'single') return this.localBoard();
  return this.rawState()?.board || this.emptyBoard;
});

players = computed<string[]>(() => {
  if (this.currentMode() === 'single') return this.localPlayers();
  const st = this.rawState();
  if (!st || !st.players) return [];
  return Array.isArray(st.players) ? st.players : Object.keys(st.players);
});
```
- **effect 的正确用法**：在 Store 的构造函数里只允许用 `effect()` 触发不修改信号的**副作用行为**，例如当对局状态变为 finished 时调用 `audio.playWin()`。

### 3. 编写主组件 (强制继承 `BaseGameComponent`)
主组件必须继承 `BaseGameComponent`，从而免费获得以下能力：
- **竞技大厅 WebSocket 自动连接**：`BaseGameComponent.ngOnInit()` 会自动调用 `connectLobby()`，确保右侧竞技大厅面板能收到房间和在线玩家数据。
- **建房 / 加入房间 / 房间销毁监听**等通用逻辑。

**关键规则**：如果你的子组件需要覆写 `ngOnInit()` 或 `ngOnDestroy()`，**必须调用 `super.ngOnInit()` / `super.ngOnDestroy()`**，否则大厅功能会失效！

```typescript
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { BaseGameComponent } from '../../../../core/utils/base-game.component';
import { TetrisStore } from './store/tetris.store';
import { AuthStore } from '../../../../core/auth/auth.store';

@Component({
  selector: 'app-tetris',
  templateUrl: './tetris.component.html',
  // ...
})
export class TetrisComponent extends BaseGameComponent implements OnInit, OnDestroy {
  // 必须实现父类的抽象属性
  override store = inject(TetrisStore);
  private authStore = inject(AuthStore);
  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  override ngOnInit() {
    super.ngOnInit(); // ← 必须！自动连接竞技大厅 WebSocket
    // 你的游戏初始化逻辑...
  }

  override ngOnDestroy() {
    super.ngOnDestroy(); // ← 必须！
    this.store.leaveGame();
  }
}
```

### 4. 复用通用 UI 组件与房间设置同步 (Change Settings / Game Setup) 🚨 极其重要！
为了支持**综合包厢模式（Party Room Mode）**（即房主可以随时在当前房间切换不同的游戏或更改难度），新游戏在复用通用 UI 组件时必须正确绑定大厅面板实例和修改事件：

- **等待大厅**：在未开始状态下使用。房主在等待大厅有权点击“更改设置”，此时需要绑定 `(changeSettings)` 事件：
```html
<app-game-waiting-room
  [mode]="currentRoomMode()"
  [roomId]="roomId()"
  [players]="mappedPlayers"
  [hostId]="hostId()"
  [currentUserId]="playerId"
  (leave)="returnToLobby()"
  (start)="store.startGame()"
  (changeSettings)="openChangeSettings()">
</app-game-waiting-room>
```

- **大厅面板**：如果你的游戏有独立的大厅界面，在模板中需要使用 `#lobbyPanel` 声明模板引用：
```html
<app-game-lobby-panel
  #lobbyPanel
  [currentGameId]="'your-game-id'"
  [currentRoomId]="roomId()"
  (joinRoom)="handleJoinRoom($event)"
  (createRoom)="handleCreateRoom($event)">
</app-game-lobby-panel>
```

- **组件逻辑绑定**：在你的游戏主组件（`<game>.component.ts`）中，必须通过 `@ViewChild` 获取大厅面板，并实现 `openChangeSettings()`：
```typescript
import { ViewChild } from '@angular/core';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';

// 在组件类中：
@ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

openChangeSettings() {
  if (this.lobbyPanel && this.roomId()) {
    this.isMobileSidebarOpen.set(true); // 如果是移动端，先呼出侧边栏
    this.lobbyPanel.openUpdateRoomModal({
      id: this.roomId(),
      game: 'your-game-id',
      mode: this.currentRoomMode(),
      difficulty: this.currentDifficulty(),
      host: this.hostId()
    });
  }
}
```
如果不遵守此项配置，房主切换游戏时房客将无法进行自动路由跳转，且点击“更改设置”按钮会报错/无响应。


### 5. 跨游戏跳转配置
在新游戏组件的 `ngOnInit` 中加入 `CrossGameJoinService` 消费逻辑，以支持从全局大厅点击“加入”直接跨游戏跳转：
```typescript
import { CrossGameJoinService } from '../../../../core/services/cross-game-join.service';

// 在组件类内部
private crossGameJoin = inject(CrossGameJoinService);

ngOnInit() {
  const pending = this.crossGameJoin.consumePendingJoin('tetris');
  if (pending) {
    this.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host);
  }
}
```

### 6. 更新多语言配置 (i18n)
在 `frontend/src/app/core/i18n/translations.ts` 中增加新游戏的翻译词条，尤其是大厅中会显示的游戏名、模式名及规则。

---

## 三、 总结 (Summary)
由于底层 WebSocket 通信、跨房间切换、掉线重连逻辑均已完美封装，你只需要编写**规则验证（后端）**和**界面渲染（前端）**，其他一切都由架构自动搞定！

---

## 四、 常见踩坑与开发规范准则 (Best Practices & Standards)

为了保证后续接入的新游戏不会重复出现相同的 Bug 并且保证 UI 体验的一致性，请务必遵守以下总结出的标准规范：

### 1. 倒计时与时间同步 (Game Timer)
- **绝对不要**使用 `服务端下发的时间戳 - 客户端本地 Date.now()` 来计算 3 秒开局倒计时。因为客户端和服务器的时钟极其容易出现偏差（Clock Skew），会导致倒计时显示 90 多秒甚至负数的严重 Bug。
- **标准做法**：当接收到后端 `status === 'starting'` 时，统一调用前端本地的 `GameTimerService.startCountdown()` 执行纯本地的 3 秒倒计时。

### 2. 多人对战面板布局标准化 (PK Opponents Layout)
- 对于拥有等比固定大小棋盘（如 `aspect-square` 的数独或华容道）的游戏，**严禁将对手进度面板放置在棋盘正下方**。由于 PC 端宽屏的高度限制，正方形棋盘往往会把下方内容挤出屏幕之外，且没有滚动条时会被直接截断。
- **标准做法**：将多人 PK 对手卡片统一放置在**棋盘的正上方**（状态栏之上），采用横向排列 + 横向滚动（`flex gap-4 overflow-x-auto`）的方式。这不仅能充分利用 PC 端的横向空间，还能保证全端（手机/iPad/PC）UI 结构的高度统一。

### 3. 全局容器自适应 (Responsive Container)
- 游戏主界面（包含 Header、棋盘、对手面板）的外层容器必须增加垂直滚动属性 `overflow-y-auto`。
- 对于棋盘容器，请加上 `flex-shrink-0`，确保在垂直空间不足时，UI 不会被强行挤压变形，而是优雅地出现滚动条。

### 4. 单机存档与等级切换逻辑 (Single Player Storage)
- 单机模式（Single）自动将进度保存到浏览器的 `LocalStorage`。但在用户主动**手动切换难度/等级**时，必须强制开启新局（清除旧存档并覆盖），**只有在重新进入页面或刷新时**才去读取存档恢复棋盘状态。避免出现切换难度却依然读取了旧难度存档的 Bug。

### 5. i18n 多语言抽离 (Translation)
- **绝不允许硬编码任何 UI 文本**（尤其是 `GAME.YOU_LOSE` 这种）。所有新增的文案（如 `Moves`, `Play Again` 等）如果具有跨游戏通用性，必须写进 `core.translations.ts` 中；如果是某游戏独占，必须写进该游戏的 `*.translations.ts` 并注册到全局。

### 6. 主题适配 (Dark/Light Theme)
- **绝不允许使用硬编码的 Tailwind 颜色**（如 `bg-slate-900`, `text-white`，或带有透明度的 `bg-white/10`）作为主背景和主文本色。
- **标准做法**：必须严格遵守并使用在 `index.css` 中定义好的 CSS 全局变量（如 `var(--color-bg-main)`, `var(--color-bg-card)`, `var(--color-text-main)`, `var(--color-border-card)`）。这能确保应用能在暗黑/明亮主题之间无缝、优雅地切换。

### 7. PC 顶栏与离开房间按钮 (Header & Leave Button)
- **避免隐患**：当进入联机 PK 时，为了给游戏提供最大的屏幕空间，右侧的“竞技大厅”面板可能在某些游戏中会被全局隐藏。此时如果游戏界面本身没有独立的退出机制，会导致 PC 端玩家被彻底卡死在房间内。
- **标准做法**：每个游戏的主界面顶部必须统一保留一个标准 Header 栏。在 Header 中，通过判断 `@if (currentRoomMode() !== 'single')` 条件，显式地渲染出包含 SVG 图标的“离开 (Leave)” 按钮（调用 `store.leaveRoom()`），保证全端体验的一致性和闭环。

### 8. 竞技大厅图标 (Lobby Icons)
- **提升品质**：禁止在全局大厅（`lobby.component.ts`）中使用简陋的 Emoji（如 💣, 🔢）作为游戏图案，这会极大削弱项目的视觉高级感。
- **标准做法**：必须使用精美的 inline SVG（内联矢量图）手工绘制游戏缩略图。该 SVG 需要高保真地抽象并还原出游戏的核心棋盘元素（例如：数独的九宫格、华容道的 3x3 滑块、六边形消除的大六边形底盘）。

### 9. 竞技大厅侧边栏的显示策略 (Lobby Panel Display Strategy)
- **分类处理**：
  - 如果新增的游戏属于“棋盘面积小且为固定比例”（如数独、华容道），在 PC 端宽屏下如果隐藏侧边栏会导致屏幕右侧大面积留白。这类游戏应保持大厅面板在 PC 端**始终显示**（可使用 `max-lg:!hidden` 使其仅在手机端隐藏）。
  - 如果游戏属于“棋盘可随屏幕无限扩展或伸缩”（如六边形消除、扫雷），则在进入房间后可以全局隐藏侧边栏（使用 `!hidden`），带来震撼的全屏沉浸体验。

### 10. 统一的顶部导航与动态标签展示 (Unified Header & Dynamic Labels)
- **避免硬编码**：在编写 PK 模式或者等待界面的顶部 Header 时，**绝不允许**将模式名称或难度写死（例如写死成 `{{ i18n.t('game.pk_steal_label')() }}`）。必须注入 `GameRegistryService` 并在 TS 类中动态获取：
  ```typescript
  getModeName() {
    const mode = this.store.currentMode();
    const key = this.gameRegistry.getModeLabel('your_game', mode);
    return key ? this.i18n.t(key)() : mode;
  }
  // 难度同理，使用 getDifficultyLabel
  ```
- **视觉排版**：对于模式和难度的展示，标准做法是采用水平并列的形式（例如：`同盘抢分 / 中等`），并利用半透明的斜杠 `/` 进行分隔。避免使用上下两排文字堆叠，以节省垂直空间。
- **单机下拉切换**：对于单机模式，强烈推荐直接复用公共组件 `<app-game-header>`，并在 `header-center` 插槽中放入一个原生下拉选择框 `<select>`，允许玩家在游戏内直接点击顶部切换难度，并绑定 `changeDifficulty()` 重新发牌/重置。

### 11. 更改房间设置与同路由刷新机制 (Room Settings Change & Router Reload)
- **前后端协议对齐**：当房主在等待大厅点击“更改设置”并提交时，前端调用的指令 `type` 必须为 `change_game`，后端引擎收到后会销毁旧对局并创建新对局，随后广播 `room_game_changed` 事件。
- **同路由组件强制销毁**：在 `WebSocketService` 监听到 `room_game_changed` 时，如果新设置的游戏和当前所在的路由完全一致（例如都在 `/games/sudoku`），Angular 路由会默认“偷懒”不进行跳转，导致旧的 Component 不会被销毁，新的难度和模式也无法被加载。
- **标准做法（已在核心封装）**：采用先跳出再跳回的强刷策略：
  ```typescript
  this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
    this.router.navigate(['/games/' + msg.game]);
  });
  ```
  在开发新游戏时，你只需保证 `openChangeSettings()` 的传参正确即可，跳转刷新的逻辑框架已为你完美接管。

遵循以上规范，我们可以最大程度保证下一个游戏在接入时不仅稳定可靠，而且在多端视觉上达到最顶级的体验！
