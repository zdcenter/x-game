# 新增游戏开发标准指南 (How to Add a New Game)

本指南旨在规范 X-Game 项目中新增游戏的开发流程。基于现有的高可扩展架构（前端 `BaseGameStore` + `BaseGameComponent` 以及后端 `BaseEngine`），开发者只需关注游戏本身的核心逻辑，即可零成本获得房间大厅、WebSocket 通信、断线重连、跨游戏跳转等一系列基础设施的支持。

---

## 一、 后端开发规范 (Backend)

### 0. 绝对红线：严禁触碰底层房间生命周期管理 🚨
目前的房间生命周期管理、WebSocket 连接机制、用户加入与离开的逻辑（特别是后端的 `pkg/ws/manager.go` 和 `pkg/ws/lobby.go`）已经过深度打磨，达到了最稳定和最高效的状态（包含断线重连、幽灵房间清理、防抖状态流转等）。
在以后添加任何新游戏、新玩法或新功能时：**绝对禁止再去触碰或修改底层的加入/离开逻辑、以及房间的解散与重连机制！**
你只需要专注于继承 `BaseEngine` 并实现你的游戏专属逻辑，底层的基础设施会自动为你提供所有支持。

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
你需要实现以下核心方法（如果嵌入了 `BaseEngine` 则自动获得了状态和广播等基础方法）：
- `InitGame(options interface{}) error`：初始化游戏参数与棋盘配置。记得如果是单机模式，直接 `e.State = engine.StatePlaying`。若是联机，必须首先置为 `e.State = engine.StateWaiting`。
- `AddPlayer(playerID string)`：玩家加入房间时触发。
- `RemovePlayer(playerID string)`：玩家彻底离开房间时触发。
- `HasPlayer(playerID string) bool`：判断玩家是否存在。
- `HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error)`：处理玩家具体操作。**🚨 此处拦截的操作名必须对应于全局枚举 `C2SAction`。**
- `CheckGameOver() (bool, []string)`：检查游戏是否结束，返回是否结束以及胜利者的 playerID 数组。
- `GetState() interface{}`：返回要广播给客户端的当前游戏状态结构体。

---

## 二、 前端开发规范 (Frontend) 🚨 (核心重构篇)

经历了架构演进后，前端的 Store 和组件开发已经进入了高度标准化的时代。

### 1. 强制继承 `BaseGameStore`
在 `frontend/src/app/features/games/你的游戏/store/你的游戏.store.ts` 中：
必须继承 `BaseGameStore`！这会免费送你如下能力：
- 自动帮你管理 `roomId`, `currentRoomMode`, `status`
- 自动封装好了 `joinRoom`, `leaveRoom`, `startGame`, `ready`, `cancelReady`, `restartGame`，**严禁再次手写这些方法**。
- 自动帮你监听全局 WS 状态同步（通过 `this.rawState()` 提供）。

```typescript
import { BaseGameStore } from '../../../../core/store/base-game.store';

@Injectable()
export class TetrisStore extends BaseGameStore {
  // 定义游戏特定的本地信号
  board = signal<number[][]>([]);

  // 如果需要额外拦截或监听 rawState，可以通过 effect() 进行，但绝不要试图手动覆盖基类的生命周期状态
  constructor() {
    super();
    effect(() => {
      const state = this.rawState();
      // 根据 rawState 派生更新你自己的棋盘
    });
  }
}
```

### 2. 彻底禁用魔法字符串：必须使用 `C2SAction` 🚨
前端与后端之间的通信指令，**绝对禁止**使用硬编码的字符串，如 `this.ws.send({ action: 'put_block' })`。
所有的动作标识符必须统一集中在 `C2SAction` (位于 `frontend/src/app/core/models/websocket.model.ts`)，前后端共用一份标准：
```typescript
import { C2SAction } from '../../../../core/models/websocket.model';

// ❌ 错误做法：
this.ws.send({ action: 'rotate' });

// ✅ 正确规范：
this.ws.send({ action: C2SAction.Rotate });
```

### 3. 前端单机逻辑的 `ILocalEngine` 标准
如果你的游戏支持单机模式或纯前端计算逻辑，必须将其从 Store 里剥离，抽取到独立的 `你的游戏-engine.ts` 中，并实现 `ILocalEngine<State, Action>` 接口。
- **优点**：彻底隔绝 UI 响应式依赖，方便写单元测试，天然支持 Undo/Redo/Hint 的状态快照。
```typescript
import { ILocalEngine } from '../../../../core/models/engine.model';

export class TetrisEngine implements ILocalEngine<TetrisState, TetrisAction> {
  // 核心状态
  board: number[][] = [];
  status: string = 'waiting';

  initBoard(options: any): void { /* ... */ }
  
  handleAction(action: TetrisAction): void {
    // 纯纯的 JS 业务逻辑计算
  }
  
  undo(): void { /* ... */ }
}
```
然后在 Store 中调用：
```typescript
  private engine = new TetrisEngine();

  rotateBlock() {
    if (this.currentRoomMode() === GameMode.Single) {
       this.engine.handleAction({ type: 'ROTATE' });
       this.board.set([...this.engine.board]); // 同步给前端 UI
    } else {
       this.ws.send({ action: C2SAction.Rotate }); // 联机则推给后端
    }
  }
```

