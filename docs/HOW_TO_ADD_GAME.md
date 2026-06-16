# 新增游戏开发指南

本项目支持两类游戏，开发流程略有不同，请先判断你的游戏属于哪一类：

| 类型 | 说明 | 现有示例 |
|---|---|---|
| **对战游戏** | 实时 WebSocket 多人对战，后端有 GameEngine | 扫雷、俄罗斯方块、五子棋、数独(多人)… |
| **解谜游戏** | 关卡制单机闯关，有题库数据库，用 REST API | 数独(单人)、数学24、推箱子 |

> 数独同时支持两类，单机走 PuzzleRepo，多人走 GameEngine。大多数新游戏只需实现其中一种。

---

## 一、后端

### 🚨 绝对红线

**不要修改 `pkg/ws/manager.go` 和 `pkg/ws/lobby.go`。** 房间生命周期（加入/离开/断线重连/幽灵房间清理）已完全封装，新游戏只需实现引擎逻辑，底层自动运转。

---

### A. 对战游戏 — 实现 GameEngine

#### 1. 创建引擎包

在 `backend/internal/engine/<你的游戏>/` 下创建 Go 包，每种对战模式建一个 struct：

```go
// backend/internal/engine/mygame/engine.go
package mygame

import (
    "encoding/json"
    "github.com/x-game/backend/internal/engine"
)

type ClassicEngine struct {
    engine.BaseEngine            // 必须嵌入！获得 Mu、State、Broadcast
    Players map[string]*Player
}

type Player struct {
    ID    string `json:"id"`
    Score int    `json:"score"`
}

// 在 init() 中注册，命名规则：<gameId>_<mode>
func init() {
    engine.Register("mygame_classic", func() engine.GameEngine {
        return &ClassicEngine{Players: make(map[string]*Player)}
    })
}
```

#### 2. 实现 GameEngine 接口

以下方法均需实现（已嵌入 `BaseEngine` 的方法不用重复写）：

```go
func (e *ClassicEngine) InitGame(options interface{}) error {
    e.Mu.Lock()
    defer e.Mu.Unlock()
    // 联机游戏必须从 Waiting 开始
    e.State = engine.StateWaiting
    e.Players = make(map[string]*Player)
    return nil
}

func (e *ClassicEngine) AddPlayer(playerID string) {
    e.Mu.Lock()
    defer e.Mu.Unlock()
    e.Players[playerID] = &Player{ID: playerID}
}

func (e *ClassicEngine) RemovePlayer(playerID string) {
    e.Mu.Lock()
    defer e.Mu.Unlock()
    delete(e.Players, playerID)
}

func (e *ClassicEngine) HasPlayer(playerID string) bool {
    e.Mu.RLock()
    defer e.Mu.RUnlock()
    _, ok := e.Players[playerID]
    return ok
}

func (e *ClassicEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
    e.Mu.Lock()
    defer e.Mu.Unlock()

    // 用 HandleLifecycle 处理通用的 start / restart_game 动作
    if engine.HandleLifecycle(&e.State, action, func() {
        engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
    }, func() {
        e.Players = make(map[string]*Player)
    }) {
        return e.State, nil
    }

    // 处理游戏专属动作（必须使用 C2SAction 中定义的字符串值）
    switch action {
    case "move":
        var req struct{ Dir string }
        json.Unmarshal(payload, &req)
        // ... 业务逻辑
    }
    return e.State, nil
}

func (e *ClassicEngine) CheckGameOver() (bool, []string) {
    e.Mu.RLock()
    defer e.Mu.RUnlock()
    // 返回 (是否结束, 胜者ID列表)
    return false, nil
}

func (e *ClassicEngine) GetState() interface{} {
    e.Mu.RLock()
    defer e.Mu.RUnlock()
    return map[string]interface{}{
        "status":  e.State,
        "players": e.Players,
    }
}
```

**`action` 字符串必须与前端 `C2SAction` 枚举的值对应**（`core/models/websocket.model.ts`），两端共用同一套字符串，不能自造。

