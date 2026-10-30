#!/usr/bin/env node
/**
 * X-Game One-Click Game Scaffolder CLI (一键新增游戏脚手架)
 * 
 * Usage:
 *   node scripts/generate-game.js <gameId> [titleZh] [iconEmoji]
 *   npm run gen:game <gameId> [titleZh] [iconEmoji]
 * 
 * Example:
 *   node scripts/generate-game.js reversi "黑白棋" "⚪"
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
\x1b[33m[X-Game Scaffolder]\x1b[0m 请提供游戏标识符 (gameId)！
用法示例:
  node scripts/generate-game.js <gameId> [中文标题] [图标Emoji]
  npm run gen:game tilematch "羊了个羊" "🀄"
  npm run gen:game reversi "黑白棋" "⚪"
`);
  process.exit(1);
}

const rawGameId = args[0].toLowerCase().trim();
if (!/^[a-z0-9_]+$/.test(rawGameId)) {
  console.error('\x1b[31m[Error]\x1b[0m gameId 只能包含小写字母、数字和下划线，例如: reversi, tilematch, car_puzzle');
  process.exit(1);
}

// Convert snake_case or plain to PascalCase (e.g. tile_match -> TileMatch, reversi -> Reversi)
function toPascalCase(str) {
  return str
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

const gameId = rawGameId;
const pascalName = toPascalCase(gameId);
const titleZh = args[1] || pascalName;
const iconEmoji = args[2] || '🎮';
const titleEn = pascalName.replace(/([A-Z])/g, ' $1').trim();

// Project Root is 2 levels up from frontend/scripts
const frontendDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(frontendDir, '..');
const backendDir = path.resolve(projectRootDir, 'backend');

console.log(`\x1b[36m🚀 正在一键装配新游戏: ${gameId} (${titleZh} ${iconEmoji}) ...\x1b[0m\n`);

// 1. 创建后端 Go 引擎
const backendEngineDir = path.join(backendDir, 'internal', 'engine', gameId);
if (!fs.existsSync(backendEngineDir)) {
  fs.mkdirSync(backendEngineDir, { recursive: true });
}

const backendEngineFile = path.join(backendEngineDir, 'engine.go');
if (!fs.existsSync(backendEngineFile)) {
  const engineGoContent = `package ${gameId}

import (
	"encoding/json"

	"github.com/x-game/backend/internal/engine"
)

// Player 玩家实时竞技状态与观战镜像数据
type Player struct {
	ID       string      \`json:"id"\`
	Score    int         \`json:"score"\`
	Progress int         \`json:"progress"\`
	Finished bool        \`json:"finished"\`
	State    interface{} \`json:"state,omitempty"\` // 供观战者实时镜像同步的棋盘/走法数据
}

// Engine 组合嵌入 BaseEngine
type Engine struct {
	engine.BaseEngine
	Players      map[string]*Player \`json:"players"\`
	InitialBoard interface{}        \`json:"initial_board,omitempty"\` // 权威公平初始发牌基准
	Difficulty   string             \`json:"difficulty"\`
	Winners      []string           \`json:"winners"\`
	Wins         map[string]int     \`json:"wins"\`
	Target       int                \`json:"target"\`
}

func init() {
	// 1. 注册基础 ID
	engine.RegisterGame("${gameId}")
	// 2. 注册极速竞速模式
	engine.Register("${gameId}_speed", func() engine.GameEngine {
		return &Engine{}
	})
}

// InitGame 初始化房间对局状态
func (e *Engine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	opts := engine.ParseGameOptions(options)
	e.State = engine.StateWaiting
	e.Players = make(map[string]*Player)
	e.Winners = make([]string, 0)
	e.Wins = make(map[string]int)
	e.Target = opts.Target
	e.Difficulty = string(opts.Difficulty)

	return nil
}

// AddPlayer 玩家连接加入房间
func (e *Engine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	if _, exists := e.Players[playerID]; !exists {
		e.Players[playerID] = &Player{
			ID:       playerID,
			Score:    0,
			Progress: 0,
			Finished: false,
			State:    e.InitialBoard,
		}
	}
	if _, exists := e.Wins[playerID]; !exists {
		e.Wins[playerID] = 0
	}
}

// RemovePlayer 玩家离开房间
func (e *Engine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

// HasPlayer 判定玩家是否存在
func (e *Engine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

// HandleAction 处理对局动作与 3 秒倒计时
func (e *Engine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	// 1. 房主点击开始对战：触发统一 3 秒倒计时，并权威统一分发相同初始盘面
	if action == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		e.TriggerCountdown(func() {
			fairBoard := map[string]interface{}{"seed": 100}
			e.InitialBoard = fairBoard
			for _, p := range e.Players {
				p.Score = 0
				p.Progress = 0
				p.Finished = false
				p.State = fairBoard
			}
			e.Winners = make([]string, 0)
		})
		return e.State, nil
	}

	// 2. 再来一局 (Rematch) 动作
	if action == string(domain.ActionRestartGame) && e.State == engine.StateFinished {
		if over, _ := engine.CheckSeriesWinner(e.Wins, e.Target); over {
			engine.ResetSeriesWins(e.Wins)
		}

		fairBoard := map[string]interface{}{"seed": 200}
		e.InitialBoard = fairBoard
		for _, p := range e.Players {
			p.Score = 0
			p.Progress = 0
			p.Finished = false
			p.State = fairBoard
		}
		e.Winners = make([]string, 0)
		e.State = engine.StateWaiting
		return e.State, nil
	}

	// 3. 对战进行中动作
	if e.State == engine.StatePlaying {
		switch action {
		case "move", "progress":
			var req struct {
				Delta int         \`json:"delta"\`
				State interface{} \`json:"state"\`
			}
			if err := json.Unmarshal(payload, &req); err == nil {
				if p, exists := e.Players[playerID]; exists {
					p.Score += req.Delta
					if req.State != nil {
						p.State = req.State
					}
					if p.Score >= 100 {
						p.Finished = true
						e.Winners = []string{playerID}
						e.Wins[playerID]++
						e.State = engine.StateFinished
					}
				}
			}
		case "forfeit":
			for id := range e.Players {
				if id != playerID {
					e.Winners = []string{id}
					e.Wins[id]++
					break
				}
			}
			e.State = engine.StateFinished
		}
	}

	return e.State, nil
}

// CheckGameOver 检查胜负
func (e *Engine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}

// GetState 状态序列化广播 (基于 BaseEngine.StandardStateMap 标准信封组装)
func (e *Engine) GetState() interface{} {
	return e.StandardStateMap(e.Players, e.Winners, e.Wins, e.Target, map[string]interface{}{
		"initial_board": e.InitialBoard,
		"difficulty":    e.Difficulty,
	})
}
`;
  fs.writeFileSync(backendEngineFile, engineGoContent, 'utf-8');
  console.log(`  ✓ 创建后端引擎: backend/internal/engine/${gameId}/engine.go`);
}

// 2. 注入 engines_gen.go 空白导入
const enginesGenFile = path.join(backendDir, 'cmd', 'api', 'engines_gen.go');
if (fs.existsSync(enginesGenFile)) {
  let genContent = fs.readFileSync(enginesGenFile, 'utf-8');
  const importLine = `\t_ "github.com/x-game/backend/internal/engine/${gameId}"`;
  if (!genContent.includes(importLine)) {
    genContent = genContent.replace(/\)\n$/, `${importLine}\n)\n`);
    fs.writeFileSync(enginesGenFile, genContent, 'utf-8');
    console.log(`  ✓ 注入后端引擎空白引用: backend/cmd/api/engines_gen.go`);
  }
}

// 3. 创建前端组件与模块目录
const gameDir = path.join(frontendDir, 'src', 'app', 'features', 'games', gameId);
const gameStoreDir = path.join(gameDir, 'store');
if (!fs.existsSync(gameStoreDir)) {
  fs.mkdirSync(gameStoreDir, { recursive: true });
}

// 3.1 前端单机轻量引擎 (0ms 纯客户端本地计算)
const localEngineFile = path.join(gameStoreDir, `${gameId}-engine.ts`);
if (!fs.existsSync(localEngineFile)) {
  const localEngineContent = `import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';

export interface ${pascalName}Action {
  type: 'move' | 'reset';
  delta?: number;
}

export class Local${pascalName}Engine implements ILocalEngine<any, ${pascalName}Action> {
  score: number = 0;
  moves: number = 0;
  status: GameStatusType = GameStatus.Waiting;
  difficulty: string = GameDifficulty.Medium;
  startAt: number = 0;

  initGame(config?: { difficulty?: string }) {
    this.difficulty = config?.difficulty || GameDifficulty.Medium;
    this.score = 0;
    this.moves = 0;
    this.status = GameStatus.Playing;
    this.startAt = Date.now();
  }

  handleAction(action: ${pascalName}Action): void {
    if (action.type === 'move') {
      if (this.status !== GameStatus.Playing) return;
      this.score += action.delta ?? 10;
      this.moves++;
      if (this.score >= 100) {
        this.status = GameStatus.Finished;
      }
    } else if (action.type === 'reset') {
      this.initGame({ difficulty: this.difficulty });
    }
  }

  getState() {
    return this;
  }

  /** 导出当前棋盘/选手数据，供 WebSocket 上报与观战广播 */
  exportBoardState() {
    return {
      score: this.score,
      moves: this.moves
    };
  }

  /** 载入外部选手的棋盘数据，供观战模式毫秒级实时镜像 */
  loadBoardState(data: any): void {
    if (!data) return;
    if (typeof data.score === 'number') this.score = data.score;
    if (typeof data.moves === 'number') this.moves = data.moves;
  }
}
`;
  fs.writeFileSync(localEngineFile, localEngineContent, 'utf-8');
  console.log(`  ✓ 创建前端本地单机引擎: ${gameId}-engine.ts`);
}

// 3.2 前端算法单元测试 (Vitest)
const specFile = path.join(gameStoreDir, `${gameId}-engine.spec.ts`);
if (!fs.existsSync(specFile)) {
  const specContent = `import { describe, it, expect, beforeEach } from 'vitest';
