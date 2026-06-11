import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ViewChildren, ElementRef, QueryList, effect, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { setupRoomLifecycle } from '../../../core/services/room-lifecycle';
import { WatersortStore } from './store/watersort.store';
import { TubeComponent } from './components/tube/tube.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { HintButtonComponent } from '../../../shared/components/hint-button/hint-button.component';
import { ToastService } from '../../../core/services/toast.service';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-watersort',
  standalone: true,
  imports: [
    CommonModule, TubeComponent, GameStartingOverlayComponent,
    GameWaitingRoomComponent, GameLobbyPanelComponent, GameRulesModalComponent,
    GameResultOverlayComponent, GameHeaderComponent, PlayerBadgeComponent,
    HintButtonComponent
  ],
  template: `
<div class="flex-grow flex flex-col lg:flex-row h-[calc(100vh-64px)] p-1 lg:p-4 gap-2 lg:gap-6 transition-colors duration-300 bg-[var(--color-bg-base)] text-[var(--color-text-main)] overflow-y-auto lg:overflow-hidden select-none overscroll-none">
    
    <!-- LEFT: Main Game Area -->
    <div class="flex-grow flex flex-col items-center relative min-w-0 min-h-[600px] lg:min-h-0">
      <div class="w-full h-full flex flex-col overflow-hidden backdrop-blur-xl border rounded-2xl lg:rounded-3xl p-3 lg:p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300"
           style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        
        <!-- Header -->
        <app-game-header
          [title]="i18n.t('app.title.watersort')()"
          [subtitle]="currentRoomMode() === 'pk_speed' ? i18n.t('game.speed_mode')() : i18n.t('game.mode_single_player')()"
          iconGradientClass="from-blue-500 to-cyan-500"
          titleGradientClass="from-blue-400 to-cyan-400"
          shadowClass="shadow-cyan-500/20"
          headerBgClass="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-t-2xl lg:rounded-t-3xl -mx-3 lg:-mx-5 -mt-3 lg:-mt-5 px-3 lg:px-5 pb-2 mb-2 lg:mb-3"
          (back)="goBack()"
          (rules)="showRules.set(true)">
          
          <img game-icon src="/assets/games/icons/watersort.svg" alt="Water Sort" class="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 drop-shadow-md" />

          <ng-container header-right>
            <div class="flex items-center gap-1 sm:gap-2 lg:gap-4">
              @if (currentRoomMode() === 'single') {
                <!-- Difficulty Button -->
                <div class="flex flex-col items-center relative">
                  <span class="text-[8px] lg:text-[10px] font-bold opacity-70 mb-0.5 lg:mb-1 uppercase tracking-widest">{{ i18n.t('game.difficulty')() }}</span>
                  <button (click)="isDifficultyModalOpen.set(!isDifficultyModalOpen())"
                    class="px-2 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl border border-[var(--color-border-card)] text-[10px] lg:text-sm font-bold bg-[var(--color-bg-main)] hover:bg-[var(--color-accent-to)] hover:text-[var(--color-bg-main)] transition-colors flex items-center gap-1 lg:gap-2 shadow-inner">
                    <span class="truncate max-w-[60px] sm:max-w-none">{{ getDifficultyText(currentRoomMode() === 'single' ? _store.localDifficulty() : currentDifficulty()) }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 lg:h-4 lg:w-4 shrink-0 transition-transform" [class.rotate-180]="isDifficultyModalOpen()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <!-- Dropdown Menu -->
                  @if (isDifficultyModalOpen()) {
                    <div class="absolute top-full right-0 mt-2 w-48 bg-[var(--color-bg-main)] rounded-xl shadow-2xl border border-[var(--color-border-card)] overflow-hidden z-50">
                      @for (diff of predefinedDifficulties; track diff.id) {
                        <button (click)="changeSingleDifficulty(diff.id); isDifficultyModalOpen.set(false)"
                          class="w-full text-left px-4 py-3 hover:bg-[var(--color-bg-card)] transition-colors border-b border-[var(--color-border-card)] last:border-0 flex flex-col"
                          [class.text-[var(--color-accent-to)]]="_store.localDifficulty() === diff.id"
                          [class.font-bold]="_store.localDifficulty() === diff.id">
                          <span class="text-sm">{{ i18n.t($any(diff.labelKey))() }}</span>
                          <span class="text-[10px] opacity-60 font-mono mt-0.5" [class.text-[var(--color-text-main)]]="_store.localDifficulty() !== diff.id">{{ diff.desc }}</span>
                        </button>
                      }
                      
                      <!-- Blind Mode Toggle -->
                      <div class="px-4 py-3 border-t border-[var(--color-border-card)] bg-[var(--color-bg-card)]">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" [checked]="isBlindMode()" (change)="toggleBlindMode($event)" class="w-4 h-4 rounded border-[var(--color-border-card)] text-[var(--color-accent-to)] focus:ring-[var(--color-accent-to)] bg-transparent">
                          <span class="text-xs font-bold text-[var(--color-text-main)]">开启盲猜模式</span>
                        </label>
                      </div>
                    </div>
                  }
                </div>
              }

              <button (click)="isMobileSidebarOpen.set(true)" class="p-1.5 lg:p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
            </div>
          </ng-container>
        </app-game-header>

        <!-- Board Area -->
        <div class="flex-1 flex flex-col relative min-h-0 overflow-hidden mt-2 w-full">
          @if (status === 'waiting' && currentRoomMode() !== 'single') {
            <app-game-waiting-room
              [gameId]="'watersort'"
              [mode]="currentRoomMode()"
              [roomId]="currentRoomId()"
              [difficulty]="_store.currentDifficulty() || 'easy'"
              [players]="playersList()"
              [hostId]="_store.hostId()"
              [currentUserId]="playerId"
              (leave)="returnToLobby()"
              (start)="playAgain()"
              (changeSettings)="openChangeSettings()"
              [readyPlayers]="_store.readyPlayers()"
              (kick)="_store.kickPlayer($event)"
              (ready)="_store.ready()"
              (cancelReady)="_store.cancelReady()">
            </app-game-waiting-room>
          } @else {

            <!-- Players / Opponents (Top) -->
            <div class="flex-none pt-2 pb-4 mb-2 border-b border-[var(--color-border-card)] shrink-0">
              <div class="w-full max-w-[800px] mx-auto flex gap-2 lg:gap-4 items-center px-2" [class.justify-center]="currentRoomMode() === 'single'">
                
                <!-- Local Player (You) -->
                <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
                  [playerName]="playerId"
                  [isHost]="playerId === _store.hostId()"
                  [isMe]="true"
                  [score]="0"
                  [stats]="[
                    { icon: '🔄', value: myMoves(), label: i18n.t('game.moves')() }
                  ]"
                  [status]="status === 'finished' ? 'finished' : 'playing'"></app-player-badge>

                @if (currentRoomMode() !== 'single' && opponentId()) {
                  <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
                    [playerName]="opponentId()!"
                    [isHost]="opponentId() === _store.hostId()"
                    [isMe]="false"
                    [score]="0"
                    [stats]="[
                      { icon: '🔄', value: opponentMoves(), label: i18n.t('game.moves')() }
                    ]"
                    [status]="status === 'finished' ? 'finished' : 'playing'"></app-player-badge>
                }
              </div>
            </div>

            <!-- Playing area wrapper to resolve absolute layout heights -->
            <div class="flex-grow flex-1 relative w-full min-h-0 flex items-center justify-center p-2 lg:p-4">
              
              <!-- Opponent Tubes (Mini) -->
              @if (currentRoomMode() !== 'single' && opponentId()) {
                <div class="absolute top-2 left-1/2 -translate-x-1/2 scale-[0.35] sm:scale-50 opacity-60 pointer-events-none origin-top transition-all">
                  <div class="flex flex-wrap justify-center gap-2 sm:gap-4 max-w-lg">
                     @for (tube of opponentTubes(); track $index) {
                       <app-tube [colors]="tube.colors" [capacity]="4"></app-tube>
                     }
                  </div>
                </div>
              }

              <!-- My Board -->
              <div class="flex flex-wrap justify-center gap-3 sm:gap-6 md:gap-8 lg:gap-12 w-full max-w-4xl mt-auto mb-auto relative" [class.mt-32]="currentRoomMode() !== 'single'">
                @for (tube of myTubes(); track $index) {
                  <app-tube #tubeElements
                    class="transform z-10 transition-all duration-300 ease-in-out"
                    [class.is-receiving]="pouringState?.step === 'pouring' && pouringState?.to === $index"
                    [class.hover:scale-105]="pouringState === null"
                    [style.transform]="getTubeTransform($index)"
                    [style.z-index]="getTubeZIndex($index)"
                    [colors]="tube.colors" 
                    [capacity]="4"
                    [selected]="selectedTubeIndex === $index"
                    [isBlindMode]="isBlindMode()"
                    (tubeClick)="onTubeClick($index)"
                  ></app-tube>
                }
              </div>

              <!-- Starting Countdown Overlay -->
              @if (status === 'starting') {
                <app-game-starting-overlay [countdown]="gameTimer.countdownDisplay()"></app-game-starting-overlay>
              }





              <!-- Hint Floating Button -->
              @if (status === 'playing' && currentRoomMode() === 'single') {
                <div class="absolute bottom-4 right-4 z-20 flex flex-col gap-3 items-end">
                  <app-hint-button layout="compact" class="block shadow-lg hover:scale-105 active:scale-95 transition-all bg-[var(--color-bg-main)] rounded-lg" (hintApplied)="applyHint()"></app-hint-button>
                </div>
              }

            </div>
          }
          
          <!-- Game Over Overlay -->
          @if (status === 'finished' && showOverlay()) {
            <app-game-result-overlay
              currentGameId="watersort"
              [status]="didIWin() ? 'win' : 'lose'"
              [title]="didIWin() ? i18n.t('game.you_win')() : (currentRoomMode() === 'single' ? i18n.t('game.game_over')() : i18n.t('game.you_lose')())"
              [stats]="[{ label: i18n.t('game.moves')(), value: myMoves() }]"
              [showLeave]="currentRoomMode() === 'single' || !isHost()"
              [showRestart]="currentRoomMode() === 'single' || isHost()"
              [showDismiss]="currentRoomMode() !== 'single' && isHost()"
              (leave)="returnToLobby()"
              (restart)="playAgain()"
              (dismiss)="dismissRoom()">
            </app-game-result-overlay>
          }
        </div>
      </div>
    </div>

    <!-- Sidebar Overlay Backdrop -->
    @if (isMobileSidebarOpen()) {
      <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-40 lg:hidden" (click)="isMobileSidebarOpen.set(false)"></div>
    }

    <!-- Sidebar -->
    <div class="flex-shrink-0 transition-transform duration-300"
         [ngClass]="{
           'fixed inset-y-0 right-0 z-50 w-[85vw] sm:w-96 bg-[var(--color-bg-main)] shadow-2xl p-4 flex flex-col': true,
           'translate-x-0': isMobileSidebarOpen(),
           'translate-x-full': !isMobileSidebarOpen(),
           'lg:relative lg:inset-auto lg:w-80 lg:shadow-none lg:p-0 lg:z-auto lg:translate-x-0': currentRoomId() === '' || currentRoomMode() === 'single'
         }">
      
      <div class="flex justify-between items-center mb-4" [class.lg:hidden]="currentRoomId() === '' || currentRoomMode() === 'single'">
        <h3 class="font-bold text-lg text-[var(--color-text-main)]"><ng-container i18n="@@game.room_info">game.room_info</ng-container></h3>
      </div>

      <!-- PK Lobby Panel -->
      <app-game-lobby-panel
        #lobbyPanel
        class="flex-grow flex"
        [currentGameId]="'watersort'"
        [currentRoomId]="currentRoomId()"
        (joinRoom)="handleJoinRoom($event)"
        (createRoom)="handleCreateRoom($event)">
      </app-game-lobby-panel>
    </div>

  </div>
  
  <app-game-rules-modal [gameId]="'watersort'" [isOpen]="showRules()" (closed)="showRules.set(false)"></app-game-rules-modal>
  `,
  styles: [`
    .is-receiving {
      animation: pour-vibrate 0.1s linear infinite;
    }
    ::ng-deep .is-receiving .liquid-layer:first-child {
      animation: liquid-wave 0.15s infinite alternate;
      transform-origin: bottom;
    }
    @keyframes pour-vibrate {
      0% { transform: translate(0, 0); }
      25% { transform: translate(-0.5px, 0.5px); }
      50% { transform: translate(0.5px, -0.5px); }
      75% { transform: translate(0.5px, 0.5px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes liquid-wave {
      0% { transform: scaleY(1); }
      100% { transform: scaleY(1.05); filter: brightness(1.2); }
    }
  `]
})
export class WatersortComponent extends BaseGameComponent implements OnInit, OnDestroy {
@ViewChild('lobbyPanel') lobbyPanel!: GameLobbyPanelComponent;
  @ViewChildren('tubeElements', { read: ElementRef }) tubeElements!: QueryList<ElementRef>;
  public i18n = inject(I18nService);
  public _store = inject(WatersortStore);
  private authStore = inject(AuthStore);
  public timerService = inject(GameTimerService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private audioService = inject(AudioService);
  
  showRules = signal(false);
  showOverlay = signal(false);

  get store() { return this._store; }
  override get playerId() { return this.authStore.currentUser()?.username || this.authStore.guestId; }
  
  private cdr = inject(ChangeDetectorRef);

  pouringState: {
    from: number,
    to: number,
    color: string,
    step: 'flying' | 'pouring' | 'returning',
    deltaX: number,
    deltaY: number,
    angle: number,
    streamX: number,
    streamY: number,
    streamHeight: number
  } | null = null;
  
  private roomLifecycle = setupRoomLifecycle({
    gameId: 'watersort',
    getCurrentMode: () => this._store.currentRoomMode(),
    onLeaveRoom: () => {
      this._store.leaveRoom();
      this.roomLifecycle.clearReconnectInfo();
    },
  });

  selectedTubeIndex: number | null = null;

  get status() { return this._store.status(); }
  get myId() { return this.playerId; }
  
  currentRoomMode() { return this._store.currentRoomMode(); }
  currentRoomId() { return this._store.roomId(); }
  currentDifficulty() { return this._store.currentDifficulty(); }

  constructor() {
    super();
    effect((onCleanup) => {
      const status = this._store.status();
      if (status === 'starting') {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }

      if (status === 'finished') {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    }, { allowSignalWrites: true });
  }

  override ngOnInit() {
    super.ngOnInit();
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this._store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '', this.myId);
      if (pending.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      const savedDiff = localStorage.getItem('watersort_single_diff') || 'easy';
      const uniqueLocalRoom = 'local_' + this.myId;
      this._store.joinRoom(uniqueLocalRoom, 'single', savedDiff, this.myId, this.myId);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this._store.leaveRoom();
  }

  isDifficultyModalOpen = signal(false);
  selectedDifficulty = signal('easy');
  isBlindMode = signal(false);
  predefinedDifficulties = [
    { id: 'easy', labelKey: 'game.diff_watersort_easy', desc: '7 Tubes (5 Colors)' },
    { id: 'medium', labelKey: 'game.diff_watersort_medium', desc: '11 Tubes (9 Colors)' },
    { id: 'hard', labelKey: 'game.diff_watersort_hard', desc: '16 Tubes (14 Colors)' }
  ];

  openDifficultySettings() {
    this.selectedDifficulty.set(this._store.currentDifficulty() || 'easy');
    this.isDifficultyModalOpen.set(true);
  }

  changeSingleDifficulty(diff: string) {
    localStorage.setItem('watersort_single_diff', diff);
    this._store.leaveRoom();
    setTimeout(() => {
      const uniqueLocalRoom = 'local_' + this.myId + '_' + Date.now();
      this.wsService.setPendingAction('create');
      this._store.joinRoom(uniqueLocalRoom, 'single', diff, this.myId, this.myId);
    }, 100);
  }

  toggleBlindMode(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.isBlindMode.set(checked);
  }

  getDifficultyText(diff: string) {
    return this.i18n.t(`game.diff_watersort_${diff}`)();
  }

  isHost(): boolean {
    return this._store.hostId() === this.myId;
  }

  playersList(): any[] {
    return this._store.playersList() as any[];
  }

  myTubes() {
    const player = this._store.players()[this.myId];
    return player ? player.tubes : [];
  }

  myMoves() {
    const player = this._store.players()[this.myId];
    return player ? player.moves : 0;
  }

  opponentId(): string | null {
    const players = this.playersList();
    const opp = players.find((p: any) => p.id !== this.myId);
    return opp ? opp.id : null;
  }

  opponentTubes() {
    const oppId = this.opponentId();
    if (!oppId) return [];
    const player = this._store.players()[oppId];
    return player ? player.tubes : [];
  }

  opponentMoves() {
    const oppId = this.opponentId();
    if (!oppId) return 0;
    const player = this._store.players()[oppId];
    return player ? player.moves : 0;
  }

  didIWin(): boolean {
    return this._store.winners().includes(this.myId);
  }

  isValidPour(from: number, to: number): boolean {
    const fromTube = this.myTubes()[from];
    const toTube = this.myTubes()[to];
    if (from === to || fromTube.colors.length === 0 || toTube.colors.length === 4) return false;
    if (toTube.colors.length === 0) return true;
    return fromTube.colors[fromTube.colors.length - 1] === toTube.colors[toTube.colors.length - 1];
  }

  getTubeTransform(index: number): string {
    if (this.pouringState?.from === index) {
      if (this.pouringState.step !== 'returning') {
        return `translate(${this.pouringState.deltaX}px, ${this.pouringState.deltaY}px) rotate(${this.pouringState.angle}deg)`;
      } else {
        return `translate(0px, 0px) rotate(0deg)`;
      }
    }
    return '';
  }

  getTubeZIndex(index: number): number {
    if (this.pouringState?.from === index) return 50;
    if (this.pouringState?.to === index) return 20;
    return 10;
  }

  triggerPourAnimation(fromIndex: number, toIndex: number) {
    if (this.pouringState) return; // Wait for current animation to finish

    const fromEl = this.tubeElements.get(fromIndex)?.nativeElement;
    const toEl = this.tubeElements.get(toIndex)?.nativeElement;
    if (fromEl && toEl) {
      const fromWrapper = fromEl.querySelector('.tube-wrapper') || fromEl;
      const toWrapper = toEl.querySelector('.tube-wrapper') || toEl;

      const fromRect = fromWrapper.getBoundingClientRect();
      const toRect = toWrapper.getBoundingClientRect();
      
      const fromTube = this.myTubes()[fromIndex];
      const color = fromTube.colors[fromTube.colors.length - 1];

      const w = fromRect.width;
      const h = fromRect.height;
      const C0_x = fromRect.left + w / 2;
      const C0_y = fromRect.top + h / 2;

      const deltaX = toRect.left - fromRect.left;
      const isRight = deltaX >= 0;
      
      const angleDeg = isRight ? 105 : -105;
      const a = angleDeg * Math.PI / 180;

      // Target mouth position
      const M_target_x = toRect.left + toRect.width / 2;
      const M_target_y = toRect.top - 15;

      // The pouring point is the lower corner of the tilted mouth
      const cornerX = isRight ? w / 2 : -w / 2;
      const cornerY = -h / 2;

      const rotX = cornerX * Math.cos(a) - cornerY * Math.sin(a);
      const rotY = cornerX * Math.sin(a) + cornerY * Math.cos(a);

      const C1_x = M_target_x - rotX;
      const C1_y = M_target_y - rotY;

      const tx = C1_x - C0_x;
      const ty = C1_y - C0_y;

      const toTube = this.myTubes()[toIndex];
      
      // Calculate how many layers will be poured
      let pourCount = 0;
      for (let i = fromTube.colors.length - 1; i >= 0; i--) {
        if (fromTube.colors[i] === color) pourCount++;
        else break;
      }
      const availableSpace = 4 - toTube.colors.length;
      pourCount = Math.min(pourCount, availableSpace);

      // Target tube's empty space fraction AFTER pouring
      const newLen = toTube.colors.length + pourCount;
      const emptyRatio = (4 - newLen) / 4;
      
      // Precise calculation: the liquid container has 8px top margin and 4px bottom margin.
      // Tube inner height is toRect.height - 12.
      // Stream starts 15px above the tube top, so it travels 15 + 8 + empty space + 10px (to penetrate surface slightly)
      const streamLen = 33 + ((toRect.height - 12) * emptyRatio);

      this.pouringState = {
        from: fromIndex,
        to: toIndex,
        color: color,
        step: 'flying',
        deltaX: tx,
        deltaY: ty,
        angle: angleDeg,
        streamX: M_target_x,
        streamY: M_target_y,
        streamHeight: streamLen
      };

      // Step 2: pouring
      setTimeout(() => {
        if (this.pouringState) this.pouringState.step = 'pouring';
        this.cdr.markForCheck();
        
        this.audioService.playWaterSort('pour');

        // Trigger actual state change so liquid level changes
        this._store.pour(fromIndex, toIndex);

        // Step 3: returning
        setTimeout(() => {
          if (this.pouringState) this.pouringState.step = 'returning';
          this.cdr.markForCheck();
          
          // Step 4: done
          setTimeout(() => {
            if (this.pouringState?.step === 'returning') {
              const toTube = this.myTubes()[toIndex];
              if (toTube && toTube.colors.length === 4 && toTube.colors.every((c: string) => c === toTube.colors[0])) {
                this.audioService.playWaterSort('bottle_full');
              }
              this.pouringState = null;
              this.cdr.markForCheck();
            }
          }, 300);
        }, 350); // Pouring duration
      }, 300); // Flying duration
    }
  }

  onTubeClick(index: number) {
    if (this.status !== 'playing') return;
    if (this.pouringState) return; // Prevent clicking while animating
    
    if (this.selectedTubeIndex === null) {
      const tube = this.myTubes()[index];
      if (tube && tube.colors.length > 0) {
        this.selectedTubeIndex = index;
        this.audioService.playWaterSort('clink');
      }
    } else {
      if (this.selectedTubeIndex !== index) {
        if (this.isValidPour(this.selectedTubeIndex, index)) {
          this.triggerPourAnimation(this.selectedTubeIndex, index);
        } else {
          this.audioService.playWaterSort('clink'); // Play clink on deselect/invalid target
        }
      } else {
        this.audioService.playWaterSort('clink'); // Play clink on deselecting same tube
      }
      this.selectedTubeIndex = null;
    }
  }

  applyHint() {
    if (this.status !== 'playing') return;
    const myTubes = this.myTubes();
    let bestMove: { from: number, to: number } | null = null;
    let fallbackMove: { from: number, to: number } | null = null;

    for (let i = 0; i < myTubes.length; i++) {
      const source = myTubes[i];
      if (source.colors.length === 0) continue;
      
      const isSolid = source.colors.every(c => c === source.colors[0]);
      if (isSolid && source.colors.length === 4) continue;

      const topColor = source.colors[source.colors.length - 1];

      for (let j = 0; j < myTubes.length; j++) {
        if (i === j) continue;
        const target = myTubes[j];
        if (target.colors.length === 4) continue;

        if (target.colors.length === 0) {
          if (!isSolid) {
            fallbackMove = { from: i, to: j };
          }
        } else {
          const targetTop = target.colors[target.colors.length - 1];
          if (topColor === targetTop) {
            bestMove = { from: i, to: j };
            break;
          }
        }
      }
      if (bestMove) break;
    }

    const move = bestMove || fallbackMove;
    if (move) {
      this.triggerPourAnimation(move.from, move.to);
      // this._store.pour(move.from, move.to); // Handled in triggerPourAnimation
    } else {
      // Use friendly toast instead of native alert
      const msg = this.i18n.t('game.no_solution')() || 'No moves available!';
      this.toastService.show(msg, 'error');
      
      // Auto restart after a short delay
      setTimeout(() => {
        this._store.restart();
        this.selectedTubeIndex = null;
      }, 2000);
    }
  }

  restart() {
    if (confirm(this.i18n.t('watersort.restart_confirm')())) {
      this._store.restart();
      this.selectedTubeIndex = null;
    }
  }

  playAgain() {
    this._store.restartGame();
  }

  returnToLobby() {
    this._store.leaveRoom();
    this.roomLifecycle.clearReconnectInfo();
    const uniqueLocalRoom = 'local_' + this.myId;
    this._store.joinRoom(uniqueLocalRoom, 'single', 'easy', this.myId, this.myId);
  }

  goBack() {
    if (this.currentRoomMode() !== 'single') {
      this._store.leaveRoom();
    }
    this.router.navigate(['/lobby']);
  }

  override handleCreateRoom(config: {name: string, mode: string, difficulty: string, password?: string}): void {
    super.handleCreateRoom(config);
    if (config.password) this.wsService.setPendingPassword(config.password);
    this._store.joinRoom(config.name, config.mode, config.difficulty, this.myId, this.myId);
    if (config.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(config.name, config.mode, config.difficulty, this.myId);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string, password?: string}): void {
    super.handleJoinRoom(event);
    if (event.password) this.wsService.setPendingPassword(event.password);
    this._store.joinRoom(event.roomId, event.mode, event.difficulty, event.host, this.myId);
    if (event.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(event.roomId, event.mode, event.difficulty, event.host);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleDismissRoom(): void {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  openChangeSettings() {
    if (this.lobbyPanel) {
      this.lobbyPanel.openCreateRoomModal();
    }
  }

  dismissRoom() {
    this._store.dismissRoom();
  }
}