#### 3. 注册 blank import（自动化）

**无需手动编辑 `main.go`。** 只需在引擎包的 `init()` 注册后，运行：

```bash
cd backend && go generate ./cmd/api/...
```

脚本 `cmd/api/gen_engines.go` 会自动扫描 `internal/engine/` 所有子目录，重写 `cmd/api/engines_gen.go`。提交 `engines_gen.go` 即可。

---

### B. 解谜游戏 — 实现 PuzzleRepo

解谜游戏有题库数据库，走统一的 REST 层（`internal/handlers/rest/puzzle.go`），无需 WebSocket 引擎。

#### 1. 建 domain 模型和数据库表

在 `internal/domain/` 下新建模型文件：

```go
// internal/domain/mypuzzle.go
package domain

type MyPuzzle struct {
    ID         string `gorm:"primarykey"`
    Difficulty string `gorm:"index"`
    Content    string // 题目数据
}

type UserMyPuzzleProgress struct {
    UserID    uint   `gorm:"index;not null"`
    PuzzleID  string `gorm:"index;not null"`
    Status    string // "playing" | "finished"
    TimeSpent int
    Stars     int
}
```

然后在 `pkg/db/postgres.go` 的 `AutoMigrate` 调用中加入这两个模型（其他模型已有示例，照着加一行）。

#### 2. 实现 PuzzleRepo 接口

在 `internal/handlers/rest/` 新建 `mypuzzle.go`：

```go
// internal/handlers/rest/mypuzzle.go
package rest

import (
    "github.com/x-game/backend/internal/domain"
    "github.com/x-game/backend/pkg/db"
)

type MyPuzzleRepo struct{}

func NewMyPuzzleRepo() PuzzleRepo { return &MyPuzzleRepo{} }

// HasSave — 是否需要中途保存进度接口（/puzzle/:id/save）
func (r *MyPuzzleRepo) HasSave() bool { return false }

// GetLevels — 返回某难度下的关卡列表（含用户进度）
func (r *MyPuzzleRepo) GetLevels(difficulty string, userID *uint) (any, error) {
    var puzzles []domain.MyPuzzle
    if err := db.DB.Where("difficulty = ?", difficulty).Find(&puzzles).Error; err != nil {
        return nil, err
    }
    // 可选：合并 userID 对应的进度数据后返回
    return puzzles, nil
}

// GetPuzzle — 返回单道题 + 用户进度（未有记录则自动创建）
func (r *MyPuzzleRepo) GetPuzzle(puzzleID string, userID *uint) (any, any, error) {
    var puzzle domain.MyPuzzle
    if err := db.DB.First(&puzzle, "id = ?", puzzleID).Error; err != nil {
        return nil, nil, err
    }
    var progress domain.UserMyPuzzleProgress
    if userID != nil {
        if err := db.DB.Where("user_id = ? AND puzzle_id = ?", *userID, puzzleID).First(&progress).Error; err != nil {
            progress = domain.UserMyPuzzleProgress{UserID: *userID, PuzzleID: puzzleID, Status: "playing"}
            db.DB.Create(&progress)
        }
    }
    return puzzle, progress, nil
}

// SaveProgress — 可选，HasSave()=true 时才会被调用
func (r *MyPuzzleRepo) SaveProgress(puzzleID string, userID uint, req SavePayload) error {
    var p domain.UserMyPuzzleProgress
    return db.DB.Where(domain.UserMyPuzzleProgress{UserID: userID, PuzzleID: puzzleID}).
        Assign(domain.UserMyPuzzleProgress{TimeSpent: req.TimeSpent}).
        FirstOrCreate(&p).Error
}

// Finish — 标记完成，框架层会自动 upsert UserGameStat，此处只更新业务进度表
func (r *MyPuzzleRepo) Finish(puzzleID string, userID uint, req FinishPayload) error {
    var p domain.UserMyPuzzleProgress
    return db.DB.Where(domain.UserMyPuzzleProgress{UserID: userID, PuzzleID: puzzleID}).
        Assign(domain.UserMyPuzzleProgress{Status: "finished", TimeSpent: req.TimeSpent, Stars: req.Stars}).
        FirstOrCreate(&p).Error
}
```

