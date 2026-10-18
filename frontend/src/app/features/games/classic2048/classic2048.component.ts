import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { AdService } from '../../../core/services/ad.service';
import { computed, Component, inject, OnInit, OnDestroy, HostListener, ViewChild, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../core/auth/auth.store';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { Classic2048Store } from './store/classic2048.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameMode, GameStatus } from '../../../core/models/game.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SettingsService } from '../../../core/services/settings.service';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { GameStatsService } from '../../../core/services/game-stats.service';
import { boardSizePx } from '../../../core/utils/board-size.util';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { ToastService } from '../../../core/services/toast.service';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';

import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';
import { LeaderboardService } from '../../../core/services/leaderboard.service';

export type C2048Theme = 'classic' | 'neon' | 'glacier';

@Component({
  selector: 'app-classic2048',
  standalone: true,
  imports: [GameSpectatingOverlayComponent, 
    CommonModule,
    GameWaitingRoomComponent,
    GameResultOverlayComponent,
    GameStartingOverlayComponent,
    GameToolbarComponent, GameLayoutComponent, GamePkHudComponent],
  templateUrl: './classic2048.component.html',
  styleUrls: ['./classic2048.component.css'],
  providers: [Classic2048Store]
})
export class Classic2048Component extends BaseGameComponent implements OnInit, OnDestroy {
  private haptic = inject(HapticService);
  private leaderboardService = inject(LeaderboardService);
  worldRecord = signal<{ bestScore: number; username: string } | null>(null);
  Math = Math;
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => {
    return this.store.playersList().map(p => {
      const board = this.store.pkBoards()[p.id];
      return {
        id: p.id,
        score: board?.score || 0,
        status: board?.status || 'playing'
      };
    });
  });

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    let maxT = 0;
    const cells = this.store.cells();
    for (const row of cells) {
      for (const val of row) {
        if (val > maxT) maxT = val;
      }
    }

    return {
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: true,
      score: this.store.localScore(),
      status: this.store.status(),
      metrics: [
        ...(maxT > 0 ? [{ label: this.i18n.t('game.pk.max_tile')(), value: maxT, icon: '🏆', colorClass: 'text-amber-500 font-bold' }] : []),
        { label: this.i18n.t('game.pk.steps')(), value: this.store.localMoves(), icon: '🔄', colorClass: 'text-sky-500 font-semibold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return [];
    const room = this.store.room();
    const players = room?.players || [];
    const pkBoards = this.store.pkBoards();

    return this.store.playersList()
      .filter(p => p.id !== this.playerId)
      .map(p => {
        const pInfo = players.find((x: any) => x.id === p.id);
        const board = pkBoards[p.id];
        let maxT = 0;
        if (board?.cells) {
          for (const row of board.cells) {
            for (const val of row) {
              if (val > maxT) maxT = val;
            }
          }
        }
        return {
          id: p.id,
          playerId: p.id,
          nickname: pInfo?.nickname || p.id,
          avatar: pInfo?.avatar,
          isHost: p.id === this.store.hostId(),
          isMe: false,
          score: board?.score || 0,
          status: (board?.status as any) || this.store.status(),
          metrics: [
            ...(maxT > 0 ? [{ label: this.i18n.t('game.pk.max_tile')(), value: maxT, icon: '🏆', colorClass: 'text-amber-500 font-bold' }] : []),
          ]
        };
      });
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return undefined;
    const oppId = this.opponentsPkStats()[0]?.playerId;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.playerId] || 0,
      opponent: wins[oppId] || 0
    };
  });

  adService = inject(AdService);
  override store = inject(Classic2048Store);
  i18n = inject(I18nService);
  private statsService = inject(GameStatsService);
  authStore = inject(AuthStore);
  toastService = inject(ToastService);
  private audio = inject(AudioService);
  
  GameStatus = GameStatus;
  GameMode = GameMode;
  math = Math;

  showRules = signal(false);
  bestScore = signal<number>(0);
  scoreDelta = signal<number>(0);
  showDelta = signal<boolean>(false);
  currentTheme = signal<C2048Theme>('classic');
  private prevScore = 0;

  get playerId(): string { return this.authStore.currentUser()?.username || this.authStore.guestId; }

  private lifecycle!: RoomLifecycleHandle;

  timeSeconds = 0;
  private timerInterval: any;

  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;

  constructor() {
    super();
    this.lifecycle = setupRoomLifecycle({
      gameId: 'classic2048',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.lifecycle.clearReconnectInfo();
      },
    });

    if (typeof localStorage !== 'undefined') {
      const savedBest = localStorage.getItem('classic2048_best_score');
      if (savedBest) this.bestScore.set(parseInt(savedBest, 10) || 0);

      const savedTheme = localStorage.getItem('classic2048_theme') as C2048Theme;
      if (savedTheme && ['classic', 'neon', 'glacier'].includes(savedTheme)) {
        this.currentTheme.set(savedTheme);
      }
    }

    effect(() => {
      if (this.store.status() === GameStatus.Finished && this.store.currentRoomMode() === GameMode.Single) {
        this.submitScore();
      }
    });

    effect(() => {
      const s = this.store.status();
      if (s === GameStatus.Playing) {
        if (this.store.localMoves() === 0 && this.store.localScore() === 0) {
          this.timeSeconds = 0;
        }
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => { this.timeSeconds++; }, 1000);
      } else {
        clearInterval(this.timerInterval);
      }
    });

    effect(() => {
      const score = this.store.localScore();
      if (score > this.prevScore) {
        const delta = score - this.prevScore;
        this.scoreDelta.set(delta);
        this.showDelta.set(true);
        setTimeout(() => this.showDelta.set(false), 800);
        this.audio.playDrop2048('merge');

        if (score > this.bestScore()) {
          this.bestScore.set(score);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('classic2048_best_score', score.toString());
          }
        }
      } else if (score === 0) {
        this.prevScore = 0;
      }
      this.prevScore = score;
    });
  }

  setTheme(theme: C2048Theme) {
    this.currentTheme.set(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('classic2048_theme', theme);
    }
    this.audio.playClick();
  }

  get timeDisplay() {
    const m = Math.floor(this.timeSeconds / 60);
    const s = this.timeSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  override ngOnInit() {
    super.ngOnInit();

    this.leaderboardService.getWorldRecord('classic2048').subscribe(rec => {
      if (rec) this.worldRecord.set(rec);
    });

    const pending = this.lifecycle.consumePendingOrReconnect();
    if (pending) {
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host ?? '');
    } else {
      if (this.store.currentRoomMode() === GameMode.Single && this.store.status() === GameStatus.Waiting) {
        this.store.startGame();
      }
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  override handleJoinRoom(params: any) {
    super.handleJoinRoom(params);
    if (params.mode !== GameMode.Single) {
      this.lifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
  }

  override handleCreateRoom(params: any) {
    super.handleCreateRoom(params);
    if (params.mode !== GameMode.Single) {
      this.lifecycle.saveReconnectInfo(params.name, params.mode, params.difficulty, this.playerId);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.store.move('up');
        this.audio.playDrop2048('move');
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.store.move('down');
        this.audio.playDrop2048('move');
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.store.move('left');
        this.audio.playDrop2048('move');
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.store.move('right');
        this.audio.playDrop2048('move');
        event.preventDefault();
        break;
    }
  }

  // Swipe handling
  private touchStartX = 0;
  private touchStartY = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    const touchEndX = event.changedTouches[0].screenX;
    const touchEndY = event.changedTouches[0].screenY;
    
    const dx = touchEndX - this.touchStartX;
    const dy = touchEndY - this.touchStartY;
    
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return; // Ignore small movements
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) this.store.move('right');
      else this.store.move('left');
    } else {
      if (dy > 0) this.store.move('down');
      else this.store.move('up');
    }
    this.audio.playDrop2048('move');
    this.haptic.vibrateSwipe();
  }

  getTileClass(value: number): string {
    return value <= 2048 ? `tile-${value}` : 'tile-super';
  }

  getTileFontSize(value: number): string {
    if (value < 100) return '2rem';
    if (value < 1000) return '1.5rem';
    return '1.2rem';
  }

  getOverlayTitle(): string {
    const won = this.store.winners().includes(this.playerId);
    return won ? this.i18n.t('game.you_win')() : this.i18n.t('game.you_lose')();
  }

  submitScore() {
    if (this.store.currentRoomMode() === GameMode.Single) {
      this.statsService.submitStat('classic2048', {
        mode: GameMode.Single,
        difficulty: this.store.currentDifficulty(),
        score: this.store.localScore(),
        time: this.timeSeconds,
        won: true
      }).subscribe();
    }
  }

  handleRevive() {
    this.store.reviveGame();
  }
}
