import { Injectable, computed, signal, effect, inject } from '@angular/core';
import { BaseGameStore } from '../../../../core/store/base-game.store';
import { GameMode, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { HashiEngine } from '../hashi-engine';
import { ToastService } from '../../../../core/services/toast.service';
import { AudioService } from '../../../../core/services/audio.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { AdService } from '../../../../core/services/ad.service';

@Injectable()
export class HashiStore extends BaseGameStore {
  readonly gameId = 'hashi';
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private audio = inject(AudioService);
  private i18n = inject(I18nService);
  private adService = inject(AdService);

  // 本地引擎
  engine = new HashiEngine();

  // 状态信号
  boardGrid = signal<number[][]>([]);
  bridges = signal<any[]>([]);
  potentialBridges = signal<any[]>([]);
  islands = signal<any[]>([]);
  
  localStatus = signal<GameStatusType>(GameStatus.Waiting);
  currentPuzzleId = signal<string>('');
  currentPuzzleContent = signal<string>('');
  localLevelIndex = signal<number>(0);
  timeSpent = signal<number>(0);

  private timer: any;

  readonly singlePlayerStatus = computed(() => this.localStatus());
  override readonly singlePlayerWinners = computed(() => []);
  override readonly singlePlayerList = computed(() => [{ id: this.playerId() }]);

  readonly opponentProgress = computed<Record<string, number>>(() => {
    if (this.currentRoomMode() === GameMode.Single) return {};
    const st = this.rawState() as any;
    if (!st || !st.players) return {};
    const res: Record<string, number> = {};
    for (const id in st.players) {
      if (id !== this.playerId()) {
        res[id] = st.players[id].progress;
      }
    }
    return res;
  });

  constructor() {
    super();

    effect(() => {
      const st = this.rawState() as any;
      if (this.currentRoomMode() === GameMode.Single || !st) return;
      
      const newStatus = st.status;
      if (newStatus === GameStatus.Playing && this.localStatus() !== GameStatus.Playing) {
        // Initialize from server puzzle
        if (st.puzzle && st.puzzle !== this.currentPuzzleContent()) {
          this.currentPuzzleContent.set(st.puzzle);
          const parsed = JSON.parse(st.puzzle);
          this.engine.initGame(parsed.grid || parsed.islands || parsed);
          this.syncEngineToState();
        }
        this.localStatus.set(GameStatus.Playing);
        this.isFinishing = false;
        this.timeSpent.set(0);
        this.startTimer();
      } else if (newStatus === GameStatus.Waiting) {
        this.localStatus.set(GameStatus.Waiting);
        this.stopTimer();
      } else if (newStatus === GameStatus.Starting) {
        this.localStatus.set(GameStatus.Starting);
      } else if (newStatus === GameStatus.Finished) {
        this.localStatus.set(GameStatus.Finished);
        this.stopTimer();
      }
    });
  }

  // 开始单机关卡
  startSinglePlayer(puzzleId: string, content: string, difficulty: string, levelIndex: number) {
    this.joinRoom('single-room', GameMode.Single, difficulty, this.playerId());
    this.currentPuzzleId.set(puzzleId);
    this.currentPuzzleContent.set(content);
    this.localLevelIndex.set(levelIndex);
    this.timeSpent.set(0);
    this.isFinishing = false;
    this.localStatus.set(GameStatus.Playing);

    const parsed = JSON.parse(content);
    this.engine.initGame(parsed.grid);
    this.syncEngineToState();

    this.startTimer();
  }

  private startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeSpent.update(v => v + 1);
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
  }

  private isFinishing = false;

  toggleBridge(r1: number, c1: number, r2: number, c2: number) {
    if (this.localStatus() !== GameStatus.Playing || this.isFinishing) return;
    
    this.engine.toggleBridge(r1, c1, r2, c2);
    this.syncEngineToState();

    if (this.engine.isSolved()) {
      this.isFinishing = true;
      this.stopTimer();
      
      setTimeout(() => {
        this.localStatus.set(GameStatus.Finished);
        this.isFinishing = false;
        
        // 提交到后端 (单机模式)
        if (this.currentRoomMode() === GameMode.Single) {
          this.http.post<{ isNewRecord: boolean }>(`${environment.apiUrl}/hashi/puzzle/${this.currentPuzzleId()}/finish`, {
            time_spent: this.timeSpent(),
            stars: 3,
            difficulty: this.currentDifficulty()
          }).subscribe();
        } else {
          // PK 模式直接告诉服务器我完成了
          this.submitPKFinish();
        }
      }, 500); 
    }
  }

  applyHint() {
    if (this.localStatus() !== GameStatus.Playing) return;

    const move = this.engine.getHintMove();
    if (!move) {
      this.toast.show(this.i18n.t('game.no_hint_available')() || 'No simple hint available', 'info');
      return;
    }

    this.adService.showRewardedAd(() => {
      this.audio.playSudoku('success'); // Play a success sound
      
      // Since toggleBridge cycles 0 -> 1 -> 2 -> 0, we can calculate how many clicks are needed
      const clicks = (move.targetCount - move.currentCount + 3) % 3;
      
      for (let i = 0; i < clicks; i++) {
        this.toggleBridge(move.r1, move.c1, move.r2, move.c2);
      }
      this.toast.show(this.i18n.t('game.hint_applied')() || 'Hint applied!', 'success');
    });
  }

  private syncEngineToState() {
    this.boardGrid.set([...this.engine.grid]);
    this.bridges.set([...this.engine.bridges]);
    this.potentialBridges.set([...this.engine.potentialBridges]);
    this.islands.set([...this.engine.islands]);
    
    // Broadcast progress in PK mode
    if (this.currentRoomMode() !== GameMode.Single && this.localStatus() === GameStatus.Playing) {
      this.ws.send({ action: 'progress', progress: this.bridges().length });
    }
  }

  // Submit to PK backend
  submitPKFinish() {
    this.ws.send({ action: 'finish', board: 'verified' });
  }

  override extractPKStatPayload() {
    return {
      score: this.bridges().length,
      time: this.timeSpent()
    };
  }

  override leaveRoom() {
    super.leaveRoom();
    this.stopTimer();
    this.localStatus.set(GameStatus.Waiting);
  }
}