> `Finish()` 只负责更新业务进度表。`UserGameStat`（个人最佳记录）由 `makeFinishHandler` 在调用 `Finish()` 后**自动 upsert**，无需在此手写。

#### 3. 在 main.go 注册路由

```go
// backend/cmd/api/main.go
mypuzzle := v1.Group("/mypuzzle")
mypuzzle.Use(middleware.OptionalProtected())
rest.RegisterPuzzleRoutes(mypuzzle, "mygame", rest.NewMyPuzzleRepo())
```

这一行会自动注册以下端点：
- `GET  /api/v1/mypuzzle/levels/:difficulty`
- `GET  /api/v1/mypuzzle/puzzle/:id`
- `POST /api/v1/mypuzzle/puzzle/:id/save`（仅 `HasSave()=true` 时）
- `POST /api/v1/mypuzzle/puzzle/:id/finish` → 返回 `{ status, isNewRecord }`

---

## 二、前端

### A. Store（对战游戏 & 解谜游戏通用）

在 `frontend/src/app/features/games/<你的游戏>/store/` 下新建 `<游戏>.store.ts`，**必须继承 `BaseGameStore`**：

```typescript
import { Injectable, computed, signal, effect } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';

@Injectable()
export class MyGameStore extends BaseGameStore {
  readonly gameId = 'mygame';

  // ── 本地状态信号（游戏特有） ──
  board = signal<number[][]>([]);
  localScore = signal(0);
  localStatus = signal<GameStatusType>(GameStatus.Waiting);

  // ── 必须实现：单机模式下的状态来源 ──
  readonly singlePlayerStatus = computed(() => this.localStatus());

  // ── 可选：覆盖单机胜者/玩家列表 ──
  override readonly singlePlayerWinners = computed(() => []);
  override readonly singlePlayerList    = computed(() => [{ id: this.playerId() }]);

  constructor() {
    super();

    // 监听多人 WS 状态变化（Single 模式不会走这里）
    effect(() => {
      const st = this.rawState() as any;
      if (this.currentRoomMode() === GameMode.Single || !st) return;
      // 根据 st.status / st.board 等字段更新本地信号
    });
  }
}
```

**基类已经提供的，不要重写：**
- `roomId`, `currentRoomMode`, `rawState`, `status`, `readyPlayers`, `hostId`
- `joinRoom()`, `leaveRoom()`, `startGame()`, `ready()`, `cancelReady()`, `restartGame()`

**`status` 计算规则：**
- `GameMode.Single` → 自动取 `singlePlayerStatus()`
- 其他模式 → 自动取 `rawState().status`

所以 `singlePlayerStatus` 里只写单机相关逻辑，多人状态完全不需要处理。

#### 单机引擎（可选但推荐）

如果有复杂的本地逻辑（棋盘计算、Undo 等），把它抽到独立的 `<游戏>-engine.ts` 文件：

```typescript
// my-game-engine.ts
export class MyGameEngine {
  board: number[][] = [];
  status = GameStatus.Waiting;

  initGame(options: any) { /* 初始化 */ }
  handleAction(action: MyAction) { /* 纯业务逻辑，无 Angular 依赖 */ }
  undo() { /* 可选 */ }
}
```

Store 中持有引擎实例，每次动作后把结果同步到 Signal：

```typescript
private engine = new MyGameEngine();

makeMove(dir: string) {
  if (this.currentRoomMode() === GameMode.Single) {
    this.engine.handleAction({ type: 'move', dir });
    this.board.set([...this.engine.board]);  // 同步到 Angular 信号
  } else {
    this.ws.send({ action: C2SAction.Move, dir });  // 发给后端
  }
}
```

