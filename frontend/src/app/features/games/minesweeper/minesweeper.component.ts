import { GameDifficulty, GameId, GameMode, GameResult, GameResultType, GameStatus } from '../../../core/models/game.model';
import { storageGet, storageSet } from '../../../core/utils/browser.util';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, NgZone, Renderer2, inject, effect, signal, computed, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { MinesweeperStore, CellState } from './store/minesweeper.store';
import { C2SAction } from '../../../core/models/websocket.model';
import { CellComponent } from './components/cell/cell.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AudioService } from '../../../core/services/audio.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameFrozenOverlayComponent } from '../../../shared/components/game-frozen-overlay/game-frozen-overlay.component';
import { GamePkModeBadgeComponent } from '../../../shared/components/game-pk-mode-badge/game-pk-mode-badge.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { HintButtonComponent } from '../../../shared/components/hint-button/hint-button.component';
import { FormsModule } from '@angular/forms';
import { TutorialOverlayComponent } from '../../../shared/components/tutorial-overlay/tutorial-overlay.component';
import { TutorialService } from '../../../core/services/tutorial.service';
import { GamePlayerMiniHudComponent } from '../../../shared/components/game-player-mini-hud/game-player-mini-hud.component';

@Component({
  selector: 'app-minesweeper',
  standalone: true,
  imports: [CommonModule, FormsModule, CellComponent, GameLobbyPanelComponent, GameResultOverlayComponent, GameWaitingRoomComponent, GameRulesModalComponent, DragDropModule, GameHeaderComponent, GameStartingOverlayComponent, PlayerBadgeComponent, PlayerListContainerComponent, HintButtonComponent, TutorialOverlayComponent, GamePlayerMiniHudComponent, GameFrozenOverlayComponent, GamePkModeBadgeComponent],
  providers: [MinesweeperStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './minesweeper.component.html',
  styleUrl: './minesweeper.component.css'
})
export class MinesweeperComponent extends BaseGameComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  Math = Math;
  store = inject(MinesweeperStore);
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  audioService = inject(AudioService);
  toastService = inject(ToastService);
  router = inject(Router);
  private gameRegistry = inject(GameRegistryService);
  private tutorialService = inject(TutorialService);
  private roomLifecycle!: RoomLifecycleHandle;

  showRules = signal(false);
  showTutorial = signal(false);
  tutorialSteps = this.tutorialService.getStepsForGame(GameId.Minesweeper);
  get playerId(): string { return this.authStore.currentUser()?.username || this.authStore.guestId; }
  currentRoomMode = signal<string>(GameMode.Single);
  currentRoomId = signal<string>('');
  currentDifficulty = signal<string>('medium');
  frozenRemaining = signal(0);
  
  showCustomDialog = signal(false);
  customW = signal(16);
  customH = signal(16);
  customM = signal(40);
  
  get predefinedDifficulties() {
    return this.gameRegistry.getConfig('minesweeper')?.difficulties || [];
  }

  hasLostSingleMode = computed(() => this.currentRoomMode() === GameMode.Single && this.store.board().some(row => row.some(c => c.state === 3)));

  isDefeat = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.hasLostSingleMode();
    if (this.currentRoomMode() === GameMode.Speed) return !this.hasWonSpeedMode();
    if (this.currentRoomMode() === GameMode.Steal) {
      const rawScores = this.store.scores();
      const myScore = rawScores[this.playerId] || 0;
      const otherScores = Object.keys(rawScores).filter(id => id !== this.playerId).map(id => rawScores[id]);
      const maxOtherScore = otherScores.length > 0 ? Math.max(...otherScores) : 0;
      return myScore < maxOtherScore;
    }
    return false;
  });

  @ViewChild('boardContainer') boardContainer!: ElementRef<HTMLDivElement>;
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;
  @ViewChild('board') board!: ElementRef<HTMLDivElement>;
  private ngZone = inject(NgZone);
  private renderer = inject(Renderer2);

  constructor() {
    super();

    effect(() => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        untracked(() => this.gameTimer.startCountdown());
      }
    });

    effect(() => {
      const status = this.store.status();
      const mode = this.currentRoomMode();

      // Elapsed timer logic
      if (status === GameStatus.Playing) {
        if (!this.elapsedInterval) {
          this.elapsedInterval = setInterval(() => {
            const startAt = this.store.startAt();
            if (startAt > 0) {
              const diffMs = Date.now() - startAt;
              const totalSec = Math.max(0, Math.floor(diffMs / 1000));
              this.elapsedSeconds.set(totalSec);
              const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
              const s = (totalSec % 60).toString().padStart(2, '0');
              this.elapsedTime.set(`${m}:${s}`);
            }
          }, 1000);
        }
      } else {
        if (this.elapsedInterval) {
          clearInterval(this.elapsedInterval);
          this.elapsedInterval = null;
        }
        if (status === GameStatus.Waiting || status === GameStatus.Starting) {
          this.elapsedTime.set('00:00');
          this.elapsedSeconds.set(0);
        }
      }
    });

    effect((onCleanup) => {
      const cooldowns = this.store.cooldowns();
      const until = cooldowns[this.playerId] || 0;
      const now = Date.now();
      let interval: any;
      if (until > now) {
        this.frozenRemaining.set(Math.ceil((until - now) / 1000));
        interval = setInterval(() => {
          const rem = Math.ceil((until - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(interval);
            this.frozenRemaining.set(0);
          } else {
            this.frozenRemaining.set(rem);
          }
        }, 200);
      } else {
        this.frozenRemaining.set(0);
      }

      onCleanup(() => {
        if (interval) clearInterval(interval);
      });
    });

    effect((onCleanup) => {
      const status = this.store.status();
      if (status === GameStatus.Finished) {
        if (this.isDefeat()) {
           this.audioService.playMinesweeper('explosion');
        } else {
           this.audioService.playMinesweeper('win');
        }
        
        const timer = setTimeout(() => {
          this.showOverlay.set(true);
        }, 1500); // 1.5 seconds delay
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });

    this.roomLifecycle = setupRoomLifecycle({
      gameId: GameId.Minesweeper,
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => {
        this.currentRoomId.set('');
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
        setTimeout(() => this.changeSingleDifficulty('medium'), 100);
      },
    });
  }

  isFrozen = computed(() => this.frozenRemaining() > 0);

  elapsedTime = signal<string>('00:00');
  elapsedSeconds = signal<number>(0);
  private elapsedInterval: any;
  
  showOverlay = signal(false);

  override ngOnInit() {
    super.ngOnInit(); // connects lobby WS
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      if (joinInfo.password) this.wsService.setPendingPassword(joinInfo.password);
      this.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host, joinInfo.target ?? 1);
    } else {
      const savedDiff = storageGet('minesweeper_single_diff') || 'easy';
      this.changeSingleDifficulty(savedDiff);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.wsService.disconnect(GameId.Minesweeper);
    this.gameTimer.stopCountdown();
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }

  override handleJoinRoom(event: { roomId: string, mode: string, difficulty: string, host: string, password?: string }) {
    if (this.currentRoomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
  }

  override handleCreateRoom(event: { name: string, mode: string, difficulty: string, password?: string }) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId?: string, target: number = 1) {
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.currentRoomId.set(roomId);
    this.isMobileSidebarOpen.set(false);
    this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, hostId);
    this.store.joinRoom(roomId, mode, difficulty, hostId, target);
  }




  getSubtitle(): string {
    return this.currentRoomMode() === GameMode.Steal ? this.i18n.t('game.same_pk_steal_label')() : (this.currentRoomMode() === GameMode.Speed ? this.i18n.t('game.same_pk_speed_label')() : this.i18n.t('game.single_label')());
  }



  handleCellReveal(cell: any) { this.store.revealCell(cell.x, cell.y); }
  handleCellFlag(cell: any) { this.store.toggleFlag(cell.x, cell.y); }

  override openChangeSettings() {
    if (this.lobbyPanel && this.currentRoomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.currentRoomId(),
        game: 'minesweeper',
        mode: this.currentRoomMode(),
        difficulty: this.currentDifficulty(),
        host: this.store.hostId()
      });
    }
  }

  isCustomDifficulty(): boolean {
    return this.currentDifficulty().startsWith('custom_');
  }

  customWidth(): string {
    return this.isCustomDifficulty() ? this.currentDifficulty().split('_')[1] : '';
  }

  customHeight(): string {
    return this.isCustomDifficulty() ? this.currentDifficulty().split('_')[2] : '';
  }

  customMines(): string {
    return this.isCustomDifficulty() ? this.currentDifficulty().split('_')[3] : '';
  }

  openCustomDialog() {
    this.showCustomDialog.set(true);
  }

  confirmCustomGame() {
    let w = this.customW();
    let h = this.customH();
    let m = this.customM();
    
    // Validate bounds
    w = Math.max(9, Math.min(50, w));
    h = Math.max(9, Math.min(50, h));
    const maxMines = Math.floor(w * h * 0.8);
    m = Math.max(10, Math.min(maxMines, m));
    
    this.showCustomDialog.set(false);
    const diffId = `custom_${w}_${h}_${m}`;
    this.changeSingleDifficulty(diffId);
  }

  changeSingleDifficulty(diff: string) {
    if (diff === 'custom') {
      this.openCustomDialog();
      return;
    }
    
    let width = 16, height = 16, mines = 40;
    if (diff.startsWith('custom_')) {
      const parts = diff.split('_');
      width = parseInt(parts[1], 10); height = parseInt(parts[2], 10); mines = parseInt(parts[3], 10);
    } else {
      switch (diff) {
        case 'easy': width = 9; height = 9; mines = 10; break;
        case 'medium': width = 16; height = 16; mines = 40; break;
        case 'hard': width = 30; height = 16; mines = 99; break;
        case 'expert': width = 30; height = 20; mines = 160; break;
        case 'master': width = 30; height = 24; mines = 230; break;
        default: 
          diff = 'medium'; 
          width = 16; height = 16; mines = 40; 
          break;
      }
    }
    
    this.currentDifficulty.set(diff);
    storageSet('minesweeper_single_diff', diff);
    this.currentRoomMode.set(GameMode.Single);
    this.store.startLocalGame(width, height, mines, diff);

    if (!this.tutorialService.hasSeen(GameId.Minesweeper) && this.tutorialSteps.length) {
      setTimeout(() => this.showTutorial.set(true), 500);
    }
  }

  onTutorialDone(): void {
    this.tutorialService.markSeen(GameId.Minesweeper);
    this.showTutorial.set(false);
  }

  getDifficultyText(difficulty: string): string {
    const d = this.predefinedDifficulties.find((x: any) => x.id === difficulty);
    return d ? `${this.i18n.t(d.labelKey as any)()} (${d.desc})` : difficulty;
  }

  getPlayerScores() {
    const scores = this.store.scores();
    const players = Object.keys(scores).map(id => ({ id, score: scores[id] }));

    // Sort logic: current player first, then others by score (descending)
    return players.sort((a, b) => {
      if (a.id === this.playerId) return -1;
      if (b.id === this.playerId) return 1;
      return b.score - a.score;
    });
  }

  hasWonSpeedMode(): boolean {
    const scores = this.store.scores();
    return scores[this.playerId] > 0;
  }

  getOverlayStatus(): GameResultType {
    if (this.currentRoomMode() === GameMode.Speed) {
      return this.hasWonSpeedMode() ? GameResult.Win : GameResult.Lose;
    }
    return this.isDefeat() ? GameResult.Lose : GameResult.Win;
  }

  getOverlayTitle(): string {
    const status = this.getOverlayStatus();
    if (this.currentRoomMode() !== GameMode.Single && !this.store.isSeriesOver()) {
      return status === GameResult.Win ? this.i18n.t('game.round_won')() : this.i18n.t('game.round_lost')();
    }
    if (status === GameResult.Win) {
      return this.currentRoomMode() === GameMode.Speed ? this.i18n.t('game.you_win')() : this.i18n.t('minesweeper.victory')();
    }
    return this.i18n.t('game.you_lose')();
  }

  getOverlaySubtitle(): string {
    if (this.currentRoomMode() !== GameMode.Single && !this.store.isSeriesOver()) {
      return this.store.pkScoreLabel();
    }
    if (this.currentRoomMode() === GameMode.Speed) {
      return this.hasWonSpeedMode() ? this.i18n.t('game.cleared_first')() : this.i18n.t('game.opponent_finished')();
    }
    if (this.isDefeat()) {
      return this.currentRoomMode() === GameMode.Single ? this.i18n.t('game.stepped_mine')() : this.i18n.t('game.steal_defeat')();
    }
    return this.currentRoomMode() === GameMode.Single ? this.i18n.t('minesweeper.cleared')() : this.i18n.t('game.steal_victory')();
  }

  getOverlayStats() {
    const stats: { label: string, value: string | number }[] = [];

    // Time spent is relevant for single and speed mode
    if (this.currentRoomMode() !== GameMode.Steal) {
      let timeStr = this.elapsedTime();
      if (this.currentRoomMode() === GameMode.Single) {
        const start = this.store.startAt();
        if (start > 0) {
          const diffMs = Date.now() - start;
          const totalSec = Math.max(0, Math.floor(diffMs / 1000));
          const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
          const s = (totalSec % 60).toString().padStart(2, '0');
          timeStr = `${m}:${s}`;
        }
      }
      if (timeStr && timeStr !== '00:00') {
        stats.push({ label: 'TIME', value: timeStr });
      }

      if (this.currentRoomMode() === GameMode.Single) {
        const best = this.store.bestTime();
        if (best > 0) {
          const m = Math.floor(best / 60).toString().padStart(2, '0');
          const s = (best % 60).toString().padStart(2, '0');
          stats.push({ label: 'BEST', value: `${m}:${s}` });
        }
      }
    }

    // Score (flags) is relevant for steal mode
    if (this.currentRoomMode() === GameMode.Steal) {
      const scores = this.store.scores();
      const myScore = scores[this.playerId] || 0;
      stats.push({ label: 'SCORE', value: myScore });
    }

    return stats;
  }

  formatBestTime(): string {
    const best = this.store.bestTime();
    if (best <= 0) return '00:00';
    const m = Math.floor(best / 60).toString().padStart(2, '0');
    const s = (best % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
