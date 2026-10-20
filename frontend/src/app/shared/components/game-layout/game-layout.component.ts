import { Component, Input, Output, EventEmitter, inject, ViewChild, OnInit, OnChanges, SimpleChanges, booleanAttribute, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { GameMode, GameStatus } from '../../../core/models/game.model';
import { GameHeaderComponent } from '../game-header/game-header.component';
import { GameRulesModalComponent } from '../game-rules-modal/game-rules-modal.component';
import { DifficultySelectorComponent } from '../difficulty-selector/difficulty-selector.component';
import { FloatingEmojiComponent } from '../floating-emoji/floating-emoji.component';
import { SettingsService } from '../../../core/services/settings.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { FriendService } from '../../../core/services/friend.service';
import { EditRoomService } from '../../../core/services/edit-room.service';
import { GhostChallengeService, GhostChallenge } from '../../../core/services/ghost-challenge.service';
import { OfflineBannerComponent } from '../offline-banner/offline-banner.component';
import { LiveRoomService } from '../../../core/services/live-room.service';
import { ZenModeService } from '../../../core/services/zen-mode.service';

@Component({
  selector: 'app-game-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GameHeaderComponent, GameRulesModalComponent, DifficultySelectorComponent, FloatingEmojiComponent, OfflineBannerComponent],
  template: `
<div class="flex w-full flex-col relative text-[var(--color-text-main)] select-none bg-[var(--color-bg-base)]"
     [ngClass]="zenService.isZenMode() ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-[calc(100dvh-64px)]'">
  <!-- Offline Mode Banner -->
  @if (!zenService.isZenMode()) {
    <app-offline-banner></app-offline-banner>
  }

  <!-- Rules Modal -->
  <app-game-rules-modal [gameId]="gameId" [isOpen]="showRules" (closed)="rulesClosed.emit()"></app-game-rules-modal>

  <!-- Top Game Header Bar -->
  <div class="w-full max-w-[1600px] mx-auto pt-1 sm:pt-1.5 px-2 sm:px-4 lg:px-6 z-40 sticky top-0 pb-1">
    <div class="w-full backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl lg:rounded-3xl shadow-sm overflow-hidden" style="background-color: var(--color-bg-card);">
      <app-game-header (titleClick)="titleClick.emit()"
        [title]="title"
        [subtitle]="subtitle"
        [iconGradientClass]="iconGradientClass"
        [titleGradientClass]="titleGradientClass"
        [shadowClass]="shadowClass"
        [headerBgClass]="headerBgClass"
        (back)="back.emit()"
        (rules)="rulesOpen.emit()"
      >
        <div game-icon class="text-xl sm:text-2xl md:text-3xl drop-shadow-md">{{ icon }}</div>

        <ng-container header-center>
          @if (currentRoomMode === GameMode.Single && !hideDefaultDifficulty && availableDifficulties.length > 1) {
            <app-difficulty-selector 
              [availableDifficulties]="availableDifficulties"
              [currentDifficulty]="currentDifficulty"
              (difficultyChange)="onDifficultyChange($event)">
            </app-difficulty-selector>
          }
          <ng-content select="[header-center]"></ng-content>
        </ng-container>

        <ng-container header-right>
          <div class="flex items-center gap-1 sm:gap-2">
            <ng-content select="[header-right]"></ng-content>

            @if (currentRoomMode === GameMode.Single && status !== GameStatus.Waiting && settingsService.settings().multiplayer_enabled === 'true') {
              @if (waitingRoomForThisGame(); as targetRoom) {
                <button (click)="liveRoom.quickJoin(targetRoom)"
                        class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all animate-pulse shrink-0"
                        [attr.title]="i18n.t('lobby.quick_join')()">
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span class="hidden xl:inline">⚡ {{ i18n.t('lobby.quick_join')() }}</span>
                  <span class="xl:hidden">⚡ {{ i18n.currentLang() === 'zh' ? '迎战' : 'Join' }}</span>
                </button>
              } @else {
                <button (click)="quickCreatePkRoom()"
                        class="px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all text-xs font-bold flex items-center gap-0.5 sm:gap-1 shadow-sm active:scale-95 group shrink-0"
                        [title]="i18n.t('game.quick_pk')() || '开房PK'">
                  <span class="group-hover:scale-110 transition-transform">⚔️</span>
                  <span class="hidden xl:inline">{{ i18n.t('game.quick_pk')() || '开房PK' }}</span>
                  <span class="xl:hidden text-[11px]">PK</span>
                </button>
              }
              <button (click)="openFriendList()"
                      class="hidden sm:flex px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold items-center gap-1 shadow-sm active:scale-95 group shrink-0"
                      [title]="i18n.t('game.invite_friend_pk')() || '邀请好友PK'">
                <span class="group-hover:scale-110 transition-transform">👥</span>
                <span class="hidden xl:inline">{{ i18n.t('game.invite_friend_pk')() || '邀请好友PK' }}</span>
                <span class="xl:hidden text-[11px]">{{ i18n.t('game.invite')() || '邀请' }}</span>
              </button>
            }

            @if (showPlayAgainBtn) {
              <button (click)="playAgain.emit()"
                      class="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 group"
                      [title]="i18n.t('game.space_shortcut_hint')() || 'Press Space or R to restart'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.play_again')() }}</span>
                <span class="hidden lg:inline text-[10px] opacity-75 font-mono">Space</span>
              </button>
            }

            @if (showLeaveBtn) {
              <button (click)="back.emit()" class="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.leave')() }}</span>
              </button>
            }
          </div>
        </ng-container>
      </app-game-header>
    </div>
  </div>

  <!-- Central Game Focus Arena (Spacious, Centered, Distraction-Free) -->
  <main class="flex-grow flex flex-col items-center w-full max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 py-1 sm:py-2">
    
    <!-- Guest Playing in PK Room Badge (Unranked play) -->
    @if (currentRoomId && !authStore.isAuthenticated()) {
      <div class="mb-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-bold flex items-center gap-1.5 shadow-sm animate-fade-in">
        <span>👀</span>
        <span>{{ i18n.t('pk.guest_badge')() }}</span>
      </div>
    }

    <!-- Active Ghost Challenge Banner -->
    @if (ghostChallenge(); as ch) {
      <div class="w-full mb-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 backdrop-blur-md flex items-center justify-between gap-3 shadow-md animate-pulse">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-xl">⚔️</span>
          <div class="text-xs">
            <span class="font-bold text-amber-400">{{ i18n.t('challenge.ghost_title')() }}: 正在挑战 {{ ch.challenger_name }} 的战绩！</span>
            <span class="text-[var(--color-text-muted)] ml-2">
              目标:
              @if (ch.target_time > 0) {
                <b class="text-[var(--color-text-main)] font-mono">{{ formatChallengeTime(ch.target_time) }}</b>
              } @else {
                <b class="text-[var(--color-text-main)] font-mono">{{ ch.target_score }} 分</b>
              }
            </span>
          </div>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap">
          幽灵擂台
        </span>
      </div>
    }

    <!-- The Game Stage (Canvas / Board Container - Seamless & Integrated) -->
    <div class="w-full flex-grow flex flex-col items-center justify-center border border-[var(--color-border-card)] bg-[var(--color-bg-card)] rounded-2xl lg:rounded-3xl shadow-sm transition-colors duration-300 p-1 sm:p-2.5 min-h-[320px] sm:min-h-[420px] relative touch-none overscroll-none">
      <!-- Project custom game components here -->
      <ng-content></ng-content>
    </div>

    <!-- Emoji Broadcast Bar (When inside multiplayer room) -->
    @if (currentRoomId) {
      <div class="w-full flex justify-center gap-2 mt-3 animate-fade-in">
        @for (em of ['👏', '🎉', '😡', '😭', '⏱️', '💡']; track em) {
          <button (click)="sendEmoji(em)" class="w-9 h-9 sm:w-11 sm:h-11 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-full text-lg sm:text-xl flex items-center justify-center hover:scale-110 hover:border-amber-500/50 transition-all shadow-md active:scale-95" [title]="i18n.t('game.send_emoji')()">
            {{ em }}
          </button>
        }
      </div>
    }

  </main>

  <!-- In-depth Strategy & SEO Section (Moved Gracefully Below Arena) -->
  @if (!zenService.isZenMode()) {
    <section class="w-full max-w-[1200px] mx-auto px-3 sm:px-6 mt-6 sm:mt-10 pb-12">
      <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-5 sm:p-8 shadow-sm">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-card)]">
          <h2 class="text-base sm:text-lg font-bold text-[var(--color-text-main)] flex items-center gap-2">
            <span>{{ i18n.t('game.strategy_guide_title')() || '🧠 深度解谜策略与游戏说明' }}</span>
          </h2>
          @if (relatedGuideSlug) {
            <a [routerLink]="['/', i18n.currentLang(), 'blog', relatedGuideSlug]"
               class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-[var(--color-accent-from)] border border-[var(--color-accent-from)]/30 bg-[var(--color-accent-from)]/10 hover:bg-[var(--color-accent-from)]/20 transition-all">
              📖 {{ i18n.t('game.read_guide')() }}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          }
        </div>
        <div class="markdown-body text-[var(--color-text-secondary)] text-xs sm:text-sm leading-relaxed" 
             [innerHTML]="i18n.t(computedSeoDescKey)()">
        </div>

        @if (relatedGuideSlug) {
          <div class="mt-6 pt-5 border-t border-[var(--color-border-card)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--color-bg-main)]">
            <div class="flex items-center gap-3">
              <span class="text-2xl p-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-inner">📚</span>
              <div>
                <div class="text-xs font-bold text-[var(--color-accent-from)]">{{ i18n.t('game.guide_callout_tag')() }}</div>
                <div class="text-xs sm:text-sm font-semibold text-[var(--color-text-main)] mt-0.5">{{ i18n.t('game.guide_callout_title')() }}</div>
              </div>
            </div>
            <a [routerLink]="['/', i18n.currentLang(), 'blog', relatedGuideSlug]"
               class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0">
              📖 {{ i18n.t('game.read_full_guide')() }}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        }
      </div>
    </section>
  }

  <app-floating-emoji></app-floating-emoji>
  
  <!-- Overlay slot for dragged pieces that must escape overflow: hidden / backdrop-filter -->
  <ng-content select="[game-overlay]"></ng-content>
</div>
  `
})
export class GameLayoutComponent implements OnInit, OnChanges {
  settingsService = inject(SettingsService);
  zenService = inject(ZenModeService);
  i18n = inject(I18nService);
  gameRegistry = inject(GameRegistryService);
  authStore = inject(AuthStore);
  private authModal = inject(AuthModalService);
  private router = inject(Router);
  wsService = inject(WebSocketService);
  friendService = inject(FriendService);
  editRoomService = inject(EditRoomService);
  liveRoom = inject(LiveRoomService);
  private route = inject(ActivatedRoute);
  private ghostChallengeService = inject(GhostChallengeService);

  readonly waitingRoomForThisGame = computed(() => {
    const myId = this.liveRoom.currentUserId();
    return this.liveRoom.waitingRooms().find(r => r.game === this.gameId && r.host !== myId);
  });

  ghostChallenge = signal<GhostChallenge | null>(null);

  isPkDrawerOpen = signal(false);

  togglePkDrawer(open?: boolean) {
    if (typeof open === 'boolean') {
      this.isPkDrawerOpen.set(open);
    } else {
      this.isPkDrawerOpen.update(v => !v);
    }
    if (!this.isPkDrawerOpen()) {
      this.mobileSidebarClosed.emit();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if ((event.code === 'Space' || event.key === 'r' || event.key === 'R') && this.showPlayAgainBtn) {
      event.preventDefault();
      this.playAgain.emit();
    }
  }

  @Input({ required: true }) gameId!: string;
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() icon: string = '';
  @Input() iconGradientClass: string = '';
  @Input() titleGradientClass: string = '';
  @Input() shadowClass: string = '';
  @Input() headerBgClass: string = '';
  
  @Input() currentRoomMode: string = GameMode.Single;
  @Input() currentRoomId: string | null = null;
  @Input() status: string = GameStatus.Waiting;
  @Input() isHost: boolean = false;
  
  @Input() showRules: boolean = false;
  @Input() showMobileSidebar: boolean = false;
  @Input() hideLeftPanel: boolean = false;
  @Input({ transform: booleanAttribute }) hideDefaultDifficulty: boolean = false;
  
  @Input() seoDescKey?: string;

  @Input() showPlayAgainBtn: boolean = false;
  @Input() showLeaveBtn: boolean = false;

  @Input() currentDifficulty: string = '';

  @Output() rulesClosed = new EventEmitter<void>();
  @Output() rulesOpen = new EventEmitter<void>();
  @Output() titleClick = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  @Output() playAgain = new EventEmitter<void>();
  @Output() navigateToPk = new EventEmitter<void>();
  @Output() joinRoom = new EventEmitter<any>();
  @Output() createRoom = new EventEmitter<any>();
  @Output() mobileSidebarClosed = new EventEmitter<void>();
  @Output() difficultyChange = new EventEmitter<string>();

  GameMode = GameMode;
  GameStatus = GameStatus;

  availableDifficulties: { id: string, labelKey: string, descKey?: string, desc?: string }[] = [];

  ngOnInit() {
    if (this.gameId) {
      const config = this.gameRegistry.getConfig(this.gameId);
      if (config && config.difficulties) {
        this.availableDifficulties = config.difficulties;
      }
    }

    const challengeId = this.route.snapshot.queryParams['challengeId'];
    if (challengeId) {
      this.ghostChallengeService.getChallenge(challengeId).subscribe({
        next: ch => this.ghostChallenge.set(ch),
        error: () => {},
      });
    }
  }

  formatChallengeTime(seconds: number): string {
    if (seconds <= 0) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentRoomId'] && changes['currentRoomId'].currentValue) {
      this.togglePkDrawer(false);
    }
  }

  handleJoinRoomFromLobby(event: any) {
    this.togglePkDrawer(false);
    this.joinRoom.emit(event);
  }

  handleCreateRoomFromLobby(event: any) {
    this.togglePkDrawer(false);
    this.createRoom.emit(event);
  }

  onDifficultyChange(newDiff: string) {
    this.currentDifficulty = newDiff;
    this.difficultyChange.emit(newDiff);
  }

  get computedSeoDescKey() {
    return this.seoDescKey || `game.${this.gameId}.seo_desc`;
  }

  /** gameId → blog post slug for internal linking (only posts already published
   *  in the production DB are listed; extend after importing new articles). */
  static readonly RELATED_GUIDES: Record<string, string> = {
    minesweeper: 'minesweeper-logic',
    sudoku: 'sudoku-benefits',
    gomoku: 'gomoku-strategy-guide',
    nonogram: 'nonogram-strategy',
    sokoban: 'sokoban-strategy',
    watersort: 'water-sort-puzzle-guide',
    tetris: 'tetris-battle-strategy',
    codebreaker: '1a2b-bulls-cows',
    math24: 'why-math24-is-the-best-brain-training-game-for-kids',
    sliding: 'sliding-puzzle-strategy',
    hexa: 'hexa-puzzle-strategy',
    block: 'block-puzzle-strategy',
    lightsout: 'lights-out-puzzle-guide',
    classic2048: 'classic2048-strategy',
    hashi: 'hashi-bridges-strategy',
    drop2048: 'classic2048-strategy',
    connect: 'gomoku-strategy-guide',
    idiom: 'benefits-of-multiplayer-educational-games',
  };

  get relatedGuideSlug(): string | null {
    return GameLayoutComponent.RELATED_GUIDES[this.gameId] || null;
  }

  openUpdateRoomModal(data: any) {
    this.editRoomService.open({
      roomId: data.id || data.roomId || this.currentRoomId || '',
      gameId: data.game || data.gameId || this.gameId,
      mode: data.mode || '',
      difficulty: data.difficulty || this.currentDifficulty,
      target: data.target ?? 1
    });
  }

  quickCreatePkRoom() {
    this.togglePkDrawer(false);
    if (!this.authStore.isAuthenticated()) {
      this.authModal.open({ returnUrl: this.router.url });
      return;
    }
    const config = this.gameRegistry.getConfig(this.gameId);
    if (!config) return;
    const pkMode = config.modes.find(m => m.id !== GameMode.Single);
    if (!pkMode) return;
    const username = this.authStore.currentUser()?.username || this.authStore.guestId;
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const name = `${username}-${suffix}`;
    this.createRoom.emit({
      name,
      gameId: this.gameId,
      mode: pkMode.id,
      difficulty: this.currentDifficulty,
      target: 1
    });
  }

  openChangeSettingsGlobal() {
    if (this.currentRoomId) {
      this.editRoomService.open({
        roomId: this.currentRoomId,
        gameId: this.gameId,
        mode: this.currentRoomMode,
        difficulty: this.currentDifficulty
      });
    }
  }

  openFriendList() {
    if (!this.authStore.isAuthenticated()) {
      this.authModal.open({ returnUrl: this.router.url });
      return;
    }
    this.friendService.togglePanel(true, {
      gameId: this.gameId,
      difficulty: this.currentDifficulty,
      mode: this.currentRoomMode
    });
  }

  sendEmoji(emoji: string) {
    this.wsService.sendEmoji(emoji);
  }
}