---

### B. 主组件

在 `features/games/<你的游戏>/` 下新建 `<游戏>.component.ts`，**必须继承 `BaseGameComponent`**：

```typescript
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { BaseGameComponent } from '../../../../core/utils/base-game.component';
import { MyGameStore } from './store/mygame.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../../core/services/room-lifecycle';
import { GameMode } from '../../../../core/models/game.model';

@Component({
  selector: 'app-mygame',
  standalone: true,
  templateUrl: './mygame.component.html',
  providers: [MyGameStore]
})
export class MyGameComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(MyGameStore);
  private lifecycle!: RoomLifecycleHandle;

  constructor() {
    super();
    this.lifecycle = setupRoomLifecycle({
      gameId: 'mygame',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.lifecycle.clearReconnectInfo();
      },
    });
  }

  override ngOnInit() {
    super.ngOnInit();  // 必须！自动连接大厅 WS
    const pending = this.lifecycle.consumePendingOrReconnect();
    if (pending) {
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host ?? '');
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();  // 必须！
    this.store.leaveRoom();
  }

  override handleJoinRoom(params: any) {
    super.handleJoinRoom(params);
    if (params.mode !== GameMode.Single) {
      this.lifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
  }
}
```

**模板中的通用 overlay（直接复制）：**

```html
<!-- 倒计时开局遮罩 -->
@if (store.status() === GameStatus.Starting) {
  <app-game-starting-overlay [countdown]="gameTimer.countdownDisplay()"/>
}

<!-- 结果面板 -->
@if (store.status() === GameStatus.Finished) {
  <app-game-result-overlay [winners]="store.singlePlayerWinners()" .../>
}
```

---

### C. 注册路由（唯一入口）

打开 `frontend/src/app/core/config/game-definitions.ts`，在 `GAME_DEFINITIONS` 数组末尾添加一条记录：

```typescript
{
  id: GameId.MyGame,          // 先在 game.model.ts 的 GameId 枚举里加这个值
  route: '/games/mygame',
  titleKey: 'lobby.mygame',
  iconEmoji: '🎮',
  loadComponent: () => import('../../features/games/mygame/mygame.component')
                         .then(m => m.MyGameComponent),
  modes: [
    { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
    // 如果有多人模式，继续添加…
  ],
  difficulties: [
    { id: GameDifficulty.Easy,   labelKey: 'game.diff_easy',   descKey: '...', desc: 'Easy' },
    { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: '...', desc: 'Medium' },
  ],
  recommendations: ['sudoku', 'minesweeper']
}
```

**`app.routes.ts` 不需要改动。** 路由由 `GAME_DEFINITIONS` 自动生成。

---

### D. 多语言（i18n）

#### 静态模板文本

HTML 里的固定文字使用 `i18n` 属性：

```html
<h1 i18n="@@mygame.title">我的游戏</h1>
```

#### TypeScript 动态文本

```typescript
private i18n = inject(I18nService);
label = this.i18n.t('mygame.win_message');  // 返回 Signal<string>
```

#### 添加翻译词条

在 `frontend/src/app/core/i18n/core.translations.ts` 中添加中英文：

```typescript
'mygame.title':       { zh: '我的游戏', en: 'My Game' },
'mygame.win_message': { zh: '你赢了！', en: 'You Win!' },
```

然后运行：

```bash
cd frontend && node generate-xlf.js
```

---

### E. 个人最佳统计

**对战游戏**：游戏结束后前端调用：

```typescript
private statsService = inject(GameStatsService);

onGameOver() {
  this.statsService.submitStat('mygame', {
    mode: this.currentRoomMode(),
    difficulty: this.currentDifficulty(),
    score: this.localScore(),
    time: this.timeSpent(),
    won: true
  }).subscribe(res => {
    if (res.isNewRecord) { /* 显示破纪录提示 */ }
  });
}
```