import { Local${pascalName}Engine } from './${gameId}-engine';
import { GameStatus } from '../../../../core/models/game.model';

describe('Local${pascalName}Engine', () => {
  let engine: Local${pascalName}Engine;

  beforeEach(() => {
    engine = new Local${pascalName}Engine();
  });

  it('should initialize game state properly', () => {
    engine.initGame();
    expect(engine.score).toBe(0);
    expect(engine.moves).toBe(0);
    expect(engine.status).toBe(GameStatus.Playing);
  });

  it('should handle move action and update score', () => {
    engine.initGame();
    engine.handleAction({ type: 'move', delta: 20 });
    expect(engine.score).toBe(20);
    expect(engine.moves).toBe(1);
  });
});
`;
  fs.writeFileSync(specFile, specContent, 'utf-8');
  console.log(`  ✓ 创建算法单测试套件: ${gameId}-engine.spec.ts`);
}

// 3.3 前端 Store (继承 BaseGameStore)
const storeFile = path.join(gameStoreDir, `${gameId}.store.ts`);
if (!fs.existsSync(storeFile)) {
  const storeContent = `import { Injectable, computed, signal } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { C2SAction } from '../../../../core/models/websocket.model';
import { Local${pascalName}Engine } from './${gameId}-engine';

@Injectable()
export class ${pascalName}Store extends BaseGameStore {
  readonly gameId = GameId.${pascalName};

