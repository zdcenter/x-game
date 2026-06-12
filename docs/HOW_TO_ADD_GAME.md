# 新增游戏开发标准指南 (How to Add a New Game)

本指南旨在规范 X-Game 项目中新增游戏的开发流程。基于现有的高可扩展架构（前端 `BaseGameComponent` + 后端 `BaseEngine`），开发者只需关注游戏本身的核心逻辑，即可零成本获得房间大厅、WebSocket 通信、断线重连、跨游戏跳转等一系列基础设施的支持。

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
- `InitGame(options interface{}) error`：初始化游戏参数与棋盘配置。
- `AddPlayer(playerID string)`：玩家加入房间时触发。
- `RemovePlayer(playerID string)`：玩家彻底离开房间时触发（注意：由于我们支持断线重连，只有在游戏未开始时，引擎框架才会主动调用此方法。若游戏进行中掉线，数据会被保留）。
- `HasPlayer(playerID string) bool`：判断玩家是否存在。
- `HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error)`：处理玩家具体操作（如点击、落子等），并返回当前的游戏状态（如 `engine.StatePlaying`）。
- `CheckGameOver() (bool, []string)`：检查游戏是否结束，返回是否结束以及胜利者的 playerID 数组。
- `GetState() interface{}`：返回要广播给客户端的当前游戏状态结构体。

**🚨 后端防坑指南：**
- **PK 模式下的 CheckGameOver**：每次客户端执行核心逻辑计算之后，切记需要在这个函数里对比所有玩家的状态，并且当有人胜利时，通过 WS Manager 向房间发送 `game_over` 广播（或者在 `HandleAction` 中调用 `Broadcast()`）。
- **状态同步 (GetState)**：每次客户端进行操作（如翻开卡片、消除方块）后，WebSocket Manager 都会自动调用每个房间的 `BroadcastStateLocked()` 获取 `GetState()`，所以你需要确保该方法返回的数据是脱敏且最新的。
- **单机模式无缝开局 (Single Player Auto Start)**：如果你的游戏在单机模式下也复用了后端的 Engine（如水管分色），那么在 `InitGame` 结束前，应当判断 `if mode == "single"` 并直接将游戏状态设为 `playing` 从而跳过倒计时。只有在联机对战模式下，才调用 `engine.StartWithCountdown` 触发经典的 3秒倒计时 动画。这能保证单机玩家进入游戏瞬间直接开玩，不再需要点击 START 按钮。

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

### 3. 实现联机必须的核心 WS 生命周期接口 (Store Network Lifecycle) 🚨 极其重要！
如果你的游戏支持 PK 模式，你的 `Store` 必须提供以下状态与方法，并且**绝不能漏掉 `ws.connect`**，否则你创建的房间会变成无人知晓的“幽灵单机房间”：

```typescript
// 必须提供这几个状态，供 BaseGameComponent 使用
roomId = signal('');
currentRoomMode = signal('single');

// 💡 注意：hostId 必须通过计算信号动态提取，不可用静态 signal，否则会导致作为房主时看不到皇冠！
hostId = computed(() => {
  if (this.currentRoomMode() === 'single') return this.auth.currentUser()?.username || this.auth.guestId;
  return (this.rawState() as any)?.host || '';
});

// 1. 建立与后端的连接 (注意命名必须为 joinRoom)
joinRoom(roomId: string, mode: string, diff: string, hostId?: string) {
  // 设置本地状态...
  this.roomId.set(roomId);
  this.currentRoomMode.set(mode);
  
  if (mode !== 'single') {
    // 【关键】必须调用此方法，后端才会真正创建/加入房间！
    this.ws.connect('your_game', roomId, this.auth.currentUser()?.username || this.auth.guestId, mode, diff, hostId);
  }
}

// 2. 补齐与 app-game-waiting-room 绑定的周边操作
ready() { this.ws.send({ type: 'ready' }); }
cancelReady() { this.ws.send({ type: 'cancel_ready' }); }
kickPlayer(playerId: string) { this.ws.send({ type: 'kick_player', target: playerId }); }
dismissRoom() { this.ws.send({ type: 'dismiss_room' }); }

// 离开房间 (注意命名必须为 leaveRoom)
leaveRoom() {
  this.ws.send({ type: 'leave_game' });
  this.ws.disconnect('your_game');
  this.roomId.set('');
}

// 游戏开始，注意用 action 触发后端引擎逻辑
startGame() { this.ws.send({ action: 'start' }); }
```

### 3.1 联机生命周期的避坑指南 (Anti-Pitfalls for Refresh & Entering Bug) 🚨
在集成前端生命周期时，经常遇到**刷新后全屏白屏**或**点击单机开始按钮无效**的致命Bug（例如方块消消和水管分色最初集成时都出现过），遇到此类情况请务必检查以下两点：

