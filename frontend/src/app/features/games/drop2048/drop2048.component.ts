import { Component, inject, OnInit, OnDestroy, signal, effect, untracked, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { Drop2048Store } from './store/drop2048.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { Drop2048BoardComponent } from './components/drop2048-board/drop2048-board.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';

@Component({
  selector: 'app-drop2048',
  standalone: true,
  imports: [
    CommonModule, 
    GameLobbyPanelComponent, 
    GameHeaderComponent,
    GameWaitingRoomComponent,
    GameResultOverlayComponent,
    GameStartingOverlayComponent,
    PlayerBadgeComponent,
    Drop2048BoardComponent,
    GameRulesModalComponent,
    PlayerListContainerComponent
  ],
  providers: [Drop2048Store],
  templateUrl: './drop2048.component.html'
})
export class Drop2048Component extends BaseGameComponent implements OnInit, OnDestroy {
  store = inject(Drop2048Store);
  roomLifecycle!: RoomLifecycleHandle;
  private router = inject(Router);
  i18n = inject(I18nService);
  private crossGameJoin = inject(CrossGameJoinService);
  private gameRegistry = inject(GameRegistryService);

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  getModeName(): string {
    const mode = this.store.currentMode();
    if (mode === 'single') return this.i18n.t('game.single_mode')();
    const key = this.gameRegistry.getModeLabel('drop2048', mode);
    return key ? this.i18n.t(key)() : mode;
  }

  get playerId(): string {
    return this.store.playerId;
  }

  view = signal<'lobby' | 'room' | 'play'>('lobby');
  showRules = signal(false);
  showOverlay = signal(false);
  currentRoomId = computed(() => this.store.roomId());

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'drop2048',
      getCurrentMode: () => this.store.currentMode(),
      onLeaveRoom: () => {
        this.store.leaveGame();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
    
    effect(() => {
      const status = this.store.status();
      const rawState = (this.store as any).rawState();
      
      untracked(() => {
        if (this.store.currentMode() !== 'single') {
          if (status === 'starting' && rawState?.globalStartAt) {
            this.view.set('play');
            this.gameTimer.startCountdown();
            this.store.resetForPK();
          } else if (status === 'playing') {
            this.view.set('play');
            if (this.store.board().length === 0) {
                this.store.spawnBlock();
            }
          } else if (status === 'waiting') {
            this.view.set('room');
          } else if (status === 'finished') {
            this.view.set('play');
          }
        } else {
          if (status === 'playing' || status === 'finished') {
            this.view.set('play');
          }
        }
      });
    });

    effect((onCleanup) => {
      if (this.store.status() === 'finished') {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    const pendingCrossJoin = this.crossGameJoin.consumePendingJoin('drop2048');

    if (pendingCrossJoin) {
      if (pendingCrossJoin.password) this.wsService.setPendingPassword(pendingCrossJoin.password);
      this.joinRoom(pendingCrossJoin.roomId, pendingCrossJoin.mode, pendingCrossJoin.difficulty, pendingCrossJoin.host);
    } else if (joinInfo) {
      if (joinInfo.mode !== 'single') {
        if (joinInfo.password) this.wsService.setPendingPassword(joinInfo.password);
        this.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host);
      } else {
        this.view.set('play');
      }
    } else {
      // Create a single-player room without auto-starting
      this.onJoinSinglePlayer('standard');
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveGame();
  }

  onJoinSinglePlayer(diff: any) {
    this.view.set('play');
    this.store.joinGame('single_room', this.playerId, 'single', diff);
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId?: string) {
    this.isMobileSidebarOpen.set(false);
    this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, hostId);
    this.store.joinGame(roomId, this.playerId, mode, difficulty, hostId);
    this.view.set('room');
  }

  override handleJoinRoom(event: { roomId: string, mode: string, difficulty: string, host: string, password?: string }) {
    if (this.store.roomId() === event.roomId) return;
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

  onLeaveClick() {
    if (this.store.currentMode() === 'single') {
      this.router.navigate(['/lobby']);
    } else {
      if (this.store.host() === this.playerId) {
        this.store.dismissRoom();
      } else {
        this.store.leaveGame();
      }
      this.roomLifecycle.clearReconnectInfo();
      this.router.navigate(['/lobby']);
    }
  }

  openChangeSettings() {
    if (this.lobbyPanel && this.store.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.store.roomId(),
        game: 'drop2048',
        mode: this.store.currentMode(),
        difficulty: this.store.localDifficulty(),
        host: this.store.host()
      });
    }
  }

  getResultTitle(): string {
    if (this.store.currentMode() === 'single') {
      return 'game.game_over';
    }
    const winners = this.store.winners();
    if (winners.includes(this.store.playerId)) return 'game.you_win';
    return 'game.you_lose';
  }
}