  localEngine = signal<Local${pascalName}Engine | null>(null);
  tick = signal<number>(0);

  localScore = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.score ?? 0;
    }
    const raw = this.rawState() as any;
    return raw?.players?.[this.playerId()]?.score ?? 0;
  });

  localMoves = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      this.tick();
      return this.localEngine()?.moves ?? 0;
    }
    return 0;
  });

  readonly singlePlayerStatus = computed<GameStatusType | string>(() => {
    this.tick();
    return this.localEngine()?.status ?? GameStatus.Waiting;
  });

  override readonly singlePlayerWinners = computed<string[]>(() => {
    this.tick();
    const eng = this.localEngine();
    return eng && eng.status === GameStatus.Finished && eng.score >= 100 ? [this.playerId()] : [];
  });

  constructor() {
    super();

    // 观战实时镜像同步：自动跟随导播焦点选手盘面
    effect(() => {
      if (this.isSpectator()) {
        const boardState = this.focusedPlayerBoardState();
        if (boardState && this.localEngine()) {
          this.localEngine()?.loadBoardState?.(boardState);
          this.tick.update(t => t + 1);
        }
      }
    });
  }

  protected override onResetLocalGameState(): void {
    // 自动清理本地临时状态（防幽灵状态契约）
  }

  startLocalGame(difficulty: string = GameDifficulty.Medium) {
    this.currentRoomMode.set(GameMode.Single);
    this.currentDifficulty.set(difficulty);
    this.ws.disconnect(this.gameId);

    const engine = new Local${pascalName}Engine();
    engine.initGame({ difficulty });
    this.localEngine.set(engine);
    this.tick.set(this.tick() + 1);
  }

  override startGame() {
    super.startGame();
    if (this.currentRoomMode() === GameMode.Single) {
      this.startLocalGame(this.currentDifficulty() as string);
    }
  }

  override restartGame() {
    super.restartGame();
    if (this.currentRoomMode() === GameMode.Single) {
      this.startLocalGame(this.currentDifficulty() as string);
    }
  }

  makeMove(delta = 10) {
    if (this.status() !== GameStatus.Playing || this.isSpectator()) return;

    const eng = this.localEngine();
    if (eng) {
      eng.handleAction({ type: 'move', delta });
      this.tick.set(this.tick() + 1);
      if (this.currentRoomMode() === GameMode.Single && eng.status === GameStatus.Finished) {
        this.submitSingleStat({ score: eng.score, won: true }).subscribe();
      }
    }

    if (this.currentRoomMode() !== GameMode.Single) {
      this.ws.send({
        action: C2SAction.Progress,
        delta,
        state: this.localEngine()?.exportBoardState?.()
      });
    }
  }
}
`;
  fs.writeFileSync(storeFile, storeContent, 'utf-8');
  console.log(`  ✓ 创建状态管理 Store: ${gameId}.store.ts`);
}

// 3.4 前端组件 TS
const componentFile = path.join(gameDir, `${gameId}.component.ts`);
if (!fs.existsSync(componentFile)) {
  const componentContent = `import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { ${pascalName}Store } from './store/${gameId}.store';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { GameScoreCapsuleComponent } from '../../../shared/components/game-score-capsule/game-score-capsule.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { GameMode } from '../../../core/models/game.model';

