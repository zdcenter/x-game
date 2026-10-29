import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { GameDifficulty, GameId, GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { C2SAction } from '../../../../core/models/websocket.model';
import { AudioService } from '../../../../core/services/audio.service';
import { LocalTilematchEngine, TileCard, TilematchAction } from './tilematch-engine';

@Injectable()
export class TilematchStore extends BaseGameStore {
  readonly gameId = GameId.Tilematch;
  private readonly audio = inject(AudioService);

  localEngine = signal<LocalTilematchEngine | null>(null);
  tick = signal<number>(0);

  // 动画与特效触发信号
  lastMatchEvent = signal<{ type: string; count: number; timestamp: number } | null>(null);

  // 基础数据计算信号
  localScore = computed(() => {
    this.tick();
    if (this.currentRoomMode() === GameMode.Single) {
      return this.localEngine()?.score ?? 0;
    }
    return this.localEngine()?.score ?? ((this.rawState() as any)?.players?.[this.playerId()]?.score ?? 0);
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
    return eng && eng.status === GameStatus.Finished && eng.isVictory ? [this.playerId()] : [];
  });

  readonly cards = computed<TileCard[]>(() => {
    this.tick();
    const raw = this.localEngine()?.cards ?? [];
    return raw.map(c => ({ ...c }));
  });

  readonly targetPlayerState = computed<any>(() => {
    if (this.currentRoomMode() === GameMode.Single) return null;
    const isSpec = this.isSpectator();
    const focus = this.focusedPlayerId();
    const myId = this.playerId();
    const raw = this.rawState() as any;
    const players = raw?.players;
    if (!players) return null;

    let targetId = '';
    if (isSpec) {
      if (focus) {
        targetId = focus;
      } else {
        const list = this.playersList();
        const opp = list.find((p: any) => p && p.id && p.id !== myId);
        targetId = opp ? opp.id : (list[0]?.id || '');
      }
    } else if (focus && focus !== myId) {
      targetId = focus;
    }

    if (!targetId || (!isSpec && targetId === myId)) return null;
    return (typeof players === 'object' && !Array.isArray(players))
      ? (players[targetId] || players[Object.keys(players).find(k => k.toLowerCase() === targetId.toLowerCase()) || ''])
      : (Array.isArray(players) ? players.find((x: any) => x?.id === targetId || x?.id?.toLowerCase() === targetId.toLowerCase()) : null);
  });

  readonly boardCards = computed<TileCard[]>(() => {
    this.tick();
    const tp = this.targetPlayerState();
    const all = this.cards();
    if (tp && tp.removedCards && Array.isArray(tp.removedCards)) {
      const removedSet = new Set<number>(tp.removedCards);
      return all.filter(c => !removedSet.has(c.id));
    }
    return all.filter(c => c.status === 'board');
  });

  readonly slotCards = computed<TileCard[]>(() => {
    this.tick();
    const tp = this.targetPlayerState();
    if (tp && tp.slotCards && Array.isArray(tp.slotCards)) {
      const all = this.cards();
      const cardMap = new Map<number, TileCard>(all.map(c => [c.id, c]));
      return tp.slotCards.map((id: number) => cardMap.get(id)).filter((c: TileCard | undefined): c is TileCard => !!c);
    }
    const raw = this.localEngine()?.slot ?? [];
    return raw.map(c => ({ ...c }));
  });

  readonly stashCards = computed<TileCard[]>(() => {
    this.tick();
    const raw = this.localEngine()?.stash ?? [];
    return raw.map(c => ({ ...c }));
  });

  readonly combo = computed<number>(() => {
    this.tick();
    return this.localEngine()?.combo ?? 0;
  });

  override readonly isVictory = computed<boolean>(() => {
    this.tick();
    if (this.currentRoomMode() === GameMode.Single) {
      return this.localEngine()?.isVictory ?? false;
    }
    const w = this.winners();
    if (w && w.length > 0) {
      return w.includes(this.playerId());
    }
    return this.localEngine()?.isVictory ?? false;
  });

  readonly stashUsed = computed<boolean>(() => {
    this.tick();
    return this.localEngine()?.stashUsed ?? false;
  });

  readonly undoRemaining = computed<number>(() => {
    this.tick();
    return this.localEngine()?.undoRemaining ?? 0;
  });

  readonly shuffleRemaining = computed<number>(() => {
    this.tick();
    return this.localEngine()?.shuffleRemaining ?? 0;
  });

  readonly totalCardsCount = computed<number>(() => {
    return this.cards().length;
  });

  readonly remainingCardsCount = computed<number>(() => {
    return this.cards().filter(c => c.status !== 'cleared').length;
  });

  readonly clearedCardsCount = computed<number>(() => {
    return this.cards().filter(c => c.status === 'cleared').length;
  });

  readonly progressPercent = computed<number>(() => {
    const total = this.totalCardsCount();
    if (total === 0) return 0;
    return Math.floor((this.clearedCardsCount() / total) * 100);
  });

  readonly slotNearFull = computed<boolean>(() => {
    return this.slotCards().length >= 5;
  });

  private readonly PROGRESS_KEY = 'xgame_tilematch_progress';

  // 无尽关卡与连胜状态
  readonly currentLevel = signal<number>(1);
  readonly highestLevel = signal<number>(1);
  readonly winStreak = signal<number>(0);

  private currentSeed: any = null;

  constructor() {
    super();
    this.loadProgress();

    // 联机 PK 模式：监听后端房间状态与下发的 cards/seed，实现确定性同构棋盘同步渲染与对决
    effect(() => {
      const state = this.rawState() as any;
      if (
        this.currentRoomMode() !== GameMode.Single &&
        state &&
        (state.status === GameStatus.Starting || state.status === GameStatus.Playing)
      ) {
        // 使用后端 seed 生成确定性 roundKey (在同一轮次中绝对恒定)
        const roundKey = state.seed ? String(state.seed) : (state.globalStartAt ? String(state.globalStartAt) : 'round');
        if (this.currentSeed !== roundKey) {
          this.currentSeed = roundKey;
          const engine = new LocalTilematchEngine();
          if (Array.isArray(state.cards) && state.cards.length > 0) {
            engine.loadCards(state.cards);
          } else {
            const seedNum = state.seed ? Math.abs(Number(state.seed) % 233280) : 123456;
            const diff = state.difficulty || GameDifficulty.Medium;
            const level = diff === GameDifficulty.Hard ? 27 : (diff === GameDifficulty.Easy ? 1 : 15);
            engine.initGame({ level, difficulty: diff, seed: seedNum });
          }
          this.currentLevel.set(engine.level || 15);
          this.localEngine.set(engine);
          this.lastMatchEvent.set(null);
          this.tick.update(t => t + 1);
        }
      }
    });
  }

  protected override onResetLocalGameState(): void {
    if (this.currentRoomMode() === GameMode.Single) {
      this.localEngine.set(null);
      this.currentSeed = null;
    } else {
      // 联机对战中：只在房间回到 Waiting 时重置种子，在 Starting/Playing 期间严禁重置 currentSeed，避免卡槽牌和对战棋盘被误清空
      const s = (this.rawState() as any)?.status;
      if (s === GameStatus.Waiting) {
        this.currentSeed = null;
        this.localEngine.set(null);
      }
    }
    this.lastMatchEvent.set(null);
  }

  startLocalGame(levelOrDiff?: number | string) {
    this.currentRoomMode.set(GameMode.Single);
    this.ws.disconnect(this.gameId);

    let level = this.currentLevel();
    if (typeof levelOrDiff === 'number') {
      level = Math.max(1, levelOrDiff);
      this.currentLevel.set(level);
    } else if (levelOrDiff === GameDifficulty.Medium) {
      level = 15; // 60 张
      this.currentLevel.set(level);
    } else if (levelOrDiff === GameDifficulty.Hard) {
      level = 27; // 96 张
      this.currentLevel.set(level);
    } else if (levelOrDiff === GameDifficulty.Easy) {
      level = 1; // 18 张
      this.currentLevel.set(level);
    }

    const engine = new LocalTilematchEngine();
    engine.initGame({ level });
    this.currentDifficulty.set(engine.difficulty);
    this.localEngine.set(engine);
    this.lastMatchEvent.set(null);
    this.tick.set(this.tick() + 1);
  }

  nextLevel() {
    const nextLvl = this.currentLevel() + 1;
    this.currentLevel.set(nextLvl);
    this.winStreak.update(s => s + 1);
    if (nextLvl > this.highestLevel()) {
      this.highestLevel.set(nextLvl);
    }
    this.saveProgress();
    this.startLocalGame(nextLvl);
  }

  restartCurrentLevel() {
    this.startLocalGame(this.currentLevel());
  }

  resetToLevelOne() {
    this.currentLevel.set(1);
    this.winStreak.set(0);
    this.saveProgress();
    this.startLocalGame(1);
  }

  private loadProgress() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(this.PROGRESS_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.currentLevel) this.currentLevel.set(Math.max(1, data.currentLevel));
          if (data.highestLevel) this.highestLevel.set(Math.max(1, data.highestLevel));
          if (data.winStreak) this.winStreak.set(Math.max(0, data.winStreak));
        }
      }
    } catch (e) {
      // ignore storage failure in strict env
    }
  }

  private saveProgress() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify({
          currentLevel: this.currentLevel(),
          highestLevel: this.highestLevel(),
          winStreak: this.winStreak(),
        }));
      }
    } catch (e) {
      // ignore
    }
  }

  override startGame() {
    super.startGame();
    if (this.currentRoomMode() === GameMode.Single) {
      this.startLocalGame(this.currentLevel());
    }
  }

  override restartGame() {
    super.restartGame();
    if (this.currentRoomMode() === GameMode.Single) {
      this.restartCurrentLevel();
    }
  }

  private syncPkProgress(eng: LocalTilematchEngine, prevScore: number) {
    if (this.currentRoomMode() !== GameMode.Single) {
      const delta = eng.score - prevScore;
      const progress = this.progressPercent();
      const finished = eng.status === GameStatus.Finished && eng.isVictory;
      const removedCards = eng.cards.filter(c => c.status !== 'board').map(c => c.id);
      const slotCards = eng.slot.map(c => c.id);
      this.ws.send({
        action: 'move',
        type: C2SAction.Move,
        delta,
        progress,
        finished,
        removedCards,
        slotCards
      });
    }
  }

  selectTile(cardId: number) {
    if (this.status() !== GameStatus.Playing) return;
    if (this.isSpectator()) return;

    const eng = this.localEngine();
    if (!eng) return;

    const card = eng.cards.find(c => c.id === cardId);
    if (!card || card.status !== 'board') return;

    if (card.isBlocked) {
      this.audio.playTileMatch('blocked');
      return;
    }

    if (eng.slot.length >= eng.SLOT_CAPACITY) {
      this.audio.playTileMatch('slot_full');
      return;
    }

    this.audio.playTileMatch('select');

    const prevScore = eng.score;
    const prevCombo = eng.combo;
    eng.handleAction({ type: 'select_tile', cardId });
    this.tick.set(this.tick() + 1);

    if (eng.combo > prevCombo && eng.lastMatchedType) {
      // 触发消除音效与多巴胺爆炸事件
      this.audio.playTileMatch('match', eng.combo);
      this.lastMatchEvent.set({
        type: eng.lastMatchedType,
        count: 3,
        timestamp: Date.now(),
      });
    } else if (eng.slot.length >= 5 && eng.status === GameStatus.Playing) {
      // 卡槽将满警示
      this.audio.playTileMatch('slot_full');
    }

    if (this.currentRoomMode() === GameMode.Single) {
      if (eng.status === GameStatus.Finished) {
        this.submitSingleStat({ score: eng.score, won: eng.isVictory }).subscribe();
      }
    } else {
      this.syncPkProgress(eng, prevScore);
    }
  }

  selectStashTile(cardId: number) {
    if (this.status() !== GameStatus.Playing) return;

    const eng = this.localEngine();
    if (!eng) return;

    if (eng.slot.length >= eng.SLOT_CAPACITY) {
      this.audio.playTileMatch('slot_full');
      return;
    }

    this.audio.playTileMatch('select');
    const prevScore = eng.score;
    const prevCombo = eng.combo;
    eng.handleAction({ type: 'select_stash_tile', cardId });
    this.tick.set(this.tick() + 1);

    if (eng.combo > prevCombo && eng.lastMatchedType) {
      this.audio.playTileMatch('match', eng.combo);
      this.lastMatchEvent.set({
        type: eng.lastMatchedType,
        count: 3,
        timestamp: Date.now(),
      });
    }

    if (this.currentRoomMode() === GameMode.Single) {
      if (eng.status === GameStatus.Finished) {
        this.submitSingleStat({ score: eng.score, won: eng.isVictory }).subscribe();
      }
    } else {
      this.syncPkProgress(eng, prevScore);
    }
  }

  useStash() {
    if (this.status() !== GameStatus.Playing) return;
    const eng = this.localEngine();
    if (!eng) return;

    if (eng.useStash()) {
      this.audio.playTileMatch('powerup');
      this.tick.set(this.tick() + 1);
    }
  }

  useUndo() {
    if (this.status() !== GameStatus.Playing) return;
    const eng = this.localEngine();
    if (!eng) return;

    if (eng.useUndo()) {
      this.audio.playTileMatch('powerup');
      this.tick.set(this.tick() + 1);
    }
  }

  useShuffle() {
    if (this.status() !== GameStatus.Playing) return;
    const eng = this.localEngine();
    if (!eng) return;

    if (eng.useShuffle()) {
      this.audio.playTileMatch('powerup');
      this.tick.set(this.tick() + 1);
    }
  }

  reviveGame(): boolean {
    if (this.currentRoomMode() === GameMode.Single) {
      const eng = this.localEngine();
      if (!eng) return false;
      if (eng.revive()) {
        this.audio.playTileMatch('powerup');
        this.tick.set(this.tick() + 1);
        return true;
      }
    }
    return false;
  }
}