1. **`playersList` 对象解析崩溃（导致白屏）**：
   从 WebSocket 收到的 `this.ws.gameState()?.players` 在 JSON 中是一个以 `playerId` 为 Key 的**对象 (Object)**，而不是数组！如果你的等待大厅 `<app-game-waiting-room>` 的 `[players]` 属性接收到了一个对象，Angular 在解构 `[...this.players]` 时会抛出致命异常 `TypeError: this.players is not iterable`，导致你的组件在 `waiting` 状态下局部渲染中断，从而表现为全屏白屏！
   **正确规范**：在 `Store` 中暴露给大厅的 `playersList` 必须强制转换为数组：
   ```typescript
   // 必须使用 Object.values() 来确保其为数组
   readonly playersList = computed(() => Object.values(this.ws.gameState()?.players || {}));
   ```

2. **单机模式必须传递真实的 `hostId`（导致“开始”点不动）**：
   当用户直接进入游戏或刷新页面时，通常会初始化为单人模式 (`single`)。如果你的游戏对单人模式依然依赖后端引擎（即即使是单机你也调用了 `this.ws.connect`），你**绝对不能**在主组件的 `ngOnInit()` 里调用 `joinRoom` 时漏传 `hostId`（或传空字符串 `""`）！
   后端在处理没有 `hostId` 的房间时会直接返回 `"room not found"` 并强行断开连接。这会导致前端依然显示 START 按钮，但由于 Socket 已经死亡，你点击开始不会有任何反应！
   **正确规范**：在主组件的回退/单机初始化逻辑中，必须强制传入 `this.playerId` 作为 `hostId`：
   ```typescript
   // ❌ 错误示例：漏传或传空字符串，导致后端报错断开
   this.store.joinRoom('local', 'single', 'easy', ''); 
   
   // ✅ 正确规范：必须传入当前用户的 playerId 作为单机房间的房主
   this.store.joinRoom('local', 'single', 'easy', this.playerId);
   ```

3. **状态解构陷阱：虚无缥缈的 `.engine_state` 属性（导致游戏画面完全不更新或白屏）**：
   在 Go 后端的 `manager.go` 中，`BroadcastStateLocked()` 广播的消息结构大致为 `{ "type": "state", "state": r.Engine.GetState(), ... }`。
   而在前端的 `WebSocketService` 中，`this.ws.gameState()` 获取到的**已经是**后端 `GetState()` 返回的那个**对象本身**（即 `msg.state`）！
   **绝对不要**画蛇添足地去访问 `this.ws.gameState()?.engine_state` 或者 `this.ws.gameState()?.state`！这是个极其容易踩坑的低级错误，会导致你永远拿不到真实数据，从而导致整个游戏面板白屏或没有任何状态更新（例如数组始终为空）。
   **正确规范**：直接从 `this.ws.gameState()` 中读取你的引擎状态属性：
   ```typescript
   // ❌ 错误示例：试图访问不存在的嵌套属性
   const myTubes = this.ws.gameState()?.engine_state?.players?.[this.myId]?.tubes; 
   
   // ✅ 正确规范：gameState() 就是你在 Go 里 GetState() 返回的结构体！
   const myTubes = this.ws.gameState()?.players?.[this.myId]?.tubes;
   ```

### 4. 编写主组件 (强制继承 `BaseGameComponent` 与使用 Standalone 组件)
主组件必须继承 `BaseGameComponent`，从而免费获得以下极其强大的能力：
- **公共服务与变量注**：自动拥有 `wsService`、`gameTimer`、`isMobileSidebarOpen`、`hostClass` 等属性，子类**绝对不要重复声明**它们（否则会发生属性遮蔽与状态不同步的 Bug）。
- **竞技大厅 WebSocket 自动连接**：`BaseGameComponent.ngOnInit()` 会自动调用 `connectLobby()`，确保右侧竞技大厅面板能收到房间数据。
- **建房 / 加入房间 / 房间销毁监听**等通用逻辑（`handleJoinRoom`, `handleCreateRoom`, `dismissRoom` 等已默认提供，会自动调用 `this.store.joinRoom` / `leaveRoom` 等生命周期方法）。

**关键规则**：
1. 如果你的子组件需要覆写 `ngOnInit()` 或 `ngOnDestroy()`，**必须调用 `super.ngOnInit()` / `super.ngOnDestroy()`**，否则大厅功能会失效！
2. 本项目使用 Angular Standalone Components 架构，不再有 `SharedModule`。主组件需要在 `imports` 数组中单独导入所需的共享组件库（如 `GameHeaderComponent`, `PlayerBadgeComponent`, `GameResultOverlayComponent`, `GameRulesModalComponent`, `GameWaitingRoomComponent` 等）。