@Component({
  selector: 'app-${gameId}',
  standalone: true,
  imports: [
    CommonModule,
    GameLayoutComponent,
    GamePkHudComponent,
    GameScoreCapsuleComponent,
    GameToolbarComponent
  ],
  providers: [${pascalName}Store],
  templateUrl: './${gameId}.component.html',
  styleUrl: './${gameId}.component.css'
})
export class ${pascalName}Component extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(${pascalName}Store);

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    return {
      id: this.playerId,
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: true,
      score: this.store.localScore(),
      status: this.store.status()
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return [];
    const myId = this.playerId;
    const room = this.store.room();
    const rawPlayers = room?.players || [];
    return rawPlayers
      .filter((p: any) => p.id !== myId)
      .map((p: any) => ({
        id: p.id,
        playerId: p.id,
        nickname: p.nickname || p.id,
        avatar: p.avatar,
        isHost: p.id === this.store.hostId(),
        isMe: false,
        score: p.score || 0,
        status: p.status || this.store.status()
      }));
  });

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.store.currentRoomMode() === GameMode.Single) {
      this.store.startLocalGame();
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }
}
`;
  fs.writeFileSync(componentFile, componentContent, 'utf-8');
  console.log(`  ✓ 创建页面逻辑组件: ${gameId}.component.ts`);
}

// 3.5 前端模板 HTML (使用 GameLayout 黄金编排器骨架)
const htmlFile = path.join(gameDir, `${gameId}.component.html`);
if (!fs.existsSync(htmlFile)) {
  const htmlContent = `<app-game-layout
  [store]="store"
  [gameId]="'${gameId}'"
  [title]="i18n.t('lobby.${gameId}')()"
  icon="${iconEmoji}"
  iconGradientClass="from-indigo-500 to-cyan-500"
  titleGradientClass="from-indigo-400 to-cyan-400"
  shadowClass="shadow-cyan-500/20"
  [showRules]="showRules()"
  [showMobileSidebar]="isMobileSidebarOpen()"
  [currentDifficulty]="store.currentDifficulty()"
  [overlayStats]="[{ label: 'SCORE', value: store.localScore() }]"
  (rulesClosed)="showRules.set(false)"
  (rulesOpen)="showRules.set(true)"
  (titleClick)="handleTitleClick()"
  (back)="goBack()"
  (playAgain)="store.startGame()"
  (restart)="store.restartGame()"
  (rematch)="handleRematch()"
  (navigateToPk)="navigateToPkArena()"
  (joinRoom)="handleJoinRoom($event)"
  (createRoom)="handleCreateRoom($event)"
  (mobileSidebarClosed)="isMobileSidebarOpen.set(false)"