**解谜游戏**：调用 `/puzzle/:id/finish` 端点时传入 `mode` 和 `difficulty`，后端自动 upsert 统计，响应中包含 `isNewRecord`。**不需要**另外调用 `submitStat`。

```typescript
this.http.post<{ isNewRecord: boolean }>(`${env.apiUrl}/mypuzzle/puzzle/${id}/finish`, {
  time_spent: this.timeSpent(),
  stars: 3,
  mode: GameMode.Single,
  difficulty: this.currentDifficulty()
}).subscribe(res => {
  if (res.isNewRecord) { /* 破纪录 */ }
});
```

---

## 三、最后几步

1. **更新文档**：编辑 `docs/FEATURES.md` 添加新游戏描述，`docs/CHANGELOG.md` 添加变更记录。

2. **SEO 文案**（如果需要）：在 i18n 文件中添加 `seo.<gameId>.title`、`seo.<gameId>.desc`、`seo.<gameId>.keywords` 词条，路由会自动读取。

3. **数据库种子**（解谜游戏）：准备题目数据，添加到种子脚本或通过管理后台导入。

4. **编译验证**：
   ```bash
   # 后端
   cd backend && go build ./cmd/api/...
   
   # 前端类型检查
   cd frontend && npx tsc --noEmit
   ```

---

## 四、响应式布局规范

游戏页面必须在 PC、iPad、手机三端都不出现滚动条和橡皮筋效果，同时最大化棋盘区域。以下是本项目经过多次修复总结出的硬性规范。

### 🚨 Overflow 红线

**任何游戏内容区容器，一律用 `overflow-hidden`，禁止 `overflow-y-auto`。**

```html
<!-- ❌ 错误 — 会在内容稍高时弹出垂直滚动条 -->
<div class="flex-1 overflow-y-auto flex flex-col ...">

<!-- ✅ 正确 — 内容撑不开父容器，超出则裁剪 -->
<div class="flex-1 overflow-hidden flex flex-col ...">
```

`overscroll-behavior: none` 已在全局 `html`/`body` 上设置，无需在游戏组件重复添加。

### 🚨 最小高度红线

**禁止在游戏布局容器上使用 `min-h-[600px]`、`min-h-[450px]` 等固定最小高度。**

这类约束会强制容器超出视口，导致父容器出现滚动条：

```html
<!-- ❌ 错误 — 强制至少 600px，小屏必溢出 -->
<div class="flex-1 relative min-w-0 min-h-[600px] lg:min-h-0 flex flex-col">

<!-- ✅ 正确 — flex-1 自动填满可用空间，不强制最小高度 -->
<div class="flex-1 relative min-w-0 flex flex-col">
```

### 棋盘尺寸：使用 TS Signal，不用 CSS 公式

CSS 的 `min()` 公式（如 `min(85vmin, 600px)`）无法区分不同断点的 Chrome 高度，导致移动端棋盘过小或 PC 端出现滚动条。**使用 `boardSizePx()` 信号。**

#### 方形棋盘（宽 = 高）

```typescript
// 在组件 class 中
import { WindowSizeService } from '../../../core/services/window-size.service';
import { boardSizePx } from '../../../core/utils/board-size.util';

// chrome = 导航栏 + 外层padding + 卡片padding + 游戏header + 进度条 + 玩家badge + 棋盘上下py + 操作按钮
// 按移动端/平板/PC 三档分别测量（单位 px）
boardSizePx = boardSizePx(inject(WindowSizeService), { mobile: 302, tablet: 350, pc: 390 });
```

```html
<!-- 棋盘 div 直接绑定信号，不要用 w-full / aspect-square / maxWidth -->
<div [style.width]="boardSizePx()" [style.height]="boardSizePx()">
  <!-- 棋盘内容 -->
</div>
```

#### 非方形棋盘（高 > 宽，如竖版游戏）