### 4. 编写主组件 (强制继承 `BaseGameComponent` 与使用 Standalone 组件)
主组件必须继承 `BaseGameComponent`，它为你提供 `wsService`、`gameTimer` 等，并自动调用 `connectLobby()` 连接大厅。

```typescript
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { BaseGameComponent } from '../../../../core/utils/base-game.component';
import { TetrisStore } from './store/tetris.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../../core/services/room-lifecycle';

@Component({
  selector: 'app-tetris',
  standalone: true,
  templateUrl: './tetris.component.html'
})
export class TetrisComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(TetrisStore);
  private roomLifecycle!: RoomLifecycleHandle;

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'tetris',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
  }

  override ngOnInit() {
    super.ngOnInit(); // ← 必须！自动连接竞技大厅 WebSocket
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
       this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy(); // ← 必须！
    this.store.leaveRoom();
  }
  
  // 对于创建、加入和解散房间的统一事件处理器，调用 super 后，务必要加上 roomLifecycle 保存
  override handleJoinRoom(...) {
     super.handleJoinRoom(params);
     if (params.mode !== GameMode.Single) this.roomLifecycle.saveReconnectInfo(...);
  }
}
```

### 5. 统一的游戏开局倒计时遮罩 (Game Starting Overlay)
在 HTML 模板中，只需直接引入并渲染即可：
```html
@if (store.status() === GameStatus.Starting) {
  <app-game-starting-overlay [countdown]="gameTimer.countdownDisplay()"></app-game-starting-overlay>
}
```

### 6. 更新多语言配置 (i18n) 🚨 全新原生编译架构
本项目已全量重构为基于 **Angular 原生 `@angular/localize`** 的编译时多语言架构。
1. **HTML 模板中的静态文本：**
   必须使用 `i18n` 属性，并指定带有 `@@` 前缀的唯一 ID。
2. **TypeScript / Signal 逻辑中的动态文本：**
   使用注入的 `I18nService` 配合 `t()` 方法：`this.i18n.t('game.defeat')()`
3. **一键生成 XLF 物理文件：**
   将中英文内容统一录入到 `frontend/src/app/core/i18n/core.translations.ts` 中。
   进入 `frontend` 目录执行 `node generate-xlf.js`，让 Angular 底层把文本物理刻录进 HTML 里！

---

## 三、 常见踩坑与开发规范准则 (Best Practices & Standards)

### 1. 全局枚举使用
**必须严格使用 `GameDifficulty`, `GameMode`, `GameStatus` 全局常量枚举来代替所有的硬编码字符串。** 
不论是在 `Store` 初始化还是在模板比较中。

### 2. 玩家信息栏 (Player Badge) 参数标准化 (Player Stats UI)
为了保持全局高逼格、清爽的 UI 体验，玩家卡片中的扩展信息严禁使用冗长的文字。
统一向 `<app-player-badge>` 的 `[stats]` 属性传入携带 `icon` 字段的配置数组，使用 Emoji 图标替代文字标签，如用 `⏱️` 表示时间，用 `🦶` 表示步数：
```html
<!-- ✅ 正确做法：使用清爽的 Icon -->
[stats]="[{ icon: '⏱️', value: '01:23' }, { icon: '🦶', value: 45 }]"
```

### 3. 主题适配 (Dark/Light Theme)
**绝不允许使用硬编码的 Tailwind 颜色**（如 `bg-slate-900`, `text-white`，或带有透明度的 `bg-white/10`）作为主背景和主文本色。
必须严格使用在 `index.css` 中定义好的 CSS 全局变量（如 `var(--color-bg-main)`, `var(--color-bg-card)`, `var(--color-text-main)`）。

### 4. 游戏排版与 CSS 布局规范 (🚨 极其重要！防跳动与 Safari 兼容)
在编写游戏的棋盘布局时，**绝对禁止**使用 `flex-1`、`flex-grow` 配合 `h-full` 来自动推算棋盘的高度。
必须利用 `vmin` 结合物理像素强行限制棋盘的最大尺寸，使浏览器失去重新计算的余地。例如：
```html
<div class="relative flex items-center justify-center shrink-0"
     style="width: min(85vmin, 600px); height: min(85vmin, 600px);">
  <app-your-game-board class="w-full h-full"></app-your-game-board>
</div>
```

遵循以上规范，我们可以最大程度保证下一个游戏在接入时不仅稳定可靠，而且在多端视觉和代码可维护性上达到最顶级的体验！