```typescript
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../../core/utils/base-game.component';
import { TetrisStore } from './store/tetris.store';
import { AuthStore } from '../../../../core/auth/auth.store';
// 💡 必须引入 room-lifecycle 相关的工具函数
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../../core/services/room-lifecycle';
// 必须明确按需导入 Standalone 组件
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';

@Component({
  selector: 'app-tetris',
  standalone: true,
  imports: [CommonModule, GameHeaderComponent, PlayerBadgeComponent /* 其他组件 */],
  templateUrl: './tetris.component.html',
  // ...
})
export class TetrisComponent extends BaseGameComponent implements OnInit, OnDestroy {
  // 必须实现父类的抽象属性
  override store = inject(TetrisStore);
  private authStore = inject(AuthStore);
  private roomLifecycle!: RoomLifecycleHandle;
  
  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  // 💡 在构造函数中注册 roomLifecycle 生命周期钩子（这是解决大厅建房丢失 action 进而导致“房间不存在” bug 的关键！）
  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'tetris', // 你的游戏 ID
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
  }

  // 注意：不要在此处重复声明 gameTimer、isMobileSidebarOpen！父类已提供！

  override ngOnInit() {
    super.ngOnInit(); // ← 必须！自动连接竞技大厅 WebSocket
    
    // 💡 必须使用 roomLifecycle 处理断线重连或大厅跨游戏加入
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      if (pending.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      // 本地初始化逻辑，例如创建单人模式
      this.store.joinRoom('single_room', 'single', 'medium');
    }
  }

  // 💡 必须重写以下三个方法，确保从大厅建房/加房时能正确保存断线重连信息
  override handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string}) {
    super.handleCreateRoom(event);
    if (event.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(this.store.roomId() || event.name, event.mode, event.difficulty, this.playerId);
    }
  }

  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string; password?: string }) {
    super.handleJoinRoom(params);
    if (params.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
  }

  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  override ngOnDestroy() {
    super.ngOnDestroy(); // ← 必须！
    this.store.leaveRoom(); // 使用 leaveRoom()
  }
}
```

### 4. 复用通用 UI 组件与房间设置同步 (Change Settings / Game Setup) 🚨 极其重要！
为了支持**综合包厢模式（Party Room Mode）**（即房主可以随时在当前房间切换不同的游戏或更改难度），新游戏在复用通用 UI 组件时必须正确绑定大厅面板实例和修改事件：