```typescript
import { boardSizePx, boardHeightPx } from '../../../core/utils/board-size.util';

// ratio = 高/宽，例如 7行5列的棋盘 444/320 ≈ 1.3875
boardWidthPx  = boardSizePx(inject(WindowSizeService), { mobile: 240, tablet: 260, pc: 300 }, 400, 200, undefined, 1.3875);
boardHeightPx = boardHeightPx(this.boardWidthPx, 1.3875);
```

```html
<div [style.width]="boardWidthPx()" [style.height]="boardHeightPx()">
  <!-- 棋盘内容 -->
</div>
```

#### Chrome 高度如何估算

Chrome = 所有垂直方向占用的非棋盘像素之和：

| 元素 | 移动端 | PC |
|---|---|---|
| 导航栏 | 64px | 64px |
| 根容器 padding（p-1/p-4） | 8px | 32px |
| 卡片 padding（p-3/p-5） | 24px | 40px |
| 游戏 Header | ~60px | ~80px |
| 进度条（如有） | 24px | 24px |
| 玩家 Badge | ~50px | ~60px |
| 棋盘区 padding（py-2/py-4） | 8px | 16px |
| 操作按钮栏（如有） | ~64px | ~64px |

把本游戏用到的元素加总，分别填入 `mobile`/`tablet`/`pc`。

#### 内部固定尺寸的棋盘组件

如果棋盘子组件内部使用硬编码像素尺寸（如 `readonly cellSize = 60`），**不要用 `boardSizePx`**，只需：

1. 移除外层容器的 `min-h-[...]` 约束
2. 把游戏内容区的 `overflow-y-auto` 改为 `overflow-hidden`

棋盘在可用空间内居中显示，超出则裁剪，不会产生滚动条。

### 标准布局骨架

```html
<!-- 根容器：撑满父级，overflow-hidden -->
<div class="flex-1 flex flex-col overflow-hidden">

  <!-- 卡片层 -->
  <div class="flex-1 flex flex-col overflow-hidden rounded-2xl ...">

    <!-- Header（flex-none，不参与伸缩） -->
    <app-game-header class="flex-none" .../>

    <!-- 玩家 Badge（flex-none） -->
    <div class="flex-none py-2 border-b ...">
      <app-player-badge .../>
    </div>

    <!-- 棋盘区（flex-grow，填满剩余空间） -->
    <div class="flex-grow flex items-center justify-center overflow-hidden min-h-0">
      <div [style.width]="boardSizePx()" [style.height]="boardSizePx()">
        <!-- 棋盘内容 -->
      </div>
    </div>

    <!-- 操作按钮（flex-none，始终可见） -->
    <div class="flex-none py-2 flex justify-center gap-4">
      <button>重开</button>
    </div>

  </div>
</div>
```

`flex-none` 保证 Header 和操作按钮不被压缩，`flex-grow` 把剩余空间全给棋盘，`overflow-hidden` 防止内容溢出。

---

## 五、规范速查

| 场景 | 正确做法 |
|---|---|
| WS 动作字符串 | 用 `C2SAction.Move` 枚举，禁止 `'move'` 字面量 |
| 颜色样式 | 用 `var(--color-bg-card)` CSS 变量，禁止 `bg-slate-900` |
| UI 文本 | 走 i18n，禁止硬编码中英文字符串 |
| 棋盘尺寸 | 用 `boardSizePx()` TS 信号；禁止 `min(85vmin, ...)` CSS 公式、`flex-1 h-full` |
| 游戏区 overflow | 一律 `overflow-hidden`，禁止 `overflow-y-auto` |
| 布局最小高度 | 禁止 `min-h-[600px]` 等固定值，用 `flex-1 min-h-0` 代替 |
| 玩家信息卡 | `[stats]="[{ icon: '⏱️', value: '01:23' }]"` emoji 图标形式 |
| 多人 status | 不在 `singlePlayerStatus` 里写多人逻辑，基类已处理 |
| 解谜统计 | 只调 `/finish`，不额外调 `submitStat` |
| engine imports | 跑 `go generate ./cmd/api/...`，不手动改 `engines_gen.go` |
