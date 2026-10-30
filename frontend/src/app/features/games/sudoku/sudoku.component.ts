import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, effect, untracked, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SudokuStore } from './store/sudoku.store';
import { SudokuLobbyComponent, sudokuDifficulties } from './components/sudoku-lobby/sudoku-lobby.component';
import { SudokuBoardComponent } from './components/sudoku-board/sudoku-board.component';
import { SudokuNumpadComponent } from './components/sudoku-numpad/sudoku-numpad.component';
import { SudokuToolsComponent } from './components/sudoku-tools/sudoku-tools.component';
import { SudokuPkStealComponent } from './components/sudoku-pk-steal/sudoku-pk-steal.component';
import { SudokuPkSpeedComponent } from './components/sudoku-pk-speed/sudoku-pk-speed.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { AudioService } from '../../../core/services/audio.service';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { FormsModule } from '@angular/forms';
import { GamePkModeBadgeComponent } from '../../../shared/components/game-pk-mode-badge/game-pk-mode-badge.component';
import { DailyChallengeService } from '../../../core/services/daily-challenge.service';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { DeviceService } from '../../../core/services/device.service';
import { CoinService } from '../../../core/services/coin.service';
import { CoinGuideService } from '../../../core/services/coin-guide.service';
import { ZenModeService } from '../../../core/services/zen-mode.service';
import { PwaService } from '../../../core/services/pwa.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { CoinIconComponent } from '../../../shared/components/coin-icon/coin-icon.component';
import { ElementRef, HostListener } from '@angular/core';

import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';

import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';

@Component({
  selector: 'app-sudoku',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    SudokuLobbyComponent, 
    SudokuBoardComponent, 
    SudokuNumpadComponent,
    SudokuToolsComponent,
    SudokuPkSpeedComponent,
    GameLayoutComponent,
    GameHandheldHeaderComponent
  ],
  providers: [SudokuStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sudoku.component.html',
  styleUrl: './sudoku.component.css'})
export class SudokuComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(SudokuStore);
  http = inject(HttpClient);
  coinService = inject(CoinService);
  coinGuideService = inject(CoinGuideService);
  zenService = inject(ZenModeService);
  pwaService = inject(PwaService);
  feedbackService = inject(FeedbackService);
  private elementRef = inject(ElementRef);

  getDifficultyLabel(diff: string): string {
    const item = this.sudokuDifficulties.find(d => d.id === diff);
    return item ? (this.i18n.t(item.labelKey as any)() || item.id) : diff;
  }

  private roomLifecycle!: RoomLifecycleHandle;
  private dailyService = inject(DailyChallengeService);
  private route = inject(ActivatedRoute);
  private pendingDailyChallengeId = signal<string | null>(null);
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;
  @ViewChild(SudokuLobbyComponent) sudokuLobby?: SudokuLobbyComponent;

  readonly activeDifficulty = signal<string>(getSavedDifficulty('sudoku', GameDifficulty.Easy));

  sudokuDifficulties = sudokuDifficulties;

  view = this.store.view;

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
        if (this.store.isVictory()) {
          this.celebrateVictory();
        }
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

    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      this.view.set('room');
      if (joinInfo.isCreate) {
        this.handleCreateRoom(joinInfo);
      } else {
        this.handleJoinRoom(joinInfo);
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

  currentDifficulty() {
    if (this.store.currentRoomMode() === GameMode.Single) {
      return this.activeDifficulty();
    }
    const rState = this.store.rawState() as any;
    if (rState && rState.difficulty) {
      return rState.difficulty;
    }
    return this.activeDifficulty();
  }

  changeSingleDifficulty(diff: string) {
    this.activeDifficulty.set(diff);
    this.store.currentDifficulty.set(diff);
    setSavedDifficulty('sudoku', diff);
    if (this.store.currentRoomMode() !== GameMode.Single || this.store.roomId()) {
      return;
    }
    if (this.view() === 'lobby') {
      if (this.sudokuLobby?.activeTab() !== diff) {
        this.sudokuLobby?.selectDifficulty(diff);
      }
      return;
    }
    // Find next unsolved level for this diff
    this.http.get<any[]>(`${environment.apiUrl}/sudoku/levels/${diff}`).subscribe({
      next: (levels) => {
        let nextLevel = levels.find(l => l.progress?.status !== 'completed');
        if (!nextLevel && levels.length > 0) {
          nextLevel = levels[0];
        }
        if (nextLevel) {
          this.http.get<any>(`${environment.apiUrl}/sudoku/puzzle/${nextLevel.id}`).subscribe(res => {
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
        }
      }
    });
  }

  override handleJoinRoom(event: any) {
    if (this.store.roomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    const action = event.isSpectator ? 'spectate' : 'join';
    this.wsService.setPendingAction(action);
    this.view.set('room');
    this.store.joinRoom(
      event.roomId,
      event.mode,
      event.difficulty,
      event.host,
      event.target ?? 1,
      event.password || '',
      event.bountyCoins || 0,
      event.isSpectator || false
    );
    if (event.mode !== GameMode.Single && !event.isSpectator) {
      this.roomLifecycle.saveReconnectInfo(event.roomId, event.mode, event.difficulty, event.host);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleCreateRoom(event: any) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.wsService.setPendingAction('create');
    const roomId = event.name || event.roomId;
    this.view.set('room');
    this.store.joinRoom(
      roomId,
      event.mode,
      event.difficulty,
      this.playerId,
      event.target ?? 1,
      event.password || '',
      event.bountyCoins || 0,
      false
    );
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(roomId, event.mode, event.difficulty, this.playerId);
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

  getSubtitle(): string {
    const v = this.view();
    if (v === 'lobby') {
      return this.i18n.t('lobby.select_level')();
    } else if (v === 'play' && this.store.currentRoomMode() === GameMode.Single) {
      return this.i18n.t('game.single_label')() + ' - ' + this.store.currentPuzzleId();
    } else {
      return this.i18n.t('game.sudoku_same_pk_speed_label')();
    }
  }

  override goBack(): void {
    if (this.view() === 'lobby') {
      super.goBack();
    } else if (this.view() === 'play' && this.store.currentRoomMode() === GameMode.Single) {
      this.goBackToLobby();
    } else {
      super.goBack();
    }
  }

  startLevel(level: {id: string, puzzle: string, solution?: string, savedState?: string, timeSpent?: number}) {
    this.view.set('play');
    const match = level.id.match(/^([a-zA-Z]+)-/);
    if (match && match[1]) {
      this.activeDifficulty.set(match[1]);
      setSavedDifficulty('sudoku', match[1]);
    }
    this.store.currentPuzzleId.set(level.id);
    this.store.initBoard(level.puzzle, level.solution, level.savedState, level.timeSpent);
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
    const diff = prefix.replace(/^sudoku-/, '');
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    const nextId = `${prefix}-${nextNum.toString().padStart(numStr.length, '0')}`;
    this.activeDifficulty.set(diff);
    this.store.currentDifficulty.set(diff);
    setSavedDifficulty('sudoku', diff);
    
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