>
  <div class="w-full flex-grow flex flex-col relative min-h-0 items-center justify-center my-auto p-2 sm:p-4">
    <!-- Top HUD (Single Mode) -->
    @if (store.currentRoomMode() === GameMode.Single) {
      <div class="flex-none px-3 sm:px-6 py-2 bg-[var(--color-bg-card)]/80 backdrop-blur-md border-b border-[var(--color-border-card)] shrink-0 w-full shadow-sm mb-2 rounded-2xl">
        <app-game-score-capsule
          [score]="store.localScore()"
          [bestScore]="store.localScore()"
          scoreIcon="${iconEmoji}"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs font-bold text-[var(--color-text-muted)]">
              🔄 {{ store.localMoves() }}
            </span>
            <button type="button"
                    (click)="store.restartGame()"
                    class="p-1.5 rounded-xl bg-[var(--color-bg-sub)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-xs font-semibold text-[var(--color-text-main)] shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    [title]="i18n.t('game.restart')() || 'Restart'">
              🔄
            </button>
          </div>
        </app-game-score-capsule>
      </div>
    } @else {
      <!-- PK HUD -->
      <div class="flex-none py-1.5 shrink-0 w-full max-w-4xl mx-auto px-2 mb-2">
        <app-game-pk-hud
          [myPlayer]="myPlayerPkStats()"
          [opponents]="opponentsPkStats()"
          [gameMode]="store.currentRoomMode()"
          [status]="store.status()"
          [targetWins]="store.currentRoomTarget()"
          [roundFormat]="store.room()?.roundFormat || 'BO3'"
        ></app-game-pk-hud>
      </div>
    }

    <!-- Game Core Board Area -->
    <div class="relative flex-grow flex flex-col items-center justify-center my-auto min-h-0 w-full max-w-md p-6 bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-card)] shadow-xl"
         [class.pointer-events-none]="store.isSpectator()">
      @if (store.isSpectator()) {
        <div class="mb-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold flex items-center gap-1.5 shadow-sm">
          <span>👁️</span>
          <span>{{ i18n.t('game.spectating')() || '观战视角 · 实时同步中' }}</span>
        </div>
      }

      <div class="text-6xl mb-4 select-none animate-bounce">${iconEmoji}</div>
      <div class="text-xl font-bold text-[var(--color-text-main)] mb-2">
        {{ i18n.t('lobby.${gameId}')() }}
      </div>
      <div class="text-sm text-[var(--color-text-muted)] mb-6 text-center">
        Score: {{ store.localScore() }} | Moves: {{ store.localMoves() }}
      </div>

      @if (!store.isSpectator()) {
        <button
          type="button"
          (click)="store.makeMove(10); vibrateLight()"
          class="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] font-black text-lg shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
          Tap to Play (+10)
        </button>
      }
    </div>

    <!-- Bottom Toolbar -->
    @if (store.currentRoomMode() === GameMode.Single) {
      <div class="w-full max-w-md mx-auto z-10 shrink-0 mt-3">
        <app-game-toolbar
          [layoutStyle]="'compact'"
          [showRestart]="true"
          (restart)="store.restartGame()"
        ></app-game-toolbar>
      </div>
    }
  </div>
