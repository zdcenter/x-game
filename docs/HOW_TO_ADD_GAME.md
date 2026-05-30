# 新增游戏开发标准指南 (How to Add a New Game)

本指南旨在规范 X-Game 项目中新增游戏的开发流程。基于现有的高可扩展架构（前端 `BaseGameComponent` + 后端 `BaseEngine`），开发者只需关注游戏本身的核心逻辑，即可零成本获得房间大厅、WebSocket 通信、断线重连、跨游戏跳转等一系列基础设施的支持。

---

## 一、 后端开发规范 (Backend)

### 1. 创建游戏引擎包
在 `backend/internal/engine/` 目录下新建你的游戏目录（例如 `backend/internal/engine/tetris/`）。

### 2. 编写 PK 模式引擎 (强制继承 `BaseEngine`)
对于任何对战模式（如 `pk_steal` 或 `pk_speed`），请定义你的引擎结构体并 **强制嵌入（embed）** `engine.BaseEngine`。这会自动继承读写锁、状态管理和广播功能。

```go
package tetris

import "github.com/x-game/backend/internal/engine"

type PKStealEngine struct {
	engine.BaseEngine // 必须嵌入！免费获得 Mu, State, Broadcast
	// 定义你的游戏特有状态
	Players map[string]*PlayerState
}
```

### 3. 实现 `GameEngine` 接口
你需要实现以下核心方法：
- `InitGame(options interface{}) error`：初始化游戏参数。
- `AddPlayer(playerID string)`：玩家加入房间时触发。
- `RemovePlayer(playerID string)`：玩家彻底离开房间时触发（注意：由于我们支持断线重连，只有在游戏未开始时，引擎框架才会主动调用此方法。若游戏进行中掉线，数据会被保留）。
- `HasPlayer(playerID string) bool`：判断玩家是否存在。
- `HandleAction(playerID string, actionType string, payload []byte) (interface{}, error)`：处理玩家具体操作（如点击、移动等）。
- `GetState() interface{}`：返回要广播给客户端的当前游戏状态。

### 4. 注册引擎
在你的引擎文件中添加 `init()` 函数进行注册。命名规范遵循：`游戏名_模式名`。
```go
func init() {
	engine.Register("tetris_pk_steal", func() engine.GameEngine { return &PKStealEngine{} })
}
```

---

## 二、 前端开发规范 (Frontend)

### 1. 建立游戏目录
在 `frontend/src/app/features/games/` 下创建新游戏目录（例如 `tetris/`）。

### 2. 编写状态管理 Store (建议使用 Signal)
新建 `tetris.store.ts`，基于现有的 `WebSocketService` 获取 `gameState()`。Store 中需包含：
- 连接和退出逻辑（调用 `wsService.connect()` / `wsService.send({ type: 'leave_game' })`）。
- 将后端数字 `status` 转换为前端字符串枚举 (`GameStatus`)。
- 提取游戏特有的棋盘和分数状态。

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

### 4. 复用通用 UI 组件
在你的模板 (`.html`) 中，无需手写等待大厅和列表，请直接使用现成的公共组件：

- **等待大厅**：在未开始状态下使用。
```html
<app-game-waiting-room
  [mode]="currentRoomMode()"
  [roomId]="currentRoomId()"
  [players]="getPlayerScores()"
  [hostId]="store.host()"
  [currentUserId]="playerId"
  (leave)="returnToLobby()"
  (start)="store.startGame()">
</app-game-waiting-room>
```

- **大厅面板**：如果你的游戏有独立的大厅界面，直接嵌入：
```html
<app-game-lobby-panel
  game="tetris"
  title="俄罗斯方块大厅"
  (join)="handleJoinRoom($event)"
  (create)="handleCreateRoom($event)">
</app-game-lobby-panel>
```

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

遵循以上规范，我们可以最大程度保证下一个游戏在接入时不仅稳定可靠，而且在多端视觉上达到最顶级的体验！
