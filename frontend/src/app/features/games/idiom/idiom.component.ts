import { Component, computed, effect, inject, OnDestroy, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameStatus, GameMode, GameResult } from '../../../core/models/game.model';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { IdiomPKStore } from './store/idiom-pk.store';
import { IdiomSolitaireEngine, IdiomItem, ChainMode } from './store/idiom-engine';
import { AudioService } from '../../../core/services/audio.service';
import { XpService } from '../../../core/services/xp.service';
import { FloatingTextService } from '../../../core/services/floating-text.service';

@Component({
  selector: 'app-idiom',
  standalone: true,
  providers: [IdiomPKStore],
  imports: [
    CommonModule,
    GameLayoutComponent,
    GameWaitingRoomComponent,
    GameResultOverlayComponent,
    GameStartingOverlayComponent,
  ],
  templateUrl: './idiom.component.html',
  styles: [`
    @keyframes gold-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
    }
    @keyframes dragon-enter {
      0% { transform: scale(0.6) translateY(20px); opacity: 0; }
      70% { transform: scale(1.08) translateY(-4px); opacity: 1; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes slot-shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }
    .anim-gold-pulse { animation: gold-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .anim-dragon-enter { animation: dragon-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .anim-slot-shake { animation: slot-shake 0.4s ease-in-out both; }
  `]
})
export class IdiomComponent extends BaseGameComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  private route = inject(ActivatedRoute);
  private audio = inject(AudioService);
  private xpService = inject(XpService);
  private floatingText = inject(FloatingTextService);
  pkStore = inject(IdiomPKStore);

  GameStatus = GameStatus;
  GameMode = GameMode;
  GameResult = GameResult;

  // Single-player Engine
  engine = IdiomSolitaireEngine.getInstance();
  isLoading = signal(true);

  // Solitaire States
  chainMode = signal<ChainMode>('exact'); // 'exact' (同字) | 'pinyin' (同音)
  solitaireChain = signal<IdiomItem[]>([]);
  streak = signal(0);
  maxStreak = signal(0);

  currentSlots = signal<string[]>(['', '', '']); // Slots 1, 2, 3 (Slot 0 is the pinned targetChar)
  activeSlotIndex = signal(0); // 0, 1, 2
  keypad = signal<string[]>([]);
  keypadUsed = signal<boolean[]>([]);
  hintsRemaining = signal(5);
  shufflesRemaining = signal(3);
  isDeadEnd = signal(false);
  shakeSlots = signal(false);
  errorMessage = signal('');

  // Modals
  showRules = signal(false);
  inspectedIdiom = signal<IdiomItem | null>(null);
  candidatesModalOpen = signal(false);
  candidatesList = signal<IdiomItem[]>([]);

  // PK Room States
  pkRoomId = signal('');
  pkRoomMode = signal<string>(GameMode.Speed);
  pkDifficulty = signal('');
  showPkOverlay = signal(false);
  private roomLifecycle: RoomLifecycleHandle;

  // PK Fill inputs (for current round)
  pkSlots = signal<string[]>(['', '', '']);
  pkKeypadUsed = signal<boolean[]>([]);

  @ViewChild('chainScrollContainer') chainScrollContainer?: ElementRef<HTMLDivElement>;

  override get store() { return this.pkStore; }
  override get playerId(): string { return this.authStore.currentUser()?.username || this.authStore.guestId; }

  currentTail = computed(() => {
    const chain = this.solitaireChain();
    return chain.length ? chain[chain.length - 1] : null;
  });

  targetChar = computed(() => this.currentTail()?.lastChar || '');
  targetPinyin = computed(() => {
    const tail = this.currentTail();
    if (!tail) return '';
    const parts = tail.p.split(' ');
    return parts[3] || tail.lastPinyin;
  });

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'idiom',
      getCurrentMode: () => this.pkRoomMode(),
      onLeaveRoom: () => this.leavePkRoom(),
    });

    // PK status effect
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

    // Reset PK slots on new round
    effect(() => {
      const targetChar = this.pkStore.targetChar();
      const keyboard = this.pkStore.keyboard();
      if (targetChar && keyboard.length > 0) {
        this.pkSlots.set(['', '', '']);
        this.pkKeypadUsed.set(new Array(keyboard.length).fill(false));
      }
    });

    // PK wrong feedback shake
    effect(() => {
      if (this.pkStore.myState()?.last_wrong) {
        this.audio.playIdiom('wrong');
        this.shakeSlots.set(true);
        setTimeout(() => {
          this.shakeSlots.set(false);
          this.clearPkSlots();
        }, 600);
      }
    });
  }

  override async ngOnInit() {
    super.ngOnInit();

    if (typeof window === 'undefined') {
      return;
    }

    // Load idiom dictionary client-side (Rule 5)
    try {
      await this.engine.loadDictionary();
      this.isLoading.set(false);
      this.startNewSolitaireGame();
    } catch (err) {
      console.error('Failed to load idiom dictionary:', err);
      this.isLoading.set(false);
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

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.pkStore.leaveRoom();
  }

  // ==========================================
  // Single Player Solitaire Logic
  // ==========================================

  startNewSolitaireGame() {
    if (!this.engine.loaded) return;
    try {
      const seed = this.engine.getRandomSeed(this.chainMode());
      this.solitaireChain.set([seed]);
      this.streak.set(0);
      this.hintsRemaining.set(5);
      this.shufflesRemaining.set(3);
      this.refreshCurrentStep();
    } catch (err) {
      console.error('Failed to start solitaire game:', err);
    }
  }

  toggleChainMode(mode: ChainMode) {
    if (this.chainMode() === mode) return;
    this.chainMode.set(mode);
    this.refreshCurrentStep();
    this.audio.playIdiom('next');
  }

  refreshCurrentStep() {
    const tail = this.currentTail();
    if (!tail) return;

    this.currentSlots.set(['', '', '']);
    this.activeSlotIndex.set(0);
    this.errorMessage.set('');

    const usedWords = new Set(this.solitaireChain().map(i => i.w));
    const { keys, successorsCount } = this.engine.generateKeypad(
      tail.lastChar,
      tail.lastPinyin,
      this.chainMode(),
      usedWords,
      12
    );

    this.keypad.set(keys);
    this.keypadUsed.set(new Array(keys.length).fill(false));
    this.isDeadEnd.set(successorsCount === 0);

    setTimeout(() => this.scrollChainToEnd(), 100);
  }

  onKeypadPress(char: string, index: number) {
    if (this.keypadUsed()[index]) return;

    const slots = [...this.currentSlots()];
    const emptyIdx = slots.findIndex(s => !s);
    if (emptyIdx === -1) return;

    slots[emptyIdx] = char;
    this.currentSlots.set(slots);

    const used = [...this.keypadUsed()];
    used[index] = true;
    this.keypadUsed.set(used);

    this.audio.playIdiom('fill');

    // If all 3 slots filled, automatically submit
    if (slots.every(s => !!s)) {
      setTimeout(() => this.submitSolitaire(), 200);
    }
  }

  onSlotClick(slotIdx: number) {
    const char = this.currentSlots()[slotIdx];
    if (!char) return;

    // Retract character
    const slots = [...this.currentSlots()];
    slots[slotIdx] = '';
    this.currentSlots.set(slots);

    // Unmark in keypad
    const keypad = this.keypad();
    const used = [...this.keypadUsed()];
    const keyIdx = keypad.findIndex((k, i) => k === char && used[i]);
    if (keyIdx !== -1) {
      used[keyIdx] = false;
      this.keypadUsed.set(used);
    }

    this.audio.playIdiom('erase');
  }

  clearSlots() {
    this.currentSlots.set(['', '', '']);
    this.keypadUsed.set(new Array(this.keypad().length).fill(false));
    this.errorMessage.set('');
    this.audio.playIdiom('erase');
  }

  submitSolitaire() {
    const slots = this.currentSlots();
    if (slots.some(s => !s)) {
      this.showError('请先填满 4 个汉字');
      return;
    }

    const fullWord = this.targetChar() + slots.join('');
    const idiomItem = this.engine.findByWord(fullWord);

    if (!idiomItem) {
      this.showError(`“${fullWord}”不是中华成语词典中的合法成语`);
      return;
    }

    // Check if already in chain
    const chainWords = this.solitaireChain().map(i => i.w);
    if (chainWords.includes(fullWord)) {
      this.showError(`成语“${fullWord}”在本次神龙链条中已经使用过了`);
      return;
    }

    // Validate chain rule
    const prev = this.currentTail();
    if (!prev) return;
    const ruleCheck = this.engine.canChain(prev, idiomItem, this.chainMode());
    if (!ruleCheck.valid) {
      this.showError(ruleCheck.reason || '首尾无法接龙');
      return;
    }

    // Success!
    this.audio.playIdiom('correct');
    this.solitaireChain.update(list => [...list, idiomItem]);
    this.streak.update(s => s + 1);
    if (this.streak() > this.maxStreak()) {
      this.maxStreak.set(this.streak());
    }

    this.xpService.showXpGain(15);
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2 - 80;
    this.floatingText.show(`🐉 神龙延展 +1 节!`, centerX, centerY, { size: 'lg', color: '#f59e0b' });

    this.refreshCurrentStep();
  }

  showError(msg: string) {
    this.errorMessage.set(msg);
    this.audio.playIdiom('wrong');
    this.shakeSlots.set(true);
    setTimeout(() => this.shakeSlots.set(false), 500);
  }

  useHint() {
    if (this.hintsRemaining() <= 0) return;
    const tail = this.currentTail();
    if (!tail) return;

    const usedWords = new Set(this.solitaireChain().map(i => i.w));
    const hintIdiom = this.engine.getHint(tail.lastChar, tail.lastPinyin, this.chainMode(), usedWords);
    if (!hintIdiom) {
      this.showError('未能找到符合规则的后续成语');
      return;
    }

    this.hintsRemaining.update(h => h - 1);
    const hintChars = Array.from(hintIdiom.w).slice(1); // Chars 1, 2, 3
    this.clearSlots();

    // Auto fill first unfilled slot
    const slots = ['', '', ''];
    slots[0] = hintChars[0];
    this.currentSlots.set(slots);

    // Mark keypad key
    const keypad = this.keypad();
    const used = [...this.keypadUsed()];
    const keyIdx = keypad.findIndex((k, i) => k === hintChars[0] && !used[i]);
    if (keyIdx !== -1) {
      used[keyIdx] = true;
      this.keypadUsed.set(used);
    }

    this.audio.playIdiom('fill');
    this.floatingText.show(`💡 推荐：${hintIdiom.w}`, window.innerWidth / 2, window.innerHeight / 2 - 80, { size: 'md', color: '#10b981' });
  }

  useShuffle() {
    if (this.shufflesRemaining() <= 0) return;
    this.shufflesRemaining.update(s => s - 1);
    this.refreshCurrentStep();
    this.audio.playIdiom('next');
    this.floatingText.show('🔄 已重置本节候选字盘', window.innerWidth / 2, window.innerHeight / 2 - 80, { size: 'sm', color: '#38bdf8' });
  }

  openCandidatesModal() {
    const tail = this.currentTail();
    if (!tail) return;
    const usedWords = new Set(this.solitaireChain().map(i => i.w));
    const successors = this.engine.findSuccessors(tail.lastChar, tail.lastPinyin, this.chainMode(), usedWords);
    this.candidatesList.set(successors);
    this.candidatesModalOpen.set(true);
  }

  selectCandidateIdiom(item: IdiomItem) {
    this.candidatesModalOpen.set(false);
    this.clearSlots();
    const chars = Array.from(item.w).slice(1);
    this.currentSlots.set(chars);
    setTimeout(() => this.submitSolitaire(), 150);
  }

  inspectIdiom(item: IdiomItem) {
    this.inspectedIdiom.set(item);
  }

  scrollChainToEnd() {
    if (this.chainScrollContainer?.nativeElement) {
      const el = this.chainScrollContainer.nativeElement;
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }
  }

  // ==========================================
  // PK Mode Logic
  // ==========================================

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

  onPkKeypadPress(char: string, index: number) {
    if (this.pkKeypadUsed()[index] || this.pkStore.isRoundOver()) return;

    const slots = [...this.pkSlots()];
    const emptyIdx = slots.findIndex(s => !s);
    if (emptyIdx === -1) return;

    slots[emptyIdx] = char;
    this.pkSlots.set(slots);

    const used = [...this.pkKeypadUsed()];
    used[index] = true;
    this.pkKeypadUsed.set(used);

    this.audio.playIdiom('fill');

    if (slots.every(s => !!s)) {
      const fullAnswer = [this.pkStore.targetChar(), ...slots];
      this.pkStore.submitFillAnswer(fullAnswer);
    }
  }

  onPkSlotClick(slotIdx: number) {
    if (this.pkStore.isRoundOver()) return;
    const char = this.pkSlots()[slotIdx];
    if (!char) return;

    const slots = [...this.pkSlots()];
    slots[slotIdx] = '';
    this.pkSlots.set(slots);

    const keyboard = this.pkStore.keyboard();
    const used = [...this.pkKeypadUsed()];
    const keyIdx = keyboard.findIndex((k, i) => k === char && used[i]);
    if (keyIdx !== -1) {
      used[keyIdx] = false;
      this.pkKeypadUsed.set(used);
    }

    this.audio.playIdiom('erase');
  }

  clearPkSlots() {
    this.pkSlots.set(['', '', '']);
    this.pkKeypadUsed.set(new Array(this.pkStore.keyboard().length).fill(false));
  }

  // ==========================================
  // Header & Navigation
  // ==========================================

  getHeaderSubtitle(): string {
    if (this.pkRoomId()) {
      return '双人神龙争夺战';
    }
    return this.chainMode() === 'exact' ? '真·成语接龙 · 同字严谨模式' : '真·成语接龙 · 同音趣味模式';
  }

  handleHeaderBack() {
    if (this.pkRoomId()) {
      this.leavePkRoom();
    } else {
      this.goBack();
    }
  }

  override handleJoinRoom(event: { roomId: string; mode: string; difficulty: string; host: string; password?: string }) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinPkRoom(event.roomId, event.mode, event.difficulty || '', event.host);
    this.isMobileSidebarOpen.set(false);
  }

  override handleCreateRoom(event: { name: string; mode: string; difficulty: string; password?: string; target?: number }) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinPkRoom(event.name, event.mode, event.difficulty || '', this.playerId, event.target ?? 3);
    this.isMobileSidebarOpen.set(false);
  }
}
