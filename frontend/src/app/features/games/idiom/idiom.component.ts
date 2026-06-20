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
import { WebSocketService } from '../../../core/services/websocket.service';

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
  template: `
<div class="h-[calc(100vh-64px)] w-full flex flex-row bg-[var(--color-bg-main)] text-[var(--color-text-main)] transition-colors duration-300">

  <!-- ===== 左侧：游戏内容区 ===== -->
  <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">

  <!-- ===================== PK MODE ===================== -->
  @if (pkRoomId()) {
    <div class="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden select-none">
      <div class="flex-1 flex flex-col bg-[var(--color-bg-card)] rounded-2xl lg:rounded-3xl m-1 lg:m-2 border border-[var(--color-border-card)] shadow-xl overflow-hidden">

        <app-game-header
          [title]="i18n.t('lobby.idiom')()"
          subtitle="极速填空 PK"
          iconGradientClass="from-purple-500 to-violet-600"
          titleGradientClass="from-purple-400 to-violet-500"
          shadowClass="shadow-purple-500/20"
          headerBgClass="bg-gradient-to-r from-purple-900/20 to-violet-900/20 border-b border-[var(--color-border-card)] px-4 lg:px-6 pb-2"
          (back)="leavePkRoom()"
          (rules)="showRules.set(true)">
          <div game-icon class="text-2xl sm:text-3xl md:text-4xl drop-shadow-md">⚡</div>
          <div header-right class="flex items-center gap-2">
            @if (pkStore.status() === 'playing' || pkStore.status() === 'finished') {
              <div class="flex items-center gap-1 text-sm font-black">
                <span class="text-green-400">{{ pkStore.myWins() }}</span>
                <span class="text-[var(--color-text-secondary)]">:</span>
                <span class="text-red-400">{{ pkStore.opponentWins() }}</span>
                <span class="text-[10px] text-[var(--color-text-secondary)] ml-1">/ {{ pkStore.target() }}</span>
              </div>
            }
          </div>
        </app-game-header>

        <div class="flex-1 overflow-hidden relative">

          <!-- 等待室 -->
          @if (pkStore.status() === 'waiting') {
            <div class="h-full overflow-y-auto">
              <app-game-waiting-room
                [gameId]="'idiom'"
                [mode]="pkRoomMode()"
                [roomId]="pkRoomId()"
                [difficulty]="pkDifficulty()"
                [players]="pkStore.players().map(p => ({ id: p.id }))"
                [hostId]="pkStore.hostId()"
                [currentUserId]="pkStore.playerId()"
                [readyPlayers]="pkStore.readyPlayers()"
                [target]="pkStore.currentRoomTarget()"
                (start)="pkStore.startGame()"
                (leave)="leavePkRoom()"
                (ready)="pkStore.ready()"
                (cancelReady)="pkStore.cancelReady()">
              </app-game-waiting-room>
            </div>
          }

          <!-- 倒计时 -->
          @if (pkStore.status() === 'starting') {
            <app-game-starting-overlay [countdown]="gameTimer.countdownDisplay()"></app-game-starting-overlay>
          }

          <!-- 对战中 -->
          @if (pkStore.status() === 'playing') {
            <div class="h-full overflow-y-auto flex flex-col items-center px-4 pt-4 pb-4 gap-4">

              <!-- Round info -->
              <div class="flex items-center justify-between w-full max-w-sm">
                <span class="text-sm font-bold text-[var(--color-text-secondary)]">第 {{ pkStore.roundNum() }} 轮</span>
                <div class="flex items-center gap-3">
                  <!-- My wins -->
                  <div class="flex gap-1">
                    @for (i of pkWinDots(pkStore.myWins(), pkStore.target()); track i.idx) {
                      <span class="w-3 h-3 rounded-full" [class]="i.filled ? 'bg-green-500' : 'bg-[var(--color-border-card)]'"></span>
                    }
                  </div>
                  <span class="text-xs text-[var(--color-text-secondary)]">VS</span>
                  <!-- Opponent wins -->
                  <div class="flex gap-1">
                    @for (i of pkWinDots(pkStore.opponentWins(), pkStore.target()); track i.idx) {
                      <span class="w-3 h-3 rounded-full" [class]="i.filled ? 'bg-red-500' : 'bg-[var(--color-border-card)]'"></span>
                    }
                  </div>
                </div>
              </div>

              <!-- Round winner banner -->
              @if (pkStore.isRoundOver()) {
                <div class="anim-slide-up w-full max-w-sm px-4 py-2.5 rounded-2xl text-center font-black text-base"
                  [class]="pkStore.iWonRound() ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-red-500/10 text-red-400 border border-red-500/30'">
                  {{ pkStore.iWonRound() ? '✅ 你先答对，得 1 分！' : '❌ 对手先答对了' }}
                </div>
              }

              <!-- Fill cells -->
              @let pkActive = pkActiveBlank();
              <div class="flex gap-3 sm:gap-5">
                @for (ch of pkStore.display(); track $index; let i = $index) {
                  <div class="w-[22vmin] h-[22vmin] min-w-[76px] min-h-[76px] max-w-[100px] max-h-[100px] rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-black border-2 transition-all duration-200"
                    [class]="pkCellClass(i, ch, pkActive)"
                    (click)="pkUndoChar(i, ch)">
                    @if (ch !== '_') {
                      {{ ch }}
                    } @else if (pkFillAnswer()[i]) {
                      <span class="anim-char-pop">{{ pkFillAnswer()[i] }}</span>
                    } @else if (pkActive === i && !pkStore.isRoundOver()) {
                      <span class="anim-cursor text-purple-400 font-thin text-4xl leading-none">|</span>
                    } @else {
                      <span class="text-purple-300/25 text-3xl">—</span>
                    }
                  </div>
                }
              </div>

              <!-- Wrong shake hint / locked hint -->
              @if (pkStore.myState()?.locked) {
                <div class="anim-slide-up px-5 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-sm font-black text-red-400 text-center">
                  🔒 本轮已锁定（错 3 次），等待下一轮
                </div>
              } @else if (pkStore.myState()?.last_wrong) {
                <span class="anim-slide-up text-sm font-bold text-red-400">
                  ❌ 不对，还剩 {{ 3 - (pkStore.myState()?.wrong_count ?? 0) }} 次机会
                </span>
              }

              <!-- Keyboard (hidden when round is over or player is locked) -->
              @if (!pkStore.isRoundOver() && !pkStore.myState()?.locked) {
                <div class="grid grid-cols-4 gap-3 w-full max-w-[340px]">
                  @for (ch of pkStore.keyboard(); track ch + $index) {
                    <button (click)="onPkKeyPress(ch)"
                      [disabled]="pkFillSelected().includes(ch)"
                      class="h-16 rounded-2xl font-black text-2xl border transition-all active:scale-90 disabled:cursor-not-allowed shadow-sm"
                      [class]="pkFillSelected().includes(ch)
                        ? 'border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-secondary)] opacity-20'
                        : 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)]'">
                      {{ ch }}
                    </button>
                  }
                </div>
                <button (click)="clearPkAnswer()"
                  class="px-4 py-2 rounded-xl border border-[var(--color-border-card)] text-sm font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] transition-colors flex items-center gap-1">
                  ⌫ 清除
                </button>
              }

            </div>
          }

          <!-- 对局结束 -->
          @if (showPkOverlay()) {
            <app-game-result-overlay
              currentGameId="idiom"
              [status]="pkStore.winners().includes(pkStore.playerId()) ? 'win' : 'lose'"
              [title]="pkStore.winners().includes(pkStore.playerId()) ? '🏆 你赢了！' : '😢 对手获胜'"
              [showRestart]="pkStore.hostId() === pkStore.playerId()"
              [showLeave]="true"
              [stats]="[{ icon: '⭐', label: '得分', value: pkStore.myWins() + ' : ' + pkStore.opponentWins() }]"
              (restart)="pkStore.restartGame()"
              (leave)="leavePkRoom()">
            </app-game-result-overlay>
          }

        </div>
      </div>
    </div>
  }

  <!-- ===================== LOBBY ===================== -->
  @if (view() === 'lobby' && !pkRoomId()) {
    <div class="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
      <div class="flex-1 flex flex-col bg-[var(--color-bg-card)] rounded-2xl lg:rounded-3xl m-1 lg:m-2 border border-[var(--color-border-card)] shadow-xl overflow-hidden">

        <app-game-header
          [title]="i18n.t('lobby.idiom')()"
          [subtitle]="i18n.t('idiom.subtitle')()"
          iconGradientClass="from-purple-500 to-violet-600"
          titleGradientClass="from-purple-400 to-violet-500"
          shadowClass="shadow-purple-500/20"
          headerBgClass="bg-gradient-to-r from-purple-900/20 to-violet-900/20 border-b border-[var(--color-border-card)] px-4 lg:px-6 pb-2"
          (back)="returnToLobby()"
          (rules)="showRules.set(true)">
          <div game-icon class="text-2xl sm:text-3xl md:text-4xl drop-shadow-md">📖</div>
          <div header-right class="flex items-center gap-2">
            @if (authStore.isAuthenticated() && idiomStats()) {
              <div class="text-right">
                <div class="text-xs font-black text-purple-400">{{ idiomStats()!.mastered }}/{{ idiomStats()!.total }}</div>
                <div class="text-[10px] text-[var(--color-text-secondary)]">{{ i18n.t('idiom.mastered')() }}</div>
              </div>
            }
            @if (settingsService.settings().multiplayer_enabled === 'true') {
              <button (click)="navigateToPkArena()"
                class="p-1.5 lg:p-2 rounded-full text-[var(--color-accent-to)] hover:text-[var(--color-text-main)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors active:scale-95 flex items-center gap-1"
                [title]="i18n.t('game.pk_arena')()">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="text-[10px] font-black uppercase tracking-wider hidden sm:inline">PK</span>
              </button>
            }
          </div>
        </app-game-header>

        <div class="flex-1 overflow-y-auto p-4 lg:p-6">
          <div class="w-full max-w-lg mx-auto flex flex-col gap-4">

            <!-- ── 模式选择 ─────────────────────────── -->
            <div class="flex flex-col gap-3">

              <!-- Fill mode card -->
              <button (click)="enterFill()"
                class="w-full rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-5 text-left hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 active:scale-[0.98] transition-all group">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30 flex items-center justify-center text-2xl group-hover:from-purple-500/30 group-hover:to-violet-500/30 transition-all shrink-0">✏️</div>
                  <div class="flex-1 min-w-0">
                    <div class="font-black text-base text-[var(--color-text-main)]">{{ i18n.t('idiom.mode_fill')() }}</div>
                    <div class="text-sm text-[var(--color-text-secondary)] mt-0.5">{{ i18n.t('idiom.mode_fill_desc')() }}</div>
                  </div>
                  <svg class="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
                @if (streak() >= 3) {
                  <div class="mt-3 flex items-center gap-1.5 text-xs font-bold text-purple-400">
                    <span>⭐</span> 上题已掌握！
                  </div>
                }
              </button>

              <!-- Wordle mode card -->
              <button (click)="enterWordle()"
                class="w-full rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-5 text-left hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 active:scale-[0.98] transition-all group">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center text-2xl group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-all shrink-0">🟩</div>
                  <div class="flex-1 min-w-0">
                    <div class="font-black text-base text-[var(--color-text-main)]">{{ i18n.t('idiom.mode_wordle')() }}</div>
                    <div class="text-sm text-[var(--color-text-secondary)] mt-0.5">{{ i18n.t('idiom.mode_wordle_desc')() }}</div>
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    @if (wordleComplete()) {
                      <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                        [class]="wordleWon() ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'">
                        {{ wordleWon() ? '✅ ' + i18n.t('idiom.done')() : i18n.t('idiom.done')() }}
                      </span>
                    }
                    <svg class="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
                @if (socialStats()) {
                  <div class="mt-3 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                    <span>👥 {{ socialStats()!.total_players }} {{ i18n.t('idiom.today_players')() }}</span>
                    <span>·</span>
                    <span>🏆 {{ socialStats()!.winners }} {{ i18n.t('idiom.today_winners')() }}</span>
                  </div>
                }
              </button>
            </div><!-- /mode cards -->

            <!-- ── 统计 + 历史（左栏下方，手机+PC都显示） -->
            <div class="flex flex-col gap-4">

              <!-- Progress card -->
              @if (authStore.isAuthenticated() && idiomStats()) {
                @let stats = idiomStats()!;
                <div class="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] p-4 flex flex-col gap-3">

                  <!-- Header: today's activity (most immediate feedback) -->
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-black text-[var(--color-text-main)]">📊 学习进度</span>
                    @if (stats.today_played > 0) {
                      <span class="text-xs text-[var(--color-text-secondary)]">
                        今日 <span class="font-bold text-green-400">{{ stats.today_correct }}</span>/{{ stats.today_played }} 题
                      </span>
                    }
                  </div>

                  <!-- Overall stacked bar: played (teal) + mastered (purple overlay) -->
                  <div class="flex items-center gap-3">
                    <div class="flex-1 h-3 rounded-full bg-[var(--color-bg-main)] overflow-hidden relative">
                      <!-- played bar (base) -->
                      <div class="absolute inset-y-0 left-0 rounded-full bg-teal-500/30 transition-all duration-700"
                        [style.width.%]="stats.total ? (stats.played / stats.total * 100) : 0"></div>
                      <!-- mastered bar (on top) -->
                      <div class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-violet-400 transition-all duration-700"
                        [style.width.%]="masteryPercent()"></div>
                    </div>
                    <div class="text-right shrink-0">
                      <div class="text-xs font-bold text-purple-400">⭐ {{ stats.mastered }} 已掌握</div>
                      <div class="text-[10px] text-teal-400">已接触 {{ stats.played }}</div>
                    </div>
                  </div>

                  <!-- Per-difficulty rows: show played + mastered separately -->
                  @if (stats.by_difficulty.length) {
                    <div class="flex flex-col gap-2 pt-1 border-t border-[var(--color-border-card)]">
                      @for (d of stats.by_difficulty; track d.difficulty) {
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold w-8 shrink-0"
                            [class]="d.difficulty === 'easy' ? 'text-green-400' : d.difficulty === 'medium' ? 'text-yellow-400' : 'text-red-400'">
                            {{ diffLabel(d.difficulty) }}
                          </span>
                          <!-- stacked bar -->
                          <div class="flex-1 h-2 rounded-full bg-[var(--color-bg-main)] overflow-hidden relative">
                            <div class="absolute inset-y-0 left-0 rounded-full bg-teal-500/30 transition-all duration-700"
                              [style.width.%]="d.total ? (d.played / d.total * 100) : 0"></div>
                            <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 bg-gradient-to-r"
                              [class]="diffBarColor(d.difficulty)"
                              [style.width.%]="d.total ? (d.mastered / d.total * 100) : 0"></div>
                          </div>
                          <!-- counts -->
                          <div class="text-right shrink-0 w-20">
                            <span class="text-[10px] text-teal-400">{{ d.played }}</span>
                            <span class="text-[10px] text-[var(--color-text-secondary)]">/</span>
                            <span class="text-[10px] text-[var(--color-text-secondary)]">{{ d.total }}</span>
                            @if (d.mastered > 0) {
                              <span class="text-[10px] text-purple-400 ml-1">⭐{{ d.mastered }}</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                    <!-- Legend -->
                    <div class="flex items-center gap-4 text-[10px] text-[var(--color-text-secondary)]">
                      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-teal-500/50 inline-block"></span>已接触</span>
                      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>已掌握（连续答对3次）</span>
                    </div>
                  }
                </div>
              }

              <!-- History card: always expanded, shows most recent records -->
              @if (authStore.isAuthenticated()) {
                <div class="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-card)]">
                    <span class="text-sm font-black text-[var(--color-text-main)]">📝 最近练习</span>
                    @if (idiomHistory().length > 0) {
                      <span class="text-xs text-[var(--color-text-secondary)]">{{ idiomHistory().length }} 条</span>
                    }
                  </div>
                  @if (idiomHistory().length === 0) {
                    <div class="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                      还没有练习记录，去填空闯关吧！
                    </div>
                  } @else {
                    <div class="divide-y divide-[var(--color-border-card)] max-h-80 overflow-y-auto">
                      @for (rec of idiomHistory(); track rec.idiom_id) {
                        <div class="flex items-start gap-3 px-4 py-3">
                          <span class="text-lg mt-0.5 shrink-0">{{ rec.is_mastered ? '⭐' : rec.last_result === 'correct' ? '✅' : '❌' }}</span>
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap mb-0.5">
                              <span class="font-black text-base text-[var(--color-text-main)]">{{ rec.word }}</span>
                              <span class="text-xs px-1.5 py-0.5 rounded-full font-bold"
                                [class]="rec.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : rec.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'">
                                {{ diffLabel(rec.difficulty) }}
                              </span>
                              @if (rec.is_mastered) {
                                <span class="text-xs px-1.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-400">已掌握</span>
                              } @else if (rec.consecutive_correct > 0) {
                                <span class="text-xs text-[var(--color-text-secondary)]">{{ rec.consecutive_correct }}/3 ✓</span>
                              }
                            </div>
                            <p class="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">{{ rec.explanation }}</p>
                          </div>
                          <span class="text-xs text-[var(--color-text-secondary)] shrink-0 mt-1">{{ relativeTime(rec.last_played_at) }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Not logged in prompt -->
              @if (!authStore.isAuthenticated()) {
                <div class="rounded-2xl border border-dashed border-purple-500/30 p-5 flex flex-col items-center gap-2 text-center">
                  <span class="text-2xl">📊</span>
                  <p class="text-sm text-[var(--color-text-secondary)]">登录后可查看掌握进度和练习记录</p>
                </div>
              }

            </div><!-- /stats+history -->

          </div><!-- /max-w-lg -->
        </div><!-- /lobby 内容 -->
      </div><!-- /.bg-card rounded -->
    </div><!-- /.flex-1 outer -->
  }

  <!-- ===================== FILL MODE ===================== -->
  @if (view() === 'fill' && !pkRoomId()) {
    <div class="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden select-none">
      <div class="flex-1 flex flex-col bg-[var(--color-bg-card)] rounded-2xl lg:rounded-3xl m-1 lg:m-2 border border-[var(--color-border-card)] shadow-xl overflow-hidden">

        <app-game-header
          [title]="i18n.t('lobby.idiom')()"
          [subtitle]="fillDifficulty() ? diffLabel(fillDifficulty()!) : i18n.t('idiom.mode_fill')()"
          iconGradientClass="from-purple-500 to-violet-600"
          titleGradientClass="from-purple-400 to-violet-500"
          shadowClass="shadow-purple-500/20"
          headerBgClass="bg-gradient-to-r from-purple-900/20 to-violet-900/20 border-b border-[var(--color-border-card)] px-4 lg:px-6 pb-2"
          (back)="fillDifficulty() ? fillDifficulty.set(null) : backToLobby()"
          (rules)="showRules.set(true)">
          <div game-icon class="text-2xl sm:text-3xl md:text-4xl drop-shadow-md">📖</div>
          <div header-right class="flex items-center gap-2">
            @if (fillDifficulty()) {
              <button (click)="fillDifficulty.set(null)"
                class="px-2.5 py-1 rounded-full text-xs font-bold border transition-colors"
                [class]="fillDifficulty() === 'easy' ? 'border-green-500/40 text-green-400 bg-green-500/10 hover:bg-green-500/20'
                        : fillDifficulty() === 'medium' ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20'
                        : 'border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20'">
                {{ diffLabel(fillDifficulty()!) }} ↕
              </button>
            }
            @if (settingsService.settings().multiplayer_enabled === 'true') {
              <button (click)="navigateToPkArena()"
                class="p-1.5 lg:p-2 rounded-full text-[var(--color-accent-to)] hover:text-[var(--color-text-main)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors active:scale-95 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="text-[10px] font-black uppercase tracking-wider hidden sm:inline">PK</span>
              </button>
            }
          </div>
        </app-game-header>

        <div class="flex-1 overflow-y-auto flex flex-col items-center px-4 pt-6 pb-4 gap-6">

          <!-- ── 难度选关（未选难度时显示） ── -->
          @if (!fillDifficulty()) {
            <div class="w-full max-w-sm flex flex-col gap-4">
              <div class="text-center">
                <p class="text-base font-black text-[var(--color-text-main)]">选择难度开始学习</p>
                <p class="text-xs text-[var(--color-text-secondary)] mt-1">从简单开始，循序渐进掌握成语</p>
              </div>

              @for (diff of ['easy','medium','hard']; track diff) {
                @let dStat = diffStat(diff);
                @let isRec = recommendedDifficulty() === diff;
                <button (click)="selectDifficulty(diff)"
                  class="w-full rounded-2xl border-2 p-4 text-left active:scale-[0.98] transition-all group relative overflow-hidden"
                  [class]="diff === 'easy'
                    ? 'border-green-500/40 bg-green-500/5 hover:border-green-500/70 hover:bg-green-500/10'
                    : diff === 'medium'
                    ? 'border-yellow-500/40 bg-yellow-500/5 hover:border-yellow-500/70 hover:bg-yellow-500/10'
                    : 'border-red-500/40 bg-red-500/5 hover:border-red-500/70 hover:bg-red-500/10'">

                  <!-- 推荐标签 -->
                  @if (isRec) {
                    <span class="absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full"
                      [class]="diff === 'easy' ? 'bg-green-500/20 text-green-400'
                              : diff === 'medium' ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'">
                      ✦ 推荐
                    </span>
                  }

                  <div class="flex items-center gap-3 mb-3">
                    <span class="text-2xl">{{ diff === 'easy' ? '🟢' : diff === 'medium' ? '🟡' : '🔴' }}</span>
                    <div>
                      <div class="font-black text-base" [class]="diff === 'easy' ? 'text-green-400' : diff === 'medium' ? 'text-yellow-400' : 'text-red-400'">
                        {{ diffLabel(diff) }}
                      </div>
                      @if (dStat) {
                        <div class="text-xs text-[var(--color-text-secondary)]">
                          已掌握 <span class="font-bold" [class]="diff === 'easy' ? 'text-green-400' : diff === 'medium' ? 'text-yellow-400' : 'text-red-400'">{{ dStat.mastered }}</span> / {{ dStat.total }}
                        </div>
                      }
                    </div>
                  </div>

                  <!-- 进度条 -->
                  @if (dStat && dStat.total > 0) {
                    <div class="h-2 rounded-full bg-[var(--color-bg-main)] overflow-hidden relative">
                      <div class="absolute inset-y-0 left-0 rounded-full bg-teal-500/30 transition-all duration-700"
                        [style.width.%]="dStat.total ? (dStat.played / dStat.total * 100) : 0"></div>
                      <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 bg-gradient-to-r"
                        [class]="diffBarColor(diff)"
                        [style.width.%]="dStat.total ? (dStat.mastered / dStat.total * 100) : 0"></div>
                    </div>
                  }
                </button>
              }
            </div>
          }

          <!-- ── 答题区（已选难度时显示） ── -->
          @if (fillDifficulty()) {

          <!-- No question yet -->
          @if (!fillQ()) {
            <div class="flex-1 flex flex-col items-center justify-center gap-6">
              <div class="text-6xl animate-bounce">📖</div>
              <div class="text-center">
                <p class="text-lg font-black mb-1">{{ i18n.t('idiom.ready_title')() }}</p>
                <p class="text-sm text-[var(--color-text-secondary)]">{{ i18n.t('idiom.ready_desc')() }}</p>
              </div>
              <button (click)="loadFill()"
                class="px-10 py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30 active:scale-95 transition-all">
                {{ i18n.t('idiom.start_fill')() }}
              </button>
            </div>
          } @else {

            <!-- Status bar: prompt / result badge -->
            <div class="flex items-center justify-between w-full max-w-sm px-1 min-h-[28px]">
              @if (answerState() === 'idle' || answerState() === 'checking') {
                <span class="text-sm font-bold text-[var(--color-text-secondary)]">
                  {{ i18n.t('idiom.fill_prompt')() }}
                </span>
              } @else if (answerState() === 'correct') {
                <span class="anim-badge-pop text-base font-black text-green-400 flex items-center gap-1.5">
                  ✅ {{ i18n.t('idiom.correct')() }}
                </span>
              } @else if (answerState() === 'correcting') {
                <span class="anim-badge-pop text-base font-black text-amber-400 flex items-center gap-1.5">
                  ✍️ 再写一遍加深记忆
                </span>
              } @else if (answerState() === 'correcting_done') {
                <span class="anim-badge-pop text-base font-black text-green-400 flex items-center gap-1.5">
                  🎉 写对了！记住了吗？
                </span>
              } @else {
                <span class="anim-badge-pop text-base font-black text-red-400 flex items-center gap-1.5">
                  ❌ {{ i18n.t('idiom.wrong')() }}
                </span>
              }
              <!-- Right badge: per-idiom mastery progress -->
              @if (streak() > 0 && answerState() !== 'idle' && answerState() !== 'checking') {
                @if (fillResult()?.is_mastered) {
                  <div class="anim-badge-pop flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40">
                    <span class="text-base">⭐</span>
                    <span class="text-sm font-black text-purple-400">已掌握</span>
                  </div>
                } @else {
                  <div class="anim-badge-pop flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40">
                    <span class="text-sm font-black text-orange-400">{{ streak() }}/3 ✓</span>
                  </div>
                }
              } @else if (authStore.isAuthenticated() && idiomStats()) {
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                  <span class="text-xs font-black text-purple-400">
                    ⭐{{ idiomStats()!.mastered }}<span class="font-normal opacity-50">/{{ idiomStats()!.total }}</span>
                  </span>
                  @if (idiomStats()!.today_played > 0) {
                    <span class="text-[10px] text-[var(--color-text-secondary)] opacity-70">
                      · 今日{{ idiomStats()!.today_correct }}/{{ idiomStats()!.today_played }}
                    </span>
                  }
                </div>
              }
            </div>

            <!-- 4-character cells -->
            @let activeIdx = activeBlankIndex();
            <div class="flex gap-3 sm:gap-5">
              @for (ch of fillQ()!.display; track $index; let i = $index) {
                <div class="w-[22vmin] h-[22vmin] min-w-[76px] min-h-[76px] max-w-[100px] max-h-[100px] rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-black border-2 transition-all duration-200"
                  [class]="cellClass(i, ch, activeIdx)"
                  [style.animation-delay]="cellAnimDelay(i, ch)"
                  (click)="undoFillChar(i, ch)">
                  @if (ch !== '_') {
                    {{ ch }}
                  } @else if (answerState() === 'correct' || answerState() === 'wrong') {
                    <span>{{ correctWord()[i] }}</span>
                  } @else if (answerState() === 'correcting_done') {
                    <span class="anim-char-pop">{{ correctWord()[i] }}</span>
                  } @else if (fillAnswer()[i]) {
                    <span class="anim-char-pop">{{ fillAnswer()[i] }}</span>
                  } @else if (activeIdx === i) {
                    <span class="anim-cursor text-purple-400 font-thin text-4xl leading-none">|</span>
                  } @else {
                    <span class="text-purple-300/25 text-3xl">—</span>
                  }
                </div>
              }
            </div>

            <!-- Input hint: shown during idle / correcting -->
            @if (answerState() === 'idle' || answerState() === 'correcting') {
              <p class="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1 opacity-70">
                <span>💡</span> 点空格可手写或拼音输入
              </p>
            }

            <!-- Hidden input: always in DOM, captures IME/handwriting input from cell click -->
            <input
              id="hw-input"
              type="text"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              inputmode="text"
              [disabled]="answerState() === 'checking'"
              (compositionend)="onCompositionEnd($event)"
              (input)="onHandwriteInput($event)"
              class="fixed top-[-200px] left-1/2 w-8 h-8 opacity-0 pointer-events-none">

            <!-- Input area: idle / checking / correcting -->
            @if (answerState() === 'idle' || answerState() === 'checking' || answerState() === 'correcting') {
              <!-- Keyboard grid -->
              <div class="grid grid-cols-4 gap-3 w-full max-w-[340px]">
                @for (ch of fillQ()!.keyboard; track ch + $index) {
                  <button (click)="onFillKeyPress(ch)"
                    [disabled]="isFillKeyUsed(ch) || answerState() === 'checking'"
                    class="h-16 rounded-2xl font-black text-2xl border transition-all active:scale-90 disabled:cursor-not-allowed shadow-sm"
                    [class]="isFillKeyUsed(ch)
                      ? 'border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-secondary)] opacity-20'
                      : 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] hover:border-[var(--color-text-secondary)]/40 active:bg-[var(--color-bg-main)]'">
                    {{ ch }}
                  </button>
                }
              </div>

              <!-- Toolbar -->
              <div class="flex items-center gap-2">
                <button (click)="clearFillAnswer()"
                  class="px-4 py-2 rounded-xl border border-[var(--color-border-card)] text-sm font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] transition-colors flex items-center gap-1">
                  ⌫ {{ i18n.t('game.clear')() }}
                </button>
                @if (answerState() === 'idle') {
                  <app-hint-button layout="compact" (hintApplied)="applyFillHint()"></app-hint-button>
                }
                @if (answerState() === 'checking') {
                  <span class="text-xs text-purple-400 font-bold animate-pulse">检查中…</span>
                }
              </div>
            }

            <!-- Result / correction panel -->
            @if (answerState() === 'correct' || answerState() === 'wrong' || answerState() === 'correcting' || answerState() === 'correcting_done') {
              @if (fillResult()) {
                <div class="w-full max-w-sm anim-slide-up">
                  <div class="rounded-2xl border-2 overflow-hidden"
                    [class]="answerState() === 'correct' || answerState() === 'correcting_done'
                      ? 'border-green-500/60'
                      : answerState() === 'correcting'
                        ? 'border-amber-500/60'
                        : 'border-red-500/40'">
                    <!-- Word + pinyin + explanation -->
                    <div class="px-5 py-4"
                      [class]="answerState() === 'correct' || answerState() === 'correcting_done'
                        ? 'bg-green-500/10'
                        : answerState() === 'correcting'
                          ? 'bg-amber-500/8'
                          : 'bg-red-500/8'">
                      <div class="flex items-baseline gap-2.5 mb-2">
                        <span class="text-2xl font-black"
                          [class]="answerState() === 'correct' || answerState() === 'correcting_done' ? 'text-green-400' : 'text-[var(--color-text-main)]'">
                          {{ correctWord().join('') }}
                        </span>
                        @if (fillResult()!.pinyin) {
                          <span class="text-sm text-purple-400 font-medium tracking-wide">{{ fillResult()!.pinyin }}</span>
                        }
                      </div>
                      <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">{{ fillResult()!.explanation }}</p>
                    </div>
                    <!-- Derivation / story -->
                    @if (fillResult()!.derivation || fillResult()!.story) {
                      <div class="px-5 py-3.5 border-t border-[var(--color-border-card)] bg-[var(--color-bg-card)] flex items-start gap-2.5">
                        <span class="text-purple-400 shrink-0 mt-0.5">📜</span>
                        <p class="text-sm text-[var(--color-text-secondary)] italic leading-relaxed">
                          {{ fillResult()!.derivation || fillResult()!.story }}
                        </p>
                      </div>
                    }
                    <!-- Action button -->
                    <div class="px-5 py-4 bg-[var(--color-bg-card)] border-t border-[var(--color-border-card)]">
                      @if (answerState() === 'correcting') {
                        <!-- During correction: no next button, prompt to write -->
                        <p class="text-center text-sm text-amber-400 font-bold py-1">
                          👆 在上方空格写出正确答案
                        </p>
                      } @else {
                        <button (click)="nextFill()"
                          class="w-full py-3 rounded-xl font-black text-white text-base active:scale-95 transition-all flex items-center justify-center gap-2"
                          [class]="answerState() === 'correct' || answerState() === 'correcting_done'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow shadow-green-500/30'
                            : 'bg-gradient-to-r from-purple-500 to-violet-600 shadow shadow-purple-500/30'">
                          {{ i18n.t('idiom.next')() }}
                          @if (autoNextCountdown() > 0) {
                            <span class="text-sm font-normal opacity-70">({{ autoNextCountdown() }}s)</span>
                          }
                          →
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            }
          }

          } <!-- /答题区 @if fillDifficulty() -->
        </div><!-- /填空内容 -->
      </div>
    </div>
  }

  <!-- ===================== WORDLE MODE ===================== -->
  @if (view() === 'wordle' && !pkRoomId()) {
    <div class="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden select-none">
      <div class="flex-1 flex flex-col bg-[var(--color-bg-card)] rounded-2xl lg:rounded-3xl m-1 lg:m-2 border border-[var(--color-border-card)] shadow-xl overflow-hidden">

        <app-game-header
          [title]="i18n.t('lobby.idiom')()"
          [subtitle]="i18n.t('idiom.mode_wordle')()"
          iconGradientClass="from-green-500 to-emerald-600"
          titleGradientClass="from-green-400 to-emerald-500"
          shadowClass="shadow-green-500/20"
          headerBgClass="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-b border-[var(--color-border-card)] px-4 lg:px-6 pb-2"
          (back)="view.set('lobby')"
          (rules)="showRules.set(true)">
          <div game-icon class="text-2xl sm:text-3xl md:text-4xl drop-shadow-md">🟩</div>
          <div header-right class="flex items-center gap-2">
            @if (socialStats()) {
              <div class="text-right text-xs text-[var(--color-text-secondary)]">
                <div>👥 {{ socialStats()!.total_players }}</div>
                <div>🏆 {{ socialStats()!.winners }}</div>
              </div>
            }
            @if (settingsService.settings().multiplayer_enabled === 'true') {
              <button (click)="navigateToPkArena()"
                class="p-1.5 lg:p-2 rounded-full text-[var(--color-accent-to)] hover:text-[var(--color-text-main)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors active:scale-95 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="text-[10px] font-black uppercase tracking-wider hidden sm:inline">PK</span>
              </button>
            }
          </div>
        </app-game-header>

        <!-- Hidden IME input for wordle -->
        <input id="wordle-input" type="text" autocomplete="off" autocorrect="off"
          autocapitalize="off" spellcheck="false" inputmode="text"
          (compositionend)="onWordleCompositionEnd($event)"
          (input)="onWordleInput($event)"
          class="fixed top-[-200px] left-1/2 w-8 h-8 opacity-0 pointer-events-none">

        <!-- 响应式布局：手机单列，PC 棋盘+键盘居中，超宽屏右侧加竞技面板 -->
        <div class="flex-1 flex overflow-y-auto lg:overflow-hidden">

          <!-- 棋盘 + 键盘居中组合（占剩余空间，内部居中对齐） -->
          <div class="flex-1 flex flex-col lg:flex-row lg:items-center lg:justify-center overflow-y-auto lg:overflow-hidden">

          <!-- ═══ 左：进度 + 提示(手机) + 棋盘 ═══ -->
          <div class="flex flex-col items-center justify-start lg:justify-center px-4 py-4 gap-3 lg:pr-2">

            <!-- 进度点 -->
            <div class="flex items-center gap-2">
              @for (i of [0,1,2,3,4,5]; track i) {
                <span class="w-3 h-3 rounded-full transition-all duration-300"
                  [class]="i < wordleGuesses().length
                    ? 'bg-green-500 scale-110'
                    : i === wordleGuesses().length && !wordleComplete()
                    ? 'bg-green-400/50 ring-2 ring-green-400/60'
                    : 'bg-[var(--color-border-card)]'">
                </span>
              }
              <span class="text-xs text-[var(--color-text-secondary)] ml-1 tabular-nums">
                {{ wordleGuesses().length }} / 6
              </span>
            </div>

            <!-- 提示区（手机才显示，PC 右栏显示） -->
            <div class="lg:hidden w-full max-w-xs">
              <ng-container *ngTemplateOutlet="hintsBlock"></ng-container>
            </div>

            <!-- 6×4 棋盘 -->
            <div class="flex flex-col gap-2 cursor-pointer" (click)="focusWordleInput()">
              @for (row of wordleGrid(); track $index; let ri = $index) {
                <div class="flex gap-2"
                  [class.anim-shake]="wordleShakeRow() && ri === wordleGuesses().length">
                  @for (cell of row; track $index; let ci = $index) {
                    <div class="w-[66px] h-[66px] lg:w-[72px] lg:h-[72px] rounded-2xl flex items-center justify-center text-2xl font-black border-2 transition-all duration-300 relative select-none"
                      [class]="wordleCellClass(cell.status)"
                      [style.transition-delay]="(cell.status && cell.status !== 'input') ? (ci * 120) + 'ms' : '0ms'">
                      {{ cell.char }}
                      @if (cell.active && !wordleSubmitting()) {
                        <span class="anim-cursor absolute bottom-2 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-green-400 rounded-full"></span>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- 错误 toast -->
            @if (wordleInputError()) {
              <div class="anim-slide-up px-5 py-2 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-sm font-bold text-rose-400 text-center">
                ⚠️ {{ wordleInputError() }}
              </div>
            }
          </div>

          <!-- 左右分隔线（PC 专属） -->
          <div class="hidden lg:block w-px shrink-0 bg-[var(--color-border-card)] self-stretch"></div>

          <!-- ═══ 右：提示(PC) + 颜色图例 + 键盘 ═══ -->
          <div class="flex flex-col px-4 pb-4 pt-0 lg:pt-4 gap-3 lg:pl-2 lg:w-[280px] lg:justify-center lg:overflow-y-auto">

            <!-- 出处 / 释义（PC 专属，手机在左栏） -->
            <div class="hidden lg:flex flex-col gap-1.5">
              <ng-container *ngTemplateOutlet="hintsBlock"></ng-container>
            </div>

            <!-- 颜色图例 -->
            <div class="flex items-center justify-center gap-3 text-xs text-[var(--color-text-secondary)]">
              <span class="flex items-center gap-1.5"><span class="w-4 h-4 rounded-md bg-green-500 shrink-0"></span>位置对</span>
              <span class="flex items-center gap-1.5"><span class="w-4 h-4 rounded-md bg-yellow-400 shrink-0"></span>字对位错</span>
              <span class="flex items-center gap-1.5"><span class="w-4 h-4 rounded-md bg-gray-600 shrink-0"></span>没有</span>
            </div>

            <!-- 键盘区（未完成时显示） -->
            @if (!wordleComplete()) {
              <!-- 20字键盘 5列×4行 -->
              <div class="grid grid-cols-5 gap-1.5">
                @for (ch of wordleKeyboard(); track ch + $index) {
                  <button (click)="onWordleKeyPress(ch)"
                    [disabled]="wordleSubmitting()"
                    class="h-12 rounded-xl font-black text-lg border-2 transition-all duration-150 active:scale-90 select-none"
                    [class]="wordleKeyBtnClass(ch)">
                    {{ ch }}
                  </button>
                }
              </div>

              <!-- 手写 + 删除 -->
              <div class="flex gap-2">
                <button (click)="focusWordleInput()"
                  class="flex items-center justify-center gap-1.5 flex-1 h-11 rounded-2xl border border-[var(--color-border-card)] text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors">
                  ✏️ 手写 / 拼音
                </button>
                <button (click)="clearLastGuessChar()"
                  [disabled]="currentGuess().length === 0 || wordleSubmitting()"
                  class="w-14 h-11 rounded-2xl border border-[var(--color-border-card)] flex items-center justify-center text-xl text-[var(--color-text-secondary)] hover:text-rose-400 hover:border-rose-400/40 hover:bg-rose-500/10 disabled:opacity-25 transition-colors shrink-0">
                  ⌫
                </button>
              </div>

              @if (wordleSubmitting()) {
                <p class="text-center text-xs text-[var(--color-text-secondary)] opacity-60 animate-pulse">验证中…</p>
              }
            }

            <!-- 结果卡（游戏完成后替换键盘区） -->
            @if (wordleComplete()) {
              <div class="anim-slide-up rounded-2xl border border-[var(--color-border-card)] overflow-hidden">
                <div class="px-4 pt-4 pb-3"
                  [class]="wordleWon() ? 'bg-green-500/10' : 'bg-[var(--color-bg-main)]'">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-2xl">{{ wordleWon() ? '🎉' : '😢' }}</span>
                    <span class="font-black text-base">{{ wordleWon() ? i18n.t('idiom.won')() : i18n.t('idiom.lost')() }}</span>
                  </div>
                  @if (wordleAnswer()) {
                    <div class="text-xl font-black text-green-400 mb-1">{{ wordleAnswer()!.word }}</div>
                    <p class="text-sm text-[var(--color-text-secondary)]">{{ wordleAnswer()!.explanation }}</p>
                  }
                </div>
                @if (wordleAnswer()?.story) {
                  <div class="px-4 py-3 border-t border-[var(--color-border-card)] bg-[var(--color-bg-card)]">
                    <div class="flex items-start gap-2">
                      <span class="text-green-400 shrink-0">📜</span>
                      <p class="text-xs text-[var(--color-text-secondary)] italic leading-relaxed">{{ wordleAnswer()!.story }}</p>
                    </div>
                  </div>
                }
                <div class="px-4 py-3 border-t border-[var(--color-border-card)] bg-[var(--color-bg-card)] flex gap-2">
                  <button (click)="shareWordle()"
                    class="flex-1 py-2.5 rounded-xl font-black border border-[var(--color-border-card)] text-sm hover:bg-[var(--color-bg-main)] transition-colors">
                    📤 {{ i18n.t('idiom.share')() }}
                  </button>
                  <button (click)="view.set('lobby')"
                    class="flex-1 py-2.5 rounded-xl font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm active:scale-95 transition-all">
                    {{ i18n.t('game.back_to_lobby')() }}
                  </button>
                </div>
              </div>
            }
          </div><!-- /键盘栏 -->
          </div><!-- /棋盘+键盘居中组合 -->

        </div><!-- /外层 flex 容器 -->

        <!-- 提示块模板 -->
        <ng-template #hintsBlock>
          <div class="w-full max-w-xs lg:max-w-none flex flex-col gap-1.5">
            @if (wordleHintSource()) {
              <div class="px-3 py-2 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
                <span class="shrink-0">📚</span>
                <span>出处：<span class="font-semibold text-[var(--color-text-main)]">{{ wordleHintSource() }}</span></span>
              </div>
            }
            @if (wordleHintMeaning()) {
              <div class="px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                <span class="shrink-0">💡</span>
                <span>{{ wordleHintMeaning() }}</span>
              </div>
            } @else if (!wordleComplete() && wordleGuesses().length < 2) {
              <div class="px-3 py-2 rounded-2xl border border-dashed border-[var(--color-border-card)]/40 text-[10px] text-[var(--color-text-secondary)] opacity-40 flex items-center gap-2">
                <span>💡</span><span>猜 2 次后解锁释义</span>
              </div>
            }
          </div>
        </ng-template>
      </div>
    </div>
  }

  <!-- Rules modal -->
  <app-game-rules-modal [gameId]="'idiom'" [isOpen]="showRules()" (closed)="showRules.set(false)"></app-game-rules-modal>

  <!-- Tutorial overlay -->
  <app-tutorial-overlay [steps]="tutorialSteps" [visible]="showTutorial()" (done)="onTutorialDone()"></app-tutorial-overlay>

  </div><!-- /左侧游戏内容区 -->

  <!-- ===== 右侧：竞技大厅面板（PC 专属，跨所有视图持久显示） ===== -->
  @if (settingsService.settings().multiplayer_enabled === 'true') {
    <div class="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 border-l border-[var(--color-border-card)]">
      <app-game-lobby-panel class="flex-1 flex" [currentGameId]="'idiom'" (joinRoom)="handleLobbyJoinRoom($event)"></app-game-lobby-panel>
    </div>
  }

</div>
  `
})
export class IdiomComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private svc = inject(IdiomService);
  private tutorialService = inject(TutorialService);
  private audio = inject(AudioService);
  private xpService = inject(XpService);
  settingsService = inject(SettingsService);
  pkStore = inject(IdiomPKStore);
  gameTimer = inject(GameTimerService);
  private wsService = inject(WebSocketService);
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

  constructor() {
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
    if (ch !== '_') return 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] cursor-default';
    if (this.pkStore.isRoundOver()) {
      return this.pkStore.iWonRound()
        ? 'border-green-500 bg-green-500 text-white'
        : 'border-red-400 bg-red-400/20 text-[var(--color-text-main)]';
    }
    if (this.pkStore.myState()?.last_wrong) {
      return 'border-red-500 bg-red-500 text-white anim-shake';
    }
    if (this.pkFillAnswer()[i]) return 'border-purple-500 bg-gradient-to-br from-purple-500/20 to-violet-600/15 text-[var(--color-text-main)]';
    if (activeIdx === i) return 'border-purple-400 bg-purple-500/15 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)] cursor-text';
    return 'border-dashed border-purple-300/25 bg-[var(--color-bg-card)] cursor-default';
  }

  pkWinDots(wins: number, target: number): { idx: number; filled: boolean }[] {
    return Array.from({ length: target }, (_, i) => ({ idx: i, filled: i < wins }));
  }

  ngOnDestroy() {
    this.pkStore.leaveRoom();
    this.wsService.disconnectLobby();
  }

  handleLobbyJoinRoom(room: any) {
    if (room.password) this.wsService.setPendingPassword(room.password);
    this.joinPkRoom(room.roomId, room.mode, room.difficulty || '', room.host);
  }

  navigateToPkArena() {
    this.router.navigate(['/pk-arena']);
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

  ngOnInit() {
    const playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
    this.wsService.connectLobby(playerId, playerId);
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
    this.router.navigate(['/lobby']);
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
