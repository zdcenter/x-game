import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { TutorialOverlayComponent } from '../../../shared/components/tutorial-overlay/tutorial-overlay.component';
import { HintButtonComponent } from '../../../shared/components/hint-button/hint-button.component';
import {
  CharResult, DailyGuessResponse, DailyStateResponse,
  FillResponse, FillSubmitResponse, GuessRecord, HistoryRecord, IdiomService, IdiomStats, SocialStats
} from './store/idiom.service';
import { IdiomPKStore } from './store/idiom-pk.store';
import { AudioService } from '../../../core/services/audio.service';
import { XpService } from '../../../core/services/xp.service';
import { SettingsService } from '../../../core/services/settings.service';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { GameStatus, GameMode } from '../../../core/models/game.model';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { BaseGameComponent } from '../../../core/utils/base-game.component';

type IdiomView = 'lobby' | 'fill' | 'wordle';

@Component({
  selector: 'app-idiom',
  standalone: true,
  providers: [IdiomPKStore],
  imports: [
    CommonModule,
    GameHeaderComponent,
    GameRulesModalComponent,
    TutorialOverlayComponent,
    HintButtonComponent,
    GameLobbyPanelComponent,
    GameWaitingRoomComponent,
    GameResultOverlayComponent,
    GameStartingOverlayComponent,
  ],
  styles: [`
    @keyframes char-pop {
      0%   { transform: scale(0.4) rotate(-8deg); opacity: 0.6; }
      65%  { transform: scale(1.18) rotate(3deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes cell-shake {
      0%,100% { transform: translateX(0); }
      15%  { transform: translateX(-10px); }
      30%  { transform: translateX(10px); }
      50%  { transform: translateX(-8px); }
      70%  { transform: translateX(7px); }
      85%  { transform: translateX(-4px); }
    }
    @keyframes cell-correct {
      0%   { transform: scale(1); }
      35%  { transform: scale(1.18); }
      65%  { transform: scale(0.93); }
      100% { transform: scale(1); }
    }
    @keyframes badge-pop {
      0%   { transform: scale(0); opacity: 0; }
      60%  { transform: scale(1.25); opacity: 1; }
      80%  { transform: scale(0.92); }
      100% { transform: scale(1); }
    }
    @keyframes slide-up {
      0%   { transform: translateY(32px); opacity: 0; }
      100% { transform: translateY(0);    opacity: 1; }
    }
    @keyframes pulse-slow {
      0%,100% { opacity: 0.3; }
      50%      { opacity: 0.7; }
    }
    @keyframes active-ring {
      0%,100% { box-shadow: 0 0 0 2px rgba(168,85,247,0.5); }
      50%     { box-shadow: 0 0 0 5px rgba(168,85,247,0.15); }
    }
    @keyframes cursor-blink {
      0%,100% { opacity: 1; }
      50%     { opacity: 0; }
    }
    .anim-char-pop   { display:inline-block; animation: char-pop   0.28s cubic-bezier(.36,.07,.19,.97) both; }
    .anim-badge-pop  { display:inline-flex;  animation: badge-pop  0.35s cubic-bezier(.36,.07,.19,.97) both; }
    .anim-slide-up   { animation: slide-up   0.32s ease-out both; }
    .anim-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
    .anim-shake      { animation: cell-shake  0.45s ease-out both; }
    .anim-correct    { animation: cell-correct 0.38s ease-out both; }
    .anim-active-ring{ animation: active-ring 1.6s ease-in-out infinite; }
    .anim-cursor     { display:inline-block; animation: cursor-blink 1s step-end infinite; }
  `],
  templateUrl: './idiom.component.html',
})
export class IdiomComponent extends BaseGameComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  private route = inject(ActivatedRoute);
  private svc = inject(IdiomService);
  private tutorialService = inject(TutorialService);
  private audio = inject(AudioService);
  private xpService = inject(XpService);
  pkStore = inject(IdiomPKStore);
  GameStatus = GameStatus;
  GameMode = GameMode;

  // ---- PK room lifecycle ----
  pkRoomId = signal('');
  pkRoomMode = signal<string>(GameMode.Speed);
  pkDifficulty = signal('');
  showPkOverlay = signal(false);
  private roomLifecycle: RoomLifecycleHandle;

  // ---- PK fill answer state ----
  pkFillAnswer = signal<string[]>(['', '', '', '']);
  pkFillSelected = signal<string[]>([]);
  pkActiveBlank = signal(-1);

  override get store() { return this.pkStore; }
  override get playerId(): string { return this.authStore.currentUser()?.username || this.authStore.guestId; }

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'idiom',
      getCurrentMode: () => this.pkRoomMode(),
      onLeaveRoom: () => this.leavePkRoom(),
    });

    // Countdown timer effect
    effect((onCleanup) => {
      const s = this.pkStore.status();
      if (s === GameStatus.Starting) {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }
      if (s === GameStatus.Finished) {
        if (this.pkStore.winners().includes(this.pkStore.playerId())) {
          this.audio.playWin();
        }
        const t = setTimeout(() => this.showPkOverlay.set(true), 1200);
        onCleanup(() => clearTimeout(t));
      } else {
        this.showPkOverlay.set(false);
      }
    });

    // Reset fill state when display changes (new round)
    effect(() => {
      const display = this.pkStore.display();
      if (display.length > 0) {
        this.pkFillAnswer.set(['', '', '', '']);
        this.pkFillSelected.set([]);
        this.pkActiveBlank.set(display.findIndex(ch => ch === '_'));
      }
    });

    // Clear answer & allow retry when server reports wrong
    effect(() => {
      if (this.pkStore.myState()?.last_wrong) {
        setTimeout(() => this.clearPkAnswer(), 700);
      }
    });
  }

  joinPkRoom(roomId: string, mode: string, diff: string, host: string, target = 3) {
    this.pkRoomId.set(roomId);
    this.pkRoomMode.set(mode);
    this.pkDifficulty.set(diff);
    this.pkStore.joinRoom(roomId, mode, diff, host, target);
    this.roomLifecycle.saveReconnectInfo(roomId, mode, diff, host);
  }

  leavePkRoom() {
    this.pkStore.leaveRoom();
    this.pkRoomId.set('');
    this.roomLifecycle.clearReconnectInfo();
  }

  // PK fill keyboard handler
  onPkKeyPress(ch: string) {
    const display = this.pkStore.display();
    const myState = this.pkStore.myState();
    if (!display.length || this.pkStore.isRoundOver() || myState?.last_wrong || myState?.locked) return;
    const active = this.pkActiveBlank();
    if (active === -1 || display[active] !== '_') return;

    const ans = [...this.pkFillAnswer()];
    ans[active] = ch;
    this.pkFillAnswer.set(ans);
    this.pkFillSelected.update(s => [...s, ch]);

    const allFilled = display.every((c, i) => c !== '_' || !!ans[i]);
    if (allFilled) {
      // Assemble full 4-char word: fixed chars from display + filled chars from ans
      const fullAns = display.map((c, i) => c !== '_' ? c : ans[i]);
      this.pkStore.submitFillAnswer(fullAns);
    } else {
      for (let j = active + 1; j < 4; j++) {
        if (display[j] === '_' && !ans[j]) { this.pkActiveBlank.set(j); return; }
      }
      for (let j = 0; j < active; j++) {
        if (display[j] === '_' && !ans[j]) { this.pkActiveBlank.set(j); return; }
      }
    }
  }

  pkUndoChar(i: number, ch: string) {
    if (ch !== '_') return;
    const ans = [...this.pkFillAnswer()];
    if (!ans[i]) return;
    this.pkFillSelected.update(s => s.filter((_, idx) => idx !== s.lastIndexOf(ans[i])));
    ans[i] = '';
    this.pkFillAnswer.set(ans);
    this.pkActiveBlank.set(i);
  }

  clearPkAnswer() {
    this.pkFillAnswer.set(['', '', '', '']);
    this.pkFillSelected.set([]);
    const display = this.pkStore.display();
    this.pkActiveBlank.set(display.findIndex(c => c === '_'));
  }

  pkCellClass(i: number, ch: string, activeIdx: number): string {
    // Round-over: ALL cells (blank + fixed) get green/dim treatment
    if (this.pkStore.isRoundOver()) {
      return this.pkStore.iWonRound()
        ? 'border-green-400 bg-green-500 text-white anim-correct shadow-[0_0_18px_rgba(34,197,94,0.55)]'
        : 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] opacity-50 cursor-default';
    }
    // Wrong shake: ALL cells shake (like single-player), blank cells go red
    if (this.pkStore.myState()?.last_wrong) {
      return ch !== '_'
        ? 'border-red-400/60 bg-[var(--color-bg-card)] text-[var(--color-text-main)] anim-shake cursor-default'
        : 'border-red-500 bg-red-500 text-white anim-shake';
    }
    if (ch !== '_') return 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] cursor-default';
    if (this.pkFillAnswer()[i]) return 'border-purple-500 bg-gradient-to-br from-purple-500/20 to-violet-600/15 text-[var(--color-text-main)]';
    if (activeIdx === i) return 'border-purple-400 bg-purple-500/15 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)] cursor-text';
    return 'border-dashed border-purple-300/25 bg-[var(--color-bg-card)] cursor-default';
  }

  pkWinDots(wins: number, target: number): { idx: number; filled: boolean }[] {
    return Array.from({ length: target }, (_, i) => ({ idx: i, filled: i < wins }));
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.pkStore.leaveRoom();
  }

  handleLobbyJoinRoom(room: any) {
    if (room.password) this.wsService.setPendingPassword(room.password);
    this.joinPkRoom(room.roomId, room.mode, room.difficulty || '', room.host);
  }

  tutorialSteps = this.tutorialService.getStepsForGame('idiom');

  // ---- Navigation ----
  view = signal<IdiomView>('lobby');
  showRules = signal(false);
  showTutorial = signal(false);

  // ---- Fill mode ----
  fillDifficulty = signal<'easy' | 'medium' | 'hard' | null>(null);

  recommendedDifficulty = computed<'easy' | 'medium' | 'hard'>(() => {
    const s = this.idiomStats();
    if (!s || !s.by_difficulty.length) return 'easy';
    const get = (d: string) => s.by_difficulty.find(x => x.difficulty === d);
    const easy = get('easy');
    if (!easy || easy.total === 0 || easy.mastered / easy.total < 0.8) return 'easy';
    const medium = get('medium');
    if (!medium || medium.total === 0 || medium.mastered / medium.total < 0.8) return 'medium';
    return 'hard';
  });

  diffStat(d: string) {
    return this.idiomStats()?.by_difficulty.find(x => x.difficulty === d) ?? null;
  }

  fillQ = signal<FillResponse | null>(null);
  fillAnswer = signal<string[]>(['', '', '', '']);
  fillSelected = signal<string[]>([]);
  fillResult = signal<FillSubmitResponse | null>(null);
  // Per-idiom consecutive correct count (from server response), NOT a session-wide counter
  streak = signal(0);
  answerState = signal<'idle' | 'checking' | 'correct' | 'wrong' | 'correcting' | 'correcting_done'>('idle');
  correctWord = signal<string[]>([]);
  autoNextCountdown = signal(0);
  private autoNextTimer: ReturnType<typeof setInterval> | null = null;

  fillComplete = computed(() => {
    const q = this.fillQ();
    if (!q) return false;
    return q.display.every((ch, i) => ch !== '_' || !!this.fillAnswer()[i]);
  });

  // User-selectable active blank index; -1 = none
  activeBlankIndex = signal(-1);


  // ---- Wordle mode ----
  wordleKeyboard = signal<string[]>([]);
  wordleGuesses = signal<GuessRecord[]>([]);
  wordleComplete = signal(false);
  wordleWon = signal(false);
  wordleAnswer = signal<{ word: string; explanation: string; story: string } | null>(null);
  socialStats = signal<SocialStats | null>(null);
  currentGuess = signal<string[]>([]);
  wordleHintSource = signal('');
  wordleHintMeaning = signal('');
  wordleInputError = signal('');
  wordleSubmitting = signal(false);
  wordleShakeRow = signal(false);
  private wordleInputHandled = false;

  // ---- Stats & History ----
  idiomStats = signal<IdiomStats | null>(null);
  idiomHistory = signal<HistoryRecord[]>([]);
  showHistory = signal(false);

  masteryPercent = computed(() => {
    const s = this.idiomStats();
    if (!s || s.total === 0) return 0;
    return Math.round((s.mastered / s.total) * 100);
  });

  diffLabel(d: string): string {
    return d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难';
  }
  diffColor(d: string): string {
    return d === 'easy' ? 'bg-green-500' : d === 'medium' ? 'bg-yellow-500' : 'bg-red-500';
  }
  diffBarColor(d: string): string {
    return d === 'easy' ? 'from-green-500 to-emerald-400' : d === 'medium' ? 'from-yellow-500 to-amber-400' : 'from-red-500 to-orange-400';
  }
  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return `${m}分钟前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}小时前`;
    return `${Math.floor(h / 24)}天前`;
  }

  wordleGrid = computed(() => {
    const guesses = this.wordleGuesses();
    const current = this.currentGuess();
    const rows: { char: string; status: string; active?: boolean }[][] = [];
    for (let i = 0; i < 6; i++) {
      const guess = guesses[i];
      if (guess) {
        rows.push(guess.result.map(r => ({ char: r.char, status: r.status })));
      } else if (i === guesses.length && !this.wordleComplete()) {
        // active input row: show current typing chars + cursor
        rows.push(Array(4).fill(null).map((_, ci) => ({
          char: current[ci] || '',
          status: 'input',
          active: ci === current.length,
        })));
      } else {
        rows.push(Array(4).fill(null).map(() => ({ char: '', status: '' })));
      }
    }
    return rows;
  });

  wordleKeyStatus = computed(() => {
    const map = new Map<string, 'correct' | 'present' | 'absent'>();
    const priority: Record<string, number> = { correct: 3, present: 2, absent: 1 };
    for (const guess of this.wordleGuesses()) {
      for (const r of guess.result) {
        const cur = map.get(r.char);
        if (!cur || priority[r.status] > priority[cur]) {
          map.set(r.char, r.status as 'correct' | 'present' | 'absent');
        }
      }
    }
    return map;
  });

  override ngOnInit() {
    super.ngOnInit();
    this.loadWordleState();
    if (this.authStore.isAuthenticated()) {
      this.svc.getStats().subscribe(s => this.idiomStats.set(s));
      this.svc.getHistory().subscribe(h => this.idiomHistory.set(h));
    }
    if (!this.tutorialService.hasSeen('idiom') && this.tutorialSteps.length) {
      setTimeout(() => this.showTutorial.set(true), 400);
    }

    // PK room lifecycle: reconnect or join from query params
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      this.joinPkRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '', joinInfo.target ?? 3);
    } else {
      this.route.queryParams.subscribe(params => {
        if (this.pkRoomId()) return;
        const mode = params['mode'];
        if (!mode || mode === GameMode.Single) return;
        const roomId = params['room'] || `idiom-${Date.now()}`;
        const host = params['host'] || roomId;
        const diff = params['difficulty'] || '';
        const target = params['target'] ? parseInt(params['target']) : 3;
        this.joinPkRoom(roomId, mode, diff, host, target);
      });
    }
  }

  returnToLobby() {
    this.navigateToLobby();
  }

  backToLobby() {
    this.view.set('lobby');
    // Refresh stats + history so lobby shows up-to-date data
    if (this.authStore.isAuthenticated()) {
      this.svc.getStats().subscribe(s => this.idiomStats.set(s));
      this.svc.getHistory().subscribe(h => this.idiomHistory.set(h));
    }
  }

  onTutorialDone() {
    this.tutorialService.markSeen('idiom');
    this.showTutorial.set(false);
  }

  // ---- Fill mode ----
  enterFill() {
    this.fillDifficulty.set(null);
    this.fillQ.set(null);
    this.view.set('fill');
  }

  selectDifficulty(d: string) {
    this.fillDifficulty.set(d as 'easy' | 'medium' | 'hard');
    this.fillQ.set(null);
    this.loadFill();
  }

  loadFill() {
    this.fillAnswer.set(['', '', '', '']);
    this.fillSelected.set([]);
    this.fillResult.set(null);
    this.answerState.set('idle');
    this.activeBlankIndex.set(-1);
    this.svc.getFill(this.fillDifficulty() ?? undefined).subscribe(q => {
      this.fillQ.set(q);
      // Default: activate the first blank
      this.activeBlankIndex.set(q.display.findIndex(ch => ch === '_'));
    });
  }

  // After filling a blank, advance to the next unfilled blank
  private advanceActive(filledIdx: number) {
    const q = this.fillQ()!;
    const ans = this.fillAnswer();
    // Search forward first
    for (let j = filledIdx + 1; j < q.display.length; j++) {
      if (q.display[j] === '_' && !ans[j]) { this.activeBlankIndex.set(j); return; }
    }
    // Wrap around
    for (let j = 0; j < filledIdx; j++) {
      if (q.display[j] === '_' && !ans[j]) { this.activeBlankIndex.set(j); return; }
    }
    this.activeBlankIndex.set(-1);
  }

  isFillKeyUsed(ch: string): boolean {
    return this.fillSelected().includes(ch);
  }

  // iOS and Android fire IME events in opposite order:
  // iOS:     compositionend (with char) → input (isComposing=true, skip)
  // Android: input (isComposing=false, commit) → compositionend (cleanup)
  // inputHandled flag prevents double-fill across both paths.
  private inputHandled = false;

  onCompositionEnd(event: CompositionEvent) {
    if (this.inputHandled) {
      // Android path: input event already committed the char
      this.inputHandled = false;
      (event.target as HTMLInputElement).value = '';
      return;
    }
    // iOS path: compositionend carries the committed char
    const input = event.target as HTMLInputElement;
    const text = event.data || input.value;
    const chars = [...text];
    if (!chars.length) return;
    const ch = chars[chars.length - 1];
    input.value = '';
    this.onHandwriteChar(ch);
  }

  onHandwriteInput(event: Event) {
    const ie = event as InputEvent;
    if (ie.isComposing) return; // still composing (iOS will handle in compositionend)
    const input = ie.target as HTMLInputElement;
    const chars = [...input.value];
    if (!chars.length) return;
    const ch = chars[chars.length - 1];
    input.value = '';
    this.inputHandled = true; // tell compositionend to skip
    this.onHandwriteChar(ch);
  }

  // Fill active blank with any character (handwrite / IME path)
  onHandwriteChar(ch: string) {
    const q = this.fillQ();
    const state = this.answerState();
    if (!q || (state !== 'idle' && state !== 'correcting')) return;
    const activeIdx = this.activeBlankIndex();
    if (activeIdx === -1) return;
    const ans = [...this.fillAnswer()];
    ans[activeIdx] = ch;
    this.fillAnswer.set(ans);
    this.audio.playIdiom('fill');
    if (q.keyboard.includes(ch) && !this.fillSelected().includes(ch)) {
      this.fillSelected.update(s => [...s, ch]);
    }
    if (q.display.every((c, j) => c !== '_' || !!ans[j])) {
      this.activeBlankIndex.set(-1);
      if (state === 'correcting') {
        setTimeout(() => this.checkCorrection(), 200);
      } else {
        this.answerState.set('checking');
        setTimeout(() => this.submitFill(), 350);
      }
    } else {
      this.advanceActive(activeIdx);
      setTimeout(() => {
        (document.getElementById('hw-input') as HTMLInputElement | null)?.focus();
      }, 30);
    }
  }

  // Cell visual class — activeIdx passed from template (direct signal read, ensures reactivity)
  cellClass(i: number, ch: string, activeIdx: number): string {
    if (ch !== '_') {
      return 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] cursor-default';
    }
    const state = this.answerState();
    if (state === 'correct') {
      return 'border-green-500 bg-green-500 text-white anim-correct';
    }
    if (state === 'wrong') {
      const isRight = this.fillAnswer()[i] === this.correctWord()[i];
      return isRight
        ? 'border-green-500 bg-green-500 text-white anim-correct'
        : 'border-red-500 bg-red-500 text-white anim-shake';
    }
    if (state === 'correcting_done') {
      return 'border-green-500 bg-green-500 text-white anim-correct';
    }
    if (this.fillAnswer()[i]) {
      return 'border-purple-500 bg-gradient-to-br from-purple-500/20 to-violet-600/15 text-[var(--color-text-main)]';
    }
    if (activeIdx === i) {
      return 'border-purple-400 bg-purple-500/15 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)] cursor-text';
    }
    // Waiting blank
    return 'border-dashed border-purple-300/25 bg-[var(--color-bg-card)] cursor-default';
  }

  cellAnimation(i: number, ch: string): string {
    // Staggered anim-correct/-shake are applied via class; return '' here (delay handled by style)
    return '';
  }

  cellAnimDelay(i: number, ch: string): string {
    const state = this.answerState();
    if ((state === 'correct' || state === 'wrong') && ch === '_') {
      return `${i * 70}ms`;
    }
    return '0ms';
  }

  onFillKeyPress(ch: string) {
    const q = this.fillQ();
    const state = this.answerState();
    if (!q || (state !== 'idle' && state !== 'correcting')) return;
    if (this.isFillKeyUsed(ch)) return;
    const activeIdx = this.activeBlankIndex();
    if (activeIdx === -1) return;

    const ans = [...this.fillAnswer()];
    ans[activeIdx] = ch;
    this.fillAnswer.set(ans);
    this.fillSelected.update(s => [...s, ch]);
    this.audio.playIdiom('fill');

    if (q.display.every((c, j) => c !== '_' || !!ans[j])) {
      this.activeBlankIndex.set(-1);
      if (state === 'correcting') {
        setTimeout(() => this.checkCorrection(), 200);
      } else {
        this.answerState.set('checking');
        setTimeout(() => this.submitFill(), 350);
      }
    } else {
      this.advanceActive(activeIdx);
    }
  }

  // Click a blank: select it (and open system keyboard); click a filled blank: undo and select
  undoFillChar(i: number, displayCh: string) {
    const state = this.answerState();
    if (displayCh !== '_' || (state !== 'idle' && state !== 'correcting')) return;
    const ch = this.fillAnswer()[i];
    if (ch) {
      const ans = [...this.fillAnswer()];
      ans[i] = '';
      this.fillAnswer.set(ans);
      this.fillSelected.update(s => s.filter(c => c !== ch));
      this.audio.playIdiom('erase');
    }
    this.activeBlankIndex.set(i);
    // Synchronous focus within user gesture → mobile browser opens system keyboard/IME immediately
    (document.getElementById('hw-input') as HTMLInputElement | null)?.focus();
  }

  clearFillAnswer() {
    const state = this.answerState();
    if (state !== 'idle' && state !== 'correcting') return;
    const q = this.fillQ();
    if (!q) return;
    this.fillAnswer.set(q.display.map(() => ''));
    this.fillSelected.set([]);
    this.activeBlankIndex.set(q.display.findIndex(ch => ch === '_'));
  }

  submitFill() {
    const q = this.fillQ();
    if (!q) return;
    const fullAnswer = q.display.map((ch, i) => ch === '_' ? this.fillAnswer()[i] : ch);
    this.svc.submitFill(q.idiom_id, fullAnswer).subscribe(res => {
      this.fillResult.set(res);
      this.correctWord.set([...res.word]);
      // streak = per-idiom consecutive_correct from server (0 when wrong, resets per idiom)
      this.streak.set(res.consecutive_correct ?? 0);
      if (res.is_correct) {
        this.answerState.set('correct');
        if (res.is_mastered) {
          this.audio.playIdiom('mastered');
        } else {
          this.audio.playIdiom('correct');
        }
        if (res.xp_result && res.xp_result.xp_earned > 0) {
          this.xpService.showXpGain(res.xp_result.xp_earned);
          if (res.xp_result.leveled_up) {
            // Slight delay so level-up victory plays after the correct/mastered sound fades
            setTimeout(() => this.audio.playUI('victory'), 400);
          }
        }
        // Auto-advance after 2 s
        this.autoNextCountdown.set(2);
        this.autoNextTimer = setInterval(() => {
          this.autoNextCountdown.update(v => v - 1);
          if (this.autoNextCountdown() <= 0) this.nextFill();
        }, 1000);
      } else {
        this.answerState.set('wrong');
        this.audio.playIdiom('wrong');
        // After 1.5s let user read the explanation, then enter correction mode
        setTimeout(() => this.enterCorrecting(), 1500);
      }
      // Refresh stats + history after every answer (correct or wrong)
      if (this.authStore.isAuthenticated()) {
        this.svc.getStats().subscribe(s => this.idiomStats.set(s));
        this.svc.getHistory().subscribe(h => this.idiomHistory.set(h));
      }
    });
  }

  enterCorrecting() {
    const q = this.fillQ();
    if (!q) return;
    this.fillAnswer.set(q.display.map(() => ''));
    this.fillSelected.set([]);
    this.activeBlankIndex.set(q.display.findIndex(ch => ch === '_'));
    this.answerState.set('correcting');
  }

  // Validate correction attempt (no server call — just local compare)
  private checkCorrection() {
    const q = this.fillQ();
    if (!q) return;
    const correct = this.correctWord();
    const ans = this.fillAnswer();
    const allMatch = q.display.every((ch, i) => ch !== '_' || ans[i] === correct[i]);
    if (allMatch) {
      this.answerState.set('correcting_done');
      this.audio.playIdiom('correcting_done');
    } else {
      // Wrong chars: clear them and reset active to first wrong blank
      const newAns = ans.map((a, i) => (q.display[i] === '_' && a !== correct[i]) ? '' : a);
      this.fillAnswer.set(newAns);
      this.fillSelected.set(newAns.filter(Boolean));
      const firstWrong = q.display.findIndex((ch, i) => ch === '_' && !newAns[i]);
      this.activeBlankIndex.set(firstWrong);
    }
  }

  applyFillHint() {
    const q = this.fillQ();
    if (!q || this.answerState() !== 'idle') return;
    const ans = [...this.fillAnswer()];
    const firstEmpty = q.display.findIndex((ch, i) => ch === '_' && !ans[i]);
    if (firstEmpty === -1) return;
    const dummyAnswer = q.display.map((ch, i) => ch === '_' ? (ans[i] || '一') : ch);
    this.svc.submitFill(q.idiom_id, dummyAnswer).subscribe(res => {
      const correct = [...res.word];
      const newAns = [...this.fillAnswer()];
      newAns[firstEmpty] = correct[firstEmpty];
      this.fillAnswer.set(newAns);
      const hintChar = correct[firstEmpty];
      if (q.keyboard.includes(hintChar)) {
        this.fillSelected.update(s => s.includes(hintChar) ? s : [...s, hintChar]);
      }
      // If now complete, auto-submit
      if (q.display.every((c, j) => c !== '_' || !!newAns[j])) {
        this.answerState.set('checking');
        setTimeout(() => this.submitFill(), 350);
      }
    });
  }

  nextFill() {
    if (this.autoNextTimer) { clearInterval(this.autoNextTimer); this.autoNextTimer = null; }
    this.autoNextCountdown.set(0);
    this.audio.playIdiom('next');
    this.loadFill();
  }

  // ---- Wordle mode ----
  enterWordle() { this.view.set('wordle'); }

  loadWordleState() {
    this.svc.getDailyState().subscribe((state: DailyStateResponse) => {
      this.wordleKeyboard.set(state.keyboard || []);
      this.wordleGuesses.set(state.guesses || []);
      this.wordleHintSource.set(state.hint_source || '');
      this.wordleHintMeaning.set(state.hint_meaning || '');
      if (state.is_complete) {
        this.wordleComplete.set(true);
        const last = (state.guesses || []).at(-1);
        this.wordleWon.set(!!last && last.result.every(r => r.status === 'correct'));
        if (state.word) {
          this.wordleAnswer.set({ word: state.word, explanation: state.explanation || '', story: state.story || '' });
        }
      }
      this.svc.getSocialStats().subscribe(s => this.socialStats.set(s));
    });
  }

  focusWordleInput() {
    (document.getElementById('wordle-input') as HTMLInputElement | null)?.focus();
  }

  onWordleCompositionEnd(event: CompositionEvent) {
    if (this.wordleInputHandled) {
      this.wordleInputHandled = false;
      (event.target as HTMLInputElement).value = '';
      return;
    }
    // iOS path
    const input = event.target as HTMLInputElement;
    const text = event.data || input.value;
    const chars = [...text].filter(ch => /\p{Script=Han}/u.test(ch));
    input.value = '';
    for (const ch of chars) this.addWordleChar(ch);
  }

  onWordleInput(event: Event) {
    const ie = event as InputEvent;
    if (ie.isComposing) return;
    const input = ie.target as HTMLInputElement;
    const chars = [...input.value].filter(ch => /\p{Script=Han}/u.test(ch));
    input.value = '';
    if (!chars.length) return;
    this.wordleInputHandled = true;
    for (const ch of chars) this.addWordleChar(ch);
  }

  addWordleChar(ch: string) {
    if (this.wordleComplete() || this.currentGuess().length >= 4 || this.wordleSubmitting()) return;
    this.wordleInputError.set('');
    this.currentGuess.update(g => [...g, ch]);
    this.audio.playIdiom('fill');
    // auto-submit when 4th char is filled
    if (this.currentGuess().length === 4) {
      setTimeout(() => this.submitWordle(), 180);
    }
  }

  clearLastGuessChar() {
    if (this.currentGuess().length === 0) return;
    this.wordleInputError.set('');
    this.currentGuess.update(g => g.slice(0, -1));
    this.audio.playIdiom('erase');
  }

  onWordleKeyPress(ch: string) {
    if (this.wordleComplete() || this.currentGuess().length >= 4) return;
    // Toggle: clicking same char again removes last char if it matches
    this.addWordleChar(ch);
  }

  submitWordle() {
    if (this.currentGuess().length < 4 || this.wordleSubmitting()) return;
    const guess = this.currentGuess().join('');
    this.wordleSubmitting.set(true);
    this.wordleInputError.set('');
    this.svc.submitDailyGuess(guess).subscribe({
      next: (res: DailyGuessResponse) => {
        this.wordleSubmitting.set(false);
        this.wordleGuesses.update(g => [...g, { guess_seq: res.guess_seq, guess, result: res.result }]);
        this.currentGuess.set([]);
        if (res.hint_meaning) this.wordleHintMeaning.set(res.hint_meaning);
        if (res.is_win || res.remaining === 0) {
          this.wordleComplete.set(true);
          this.wordleWon.set(res.is_win);
          if (res.word) {
            this.wordleAnswer.set({ word: res.word, explanation: res.explanation || '', story: res.story || '' });
          }
          this.audio.playIdiom(res.is_win ? 'mastered' : 'wrong');
          this.svc.getSocialStats().subscribe(s => this.socialStats.set(s));
        } else {
          this.audio.playIdiom('fill');
        }
      },
      error: (err) => {
        this.wordleSubmitting.set(false);
        const msg = err?.error?.message || '提交失败，请重试';
        this.wordleInputError.set(msg);
        this.audio.playIdiom('wrong');
        // shake the active row
        this.wordleShakeRow.set(true);
        setTimeout(() => this.wordleShakeRow.set(false), 500);
        setTimeout(() => this.wordleInputError.set(''), 2500);
      },
    });
  }

  shareWordle() {
    const date = new Date().toISOString().slice(0, 10);
    const guesses = this.wordleGuesses();
    const grid = guesses.map(g =>
      g.result.map(r => r.status === 'correct' ? '🟩' : r.status === 'present' ? '🟨' : '⬛').join('')
    ).join('\n');
    const text = `成语猜词 ${date} ${this.wordleWon() ? guesses.length + '/6' : 'X/6'}\n${grid}\nhttps://puzzlepk.com/games/idiom`;
    if (typeof navigator !== 'undefined') {
      navigator.share ? navigator.share({ text }) : navigator.clipboard?.writeText(text);
    }
  }

  // ---- Style helpers ----
  wordleCellClass(status: string): string {
    switch (status) {
      case 'correct': return 'bg-green-500 border-green-500 text-white';
      case 'present': return 'bg-yellow-400 border-yellow-400 text-white';
      case 'absent':  return 'bg-gray-600 border-gray-600 text-gray-300';
      case 'input':   return 'border-green-400/70 bg-green-500/10 text-[var(--color-text-main)]';
      default:        return 'border-[var(--color-border-card)]/50 border-dashed bg-[var(--color-bg-card)]';
    }
  }

  wordleKeyBtnClass(ch: string): string {
    const status = this.wordleKeyStatus().get(ch);
    switch (status) {
      case 'correct': return 'bg-green-500 border-green-500 text-white';
      case 'present': return 'bg-yellow-400 border-yellow-400 text-white';
      case 'absent':  return 'bg-gray-700 border-gray-700 text-gray-500 opacity-50 cursor-not-allowed';
      default:        return 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)]';
    }
  }
}
