import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, inject, OnInit, OnDestroy, ViewChild, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { Math24Store } from './store/math24.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { Math24PkStealComponent } from './components/math24-pk-steal/math24-pk-steal.component';
import { Math24PkSpeedComponent } from './components/math24-pk-speed/math24-pk-speed.component';
import { Math24BoardComponent } from './components/math24-board/math24-board.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { Math24LobbyComponent } from './components/math24-lobby/math24-lobby.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { DailyChallengeService } from '../../../core/services/daily-challenge.service';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { TutorialOverlayComponent } from '../../../shared/components/tutorial-overlay/tutorial-overlay.component';
import { TutorialService } from '../../../core/services/tutorial.service';

import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';

@Component({
  selector: 'app-math24',
  standalone: true,
  imports: [
    CommonModule,
    GameLobbyPanelComponent,
    GameHeaderComponent,
    GameWaitingRoomComponent,
    Math24PkStealComponent,
    Math24PkSpeedComponent,
    Math24BoardComponent,
    GameResultOverlayComponent,
    Math24LobbyComponent,
    GameStartingOverlayComponent,
    PlayerBadgeComponent,
    GameRulesModalComponent,
    TutorialOverlayComponent,
  ],
  templateUrl: './math24.component.html'
})
export class Math24Component extends BaseGameComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  store = inject(Math24Store);
  private authStore = inject(AuthStore);
  private roomLifecycle!: RoomLifecycleHandle;
  private router = inject(Router);
  i18n = inject(I18nService);

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  private tutorialService = inject(TutorialService);
  private dailyService = inject(DailyChallengeService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private pendingDailyChallengeId = signal<string | null>(null);
  view = signal<'lobby' | 'room' | 'play'>('lobby');
  startingCountdown = signal(3);
  showRules = signal(false);
  showOverlay = signal(false);
  showTutorial = signal(false);
  tutorialSteps = this.tutorialService.getStepsForGame('math24');
  private countdownInterval: any;

  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'math24',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
    
    effect(() => {
      const result = this.store.lastStatResult();
      const challengeId = this.pendingDailyChallengeId();
      if (result && challengeId) {
        untracked(() => {
          this.dailyService.finish(0, this.store.timeSpent()).subscribe();
          this.pendingDailyChallengeId.set(null);
        });
      }
    });

    effect((onCleanup) => {
      const status = this.store.status();
      if (this.store.currentRoomMode() !== GameMode.Single) {
        if (status === GameStatus.Starting) {
          untracked(() => {
            this.view.set('play');
            this.startingCountdown.set(3);
            if (this.countdownInterval) clearInterval(this.countdownInterval);
            this.countdownInterval = setInterval(() => {
              this.startingCountdown.update(v => Math.max(1, v - 1));
            }, 1000);
          });
        } else if (status === GameStatus.Playing) {
          untracked(() => {
            this.view.set('play');
            if (this.countdownInterval) clearInterval(this.countdownInterval);
          });
        } else if (status === GameStatus.Waiting) {
          untracked(() => {
            this.view.set('room');
            if (this.countdownInterval) clearInterval(this.countdownInterval);
          });
        }
      }
      
      const isFin = this.store.isFinished() || this.store.status() === GameStatus.Finished;
      if (isFin) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();

    const qp = this.route.snapshot.queryParamMap;
    const dailyChallengeId = qp.get('dailyChallengeId');
    const puzzleId = qp.get('puzzleId');
    if (dailyChallengeId && puzzleId) {
      this.pendingDailyChallengeId.set(dailyChallengeId);
      this.http.get<any>(`${environment.apiUrl}/math24/puzzle/${puzzleId}`).subscribe(res => {
        if (res?.puzzle) {
          this.startLevel({
            id: res.puzzle.id,
            puzzle: res.puzzle.cards,
            difficulty: res.puzzle.difficulty ?? GameDifficulty.Easy,
            levelIndex: 0
          });
        }
      });
      return;
    }

    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      if (joinInfo.password) this.wsService.setPendingPassword(joinInfo.password);
      this.store.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '', joinInfo.target || 1);
      if (joinInfo.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '');
      }
      this.view.set('room');
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.store.leaveRoom();
  }

  returnToLobby() {
    this.store.leaveRoom();
    this.router.navigate(['/lobby']);
  }

  getSubtitle(): string {
    const v = this.view();
    if (v === 'lobby') {
      return this.i18n.t('lobby.select_level')();
    } else if (v === 'play' && this.store.currentRoomMode() === GameMode.Single) {
      return this.i18n.t('game.single_mode')();
    } else {
      return this.store.currentRoomMode() === GameMode.Speed ? this.i18n.t('game.speed_mode')() : this.i18n.t('game.steal_mode')();
    }
  }

  onHeaderBack(): void {
    if (this.view() === 'lobby') {
      this.router.navigate(['/']);
    } else if (this.view() === 'play' && this.store.currentRoomMode() === GameMode.Single) {
      this.view.set('lobby');
    } else {
      this.returnToLobby();
    }
  }

  override openChangeSettings() {
    if (this.lobbyPanel && this.store.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.store.roomId(),
        game: 'math24',
        mode: this.store.currentRoomMode(),
        difficulty: this.store.currentDifficulty(),
        host: this.store.hostId()
      });
    }
  }

  getGameResultStatus(): 'win' | 'lose' {
    if (this.store.currentRoomMode() === GameMode.Single) return 'win';
    const isWinner = this.store.winners().includes(this.playerId);
    return isWinner ? 'win' : 'lose';
  }

  getGameResultTitle(): string {
    if (this.store.currentRoomMode() === GameMode.Single) return this.i18n.t('game.win')();
    const isWinner = this.store.winners().includes(this.playerId);
    return isWinner ? this.i18n.t('game.win')() : this.i18n.t('game.lose')();
  }

  getStats(): { label?: string; icon?: string; value: string | number }[] {
    if (this.store.currentRoomMode() === GameMode.Single) {
      const time = this.store.timeSpent();
      const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };
      return [
        { label: this.i18n.t('game.level')(), value: this.store.localLevelIndex() + 1 },
        { icon: '⏱️', value: formatTime(time) }
      ];
    }
    const myPlayer = this.store.players()[this.playerId];
    if (myPlayer) {
      if (this.store.currentRoomMode() === GameMode.Steal) {
        return [{ label: 'Score', value: myPlayer.score || 0 }];
      } else {
        return [{ label: 'Solved', value: myPlayer.progress || 0 }];
      }
    }
    return [];
  }

  playNextLevel() {
    this.store.loadNextLevel();
  }

  playAgain() {
    if (this.store.currentRoomMode() === GameMode.Single) {
      this.playNextLevel();
    } else {
      this.store.restartGame();
    }
  }

  startLevel(event: { id: string, puzzle: string, difficulty: string, levelIndex: number }) {
    this.view.set('play');
    this.store.startSinglePlayer(event.id, event.puzzle, event.difficulty, event.levelIndex);
    if (!this.tutorialService.hasSeen('math24') && this.tutorialSteps.length) {
      setTimeout(() => this.showTutorial.set(true), 500);
    }
  }

  onTutorialDone(): void {
    this.tutorialService.markSeen('math24');
    this.showTutorial.set(false);
  }

  override handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string}) {
    super.handleCreateRoom(event);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(this.store.roomId() || event.name, event.mode, event.difficulty, this.playerId);
    }
    this.view.set("room");
  }

  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string; password?: string }) {
    super.handleJoinRoom(params);
    if (params.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
    this.view.set('room');
  }
  
  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

}