</app-game-layout>
`;
  fs.writeFileSync(htmlFile, htmlContent, 'utf-8');
  console.log(`  ✓ 创建页面布局模板: ${gameId}.component.html`);
}

// 3.6 前端样式 CSS
const cssFile = path.join(gameDir, `${gameId}.component.css`);
if (!fs.existsSync(cssFile)) {
  fs.writeFileSync(cssFile, `:host {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n`, 'utf-8');
  console.log(`  ✓ 创建样式文件: ${gameId}.component.css`);
}

// 4. 注册到 game.model.ts 中的 GameId
const gameModelFile = path.join(frontendDir, 'src', 'app', 'core', 'models', 'game.model.ts');
if (fs.existsSync(gameModelFile)) {
  let modelContent = fs.readFileSync(gameModelFile, 'utf-8');
  if (!modelContent.includes(`${pascalName}: '${gameId}'`)) {
    modelContent = modelContent.replace(/Hashi: 'hashi'(,)?\n\} as const;/, `Hashi: 'hashi',\n  ${pascalName}: '${gameId}'\n} as const;`);
    fs.writeFileSync(gameModelFile, modelContent, 'utf-8');
    console.log(`  ✓ 注册 GameId 枚举: GameId.${pascalName}`);
  }
}

// 5. 注册到 game-definitions.ts 中的 GAME_DEFINITIONS
const gameDefFile = path.join(frontendDir, 'src', 'app', 'core', 'config', 'game-definitions.ts');
if (fs.existsSync(gameDefFile)) {
  let defContent = fs.readFileSync(gameDefFile, 'utf-8');
  if (!defContent.includes(`id: GameId.${pascalName}`)) {
    const newDefEntry = `  {
    id: GameId.${pascalName},
    route: '/games/${gameId}',
    titleKey: 'lobby.${gameId}',
    iconEmoji: '${iconEmoji}',
    loadComponent: () => import('../../features/games/${gameId}/${gameId}.component').then(m => m.${pascalName}Component),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Speed, labelKey: 'game.speed_label', descKey: 'game.speed_desc', icon: '⚡', desc: 'Speed PK' }
    ],
    multiRound: true,
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_easy', desc: 'Easy' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_medium', desc: 'Medium' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_hard', desc: 'Hard' }
    ],
    recommendations: ['minesweeper', 'classic2048']
  },
];`;
    defContent = defContent.replace(/\n\];\s*$/, `,\n${newDefEntry}\n`);
    fs.writeFileSync(gameDefFile, defContent, 'utf-8');
    console.log(`  ✓ 注册前端路由与元数据: GAME_DEFINITIONS`);
  }
}

// 6. 注册多语言词条 (zh.json & en.json)
const zhFile = path.join(frontendDir, 'src', 'assets', 'i18n', 'zh.json');
if (fs.existsSync(zhFile)) {
  try {
    const zh = JSON.parse(fs.readFileSync(zhFile, 'utf-8'));
    if (!zh[`lobby.${gameId}`]) zh[`lobby.${gameId}`] = titleZh;
    if (!zh[`seo.${gameId}.title`]) zh[`seo.${gameId}.title`] = `${titleZh}在线玩 - 双人实时对战 | 益智游戏PK网`;
    if (!zh[`seo.${gameId}.desc`]) zh[`seo.${gameId}.desc`] = `免费在线体验${titleZh}，支持单人练习与多人在线实时竞速对决。`;
    if (!zh[`game.${gameId}.seo_desc`]) zh[`game.${gameId}.seo_desc`] = `<h2>关于${titleZh}</h2><p>${titleZh}是一款经典的休闲益智游戏，快来挑战吧！</p>`;
    fs.writeFileSync(zhFile, JSON.stringify(zh, null, 2), 'utf-8');
    console.log(`  ✓ 注入中文词条: zh.json`);
  } catch (err) {
    console.warn(`  ⚠️ zh.json 解析或写入警告:`, err.message);
  }
}

const enFile = path.join(frontendDir, 'src', 'assets', 'i18n', 'en.json');
if (fs.existsSync(enFile)) {
  try {
    const en = JSON.parse(fs.readFileSync(enFile, 'utf-8'));
    if (!en[`lobby.${gameId}`]) en[`lobby.${gameId}`] = titleEn;
    if (!en[`seo.${gameId}.title`]) en[`seo.${gameId}.title`] = `Play ${titleEn} Online - Realtime 1v1 Battle | Puzzle PK`;
    if (!en[`seo.${gameId}.desc`]) en[`seo.${gameId}.desc`] = `Play ${titleEn} free online. Supports single player practice and realtime speed PK.`;
    if (!en[`game.${gameId}.seo_desc`]) en[`game.${gameId}.seo_desc`] = `<h2>About ${titleEn}</h2><p>${titleEn} is a classic puzzle game. Challenge your mind now!</p>`;
    fs.writeFileSync(enFile, JSON.stringify(en, null, 2), 'utf-8');
    console.log(`  ✓ 注入英文词条: en.json`);
  } catch (err) {
    console.warn(`  ⚠️ en.json 解析或写入警告:`, err.message);
  }
}

console.log(`
\x1b[32m✨ [Success] 新游戏 ${gameId} (${titleZh}) 基础骨架与所有端对端契约已全部自动组装完毕！\x1b[0m
下一步操作提示：
1. 编写具体游戏逻辑：在 \`src/app/features/games/${gameId}/store/${gameId}-engine.ts\` 中编写棋盘逻辑；
2. 运行单测验证：\`npx vitest run src/app/features/games/${gameId}/\`
3. 启动开发服务器调试：\`npm start\`，访问 \`/zh/games/${gameId}\` 即可体验！
`);
