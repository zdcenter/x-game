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
主组件必须继承 `BaseGameComponent`，从而免费获得建房、加入房间、房间销毁监听等逻辑。

```typescript
import { Component, computed, inject } from '@angular/core';
import { BaseGameComponent } from '../../../../core/utils/base-game.component';
import { TetrisStore } from './store/tetris.store';
import { AuthStore } from '../../../../core/auth/auth.store';

@Component({
  selector: 'app-tetris',
  templateUrl: './tetris.component.html',
  // ...
})
export class TetrisComponent extends BaseGameComponent {
  // 必须实现父类的抽象属性
  override store = inject(TetrisStore);
  private authStore = inject(AuthStore);
  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
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
