import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, effect, untracked, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SudokuStore } from './store/sudoku.store';
import { SudokuLobbyComponent } from './components/sudoku-lobby/sudoku-lobby.component';
import { SudokuBoardComponent } from './components/sudoku-board/sudoku-board.component';
import { SudokuNumpadComponent } from './components/sudoku-numpad/sudoku-numpad.component';
import { SudokuToolsComponent } from './components/sudoku-tools/sudoku-tools.component';
import { SudokuRoomComponent } from './components/sudoku-room/sudoku-room.component';
import { SudokuPkStealComponent } from './components/sudoku-pk-steal/sudoku-pk-steal.component';
import { SudokuPkSpeedComponent } from './components/sudoku-pk-speed/sudoku-pk-speed.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { AudioService } from '../../../core/services/audio.service';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { TutorialOverlayComponent } from '../../../shared/components/tutorial-overlay/tutorial-overlay.component';
import { TutorialService } from '../../../core/services/tutorial.service';
import { DailyChallengeService } from '../../../core/services/daily-challenge.service';

import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';

@Component({
  selector: 'app-sudoku',
  standalone: true,
  imports: [
    CommonModule, 
    SudokuLobbyComponent, 
    SudokuBoardComponent, 
    SudokuNumpadComponent,
    SudokuToolsComponent,
    SudokuRoomComponent,
    SudokuPkStealComponent,
    SudokuPkSpeedComponent,
    GameResultOverlayComponent,
    GameLobbyPanelComponent,
    GameHeaderComponent,
    PlayerBadgeComponent,
    TutorialOverlayComponent
  ],
  providers: [SudokuStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sudoku.component.html',
  styleUrl: './sudoku.component.css'})
export class SudokuComponent extends BaseGameComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  store = inject(SudokuStore);
  router = inject(Router);
  http = inject(HttpClient);
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  private roomLifecycle!: RoomLifecycleHandle;
  private gameRegistry = inject(GameRegistryService);
  private tutorialService = inject(TutorialService);
  private dailyService = inject(DailyChallengeService);
  private route = inject(ActivatedRoute);
  private pendingDailyChallengeId = signal<string | null>(null);
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;

  view = this.store.view;
  showOverlay = signal(false);
  showTutorial = signal(false);
  tutorialSteps = this.tutorialService.getStepsForGame('sudoku');
  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  constructor() {
    super();

    // Watch for countdown trigger
    effect((onCleanup) => {
      const status = this.store.gameStatus();
      if (status === GameStatus.Starting) {
        untracked(() => this.gameTimer.startCountdown());
      }
      
      const isFin = this.store.isFinished() || status === GameStatus.Finished;
      if (isFin) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
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

    // Room lifecycle: cross-game join, reconnect, room dismissed handling
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'sudoku',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
  }

  override ngOnInit() {
    super.ngOnInit(); // connects lobby WS
    this.view.set('lobby');

    const qp = this.route.snapshot.queryParamMap;
    const dailyChallengeId = qp.get('dailyChallengeId');
    const puzzleId = qp.get('puzzleId');
    if (dailyChallengeId && puzzleId) {
      this.pendingDailyChallengeId.set(dailyChallengeId);
      this.http.get<any>(`${environment.apiUrl}/sudoku/puzzle/${puzzleId}`).subscribe(res => {
        if (res?.puzzle) {
          this.startLevel({
            id: res.puzzle.id,
            puzzle: res.puzzle.puzzle,
            solution: res.puzzle.solution,
            savedState: res.progress?.current_state,
            timeSpent: res.progress?.time_spent || 0
          });
        }
      });
      return;
    }

    // Check for cross-game join or reconnect
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      if (joinInfo.password) this.wsService.setPendingPassword(joinInfo.password);
      this.store.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '', joinInfo.target ?? 1);
      if (joinInfo.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '');
      }
    }
  }
  getSinglePlayerStats() {
    const stats: any[] = [
      { icon: '⏱️', value: this.gameTimer.formatTime(this.store.timeSpent()) }
    ];
    const best = this.store.bestTime();
    if (best > 0) {
      stats.push({ label: 'BEST', value: this.gameTimer.formatTime(best) });
    }
    return stats;
  }


  override handleJoinRoom(event: { roomId: string, mode: string, difficulty: string, host: string, password?: string }) {
    if (this.store.roomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(event.roomId, event.mode, event.difficulty, event.host);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleCreateRoom(event: { name: string, mode: string, difficulty: string, password?: string }) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(event.name, event.mode, event.difficulty, this.playerId);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  override ngOnDestroy() {
    this.wsService.disconnect('sudoku');
    this.gameTimer.stopCountdown();
    this.store.destroy();
  }

  goBackToLobby() {
    this.store.pauseAndSave();
    this.store.view.set('lobby');
  }

  openChangeSettings() {
    if (this.lobbyPanel && this.store.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.store.roomId(),
        game: 'sudoku',
        mode: this.store.currentRoomMode(),
        difficulty: '',
        host: this.store.hostId()
      });
    }
  }

  startLevel(level: {id: string, puzzle: string, solution?: string, savedState?: string, timeSpent?: number}) {
    this.view.set('play');
    this.store.currentPuzzleId.set(level.id);
    this.store.initBoard(level.puzzle, level.solution, level.savedState, level.timeSpent);
    if (!this.tutorialService.hasSeen('sudoku') && this.tutorialSteps.length) {
      setTimeout(() => this.showTutorial.set(true), 500);
    }
  }

  onTutorialDone(): void {
    this.tutorialService.markSeen('sudoku');
    this.showTutorial.set(false);
  }

  playNextLevel() {
    const currentId = this.store.currentPuzzleId();
    if (!currentId) return;
    const match = currentId.match(/^(.*)-(\d+)$/);
    if (!match) {
      this.store.view.set('lobby');
      return;
    }
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    const nextId = `${prefix}-${nextNum.toString().padStart(numStr.length, '0')}`;
    
    this.http.get<any>(`${environment.apiUrl}/sudoku/puzzle/${nextId}`).subscribe({
      next: (res) => {
        this.store.currentPuzzleId.set(res.puzzle.id);
        this.store.initBoard(res.puzzle.puzzle, res.puzzle.solution, res.progress?.current_state, res.progress?.time_spent);
      },
      error: () => {
        // Next level doesn't exist, back to lobby
        (this.store as any).toast.show(this.i18n.t('lobby.coming_soon')(), 'info');
        this.store.view.set('lobby');
      }
    });
  }
}
