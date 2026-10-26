import { Component, Input, Output, EventEmitter, inject, ViewChild, OnInit, OnChanges, SimpleChanges, booleanAttribute, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { GameMode, GameStatus, GameResultType } from '../../../core/models/game.model';
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
import { FeedbackModalComponent } from '../feedback-modal/feedback-modal.component';
import { FeedbackService } from '../../../core/services/feedback.service';
import { ShareService } from '../../../core/services/share.service';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { GameStoreInterface } from '../../../core/interfaces/game-store.interface';
import { GameWaitingRoomComponent } from '../game-waiting-room/game-waiting-room.component';
import { GameStartingOverlayComponent } from '../game-starting-overlay/game-starting-overlay.component';
import { GameResultOverlayComponent } from '../game-result-overlay/game-result-overlay.component';
import { getOrigin, setSavedDifficulty } from '../../../core/utils/browser.util';

@Component({
  selector: 'app-game-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    GameHeaderComponent,
    GameRulesModalComponent,
    DifficultySelectorComponent,
    FloatingEmojiComponent,
    OfflineBannerComponent,
    FeedbackModalComponent,
    GameWaitingRoomComponent,
    GameStartingOverlayComponent,
    GameResultOverlayComponent
  ],
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
  <div class="w-full max-w-[1600px] mx-auto pt-1 sm:pt-1.5 px-3 sm:px-6 lg:px-8 z-40 sticky top-0 pb-1">
    <div class="w-full backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl lg:rounded-3xl shadow-sm overflow-visible" style="background-color: var(--color-bg-card);">
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
          @if (effectiveRoomMode() === GameMode.Single && !hideDefaultDifficulty && availableDifficulties.length > 1) {
            <app-difficulty-selector 
              [availableDifficulties]="availableDifficulties"
              [currentDifficulty]="effectiveDifficulty()"
              (difficultyChange)="onDifficultyChange($event)">
            </app-difficulty-selector>
          }
          <ng-content select="[header-center]"></ng-content>
        </ng-container>

        <ng-container header-right>
          <div class="flex items-center gap-1 sm:gap-2">
            <ng-content select="[header-right]"></ng-content>

            @if (effectiveRoomMode() === GameMode.Single && effectiveStatus() !== GameStatus.Waiting && settingsService.settings().multiplayer_enabled === 'true') {
              @if (waitingRoomForThisGame(); as targetRoom) {
                <button (click)="onQuickJoinTargetRoom(targetRoom)"
                        class="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all animate-pulse shrink-0 cursor-pointer pointer-events-auto"
                        [attr.title]="i18n.t('lobby.quick_join')()">
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span>⚡ {{ i18n.t('lobby.quick_join')() || '迎战' }}</span>
                </button>
              } @else {
                <button (click)="quickCreatePkRoom()"
                        class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 group shrink-0 cursor-pointer"
                        [title]="i18n.t('game.quick_pk')() || '联机对战'">
                  <span class="group-hover:scale-110 transition-transform">⚔️</span>
                  <span>{{ i18n.t('game.quick_pk')() || '联机对战' }}</span>
                </button>
              }
            }

            @if (effectiveShowPlayAgain()) {
              <button (click)="onPlayAgainClicked()"
                      class="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 group"
                      [title]="i18n.t('game.space_shortcut_hint')() || 'Press Space or R to restart'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.play_again')() }}</span>
                <span class="hidden lg:inline text-[10px] opacity-75 font-mono">Space</span>
              </button>
            }

            @if (effectiveShowLeave()) {
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
  <main class="flex-grow flex flex-col w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-1 sm:py-2 min-h-0"
        [class.items-center]="!isLobby">
    
    <!-- Guest Playing in PK Room Badge (Unranked play) -->
    @if (effectiveRoomId() && !authStore.isAuthenticated()) {
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

    <!-- Auto-managed Multiplayer Waiting Room (When store is provided) -->
    @if (isAutoWaitingRoomVisible()) {
      <div class="w-full flex-grow flex flex-col min-h-0 overflow-hidden p-2 lg:p-4">
        <app-game-waiting-room
          [gameId]="gameId"
          [mode]="effectiveRoomMode()"
          [roomId]="effectiveRoomId() || ''"
          [difficulty]="effectiveDifficulty()"
          [players]="effectivePlayers()"
          [hostId]="effectiveHostId()"
          [currentUserId]="storePlayerId()"
          [readyPlayers]="effectiveReadyPlayers()"
          [target]="effectiveTarget()"
          (start)="onWaitingRoomStart()"
          (leave)="back.emit()"
          (changeSettings)="openChangeSettingsGlobal()"
          (ready)="onWaitingRoomReady()"
          (cancelReady)="onWaitingRoomCancelReady()"
          (kick)="onWaitingRoomKick($event)"
          (difficultyChange)="onDifficultyChange($event)"
        ></app-game-waiting-room>
      </div>
    } @else {
      <!-- The Game Stage (Canvas / Board Container - Seamless & Integrated) -->
      <div class="w-full flex-grow flex flex-col border border-[var(--color-border-card)] bg-[var(--color-bg-card)] rounded-2xl lg:rounded-3xl shadow-sm transition-colors duration-300 p-1 sm:p-2.5 relative"
           [ngClass]="{
             'min-h-[320px] sm:min-h-[420px] items-center justify-center': !isLobby,
             'min-h-[520px] sm:min-h-[620px] lg:min-h-[680px] h-[72vh] max-h-[840px] items-stretch justify-start overflow-hidden': isLobby,
             'touch-none overscroll-none': !isLobby && !allowScroll && effectiveStatus() !== GameStatus.Waiting,
             'touch-pan-y': isLobby || allowScroll || effectiveStatus() === GameStatus.Waiting,
             'overflow-y-auto h-full min-h-0': !isLobby && (allowScroll || effectiveStatus() === GameStatus.Waiting)
           }"
           [style.overscroll-behavior]="(isLobby || allowScroll || effectiveStatus() === GameStatus.Waiting) ? 'contain' : 'none'"
           [style.touch-action]="(isLobby || allowScroll || effectiveStatus() === GameStatus.Waiting) ? 'pan-y' : 'none'">
        <!-- Project custom game components here -->
        <ng-content></ng-content>

        <!-- Auto-managed 3s Countdown Overlay -->
        @if (isAutoStartingVisible()) {
          <app-game-starting-overlay [countdown]="gameTimer.countdownDisplay()"></app-game-starting-overlay>
        }

        <!-- Auto-managed Game Finished Result Overlay -->
        @if (isAutoResultVisible()) {
          <app-game-result-overlay
            [currentGameId]="gameId"
            [status]="resultStatus()"
            [title]="resultTitle()"
            [subtitle]="customResultSubtitle"
            [stats]="overlayStats || []"
            [isPkMatch]="effectiveRoomMode() !== GameMode.Single"
            [opponentInfo]="resultOpponent()"
            [pkSeriesScore]="resultPkSeriesScore()"
            [pkRoundFormat]="resultPkRoundFormat()"
            [xpResult]="resultXpResult()"
            [isNewRecord]="resultIsNewRecord()"
            [showLeave]="true"
            [showRestart]="effectiveRoomMode() === GameMode.Single || effectiveHostId() === storePlayerId()"
            [showDismiss]="effectiveRoomMode() !== GameMode.Single && effectiveHostId() === storePlayerId()"
            [showRevive]="effectiveShowRevive()"
            [showNextLevel]="showNextLevel"
            (rematch)="onResultRematch()"
            (leave)="back.emit()"
            (restart)="onResultRestart()"
            (dismiss)="onResultDismiss()"
            (revive)="onResultRevive()"
            (nextLevel)="nextLevel.emit()"
            [enableChangeRoomGame]="effectiveRoomMode() !== GameMode.Single && effectiveHostId() === storePlayerId()"
            (changeRoomGame)="onResultChangeRoomGame($event)"
          ></app-game-result-overlay>
        }
      </div>
    }

    <!-- Emoji Broadcast Bar (When inside multiplayer room) -->
    @if (effectiveRoomId()) {
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
    <section class="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 mt-6 sm:mt-10 pb-12">
      <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-5 sm:p-8 shadow-sm">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--color-border-card)]">
          <h2 class="text-base sm:text-lg font-bold text-[var(--color-text-main)] flex items-center gap-2">
            <span>{{ i18n.t('game.strategy_guide_title')() || '🎮 玩法规则与操作指南' }}</span>
          </h2>
          <div class="flex items-center gap-2">
            <a [routerLink]="['/', i18n.currentLang(), 'docs', gameId]"
               class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--color-accent-from)] border border-[var(--color-accent-from)]/30 bg-[var(--color-accent-from)]/10 hover:bg-[var(--color-accent-from)]/20 transition-all cursor-pointer">
              <span>📚</span>
              <span>{{ i18n.t('game.read_docs_guide')() || '进阶攻略' }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            @if (relatedGuideSlug) {
              <a [routerLink]="['/', i18n.currentLang(), 'blog', relatedGuideSlug]"
                 class="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--color-text-secondary)] border border-[var(--color-border-card)] bg-[var(--color-bg-main)] hover:text-[var(--color-text-main)] hover:border-[var(--color-accent-from)]/40 transition-all cursor-pointer">
                <span>📖</span>
                <span>{{ i18n.t('game.read_guide')() }}</span>
              </a>
            }
          </div>
        </div>
        <div class="markdown-body text-[var(--color-text-secondary)] text-xs sm:text-sm leading-relaxed" 
             [innerHTML]="i18n.t(computedSeoDescKey)()">
        </div>

        <!-- Callout Banner: Link to Deep Tutorial /docs/:gameId -->
        <div class="mt-6 pt-5 border-t border-[var(--color-border-card)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--color-bg-main)]">
          <div class="flex items-center gap-3">
            <span class="text-2xl p-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-inner">🎓</span>
            <div>
              <div class="text-xs font-bold text-[var(--color-accent-from)]">{{ i18n.t('game.docs_callout_tag')() || '深度教程与技巧宝典' }}</div>
              <div class="text-xs sm:text-sm font-semibold text-[var(--color-text-main)] mt-0.5">{{ i18n.t('game.docs_callout_title')() || '想进阶成为解谜大师？查阅全套核心技巧与高阶推演指南' }}</div>
            </div>
          </div>
          <a [routerLink]="['/', i18n.currentLang(), 'docs', gameId]"
             class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0 cursor-pointer">
            <span>📚</span>
            <span>{{ i18n.t('game.read_full_docs')() || '查阅完整攻略文档' }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  }

  <app-floating-emoji></app-floating-emoji>
  
  <!-- Overlay slot for dragged pieces that must escape overflow: hidden / backdrop-filter -->
  <ng-content select="[game-overlay]"></ng-content>

  <!-- Floating Utility Actions (Bottom-Right: Strategy Guide, Share & Bug/Feedback) -->
  <aside class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-2.5 sm:right-4 z-40 flex flex-col gap-2 items-center pointer-events-auto"
         aria-label="Game auxiliary actions">
    <!-- In-depth Strategy & Docs Button (直达本游戏进阶攻略文档) -->
    <a [routerLink]="['/', i18n.currentLang(), 'docs', gameId]"
       target="_blank"
       class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--color-bg-card)]/90 hover:bg-[var(--color-bg-card)] backdrop-blur-md border border-[var(--color-accent-from)]/50 text-[var(--color-accent-from)] shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group cursor-pointer"
       [attr.title]="i18n.t('game.read_docs_guide')() || '进阶攻略文档'">
      <span class="text-base sm:text-lg group-hover:scale-110 transition-transform">📚</span>
      <span class="sr-only">{{ i18n.t('game.read_docs_guide')() || '进阶攻略文档' }}</span>
    </a>

    <!-- Share / Recommend Game Button -->
    <button type="button"
            (click)="onShareGame()"
            class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--color-bg-card)]/80 hover:bg-[var(--color-bg-card)] backdrop-blur-md border border-[var(--color-border-card)] text-sky-500 hover:text-sky-400 shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center opacity-85 hover:opacity-100 group cursor-pointer"
            [attr.title]="i18n.t('share.tooltip')() || '分享游戏 / 推荐本站'">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-4.5 sm:w-4.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      <span class="sr-only">{{ i18n.t('share.tooltip')() || '分享游戏' }}</span>
    </button>

    <!-- Feedback / Bug Report Button -->
    <button type="button"
            (click)="onOpenFeedback()"
            class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--color-bg-card)]/80 hover:bg-[var(--color-bg-card)] backdrop-blur-md border border-[var(--color-border-card)] text-amber-500 hover:text-amber-400 shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center opacity-85 hover:opacity-100 group cursor-pointer"
            [attr.title]="i18n.t('feedback.tooltip')() || '意见建议与 Bug 反馈'">
      <span class="text-base sm:text-lg group-hover:scale-110 transition-transform">🐞</span>
      <span class="sr-only">{{ i18n.t('feedback.tooltip')() || '意见反馈' }}</span>
    </button>
  </aside>

  <!-- Player Feedback Modal Dialog -->
  <app-feedback-modal></app-feedback-modal>
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
  feedbackService = inject(FeedbackService);
  shareService = inject(ShareService);

  onShareGame() {
    const url = `${getOrigin()}/games/${this.gameId || ''}`;
    const title = this.title || this.gameId || 'X-Game';
    const descKey = `lobby.${this.gameId}.desc`;
    const desc = this.i18n.t(descKey)() || '';
    this.shareService.share({
      title: `${title} - ${this.i18n.t('app.title')()}`,
      text: `${this.i18n.t('share.game_invite')() || 'Play this awesome game with me!'} ${title}\n${desc}`,
      url
    });
  }

  onOpenFeedback() {
    this.feedbackService.open({
      gameId: this.gameId,
      gameTitle: this.title || this.gameId,
      level: this.currentDifficulty ? `${this.currentDifficulty}` : undefined
    });
  }

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

  gameTimer = inject(GameTimerService);

  @Input() store?: GameStoreInterface;
  @Input({ transform: booleanAttribute }) autoManageOverlays: boolean = true;
  @Input() overlayStats?: { icon?: string; label?: string; value: string | number }[];
  @Input() customResultTitle?: string;
  @Input() customResultSubtitle?: string;
  @Input() isDefeat?: boolean;
  @Input() showOverlay: boolean = true;
  @Input({ transform: booleanAttribute }) showRevive: boolean = false;
  @Input({ transform: booleanAttribute }) showNextLevel: boolean = false;

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
  @Input({ transform: booleanAttribute }) isLobby: boolean = false;
  @Input({ transform: booleanAttribute }) allowScroll: boolean = false;
  
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
  @Output() rematch = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
  @Output() revive = new EventEmitter<void>();
  @Output() nextLevel = new EventEmitter<void>();

  readonly effectiveShowRevive = computed(() => {
    if (this.showRevive) return true;
    if (!this.store) return false;
    const s = this.store as any;
    if (typeof s.canRevive === 'function') return s.canRevive();
    if (typeof s.hasRevived === 'function') return !s.hasRevived();
    return false;
  });

  readonly storePlayerId = computed(() => {
    return (this.store as any)?.playerId?.() || (this.store as any)?.playerId || this.authStore.currentUser()?.username || this.authStore.guestId || '';
  });

  readonly effectiveRoomMode = computed(() => {
    return this.store ? this.store.currentRoomMode() : this.currentRoomMode;
  });

  readonly effectiveRoomId = computed(() => {
    return this.store ? (this.store.roomId() || null) : this.currentRoomId;
  });

  readonly effectiveStatus = computed(() => {
    return this.store ? this.store.status() : this.status;
  });

  readonly effectiveIsHost = computed(() => {
    return this.store ? (this.store.hostId() === this.storePlayerId()) : this.isHost;
  });

  readonly effectiveDifficulty = computed(() => {
    return this.currentDifficulty || (this.store as any)?.currentDifficulty?.() || (this.store as any)?.difficulty?.() || 'medium';
  });

  readonly effectivePlayers = computed(() => {
    return this.store ? (this.store.playersList?.() || (this.store as any).roomPlayers?.() || []) : [];
  });

  readonly effectiveReadyPlayers = computed(() => {
    return this.store ? (this.store.readyPlayers?.() || {}) : {};
  });

  readonly effectiveTarget = computed(() => {
    return this.store ? (this.store.currentRoomTarget?.() || 1) : 1;
  });

  readonly effectiveHostId = computed(() => {
    return this.store ? (this.store.hostId?.() || '') : (this.isHost ? this.storePlayerId() : '');
  });

  readonly effectiveShowPlayAgain = computed(() => {
    return this.showPlayAgainBtn || (!!this.store && this.effectiveRoomMode() === GameMode.Single && this.effectiveStatus() === GameStatus.Finished && this.showOverlay);
  });

  readonly effectiveShowLeave = computed(() => {
    return this.showLeaveBtn || (!!this.store && this.effectiveRoomMode() !== GameMode.Single);
  });

  readonly isAutoWaitingRoomVisible = computed(() => {
    return !this.isLobby && !!this.store && this.autoManageOverlays && this.effectiveStatus() === GameStatus.Waiting && this.effectiveRoomMode() !== GameMode.Single;
  });

  readonly isAutoStartingVisible = computed(() => {
    return !!this.store && this.autoManageOverlays && this.effectiveStatus() === GameStatus.Starting;
  });

  readonly isAutoResultVisible = computed(() => {
    return !!this.store && this.autoManageOverlays && this.effectiveStatus() === GameStatus.Finished && (this.showOverlay || this.effectiveRoomMode() !== GameMode.Single);
  });

  readonly resultStatus = computed<GameResultType>(() => {
    const myId = this.storePlayerId();
    const winners = (this.store as any)?.winners?.() || [];
    if (winners.length > 0) return winners.includes(myId) ? 'win' : 'lose';
    if (this.isDefeat !== undefined) return this.isDefeat ? 'lose' : 'win';
    return 'win';
  });

  readonly resultTitle = computed(() => {
    if (this.customResultTitle) return this.customResultTitle;
    const isWin = this.resultStatus() === 'win';
    if (isWin) return this.i18n.t('game.you_win')() || '🎉 胜利！';
    return this.effectiveRoomMode() === GameMode.Single ? (this.i18n.t('game.game_over')() || '游戏结束') : (this.i18n.t('game.you_lose')() || '惜败');
  });

  readonly resultOpponent = computed(() => {
    if (this.effectiveRoomMode() === GameMode.Single) return undefined;
    const myId = this.storePlayerId();
    const opp = this.effectivePlayers().find((p: any) => (p.id || p.userId || p.username) !== myId);
    return opp ? { id: opp.id || opp.userId, nickname: opp.nickname || opp.username || opp.id, score: opp.score || 0 } : undefined;
  });

  readonly resultPkSeriesScore = computed(() => {
    return (this.store as any)?.pkScoreLabel?.() || '';
  });

  readonly resultPkRoundFormat = computed(() => {
    return (this.store as any)?.room?.()?.roundFormat || (this.effectiveTarget() > 1 ? `BO${this.effectiveTarget() * 2 - 1}` : 'BO1');
  });

  readonly resultXpResult = computed(() => {
    return (this.store as any)?.lastStatResult?.()?.xp_result;
  });

  readonly resultIsNewRecord = computed(() => {
    return (this.store as any)?.lastStatResult?.()?.isNewRecord;
  });

  onPlayAgainClicked() {
    this.playAgain.emit();
    if (this.store && this.effectiveRoomMode() === GameMode.Single) {
      if (typeof (this.store as any).restartGame === 'function') {
        (this.store as any).restartGame();
      } else if (typeof (this.store as any).startGame === 'function') {
        (this.store as any).startGame();
      }
    }
  }

  onWaitingRoomStart() {
    this.store?.startGame();
  }

  onWaitingRoomReady() {
    this.store?.ready();
  }

  onWaitingRoomCancelReady() {
    this.store?.cancelReady();
  }

  onWaitingRoomKick(targetId: string) {
    this.store?.kickPlayer(targetId);
  }

  onResultRestart() {
    this.restart.emit();
    if (this.store) {
      if (this.effectiveRoomMode() === GameMode.Single) {
        this.playAgain.emit();
        if (typeof (this.store as any).restartGame === 'function') {
          (this.store as any).restartGame();
        } else if (typeof (this.store as any).startGame === 'function') {
          (this.store as any).startGame();
        }
      } else {
        this.store.restartGame();
      }
    }
  }

  onResultRematch() {
    this.rematch.emit();
    this.onResultRestart();
  }

  onResultDismiss() {
    this.dismiss.emit();
    if (this.store) {
      this.store.dismissRoom();
    }
    this.back.emit();
  }

  onResultRevive() {
    this.revive.emit();
    const s = this.store as any;
    if (typeof s?.reviveGame === 'function') {
      s.reviveGame();
    } else if (typeof s?.revive === 'function') {
      s.revive();
    }
  }

  onResultChangeRoomGame(game: string) {
    (this.store as any)?.changeRoomGame?.(game);
  }

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

  onQuickJoinTargetRoom(targetRoom: any) {
    if (!this.authStore.isAuthenticated()) {
      this.authModal.open({ returnUrl: this.router.url });
      return;
    }
    this.joinRoom.emit({
      roomId: targetRoom.id,
      mode: targetRoom.mode,
      difficulty: targetRoom.difficulty,
      host: targetRoom.host
    });
  }

  handleCreateRoomFromLobby(event: any) {
    this.togglePkDrawer(false);
    this.createRoom.emit(event);
  }

  onDifficultyChange(newDiff: string) {
    this.currentDifficulty = newDiff;
    if (this.gameId) {
      setSavedDifficulty(this.gameId, newDiff);
    }
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