- **等待大厅**：在未开始状态下使用。房主在等待大厅有权点击“更改设置”，此时需要绑定 `(changeSettings)` 事件：
```html
<app-game-waiting-room
  [gameId]="'your-game-id'"
  [mode]="currentRoomMode()"
  [roomId]="roomId()"
  [difficulty]="store.localDifficulty() || store.currentDifficulty() || 'medium'"
  [players]="store.playersList()"
  [hostId]="hostId()"
  [currentUserId]="playerId"
  [readyPlayers]="store.readyPlayers()"
  (start)="store.startGame()"
  (leave)="onLeaveClick()"
  (changeSettings)="openChangeSettings()"
  (ready)="store.ready()"
  (cancelReady)="store.cancelReady()"
  (kick)="store.kickPlayer($event)"
></app-game-waiting-room>
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


### 5. 游戏排版与 CSS 布局规范 (🚨 极其重要！防跳动与 Safari 兼容)
在编写游戏的棋盘布局（特别是棋盘在上方、碎片/操作盘在下方的游戏）时，**绝对禁止**使用 `flex-1`、`flex-grow` 配合 `h-full` 来自动推算棋盘的高度。这会在移动端、不同浏览器（特别是 Safari）的前端路由跳转（CSR）与直接刷新时，由于 Flexbox 的内容固有高度计算逻辑差异，导致致命的布局跳动、棋盘间隙极其巨大、以及将底部元素挤出屏幕外（需滑动滚动条才能看到）。

**唯一受支持的响应式完美布局范式**：
1. **废弃 Flex 自动伸缩**：移除所有可能产生高度伸缩不可控的弹性盒子包裹层（棋盘和操作盘容器不要加 `flex-1`）。
2. **绝对物理尺寸锁定 (vmin)**：利用 `vmin` 结合物理像素强行限制棋盘的最大尺寸，使浏览器失去重新计算的余地。例如：
   ```html
   <!-- 容器不要包含任何导致高度拉伸的属性 -->
   <div class="w-full flex flex-col items-center justify-start py-4 shrink-0">
     <!-- 严格使用 vmin 锁定物理尺寸 -->
     <div class="relative flex items-center justify-center shrink-0"
          style="width: min(85vmin, 600px); height: min(85vmin, 600px);">
       <app-your-game-board class="w-full h-full"></app-your-game-board>
     </div>
     
     <!-- 底部操作盘紧贴其下 -->
     <div class="w-full h-24 shrink-0 mt-4">...</div>
   </div>
   ```
3. **自上而下的绝对堆叠**：内部的元素严格从上到下挨着排列，不要在中间插入任何 `flex-1` 占位符。多余的屏幕高度会自动被留在屏幕最底部，绝不会强行撑开组件内部的间距。

### 6. 跨游戏跳转配置
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

### 7. 更新多语言配置 (i18n) 🚨 全新原生编译架构
本项目已全量重构为基于 **Angular 原生 `@angular/localize`** 的编译时多语言架构，以换取极致的加载性能与 SEO 效果。
开发新游戏时，处理多语言必须遵循以下标准工作流：

1. **HTML 模板中的静态文本：**
   必须使用 `i18n` 属性，并指定带有 `@@` 前缀的唯一 ID。
   ```html
   <button i18n="@@game.ready">Ready</button>
   ```
2. **TypeScript / Signal 逻辑中的动态文本：**
   使用注入的 `I18nService` 配合 `t()` 方法获取 Signal 包装的翻译值：
   ```typescript
   i18n = inject(I18nService);
   // 必须带括号调用，因为 t() 返回的是一个 computed Signal
   const title = this.i18n.t('game.defeat')(); 
   ```
3. **录入词典库：**
   将你新增的 key（例如 `game.ready`, `game.defeat`）和对应的中英文内容，统一录入到 `frontend/src/app/core/i18n/core.translations.ts` 的 `en` 和 `zh` 字典对象中。

4. **一键生成 XLF 物理文件（关键）：**
   在编写完代码后，进入 `frontend` 目录，执行自定义提取脚本：
   ```bash
   node generate-xlf.js
   ```
   这个脚本会扫描全站的 `core.translations.ts`，自动为你生成并补全 `src/locale/messages.zh.xlf` 和 `messages.en.xlf`。Angular 在执行 `npm run build` 时，就是靠这两个 `.xlf` 文件在底层把文本物理刻录进 HTML 里的！

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
- **绝不允许硬编码任何中文 UI 文本**（尤其是 `重新开始`, `您已失败` 这种）。
- 由于我们采用了 Angular AOT 原生编译模式（提取文本生成 XLF 字典库），所有新增的文案都**必须统一集中写进 `core.translations.ts` 中**，不再分散在各个游戏目录下。这确保了 `generate-xlf.js` 脚本能一次性无遗漏地把全站词条提取并注入到生产环境的双语包中。

### 6. 主题适配 (Dark/Light Theme)
- **绝不允许使用硬编码的 Tailwind 颜色**（如 `bg-slate-900`, `text-white`，或带有透明度的 `bg-white/10`）作为主背景和主文本色。
- **标准做法**：必须严格遵守并使用在 `index.css` 中定义好的 CSS 全局变量（如 `var(--color-bg-main)`, `var(--color-bg-card)`, `var(--color-text-main)`, `var(--color-border-card)`）。这能确保应用能在暗黑/明亮主题之间无缝、优雅地切换。

### 7. PC 顶栏与离开房间按钮 (Header & Leave Button)
- **避免隐患**：当进入联机 PK 时，为了给游戏提供最大的屏幕空间，右侧的“竞技大厅”面板可能在某些游戏中会被全局隐藏。此时如果游戏界面本身没有独立的退出机制，会导致 PC 端玩家被彻底卡死在房间内。
- **标准做法**：每个游戏的主界面顶部必须统一保留一个标准 Header 栏。在 Header 中，通过判断 `@if (currentRoomMode() !== 'single')` 条件，显式地渲染出包含 SVG 图标的“离开 (Leave)” 按钮（调用 `store.leaveRoom()`），保证全端体验的一致性和闭环。

### 8. 竞技大厅图标 (Lobby Icons) 与 3D 拟物化标准
- **提升品质**：禁止在全局大厅（`game-lobby-panel.component.ts`）和结算页面中使用简陋的 Emoji（如 💣, 🔢）作为游戏主要图标，这会极大削弱项目的视觉高级感。
- **标准做法**：
  1. 必须使用精美的 3D 拟物化风格手工绘制或生成 SVG 游戏缩略图。该 SVG 需要高保真地抽象并还原出游戏的核心棋盘元素，并带有一定的体积感和阴影。
  2. 将完成的图标统一命名为 `<gameId>.svg`，并放置于 `frontend/public/assets/games/icons/` 目录下。
  3. 全局组件（大厅、结算页、推荐位）已实现了自动挂载逻辑，会根据游戏的 ID 自动去加载对应的高清 SVG 图标（例如 `<img src="/assets/games/icons/{{game.id}}.svg">`）。
  4. 此外，在 `game-definitions.ts` 注册时，仍需保留 `iconEmoji` 字段（如 `iconEmoji: '💣'`），以作为部分极小空间或系统级的后备展示 (Fallback)。

### 9. 竞技大厅侧边栏的显示策略 (Lobby Panel Display Strategy)
- **分类处理**：
  - 如果新增的游戏属于“棋盘面积小且为固定比例”（如数独、华容道），在 PC 端宽屏下如果隐藏侧边栏会导致屏幕右侧大面积留白。这类游戏应保持大厅面板在 PC 端**始终显示**（可使用 `max-lg:!hidden` 使其仅在手机端隐藏）。
  - 如果游戏属于“棋盘可随屏幕无限扩展或伸缩”（如六边形消除、扫雷），则在进入房间后可以全局隐藏侧边栏（使用 `!hidden`），带来震撼的全屏沉浸体验。

### 10. 统一的顶部导航与动态标签展示 (Unified Header & Dynamic Labels)
- **避免硬编码**：在编写 PK 模式或者等待界面的顶部 Header 时，**绝不允许**将模式名称或难度写死（例如写死成 `{{ i18n.t('game.pk_steal_label')() }}`）。必须注入 `GameRegistryService` 并在 TS 类中动态获取：
  ```typescript
  getModeName() {
    const mode = this.store.currentRoomMode();
    const key = this.gameRegistry.getModeLabel('your_game', mode);
    return key ? this.i18n.t(key)() : mode;
  }
  // 难度同理，使用 getDifficultyLabel
  ```
- **视觉排版与 `GameHeaderComponent` 传参**：
  `app-game-header` 不再接收 `[mode]` 和 `[isOffline]`。现在你需要直接向其传递计算好的 `[title]` 和 `[subtitle]`，并自行配置主题色的渐变 Class。这极大地提升了灵活性。
  ```html
  <app-game-header
    [title]="i18n.t('lobby.your_game')()"
    [subtitle]="getModeName() + ' - ' + getDifficultyName()"
    iconGradientClass="from-blue-400 to-emerald-500"
    titleGradientClass="from-blue-300 to-emerald-400"
    shadowClass="shadow-emerald-500/20"
    headerBgClass="bg-gradient-to-r from-blue-900/30 to-emerald-900/30"
    (back)="onLeaveClick()"
    (rules)="showRules.set(true)"
  >
    <div game-icon>💡</div>
    <div header-center>
      <!-- 可以放离线标志，或者单人模式的难度选择 select -->
    </div>
  </app-game-header>
  ```
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

### 12. 统一的游戏开局倒计时遮罩 (Game Starting Overlay)
- **避免冗余**：开发新游戏时，**严禁**在 HTML 模板中重复手写包含 `z-index`、`backdrop-blur`、大号数字和多语言文本的倒计时遮罩层代码。
- **标准做法**：全局已经抽离了跨游戏的通用倒计时组件。只需在主组件模块中导入 `GameStartingOverlayComponent`，然后在 HTML 模板中判断 `status === 'starting'` 时直接使用即可：
  ```html
  @if (store.status() === 'starting') {
    <app-game-starting-overlay [countdown]="gameTimer.countdownDisplay()"></app-game-starting-overlay>
  }
  ```
  该组件已内置了全屏遮罩、发光特效、动态脉冲动画，并自动绑定了 `game.starting` 的全局多语言翻译。

### 13. PK 模式下的阵亡与观战状态 (Death & Spectating in PK Mode)
- **避免隐患**：如果在 PK 模式中单人阵亡（如俄罗斯方块触顶），绝对不能因为全局 `status` 仍是 `playing` 就被前端 Effect 重新拉起新局，从而导致无限自动重开的严重 Bug。
- **标准做法**：
  - 前端 Store 中必须显式增加 `isDead = signal<boolean>(false)` 状态。
  - 玩家阵亡时调用 `this.isDead.set(true)` 并且停止本地的定时器/游戏循环。
  - 在监听 `gameState` 的 `effect` 中，拉起新局前必须判断 `!this.isDead()`。
  - 当全局 `status` 变回 `waiting` 或 `starting` 时，记得重置 `isDead` 为 `false`。
  - UI 层面：在游戏容器内增加判定 `@if (store.status() === 'playing' && store.isDead())`，渲染出全屏的 `Spectating... (观战中...)` 遮罩层，剥夺操作权限。直到全局状态变为 `finished` 时，才弹出最终的 `<app-game-result-overlay>` 结算界面。

### 14. 游戏内操作通信的载荷规范 (In-Game Action Payload Standard)
- **避免隐患**：千万不要把游戏内专有的操作指令（如“发送阵亡”、“发出攻击”）错写成 `{ type: 'your_action' }` 发给后端！WebSocket Manager 的外层路由只会拦截房间级的通用命令（如 `leave_game`, `ready`, `restart_game` 等），无法识别自定义 type，会将其透传给 Engine。但 `Engine.HandleAction` 默认读取的是载荷里的 `action` 字段。如果不带 `action` 字段，该指令会被后端直接丢弃，且无任何报错提示。
- **标准做法**：所有**具体的游戏内操作**都必须使用 `{ action: '操作名', ...其他参数 }` 的格式发送！
  - ❌ 错误做法：`this.ws.send({ type: 'game_over' })`
  - ✅ 正确做法：`this.ws.send({ action: 'game_over', score: 100 })`

### 15. PK 模式后端的结算时机 (Backend PK Game Over Condition)
- **避免隐患**：设计非大逃杀模式（即非“剩者为王”）的 PK 游戏时，切勿在后端的 `checkGameEnd()` 中看到有人死掉（存活 `< 1`）就立刻将状态改为 `StateFinished`。这会导致第一个死亡的人直接掐断所有人的游戏进程。
- **标准做法**：对于需要比拼最终积分（Score / Timer）的游戏，后端的 `checkGameEnd()` 必须耐心等待 **所有玩家的 Finished 状态都变为 true**（即 `allFinished == true`）时，才触发全局结束。此时再遍历对比所有玩家的数据，将表现最好的人推入 `Winners` 数组。

### 16. 跨游戏跳转的“断线容灾” (Network Race Condition in Game Switching)
- **原理解析**：在同房间切换不同游戏时，前端会经历“销毁旧页面 -> 断开 WebSocket -> 加载新页面 -> 重连新 WebSocket”的过程。在这 0.5 秒的间隙，如果不做特殊处理，后端会认为“房主跑路了”，从而把房主身份转让给别人，甚至解散房间。
- **开发者须知**：为了完美解决这个时序竞争，后端的 WebSocket Manager 中已经加入了 `GameChangedAt` 的防抖时间戳。只要你是正常点击“切换游戏”，后端会自动开启 **5 秒的免死金牌**，拦截这 5 秒内的房主转移和房间销毁惩罚。因此，前端开发新游戏时无需惧怕断线，在 `ngOnDestroy` 中安心调用 `disconnectWS()` 即可。

### 17. 玩家信息栏与对手卡片封装标准化 (Player Badge UI Standard)
- **视觉要求**：为了极致节省纵向屏幕空间并统一全站设计美学，**所有在顶部展示玩家状态（含单机/PK）的游戏，必须采用“横向通栏细长条 + 底部极简分割线”的高端排版规范**，严禁随意手写内外边距导致顶部区域过于臃肿。
- **标准外层结构规范**：请务必将 `<app-player-badge>` 放置在如下规定的 Flex 容器内，以保证它在全端能完美展现为细长的卡片条：
  ```html
  <!-- 标准玩家信息通栏结构 -->
  <div class="flex-none py-2 mb-2 border-b border-[var(--color-border-card)] w-full">
    <div class="w-full max-w-[800px] mx-auto flex items-center gap-2 lg:gap-4 px-2 overflow-x-auto custom-scrollbar" [class.justify-center]="store.currentRoomMode() === 'single'">
      
      <!-- Local Player (You) -->
      <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
        [playerName]="playerId"
        [isHost]="true"
        [isMe]="true"
        [stats]="[{ label: 'Score', value: store.score() }]"
        [status]="store.status() === 'finished' ? 'finished' : 'playing'"
      ></app-player-badge>

      <!-- Opponents -->
      @for (opp of opponents; track opp.id) {
        <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
          [playerName]="opp.id"
          [isHost]="opp.isHost"
          [stats]="[{ icon: '💡', value: opp.score }]"
          [status]="opp.status"
        ></app-player-badge>
      }
    </div>
  </div>
  ```
- **避免冗余**：如果在 PK 模式下需要渲染对手的分数、进度条或状态，**严禁**手写包含头像、皇冠、分数、冰冻效果等重复的 UI 代码。公共组件 `<app-player-badge>` 原生支持 `👑` (房主)、`👁️` (观战者)、冰冻 `🥶` 状态，并且可以通过 `[stats]` 数组传入极其丰富的图标、文本和颜色。

### 18. 正方形棋盘的自适应缩放陷阱 (Responsive Square Board Layout)
- **避免隐患**：在开发《俄罗斯方块》、《六边形消除》等拥有正方形（或固定宽高比）棋盘的游戏时，如果直接在 HTML 模板的 `style` 属性中写死 `max-width: min(100%, 600px, calc(100dvh - 320px))` 等复杂 CSS 表达式，**Angular 的模板解析器（Sanitizer）会悄悄将不认识的复杂 CSS 表达式直接剔除！** 而如果试图通过 Tailwind CSS 任意值语法（如 `max-w-[min(100%,600px,calc(100dvh-320px))]`）来编写，由于存在逗号和嵌套，Tailwind JIT 编译器大概率会**解析失败并直接吞掉该类名**。最终导致棋盘失去了所有 max-width 保护，变成一个无边无际的 1920x1920 巨型方块，甚至把其他元素挤出屏幕！
- **标准做法**：
  **直接使用 Angular 原生的属性绑定语法 `[style.maxWidth]`，绝对 100% 绕开所有的解析陷阱！**
  属性绑定不会经过 HTML 解析器清洗，而是直接由 JavaScript 调用浏览器底层的 DOM API (`element.style.maxWidth`) 赋值，原汁原味，万无一失：
  ```html
  <!-- 外层只负责居中对齐，不干涉棋盘大小计算 -->
  <div class="relative flex-grow flex items-center justify-center min-h-0 w-full shrink py-2">
    <!-- 内部实际棋盘：直接使用 Angular 属性绑定，填入原生 CSS 的 min() 表达式 -->
    <div class="relative flex items-center justify-center w-full aspect-square"
         [style.maxWidth]="'min(100%, 600px, calc(100dvh - 320px))'">
       <app-your-game-board></app-your-game-board>
    </div>
  </div>
  ```

### 19. 新游戏的双语 SEO 配置 (Bilingual SEO Configuration)
- **避免隐患**：如果新增游戏时忘记配置 SEO，当用户或搜索引擎（Google/Bing）通过特定 URL 访问或分享该游戏时，网页将只能显示 `index.html` 中基础的默认标题，错失了特定游戏长尾关键字的流量。
- **标准做法**：
  1. 在 `frontend/src/app/app.routes.ts` 中的游戏路由配置里，必须加上对应的 SEO 数据绑定：
     `data: { seo: { titleKey: 'seo.your_game.title', descKey: 'seo.your_game.desc', keywordsKey: 'seo.your_game.keywords' } }`
  2. 在 `frontend/src/app/core/i18n/core.translations.ts` 中，必须为新增游戏提供**英文**和**中文**两套完整的 SEO 词条（包含 `title`, `desc`, `keywords`），确保动态切换语言时能完美覆盖搜索关键词。

### 20. 房间大厅“隐身”与无法加入问题 (Room Visibility & State Initialization Bug) 🚨
- **原理解析与隐患**：在测试新增游戏的联机 PK 模式时，如果发现“房主创建了房间，但其他玩家在大厅死活看不到这个房间（或者房间状态显示为‘已完成’导致无法加入）”，极有可能是以下两处状态初始化遗漏导致的：
  1. **前端未设置兜底模式**：在创建房间组件（如 `game-lobby-panel`）触发 `joinRoom` 前，如果传递给后端的 `mode` 变量不小心为空（`""`），后端可能会将其错误判断为 `single` 模式，从而变成单机隐身房间。
  2. **后端引擎状态未赋初值**：在后端引擎（如 `sokoban/engine.go`）的 `InitGame` 中，**必须显式地将 `e.State` 初始化为 `engine.StateWaiting`**。如果不进行初始化，`e.State` 会保持默认零值（空字符串）。而在 WebSocket 广播房间列表时，空状态的房间由于不满足 “waiting” 条件，会向大厅发送“Started”状态，或者干脆无法被正确筛选，最终导致其他玩家看不见你的房间或者只能看到一个不能点的灰色“加入”按钮。
- **标准做法**：
  在后端的 `InitGame` 函数第一行，永远不要忘记加上：`e.State = engine.StateWaiting`。如果是单机模式，再在后面将其覆盖为 `engine.StatePlaying`。

### 21. “准备战斗”按钮点击无效的拼写陷阱 (Ready Button Unresponsive Bug)
- **避免隐患**：如果你发现在联机等待大厅（`<app-game-waiting-room>`）中，点击了绿色的“准备战斗”按钮，按钮没有变成橘色的“取消准备”，旁边也没有出现绿色的 ✅ 对勾，但后端却确实收到了 ready 信号，这 100% 是前端 Store 在映射 WebSocket 状态时字段拼写错误导致的！
- **原理解析**：WebSocket 下发的状态里，准备玩家的字段是小驼峰的 `readyPlayers` (例如 `{"userA": true, "userB": false}`)。如果在前端 Store（如 `sokoban.store.ts`）里错写成了下划线的 `ready_players`，或者在找不到时错误地提供了一个空数组 `[]`（而不是空对象 `{}`），就会导致等待室组件永远无法读取到玩家的准备状态，从而产生“按钮点不烂、状态不更新”的灵异现象。
- **标准做法**：
  必须准确无误地拼写 `readyPlayers` 字段，并提供 `{}` 作为兜底。
  ```typescript
  // ❌ 错误做法：拼写成了下划线，且使用了 []
  readonly readyPlayers = computed(() => this.ws.gameState()?.ready_players || []);
  
  // ✅ 正确规范：准确匹配后端字段 readyPlayers，且兜底为空对象 {}
  readonly readyPlayers = computed(() => (this.ws.gameState() as any)?.readyPlayers || {});
  ```

### 22. 结算界面“返回大厅”按钮失效陷阱 (Result Overlay Leave Event) 🚨
- **原理解析与隐患**：为了保证闭环体验，公共结算组件 `<app-game-result-overlay>` 内部**无条件**渲染了一个“返回大厅 (Return to Lobby)”的按钮。如果你在调用该组件时忘记绑定 `(leave)` 事件，点击该按钮将毫无反应，导致玩家（尤其是单机模式玩家）被死死卡在结算界面无法退出！
- **标准做法**：
  在任何使用 `<app-game-result-overlay>` 的地方，必须显式绑定 `(leave)` 事件，通常调用 `goBack()` 或 `returnToLobby()`：
  ```html
  <app-game-result-overlay
    currentGameId="your_game"
    [status]="'win'"
    [title]="t('game.you_win')()"
    (restart)="store.playAgain()"
    (leave)="goBack()"> <!-- 🚨 绝对不能漏掉这一行！ -->
  </app-game-result-overlay>
  ```

### 23. 玩家信息栏 (Player Badge) 参数标准化 (Player Stats UI)
- **避免隐患**：为了保持全局高逼格、清爽的 UI 体验，玩家卡片中的扩展信息（如用时、步数）严禁使用冗长的文字（如 `Time: 12s`, `Moves: 5`）。
- **标准做法**：
  统一向 `<app-player-badge>` 的 `[stats]` 属性传入携带 `icon` 字段的配置数组，使用 Emoji 图标替代文字标签，如用 `⏱️` 表示时间，用 `🦶` 表示步数：
  ```html
  <!-- ❌ 错误做法：使用冗长的 label -->
  [stats]="[{ label: 'TIME', value: '01:23' }, { label: 'MOVES', value: 45 }]"
  
  <!-- ✅ 正确做法：使用清爽的 Icon -->
  [stats]="[{ icon: '⏱️', value: '01:23' }, { icon: '🦶', value: 45 }]"
  ```

### 24. 统一公共组件的样式封装与反“套娃”原则 (Component Encapsulation & Anti-Nesting) 🚨
- **避免隐患**：在调用全站统一的公共组件（例如 `<app-game-header>`）时，**绝对禁止**在业务组件内部通过传参（如 `headerBgClass`）去强行覆盖、修补基础的结构样式（例如圆角 `rounded-t-2xl`，或者为了抵消父边距而使用负边距 `-mx-5`）。这不仅会导致代码大量冗余，还会使得封装性被破坏——当你想要统一调整全站的圆角弧度时，就不得不去修改几十个子文件。此外，也**严禁**出现“外层套了带卡片样式的父容器，内层又套了一个带卡片样式的子容器”的“双重套娃”结构。
- **标准做法**：
  1. **让底层公共组件接管结构**：诸如顶部的左右圆角、默认阴影、基础内边距等具有全站一致性的通用样式，必须下沉硬编码到公共组件（如 `game-header.component.ts`）自身的模板和样式中。业务侧调用时，只需、且只能传入表现层的个性化参数（如渐变颜色 `from-blue-900 to-emerald-900`）。
  2. **极简的外层容器**：确保游戏的最外层容器直接且唯一地使用统一的 `rounded-2xl lg:rounded-3xl` 配合 `overflow-hidden`。一旦外层有了 `overflow-hidden`，内部子组件的直角自然会被裁切成优雅的圆角，完全不需要在子组件上手写 `rounded-t-xxx` 来迎合父组件。

遵循以上规范，我们可以最大程度保证下一个游戏在接入时不仅稳定可靠，而且在多端视觉和流量获取上达到最顶级的体验！
