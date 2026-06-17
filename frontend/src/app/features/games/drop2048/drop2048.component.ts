import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
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
  GameStatus = GameStatus;
  GameMode = GameMode;
  override store = inject(Drop2048Store);
  roomLifecycle!: RoomLifecycleHandle;
  private router = inject(Router);
  i18n = inject(I18nService);
  private crossGameJoin = inject(CrossGameJoinService);
  private gameRegistry = inject(GameRegistryService);

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  getModeName(): string {
    const mode = this.store.currentRoomMode();
    if (mode === GameMode.Single) return this.i18n.t('game.single_mode')();
    const key = this.gameRegistry.getModeLabel('drop2048', mode);
    return key ? this.i18n.t(key)() : mode;
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
  }

  override ngOnInit() {
    super.ngOnInit();
    
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    const pendingCrossJoin = this.crossGameJoin.consumePendingJoin('drop2048');

    if (pendingCrossJoin) {
      if (pendingCrossJoin.password) this.wsService.setPendingPassword(pendingCrossJoin.password);
      this.joinRoom(pendingCrossJoin.roomId, pendingCrossJoin.mode, pendingCrossJoin.difficulty, pendingCrossJoin.host);
    } else if (joinInfo) {
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

  onLeaveClick() {
    if (this.store.currentRoomMode() === GameMode.Single) {
      this.store.leaveRoom();
      this.router.navigate(['/lobby']);
    } else {
      if (this.store.hostId() === this.playerId) {
        this.store.dismissRoom();
      } else {
        this.store.leaveRoom();
      }
      this.roomLifecycle.clearReconnectInfo();
      this.router.navigate(['/lobby']);
    }
  }

  openChangeSettings() {
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
}
