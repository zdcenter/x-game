import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { AdService } from '../../../core/services/ad.service';
import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, inject, OnInit, OnDestroy, signal, effect, untracked, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { Drop2048Store } from './store/drop2048.store';
import { getDrop2048BlockStyle } from './store/drop2048-engine';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GamePlayerMiniHudComponent } from '../../../shared/components/game-player-mini-hud/game-player-mini-hud.component';
import { Drop2048BoardComponent } from './components/drop2048-board/drop2048-board.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { FloatingTextService } from '../../../core/services/floating-text.service';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-drop2048',
  standalone: true,
  imports: [GameSpectatingOverlayComponent, 
    CommonModule, 
    GameWaitingRoomComponent,
    GameResultOverlayComponent,
    GameStartingOverlayComponent,
    Drop2048BoardComponent,
    GamePlayerMiniHudComponent,
    GameToolbarComponent, GameLayoutComponent, GamePkHudComponent],
  providers: [Drop2048Store],
  templateUrl: './drop2048.component.html',
  styleUrls: ['./drop2048.component.css']
})
export class Drop2048Component extends BaseGameComponent implements OnInit, OnDestroy {
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => {
    const opps = this.store.opponents().map(opp => ({
      id: opp.id,
      score: opp.score || 0,
      status: opp.finished ? 'finished' : 'playing'
    }));
    const me = {
      id: this.playerId,
      score: this.store.score(),
      status: this.store.status() === GameStatus.Finished ? 'finished' : 'playing'
    };
    return [me, ...opps];
  });
  adService = inject(AdService);
  private authStore = inject(AuthStore);
  GameStatus = GameStatus;
  GameMode = GameMode;
  override store = inject(Drop2048Store);
  roomLifecycle!: RoomLifecycleHandle;
  private router = inject(Router);
  i18n = inject(I18nService);
  private gameRegistry = inject(GameRegistryService);
  private floatingText = inject(FloatingTextService);

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    return {
      id: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: true,
      score: this.store.score(),
      status: this.store.status() === GameStatus.Finished ? GameStatus.Finished : GameStatus.Playing,
      metrics: [
        { label: this.i18n.t('game.pk.score')() || '分', value: this.store.score(), icon: '⭐', colorClass: 'text-amber-500 font-bold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    return this.store.opponents().map(opp => {
      return {
        id: opp.id,
        nickname: opp.id,
        isHost: opp.id === this.store.hostId(),
        isMe: false,
        score: opp.score,
        status: opp.finished ? GameStatus.Finished : GameStatus.Playing,
        metrics: [
          { label: this.i18n.t('game.pk.score')() || '分', value: opp.score, icon: '⭐', colorClass: 'text-amber-500 font-bold' }
        ]
      };
    });
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return undefined;
    const oppId = this.opponentsPkStats()[0]?.id;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.playerId] || 0,
      opponent: wins[oppId] || 0
    };
  });

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  getModeName(): string {
    const mode = this.store.currentRoomMode();
    if (mode === GameMode.Single) return this.i18n.t('game.single_mode')();
    const key = this.gameRegistry.getModeLabel('drop2048', mode);
    return key ? this.i18n.t(key)() : mode;
  }

  getSubtitle(): string {
    return this.getModeName();
  }



  override get playerId(): string {
    return this.store.playerId();
  }

  view = signal<'lobby' | 'room' | 'play'>('lobby');
  showRules = signal(false);
  showOverlay = signal(false);
  currentRoomId = computed(() => this.wsService.gameState()?.roomId || '');

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'drop2048',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
    
    effect(() => {
      const status = this.store.status();
      const rawState = (this.store as any).rawState();
      
      untracked(() => {
        if (this.store.currentRoomMode() !== GameMode.Single) {
          if (status === GameStatus.Starting && rawState?.globalStartAt) {
            this.view.set('play');
            this.gameTimer.startCountdown();
          } else if (status === GameStatus.Playing) {
            this.view.set('play');
          } else if (status === GameStatus.Waiting) {
            this.view.set('room');
          } else if (status === GameStatus.Finished) {
            this.view.set('play');
          }
        } else {
          if (status === GameStatus.Playing || status === GameStatus.Finished) {
            this.view.set('play');
          }
        }
      });
    });

    effect((onCleanup) => {
      if (this.store.status() === GameStatus.Finished) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });

    effect(() => {
      const c = this.store.comboCount();
      if (c > 0) {
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;
        
        // try to get bounding rect of the game layout or board
        const boardEl = document.querySelector('app-drop2048-board');
        if (boardEl) {
           const rect = boardEl.getBoundingClientRect();
           x = rect.left + rect.width / 2;
           y = rect.top + Math.max(0, rect.height / 2 - 50);
        }

        this.floatingText.show(`🔥 COMBO ×${c + 1}!`, x, y, { size: 'lg', color: '#fbbf24' });
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();

    if (joinInfo) {
      if (joinInfo.mode !== GameMode.Single) {
        if (joinInfo.password) this.wsService.setPendingPassword(joinInfo.password);
        this.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host, joinInfo.target ?? 1);
      } else {
        this.view.set('play');
        this.store.joinRoom('single_room', GameMode.Single, GameDifficulty.Medium);
      }
    } else {
      // Create a single-player room without auto-starting
      this.onJoinSinglePlayer(GameDifficulty.Medium);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  onJoinSinglePlayer(diff: any) {
    this.view.set('play');
    this.store.joinRoom('single_room', GameMode.Single, diff);
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId?: string, target: number = 1) {
    this.isMobileSidebarOpen.set(false);
    this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, hostId);
    this.store.joinRoom(roomId, mode, difficulty, hostId, target);
    this.view.set('room');
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

  onRoomCreated() {
    this.view.set('room');
  }



  override openChangeSettings() {
    if (this.lobbyPanel && this.currentRoomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.currentRoomId(),
        game: 'drop2048',
        mode: this.store.currentRoomMode(),
        difficulty: '',
        host: this.store.hostId()
      });
    }
  }

  getResultTitle(): string {
    if (this.store.currentRoomMode() === GameMode.Single) {
      return 'game.game_over';
    }
    const winners = this.store.winners();
    if (winners.includes(this.playerId)) return 'game.you_win';
    return 'game.you_lose';
  }

  handleRevive() {
    this.store.reviveGame();
  }

  Math = Math;

  cellSize = computed(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 380) return 54;
    if (typeof window !== 'undefined' && window.innerWidth < 640) return 58;
    return 64;
  });

  getBlockStyle(val: number): Record<string, string> {
    return getDrop2048BlockStyle(val);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.store.status() !== GameStatus.Playing) return;

    const isLeft = event.code === 'ArrowLeft' || event.key === 'ArrowLeft' || event.code === 'KeyA' || event.key === 'a' || event.key === 'A';
    const isRight = event.code === 'ArrowRight' || event.key === 'ArrowRight' || event.code === 'KeyD' || event.key === 'd' || event.key === 'D';
    const isDown = event.code === 'ArrowDown' || event.key === 'ArrowDown' || event.code === 'KeyS' || event.key === 's' || event.key === 'S';
    const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Space';

    if (isLeft) {
      this.store.moveLeft();
      event.preventDefault();
      event.stopPropagation();
    } else if (isRight) {
      this.store.moveRight();
      event.preventDefault();
      event.stopPropagation();
    } else if (isDown) {
      this.store.softDrop();
      event.preventDefault();
      event.stopPropagation();
    } else if (isSpace) {
      this.store.hardDrop();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private touchStartX = 0;
  private touchStartY = 0;
  private lastProcessedX = 0;
  private lastProcessedY = 0;
  private touchStartTime = 0;
  private hasMoved = false;

  onTouchStart(e: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.lastProcessedX = this.touchStartX;
    this.lastProcessedY = this.touchStartY;
    this.touchStartTime = Date.now();
    this.hasMoved = false;
  }

  onTouchMove(e: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const dx = currentX - this.lastProcessedX;
    const dy = currentY - this.lastProcessedY;

    // Horizontal movement (switch columns)
    if (Math.abs(dx) > 26) {
      if (dx > 0) {
        this.store.moveRight();
      } else {
        this.store.moveLeft();
      }
      this.lastProcessedX = currentX;
      this.hasMoved = true;
    }

    // Vertical soft drop (only downwards)
    if (dy > 32) {
      this.store.softDrop();
      this.lastProcessedY = currentY;
      this.hasMoved = true;
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    const currentX = e.changedTouches[0].clientX;
    const currentY = e.changedTouches[0].clientY;
    const totalDy = currentY - this.touchStartY;
    const duration = Date.now() - this.touchStartTime;

    // Fast downward flick triggers hard drop
    if (!this.hasMoved && totalDy > 45 && duration < 280) {
      this.store.hardDrop();
    }
  }
}
