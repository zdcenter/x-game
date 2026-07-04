import { GameDifficulty, GameId, GameMode, GameStatus } from '../../../core/models/game.model';
import { storageGet, storageSet, storageRemove } from '../../../core/utils/browser.util';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { Component, inject, OnInit, OnDestroy, signal, computed, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { CodebreakerStore } from './store/codebreaker.store';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { GameService } from '../../../core/services/game.service';
import { ToastService } from '../../../core/services/toast.service';
import { AudioService } from '../../../core/services/audio.service';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { SettingsService } from '../../../core/services/settings.service';
import { TutorialOverlayComponent } from '../../../shared/components/tutorial-overlay/tutorial-overlay.component';
import { TutorialService } from '../../../core/services/tutorial.service';
import { GamePlayerMiniHudComponent } from '../../../shared/components/game-player-mini-hud/game-player-mini-hud.component';

import { BaseGameComponent } from '../../../core/utils/base-game.component';

@Component({
  selector: 'app-codebreaker',
  standalone: true,
  imports: [
    CommonModule,
    GameResultOverlayComponent,
    GameRulesModalComponent,
    GameWaitingRoomComponent,
    GameLobbyPanelComponent,
    GameStartingOverlayComponent,
    GameHeaderComponent,
    GameToolbarComponent,
    TutorialOverlayComponent
  ],
  providers: [CodebreakerStore],
  templateUrl: './codebreaker.component.html',
  styleUrls: ['./codebreaker.component.css']
})
export class CodebreakerComponent extends BaseGameComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  i18n = inject(I18nService);
  route = inject(ActivatedRoute);
  authStore = inject(AuthStore);
  override store = inject(CodebreakerStore);
  toastService = inject(ToastService);
  audio = inject(AudioService);

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;
  roomLifecycle: RoomLifecycleHandle;

  private tutorialService = inject(TutorialService);
  showRules = signal(false);
  showOverlay = signal(false);
  showTutorial = signal(false);
  tutorialSteps = this.tutorialService.getStepsForGame(GameId.Codebreaker);

  // User input signals
  currentInput = signal<string>('');

  // Helper scratchpad: tracks digit markers (none, cross, check)
  // mapped to 0-9
  helperMarks = signal<Record<string, 'none' | 'cross' | 'check'>>({});

  revealLatest = signal(false);
  maxAchievedA = computed(() => {
    const guesses = this.myState()?.guesses || [];
    return guesses.length ? Math.max(...guesses.map(g => g.a)) : 0;
  });
  
  hintResult = signal<{pos: number, val: string} | null>(null);

  // Computed state
  status = this.store.status;
  digitLength = this.store.digitLength;
  players = this.store.players;
  myState = this.store.myState;
  opponentState = this.store.opponentState;
  winners = this.store.winners;
  myPlayerId = this.store.playerId;

  // Room state
  currentRoomMode = signal<string>(GameMode.Single);
  currentDifficulty = signal<string>(GameDifficulty.Medium);
  roomId = signal<string>('');

  get mappedPlayers() {
    return this.players().map(p => ({ id: p.id }));
  }

  override get playerId(): string {
    return this.myPlayerId();
  }

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'codebreaker',
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        if (this.roomLifecycle) {
          this.roomLifecycle.clearReconnectInfo();
        }
      },
    });

    effect((onCleanup) => {
      const status = this.status();
      if (status === GameStatus.Starting) {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }

      if (status === GameStatus.Finished) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });

    effect(() => {
      // Auto-save logic
      if (this.currentRoomMode() !== GameMode.Single) return;
      const status = this.status();
      const diff = this.currentDifficulty();
      if (status === GameStatus.Playing) {
        const state = {
          status,
          secretCode: this.store.getSecretCode(),
          guesses: this.myState()?.guesses || [],
          helperMarks: this.helperMarks(),
          timestamp: Date.now()
        };
        storageSet(`codebreaker_save_${diff}`, JSON.stringify(state));
      } else if (status === GameStatus.Finished) {
        storageRemove(`codebreaker_save_${diff}`);
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit(); // handles visitGame and connectLobby
    const playerId = this.authStore.currentUser()?.username || this.authStore.guestId;

    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      if (joinInfo.password) this.wsService.setPendingPassword(joinInfo.password);
      this.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '', joinInfo.target ?? 1);
    } else {
      this.route.queryParams.subscribe(params => {
        // Only run if we don't already have an active room set by consumePendingOrReconnect
        if (this.roomId()) {
          return;
        }
        const mode = params['mode'] || GameMode.Single;
        const diff = params['difficulty'] || storageGet('codebreaker_single_diff') || 'easy';
        const roomId = params['room'] || `codebreaker-${Date.now()}`;
        const host = params['host'] || roomId;
        
        if (this.roomId() === roomId && this.currentRoomMode() === mode) {
          return;
        }

        this.joinRoom(roomId, mode, diff, host);
      });
    }
  }

  joinRoom(roomId: string, mode: string, difficulty: string, host: string, target: number = 1) {
    if (!roomId) return;
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.roomId.set(roomId);

    const playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
    
    this.store.joinRoom(roomId, mode, difficulty, host, target);

    // Reset local helpers on join
    this.currentInput.set('');
    this.helperMarks.set({});
    
    // Try to load save if single player
    if (mode === GameMode.Single) {
      try {
        const saved = storageGet(`codebreaker_save_${difficulty}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.status === GameStatus.Playing && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000) {
            this.store.restoreSave(parsed.secretCode, parsed.guesses);
            this.helperMarks.set(parsed.helperMarks || {});
          }
        }
      } catch (e) {
        console.error('Failed to load save', e);
      }
    }
    
    if (mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, host);
    } else if (!this.tutorialService.hasSeen(GameId.Codebreaker) && this.tutorialSteps.length) {
      setTimeout(() => this.showTutorial.set(true), 600);
    }
  }

  onTutorialDone(): void {
    this.tutorialService.markSeen(GameId.Codebreaker);
    this.showTutorial.set(false);
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  

  override handleCreateRoom(config: any) {
    if (config.password) this.wsService.setPendingPassword(config.password);
    const roomId = config.name || `codebreaker-${Date.now()}`;
    const host = this.myPlayerId();
    const diff = config.difficulty || 'medium';
    this.joinRoom(roomId, config.mode, diff, host);
    this.isMobileSidebarOpen.set(false);
  }

  override handleJoinRoom(room: any) {
    if (room.password) this.wsService.setPendingPassword(room.password);
    const diff = room.difficulty || 'medium';
    this.joinRoom(room.roomId, room.mode, diff, room.host);
    this.isMobileSidebarOpen.set(false);
  }

  changeDifficulty(event: Event) {
    const diff = (event.target as HTMLSelectElement).value;
    if (diff === this.currentDifficulty()) return;
    storageSet('codebreaker_single_diff', diff);
    this.currentDifficulty.set(diff);
    this.store.joinRoom(this.roomId(), this.currentRoomMode(), diff, this.store.hostId());
    this.currentInput.set('');
  }

  getSubtitle(): string {
    if (this.currentRoomMode() === GameMode.Single) {
      let diffStr = '';
      const diff = this.currentDifficulty();
      if (diff) {
        if (diff === GameDifficulty.Easy) diffStr = this.i18n.t('game.diff_easy')();
        else if (diff === GameDifficulty.Hard) diffStr = this.i18n.t('game.diff_hard')();
        else diffStr = this.i18n.t('game.diff_medium')();
      }
      return this.i18n.t('gomoku.mode.single')() + (diffStr ? ' - ' + diffStr : '');
    } else {
      return this.i18n.t('codebreaker.game_mode_pk')();
    }
  }

  onRestart() {
    this.store.startGame();
    this.currentInput.set('');
  }

  // Keyboard actions
  pressKey(num: string) {
    if (this.status() !== GameStatus.Playing) return;
    
    const input = this.currentInput();
    
    // Check digit length
    if (input.length >= this.digitLength()) {
      return;
    }
    // Prevent duplicate digits
    if (input.includes(num)) {
      this.toastService.show(this.i18n.t('codebreaker.duplicate_digits')(), 'error');
      return;
    }

    this.currentInput.set(input + num);
  }

  clearInput() {
    this.currentInput.set('');
  }

  deleteLast() {
    const input = this.currentInput();
    if (input.length > 0) {
      this.currentInput.set(input.slice(0, -1));
    }
  }

  submitGuess() {
    const val = this.currentInput();
    if (val.length !== this.digitLength()) {
      this.toastService.show(
        this.i18n.t('codebreaker.invalid_length')().replace('{length}', this.digitLength().toString()),
        'error'
      );
      return;
    }
    this.store.submitGuess(val);
    this.currentInput.set('');
    this.revealLatest.set(false);
    setTimeout(() => { this.revealLatest.set(true); setTimeout(() => this.revealLatest.set(false), 900); }, 0);
  }

  // Hint logic
  applyHint() {
    const result = this.store.applyHint();
    if (result.success && result.pos !== undefined && result.val !== undefined) {
      // Mark it on the helper
      this.helperMarks.update(record => ({
        ...record,
        [`pos${result.pos}-${result.val}`]: 'check'
      }));
      // Show overlay
      this.hintResult.set({ pos: result.pos, val: result.val });
      this.audio.playPuzzle('guess');
    } else {
      this.toastService.show(this.i18n.t(result.message || '')() || 'No hint available', 'info');
    }
  }

  // Scratchpad toggle
  cycleHelperMark(num: string) {
    const current = this.helperMarks()[num];
    let next: 'none' | 'cross' | 'check' = 'none';
    if (current === 'none') next = 'cross';
    else if (current === 'cross') next = 'check';
    
    this.helperMarks.update(record => ({
      ...record,
      [num]: next
    }));
  }

  // Helper getters
  getOpponentBestResult(): string {
    const state = this.opponentState();
    if (!state || state.guesses.length === 0) return '0A0B';
    
    let maxA = -1;
    let bestB = 0;
    for (const r of state.guesses) {
      if (r.a > maxA) {
        maxA = r.a;
        bestB = r.b;
      } else if (r.a === maxA && r.b > bestB) {
        bestB = r.b;
      }
    }
    return `${maxA}A${bestB}B`;
  }

  get winnerText(): string {
    const winList = this.winners();
    if (winList.length === 0) return '';
    const won = winList.includes(this.myPlayerId());
    if (this.currentRoomMode() !== GameMode.Single && !this.store.isSeriesOver()) {
      return won ? this.i18n.t('game.round_won')() : this.i18n.t('game.round_lost')();
    }
    return won ? this.i18n.t('game.you_win')() : this.i18n.t('game.you_lose')();
  }

  get winDescription(): string {
    if (this.currentRoomMode() !== GameMode.Single && !this.store.isSeriesOver()) {
      return this.store.pkScoreLabel();
    }
    const attempts = this.myState()?.guesses.length || 0;
    return this.i18n.t('codebreaker.victory_desc')().replace('{attempts}', attempts.toString());
  }
}
