import { Component, Input, Output, EventEmitter, inject, ViewChild, OnInit, OnChanges, OnDestroy, SimpleChanges, booleanAttribute, signal, computed, effect, HostListener } from '@angular/core';
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
import { LayoutService } from '../../../core/services/layout.service';
import { DeviceService } from '../../../core/services/device.service';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { GameStoreInterface } from '../../../core/interfaces/game-store.interface';
import { GameWaitingRoomComponent } from '../game-waiting-room/game-waiting-room.component';
import { GameStartingOverlayComponent } from '../game-starting-overlay/game-starting-overlay.component';
import { GameResultOverlayComponent } from '../game-result-overlay/game-result-overlay.component';
import { GameSwitchModalComponent } from '../game-switch-modal/game-switch-modal.component';
import { GameSwitchService } from '../../../core/services/game-switch.service';
import { getOrigin, setSavedDifficulty, getSavedDifficulty } from '../../../core/utils/browser.util';
import { AdService } from '../../../core/services/ad.service';

@Component({
  selector: 'app-game-layout',
  standalone: true,
  host: {
    'ngSkipHydration': 'true'
  },
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
    GameResultOverlayComponent,
    GameSwitchModalComponent
  ],
  template: `
<div class="flex w-full flex-col relative text-[var(--color-text-main)] select-none"
     [ngClass]="zenService.isZenMode() ? 'h-[100dvh] max-h-[100dvh] overflow-hidden bg-[var(--color-bg-base)]' : (deviceService.isHandheld() ? 'min-h-[100dvh] bg-transparent p-0 m-0' : 'min-h-[calc(100dvh-64px)] bg-[var(--color-bg-base)]')">
  <!-- Offline Mode Banner -->
  @if (!zenService.isZenMode() && !isImmersiveEffective()) {
    <app-offline-banner></app-offline-banner>
  }

  <!-- Rules Modal -->
  <app-game-rules-modal [gameId]="gameId" [isOpen]="showRules" (closed)="rulesClosed.emit()"></app-game-rules-modal>

  <!-- Top Game Header Bar (在所有通用游戏中为手机/PWA保留返回键、规则手册与工具箱；仅在游戏显式传入 [immersive]="true" 时完全隐藏) -->
  @if (!zenService.isZenMode() && !isImmersiveEffective()) {
    <div class="w-full max-w-[1600px] mx-auto pt-0.5 sm:pt-1.5 px-1 sm:px-6 lg:px-8 z-40 sticky top-0 pb-0.5 sm:pb-1">
      <div class="w-full backdrop-blur-xl border border-[var(--color-border-card)] rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-xs overflow-visible" style="background-color: var(--color-bg-card);">
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
              <!-- PC 端（xl+ 宽屏）：由左侧专属座舱接管难度选择，顶栏彻底去除突兀堆叠，保持平台级纯净纯粹；仅在移动/平板端展示 -->
              <div class="xl:hidden">
                <app-difficulty-selector 
                  [availableDifficulties]="availableDifficulties"
                  [currentDifficulty]="effectiveDifficulty()"
                  (difficultyChange)="onDifficultyChange($event)">
                </app-difficulty-selector>
              </div>
            }
            <ng-content select="[header-center]"></ng-content>
          </ng-container>

          <ng-container header-right>
            <div class="flex items-center gap-1 sm:gap-2">
              <ng-content select="[header-right]"></ng-content>

              @if (effectiveRoomMode() === GameMode.Single && settingsService.settings().multiplayer_enabled === 'true') {
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

              @if (effectiveRoomMode() !== GameMode.Single && effectiveRoomId() && effectiveIsHost()) {
                <button (click)="openSwitchGame()"
                        class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white border border-purple-500/30 transition-all text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 group shrink-0 cursor-pointer"
                        [title]="i18n.t('game.switch_pk_game')() || '更换游戏 / 调整难度'">
                  <span class="group-hover:rotate-12 transition-transform">🎮</span>
                  <span class="hidden sm:inline">{{ i18n.t('game.switch_pk_game_short')() || '换游戏' }}</span>
                </button>
              }
            </div>
          </ng-container>
        </app-game-header>
      </div>
    </div>
  }

  <!-- Central Game Focus Arena (Spacious, Centered, Distraction-Free) -->
  <main class="flex-grow flex flex-col min-h-0 relative transition-all duration-300"
        [ngClass]="isImmersiveEffective() ? 'w-full h-[100dvh] max-h-[100dvh] flex-none overflow-hidden p-0 m-0 max-w-none' : 'w-full max-w-[1600px] mx-auto px-1 sm:px-6 lg:px-8 py-0.5 sm:py-2'"
        [class.items-center]="!isLobbyEffective() && !isImmersiveEffective()"
        [class.pb-16]="showHandheldDock()">
    
    <!-- Cockpit Grid Wrapper (Single-column on mobile/tablet, 3-column on PC xl+) -->
    <div class="w-full flex-grow flex flex-col xl:flex-row items-center xl:items-start justify-center gap-4 2xl:gap-6 min-h-0"
         [class.h-full]="isImmersiveEffective()"
         [class.max-h-full]="isImmersiveEffective()"
         [class.overflow-hidden]="isImmersiveEffective()">

      <!-- Left Cockpit Wing (PC Wide Screen: xl+) -->
      @if (!isImmersiveEffective()) {
        <aside class="hidden xl:flex flex-col gap-3 w-64 xl:w-72 2xl:w-80 shrink-0 animate-fade-in self-start sticky top-20">
          
          <!-- Card 1: 🎯 难度规格 / 游戏等级 (Game Difficulty Card, Standardized for all games) -->
          @if (effectiveRoomMode() === GameMode.Single && availableDifficulties.length > 0) {
            <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)]/90 backdrop-blur-md p-4 shadow-sm flex flex-col gap-3">
              <div class="flex items-center justify-between pb-2 border-b border-[var(--color-border-card)]/60">
                <span class="text-sm font-black text-[var(--color-text-main)] flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>{{ i18n.t('game.difficulty')() || '难度规格' }}</span>
                </span>
                <span class="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {{ getDifficultyLabel(effectiveDifficulty()) }}
                </span>
              </div>

              <!-- Difficulty Rows: One row per level (独占一行) -->
              <div class="grid grid-cols-1 gap-2">
                @for (diff of availableDifficulties; track diff.id) {
                  <button (click)="onDifficultyChange(diff.id)"
                          class="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between cursor-pointer active:scale-98 select-none"
                          [ngClass]="effectiveDifficulty() === diff.id ? 'bg-amber-500 text-white shadow-xs' : 'bg-[var(--color-bg-main)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)]'">
                    <div class="flex items-center gap-2">
                      <span class="text-base">{{ getDifficultyEmoji(diff.id) }}</span>
                      <span>{{ diff.labelKey ? (i18n.t(diff.labelKey)() || diff.id) : diff.id }}</span>
                    </div>
                    @if (diff.desc || diff.descKey) {
                      <span class="text-xs font-mono opacity-80" [title]="diff.descKey ? (i18n.t(diff.descKey)() || diff.desc || '') : (diff.desc || '')">
                        {{ diff.desc || (diff.descKey ? (i18n.t(diff.descKey)()) : '') }}
                      </span>
                    }
                  </button>
                }

                <!-- Extra difficulty slots (e.g. Minesweeper custom WxH button) -->
                <ng-content select="[cockpit-difficulty-extra]"></ng-content>
              </div>
            </div>
          }

          <!-- Custom Left Wing Extension Slot (for any extra game-specific widget) -->
          <ng-content select="[cockpit-left]"></ng-content>

          <!-- Card 2: 👤 选手档案 & ⚔️ PK对决 (Player Profile & Combat Specs) -->
          <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)]/90 backdrop-blur-md p-4 shadow-sm flex flex-col gap-3">
            <div class="flex items-center gap-3 pb-3 border-b border-[var(--color-border-card)]/60">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                {{ icon || '🎮' }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-black text-[var(--color-text-main)] truncate">
                  {{ authStore.currentUser()?.nickname || authStore.currentUser()?.username || (i18n.t('auth.guest')() || '挑战者') }}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    🪙 {{ authStore.currentUser()?.brain_coins ?? 0 }}
                  </span>
                  <span class="text-xs text-[var(--color-text-muted)] font-mono">
                    Lv.{{ authStore.currentUser()?.level ?? 1 }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Current Game Quick Specs -->
            <div class="flex flex-col gap-2 text-sm">
              <div class="flex items-center justify-between text-[var(--color-text-muted)]">
                <span>{{ i18n.t('game.mode')() || '游戏模式' }}</span>
                <span class="font-bold text-[var(--color-text-main)] capitalize">
                  {{ effectiveRoomMode() === GameMode.Single ? (i18n.t('game.mode_single')() || '单机休闲') : (i18n.t('game.mode_pk')() || '实时对战') }}
                </span>
              </div>
              @if (effectiveDifficulty()) {
                <div class="flex items-center justify-between text-[var(--color-text-muted)]">
                  <span>{{ i18n.t('game.difficulty')() || '当前难度' }}</span>
                  <span class="font-bold text-amber-500 capitalize">
                    {{ getDifficultyLabel(effectiveDifficulty()) }}
                  </span>
                </div>
              }
              <div class="flex items-center justify-between text-[var(--color-text-muted)]">
                <span>{{ i18n.t('game.status')() || '对局状态' }}</span>
                <span class="font-bold text-emerald-500">
                  {{ effectiveStatus() === GameStatus.Playing ? (i18n.t('game.status_playing')() || '🔥 挑战中') : (effectiveStatus() === GameStatus.Waiting ? (i18n.t('game.status_waiting')() || '⏳ 等待中') : (i18n.t('game.status_ready')() || '✨ 就绪')) }}
                </span>
              </div>
            </div>

            <!-- PK Match Hub in Left Wing -->
            @if (effectiveRoomMode() === GameMode.Single && settingsService.settings().multiplayer_enabled === 'true') {
              <div class="pt-2 border-t border-[var(--color-border-card)]/60 flex flex-col gap-2">
                <!-- If there's an active waiting room, highlight quick challenge -->
                @if (waitingRoomForThisGame(); as wr) {
                  <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1.5 animate-pulse">
                    <div class="flex items-center justify-between text-xs font-bold text-amber-500">
                      <span class="flex items-center gap-1">
                        <span>⚔️</span>
                        <span>{{ i18n.t('pk.waiting_room_alert')() || '发现对战房间！' }}</span>
                      </span>
                      <span class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20">
                        {{ getDifficultyLabel(wr.difficulty) }}
                      </span>
                    </div>
                    <button (click)="onQuickJoinTargetRoom(wr)"
                            class="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer">
                      <span>⚡</span>
                      <span>{{ i18n.t('lobby.quick_join')() || '快速应战' }}</span>
                    </button>
                  </div>
                }

                <!-- Fast Create / PK Arena button -->
                <button (click)="quickCreatePkRoom()"
                        class="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer spring-press">
                  <span>⚔️</span>
                  <span>{{ i18n.t('game.quick_pk')() || '发起对决' }}</span>
                </button>
              </div>
            }
          </div>
        </aside>
      }

      <!-- Center Cockpit Stage (Main Arena) -->
      <div class="flex-1 min-w-0 max-w-4xl flex flex-col items-center justify-start self-stretch"
           [class.h-full]="isImmersiveEffective()"
           [class.max-h-full]="isImmersiveEffective()"
           [class.overflow-hidden]="isImmersiveEffective()">
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
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap">
              {{ i18n.t('game.ghost_arena')() || '幽灵擂台' }}
            </span>
          </div>
        }

        <!-- Universal Spectator Director Bar (Option 1) -->
        @if (isSpectatorActive()) {
          <div class="w-full mb-2 px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-[var(--color-bg-card)]/95 border border-amber-500/40 shadow-lg flex items-center justify-between gap-2 backdrop-blur-md animate-fade-in shrink-0">
            <div class="flex items-center gap-2 min-w-0">
              <span class="flex h-2.5 w-2.5 relative shrink-0">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span class="text-xs font-black text-amber-500 dark:text-amber-400 flex items-center gap-1 shrink-0">
                👁️ {{ i18n.t('game.spectator_mode')() || '观战模式' }}
              </span>
              <span class="text-xs font-semibold text-[var(--color-text-muted)] truncate">
                {{ i18n.t('game.watching_player')() || '正在观看' }}:
                <b class="text-[var(--color-text-main)] font-bold">{{ focusedPlayerName() }}</b>
                <span class="text-[10px] opacity-75 ml-1 hidden md:inline">({{ i18n.t('game.click_avatar_to_switch')() || '点击选手头像秒切视角' }})</span>
              </span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Player Switcher Pills -->
              <div class="flex items-center gap-1.5">
                @for (p of spectatorContestants(); track (p.id || p.userId)) {
                  <button (click)="selectFocusPlayer(p.id || p.userId)"
                          class="px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          [ngClass]="isPlayerFocused(p.id || p.userId) ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-2 ring-amber-400 shadow-md scale-105' : 'bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-amber-400/50 border border-[var(--color-border-card)]'">
                    @if (isPlayerFocused(p.id || p.userId)) {
                      <span class="text-[10px] animate-pulse">🎯</span>
                    }
                    <span class="truncate max-w-[65px] sm:max-w-[100px]">{{ p.nickname || p.id || p.userId }}</span>
                    @if (isPlayerFocused(p.id || p.userId)) {
                      <span class="text-[8px] bg-white/25 px-1 py-0.2 rounded font-black tracking-tight">锁定</span>
                    }
                    @if (p.isHost) { <span class="text-[9px]">👑</span> }
                  </button>
                }
              </div>
              <!-- Leave spectate button -->
              <button (click)="back.emit()" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1 shrink-0">
                <span>🚪</span>
                <span class="hidden sm:inline">{{ i18n.t('game.leave_spectate')() || '退出观战' }}</span>
              </button>
            </div>
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
              (difficultyChange)="onWaitingRoomDifficultyChange($event)"
            ></app-game-waiting-room>
          </div>
        } @else {
          <!-- The Game Stage (Canvas / Board Container - Seamless & Integrated) -->
          <div class="w-full flex-grow flex flex-col relative transition-all duration-300"
               [class.pointer-events-none]="isSpectatorActive()"
               [ngClass]="isImmersiveEffective() ? 'h-full max-h-full overflow-hidden min-h-0 p-0 m-0 border-0 rounded-none bg-transparent shadow-none' : 'game-stage-pedestal border border-[var(--color-border-card)] bg-[var(--color-bg-card)]/95 backdrop-blur-md rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-md sm:shadow-xl p-1 sm:p-2.5'"
               [class.min-h-[320px]]="!isLobbyEffective() && !isImmersiveEffective()"
               [class.sm:min-h-[420px]]="!isLobbyEffective() && !isImmersiveEffective()"
               [class.items-center]="!isLobbyEffective() && !isImmersiveEffective()"
               [class.justify-center]="!isLobbyEffective() && !isImmersiveEffective()"
               [class.justify-start]="isLobbyEffective() || isImmersiveEffective()"
               [class.min-h-[520px]]="isLobbyEffective() && !isImmersiveEffective()"
               [class.sm:min-h-[620px]]="isLobbyEffective() && !isImmersiveEffective()"
               [class.lg:min-h-[680px]]="isLobbyEffective() && !isImmersiveEffective()"
               [class.h-[72vh]]="isLobbyEffective() && !isImmersiveEffective()"
               [class.max-h-[840px]]="isLobbyEffective() && !isImmersiveEffective()"
               [class.items-stretch]="isLobbyEffective()"
               [class.overflow-hidden]="isLobbyEffective()"
               [class.touch-none]="!isLobbyEffective() && !allowScroll && effectiveStatus() !== GameStatus.Waiting"
               [class.overscroll-none]="!isLobbyEffective() && !allowScroll && effectiveStatus() !== GameStatus.Waiting"
               [class.touch-pan-y]="isLobbyEffective() || allowScroll || effectiveStatus() === GameStatus.Waiting"
               [class.overflow-y-auto]="!isLobbyEffective() && (allowScroll || effectiveStatus() === GameStatus.Waiting)"
               [class.h-full]="!isLobbyEffective() && (allowScroll || effectiveStatus() === GameStatus.Waiting)"
               [style.overscroll-behavior]="(isLobbyEffective() || allowScroll || effectiveStatus() === GameStatus.Waiting) ? 'contain' : 'none'"
               [style.touch-action]="(isLobbyEffective() || allowScroll || effectiveStatus() === GameStatus.Waiting) ? 'pan-y' : 'none'">

            <!-- Ambient Console Spotlight (Desktop only, subtle & gorgeous) -->
            @if (!isImmersiveEffective()) {
              <div class="hidden lg:block pointer-events-none absolute -inset-6 sm:-inset-10 game-cockpit-glow blur-2xl -z-10 opacity-70"></div>
            }
            <!-- Project custom game components here -->
            <ng-content></ng-content>

            <!-- 轻量极速自动流转提示胶囊 (Auto Next Banner) -->
            @if (isAutoNextNoticeVisible()) {
              <div class="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--color-bg-card)]/95 border border-[var(--color-accent-from)] shadow-xl backdrop-blur-md animate-bounce-in text-xs sm:text-sm font-bold text-[var(--color-text-main)] pointer-events-auto">
                <span class="animate-spin text-sm">⏳</span>
                <span>{{ i18n.t('game.auto_next_title')() }}</span>
                <button (click)="proceedAutoNextNow()" class="ml-1 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] font-extrabold hover:brightness-110 active:scale-95 transition-all shadow-sm">
                  {{ i18n.t('game.auto_next_btn')() }}
                </button>
              </div>
            }

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
                [isHost]="effectiveIsHost()"
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
      </div>

      <!-- Right Cockpit Wing (PC Wide Screen: xl+) -->
      @if (!isLobbyEffective() && !isImmersiveEffective()) {
        <aside class="hidden xl:flex flex-col gap-3 w-64 xl:w-72 2xl:w-80 shrink-0 animate-fade-in self-start sticky top-20">
          <ng-content select="[cockpit-right]"></ng-content>
          <!-- Desktop Hotkey & Pro Cheatsheet Card -->
          <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)]/90 backdrop-blur-md p-4 shadow-sm flex flex-col gap-3">
            <div class="flex items-center justify-between pb-2 border-b border-[var(--color-border-card)]/60">
              <span class="text-sm font-black text-[var(--color-text-main)] flex items-center gap-1.5">
                <span>⌨️</span>
                <span>{{ i18n.t('game.hotkeys')() || '快捷操作' }}</span>
              </span>
              <span class="text-xs font-mono font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-main)] px-2 py-0.5 rounded border border-[var(--color-border-card)]">Pro</span>
            </div>

            <div class="flex flex-col gap-2.5 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-[var(--color-text-secondary)]">{{ i18n.t('game.key_restart')() || '极速重开' }}</span>
                <kbd class="px-2.5 py-0.5 rounded-md bg-[var(--color-bg-main)] border border-[var(--color-border-card)] font-mono text-xs font-bold text-[var(--color-text-main)] shadow-2xs">R / Space</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-[var(--color-text-secondary)]">{{ i18n.t('game.key_undo')() || '智能撤销' }}</span>
                <kbd class="px-2.5 py-0.5 rounded-md bg-[var(--color-bg-main)] border border-[var(--color-border-card)] font-mono text-xs font-bold text-[var(--color-text-main)] shadow-2xs">Ctrl + Z</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-[var(--color-text-secondary)]">{{ i18n.t('game.key_hint')() || '锦囊提示' }}</span>
                <kbd class="px-2.5 py-0.5 rounded-md bg-[var(--color-bg-main)] border border-[var(--color-border-card)] font-mono text-xs font-bold text-[var(--color-text-main)] shadow-2xs">H</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-[var(--color-text-secondary)]">{{ i18n.t('game.key_rules')() || '速查攻略' }}</span>
                <button (click)="scrollToStrategyGuide()"
                        class="px-2.5 py-1 rounded-md bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] font-mono text-xs font-bold text-amber-500 shadow-2xs cursor-pointer active:scale-95 transition-all">
                  {{ i18n.t('game.view_rules')() || '📖 查看' }}
                </button>
              </div>
            </div>

            <!-- Focus / Zen Mode Shortcut -->
            <button (click)="zenService.toggle()"
                    class="w-full mt-1.5 py-2 px-3.5 rounded-xl bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer">
              <span>🧘</span>
              <span>{{ zenService.isZenMode() ? (i18n.t('game.zen_mode_exit')() || '退出沉浸') : (i18n.t('game.zen_mode')() || '专注全屏模式') }}</span>
            </button>
          </div>
        </aside>
      }

    </div>

  </main>

  <!-- Ergonomic Handheld Floating Dock (Thumb Zone Mastery) -->
  @if (showHandheldDock()) {
    <aside class="fixed bottom-[calc(0.6rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-40 px-3 w-full max-w-sm pointer-events-none flex justify-center">
      <div class="pointer-events-auto backdrop-blur-xl bg-[var(--color-bg-card)]/95 border border-[var(--color-border-card)] shadow-2xl rounded-2xl p-1.5 flex items-center justify-between gap-1.5 w-full ring-1 ring-black/5 dark:ring-white/10 animate-slide-up">
        <!-- 1. Quick Restart / Play Again Button (Thumb hotspot) -->
        @if (effectiveShowPlayAgain() || effectiveStatus() === GameStatus.Playing) {
          <button (click)="onPlayAgainClicked()"
                  class="flex-1 py-2 px-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer spring-press">
            <span class="text-sm">↺</span>
            <span>{{ effectiveStatus() === GameStatus.Playing ? (i18n.t('game.restart')() || '重玩') : (i18n.t('game.play_again')() || '再来一局') }}</span>
          </button>
        }

        <!-- 2. Slot for Game-Specific Dock Actions (Undo, Hint, etc.) -->
        <ng-content select="[handheld-dock]"></ng-content>

        <!-- 3. PK / Switch Game -->
        @if (effectiveRoomMode() === GameMode.Single && settingsService.settings().multiplayer_enabled === 'true') {
          <button (click)="quickCreatePkRoom()"
                  class="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 font-bold text-xs border border-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 spring-press"
                  [title]="i18n.t('game.quick_pk')() || '开房PK'">
            <span>⚔️</span>
            <span>{{ i18n.t('game.quick_pk')() || '联机' }}</span>
          </button>
        } @else if (effectiveRoomMode() !== GameMode.Single && effectiveIsHost()) {
          <button (click)="openSwitchGame()"
                  class="py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 font-bold text-xs border border-purple-500/30 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 spring-press"
                  [title]="i18n.t('game.switch_pk_game')() || '换游戏'">
            <span>🎮</span>
            <span>{{ i18n.t('game.switch_pk_game_short')() || '换游戏' }}</span>
          </button>
        }

        <!-- 4. Scroll to SEO & Strategy Guide Button -->
        <button (click)="scrollToStrategyGuide()"
                class="w-9 h-8 rounded-xl bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-card)] flex items-center justify-center text-xs active:scale-95 transition-all cursor-pointer shrink-0"
                [title]="i18n.t('game.strategy_guide_title')() || '查看完整玩法与SEO攻略'">
          <span>📖</span>
        </button>
      </div>
    </aside>
  }

  <!-- In-depth Strategy & SEO Section (100% Crawlable & Accessible across all platforms) -->
  @if (!zenService.isZenMode()) {
    <section id="strategy-guide"
             itemscope
             itemtype="https://schema.org/VideoGame"
             class="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 mt-6 sm:mt-10 pb-16">
      <meta itemprop="name" [content]="title" />
      <meta itemprop="gamePlatform" content="Web, Mobile, PC, Tablet, iOS, Android" />
      <meta itemprop="applicationCategory" content="PuzzleGame" />
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

  <!-- Floating Feedback / Bug Report Button (Single minimalist button at bottom right, globally persistent for all games) -->
  <aside class="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] right-2.5 sm:right-4 z-50 flex items-center pointer-events-auto"
         aria-label="Feedback button">
    <!-- Feedback / Bug Report Button -->
    <button type="button"
            (click)="onOpenFeedback()"
            class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--color-bg-card)]/90 hover:bg-[var(--color-bg-card)] backdrop-blur-md border border-[var(--color-border-card)] text-amber-500 hover:text-amber-400 shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center opacity-70 hover:opacity-100 group cursor-pointer"
            [attr.title]="i18n.t('feedback.tooltip')() || '意见建议与 Bug 反馈'">
      <span class="text-sm sm:text-base group-hover:scale-110 transition-transform">🐞</span>
      <span class="sr-only">{{ i18n.t('feedback.tooltip')() || '意见反馈' }}</span>
    </button>
  </aside>

  <!-- Player Feedback Modal Dialog -->
  <app-feedback-modal></app-feedback-modal>

  <!-- Switch Game / Difficulty Modal Dialog -->
  <app-game-switch-modal></app-game-switch-modal>
</div>
  `
})
export class GameLayoutComponent implements OnInit, OnChanges, OnDestroy {
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
  layoutService = inject(LayoutService);
  deviceService = inject(DeviceService);
  adService = inject(AdService);
  gameSwitchService = inject(GameSwitchService);

  openSwitchGame() {
    if (this.effectiveRoomMode() !== GameMode.Single && !this.effectiveIsHost()) {
      return;
    }
    this.gameSwitchService.open({
      roomId: this.effectiveRoomId() || undefined,
      currentGameId: this.gameId,
      currentDifficulty: this.effectiveDifficulty(),
      currentMode: this.effectiveRoomMode(),
      isPkMatch: this.effectiveRoomMode() !== GameMode.Single
    });
  }

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
  readonly isDefeatSignal = signal<boolean | undefined>(undefined);
  @Input() set isDefeat(val: boolean | undefined) {
    this.isDefeatSignal.set(val);
  }
  get isDefeat(): boolean | undefined {
    return this.isDefeatSignal();
  }

  readonly showOverlaySignal = signal<boolean>(true);
  @Input() set showOverlay(val: boolean) {
    this.showOverlaySignal.set(val);
  }
  get showOverlay(): boolean {
    return this.showOverlaySignal();
  }
  @Input({ transform: booleanAttribute }) showRevive: boolean = false;
  @Input({ transform: booleanAttribute }) showNextLevel: boolean = false;
  @Input({ transform: booleanAttribute }) immersive: boolean = false;

  readonly isImmersiveActive = signal<boolean>(false);

  readonly isImmersiveEffective = computed(() => {
    // 仅当游戏组件显式指定了 [immersive]="true"（例如自带原生微顶栏的《羊了个羊》），
    // 或者在手持设备上主动开启沉浸时，才隐藏公共顶栏；
    // 通用 18 款游戏默认保留超轻量微型顶栏，确保 PWA 模式与移动端下的【⬅ 返回大厅】、【📖 玩法手册】与【⚙️ 设置】100% 存在！
    const isHandheld = this.deviceService.isHandheld();
    return isHandheld && (this.immersive || this.isImmersiveActive());
  });

  toggleImmersive() {
    this.isImmersiveActive.update(v => {
      const next = !v;
      this.layoutService.setImmersiveGame(next && this.deviceService.isHandheld());
      return next;
    });
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
  readonly isLobbySignal = signal<boolean>(false);
  @Input({ transform: booleanAttribute }) set isLobby(val: boolean) {
    this.isLobbySignal.set(val);
  }
  get isLobby(): boolean {
    return this.isLobbySignal();
  }

  readonly isLobbyEffective = computed(() => {
    return this.isLobbySignal() && this.effectiveRoomMode() === GameMode.Single;
  });

  readonly showHandheldDock = computed(() => {
    return this.deviceService.isHandheld() &&
      !this.zenService.isZenMode() &&
      !this.isImmersiveEffective() &&
      !this.isAutoWaitingRoomVisible() &&
      !this.isSpectatorActive() &&
      !this.isLobbyEffective();
  });

  scrollToStrategyGuide() {
    const el = document.getElementById('strategy-guide');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
  @Input({ transform: booleanAttribute }) allowScroll: boolean = false;
  
  @Input() seoDescKey?: string;

  @Input() showPlayAgainBtn: boolean = false;
  @Input() showLeaveBtn: boolean = false;
  readonly currentDifficultySignal = signal<string>('');
  @Input() set currentDifficulty(val: string) {
    this.currentDifficultySignal.set(val || '');
  }
  get currentDifficulty(): string {
    return this.currentDifficultySignal();
  }

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
    const directDiff = this.currentDifficultySignal();
    if (directDiff) return directDiff;
    const storeDiff = (this.store as any)?.currentDifficulty?.() || (this.store as any)?.difficulty?.();
    if (storeDiff) return storeDiff;
    if (this.gameId) {
      return getSavedDifficulty(this.gameId, this.availableDifficulties[0]?.id || 'medium');
    }
    return this.availableDifficulties[0]?.id || 'medium';
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
    return this.showPlayAgainBtn || (!!this.store && this.effectiveRoomMode() === GameMode.Single && this.effectiveStatus() === GameStatus.Finished && this.showOverlaySignal());
  });

  readonly effectiveShowLeave = computed(() => {
    return this.showLeaveBtn || (!!this.store && this.effectiveRoomMode() !== GameMode.Single);
  });

  readonly isSpectatorActive = computed(() => {
    return (this.store as any)?.isSpectator?.() || false;
  });

  readonly focusedPlayerId = computed(() => {
    return (this.store as any)?.focusedPlayerId?.() || '';
  });

  isPlayerFocused(id?: string): boolean {
    if (!id) return false;
    const focus = this.focusedPlayerId();
    return id === focus || id.toLowerCase() === focus.toLowerCase();
  }

  readonly spectatorContestants = computed(() => {
    const players = this.effectivePlayers();
    return players || [];
  });

  readonly focusedPlayerName = computed(() => {
    const focusId = this.focusedPlayerId();
    const players = this.spectatorContestants();
    const p = players.find((x: any) => this.isPlayerFocused(x.id || x.userId));
    return p ? (p.nickname || p.id || p.userId) : (focusId || '选手');
  });

  selectFocusPlayer(playerId: string) {
    if (playerId && (this.store as any)?.setFocusedPlayer) {
      (this.store as any).setFocusedPlayer(playerId);
    }
  }

  readonly isAutoWaitingRoomVisible = computed(() => {
    return !this.isLobbyEffective() && !!this.store && this.autoManageOverlays && this.effectiveStatus() === GameStatus.Waiting && this.effectiveRoomMode() !== GameMode.Single && !this.isSpectatorActive();
  });

  readonly isAutoStartingVisible = computed(() => {
    return !!this.store && this.autoManageOverlays && this.effectiveStatus() === GameStatus.Starting;
  });

  readonly currentFinishFlow = computed(() => {
    const config = this.gameRegistry.getConfig(this.gameId);
    return config?.finishFlow || {
      winAction: 'modal',
      loseAction: 'modal',
      autoNextAdFreq: -1,
      autoNextDelayMs: 1500,
    };
  });

  readonly resultStatus = computed<GameResultType>(() => {
    // 1. 若外部组件通过输入属性强制声明了 isDefeat（优先级最高）
    const defeat = this.isDefeatSignal();
    if (defeat !== undefined) return defeat ? 'lose' : 'win';

    // 2. 统一遵从平台契约 store.isVictory()！
    if (this.store) {
      return this.store.isVictory() ? 'win' : 'lose';
    }

    return 'win';
  });

  readonly isAutoResultVisible = computed(() => {
    if (!this.store || !this.autoManageOverlays || this.effectiveStatus() !== GameStatus.Finished) {
      return false;
    }
    if (this.effectiveRoomMode() === GameMode.Single) {
      const flow = this.currentFinishFlow();
      const isWin = this.resultStatus() === 'win';
      if (isWin && flow.winAction === 'auto_next') return false;
      if (!isWin && (flow.loseAction === 'board_overlay' || flow.loseAction === 'auto_restart')) return false;
    }
    // 母版内部延时就绪，或外部显式传入了 showOverlay=true，弹窗均能 100% 顺畅挂载
    return this.isInternalModalReady() || this.showOverlaySignal();
  });

  readonly resultTitle = computed(() => {
    if (this.customResultTitle) return this.customResultTitle;
    if (this.isSpectatorActive()) {
      const winners = (this.store as any)?.winners?.() || [];
      const winnerName = winners.length > 0 ? winners[0] : '';
      return winnerName ? (this.i18n.t('game.winner_crowned')() || '恭喜 {name} 获胜！').replace('{name}', winnerName) : (this.i18n.t('game.match_finished')() || '对决已分胜负');
    }
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
    this.adService.showReviveRewardedAd(this.gameId || 'game', () => {
      this.revive.emit();
      const s = this.store as any;
      if (typeof s?.reviveGame === 'function') {
        s.reviveGame();
      } else if (typeof s?.revive === 'function') {
        s.revive();
      }
    });
  }

  onResultChangeRoomGame(game: string) {
    (this.store as any)?.changeRoomGame?.(game);
  }

  isAutoNextNoticeVisible = signal(false);
  readonly isInternalModalReady = signal<boolean>(false);
  private modalDelayTimer: any = null;
  private autoNextTimer: any = null;
  private autoRestartTimer: any = null;

  constructor() {
    effect(() => {
      const status = this.effectiveStatus();
      const mode = this.effectiveRoomMode();
      if (status === GameStatus.Finished) {
        if (mode === GameMode.Single) {
          const flow = this.currentFinishFlow();
          const isWin = this.resultStatus() === 'win';
          if (isWin && flow.winAction === 'auto_next') {
            this.isAutoNextNoticeVisible.set(true);
            const delay = flow.autoNextDelayMs !== undefined ? flow.autoNextDelayMs : 1500;
            this.autoNextTimer = setTimeout(() => {
              this.triggerAutoNextFlow();
            }, delay);
          } else if (!isWin && flow.loseAction === 'auto_restart') {
            const delay = flow.autoNextDelayMs !== undefined ? flow.autoNextDelayMs : 1500;
            this.autoRestartTimer = setTimeout(() => {
              this.onResultRestart();
            }, delay);
          } else if (!isWin && flow.loseAction === 'board_overlay') {
            this.isInternalModalReady.set(false);
          } else {
            // 标准弹窗结算：母版内部自带延时，确保即使子游戏未写任何代码也能自动平滑弹窗！
            const delay = flow.autoNextDelayMs !== undefined ? flow.autoNextDelayMs : 1500;
            this.modalDelayTimer = setTimeout(() => {
              this.isInternalModalReady.set(true);
            }, delay);
          }
        } else {
          this.isInternalModalReady.set(true);
        }
      } else {
        this.clearAutoNextTimers();
        if (this.modalDelayTimer) {
          clearTimeout(this.modalDelayTimer);
          this.modalDelayTimer = null;
        }
        this.isInternalModalReady.set(false);
      }
    });
  }

  proceedAutoNextNow() {
    this.clearAutoNextTimers();
    this.triggerAutoNextFlow();
  }

  private clearAutoNextTimers() {
    if (this.autoNextTimer) {
      clearTimeout(this.autoNextTimer);
      this.autoNextTimer = null;
    }
    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
      this.autoRestartTimer = null;
    }
    this.isAutoNextNoticeVisible.set(false);
  }

  private triggerAutoNextFlow() {
    this.clearAutoNextTimers();
    const flow = this.currentFinishFlow();
    this.adService.tryShowAutoNextInterstitial(
      this.gameId,
      () => {
        this.nextLevel.emit();
        this.onResultRestart();
      },
      flow.autoNextAdFreq
    );
  }

  GameMode = GameMode;
  GameStatus = GameStatus;

  @Input() availableDifficulties: { id: string, labelKey: string, descKey?: string, desc?: string }[] = [];

  ngOnInit() {
    if (this.deviceService.isHandheld() && this.immersive) {
      this.isImmersiveActive.set(true);
      this.layoutService.setImmersiveGame(true);
    }

    if (this.gameId && this.availableDifficulties.length === 0) {
      const config = this.gameRegistry.getConfig(this.gameId);
      if (config && config.difficulties) {
        this.availableDifficulties = config.difficulties;
      }
    }

    if (!this.currentDifficultySignal()) {
      const saved = this.gameId ? getSavedDifficulty(this.gameId, '') : '';
      const storeDiff = (this.store as any)?.currentDifficulty?.() || (this.store as any)?.difficulty?.();
      const initial = saved || storeDiff || this.availableDifficulties[0]?.id || 'medium';
      if (initial) {
        this.currentDifficultySignal.set(initial);
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

  getDifficultyLabel(diff?: string): string {
    if (!diff) return '';
    if (diff === 'custom') {
      return this.i18n.t('game.custom')() || '自定义';
    }
    const found = this.availableDifficulties.find(d => d.id === diff);
    if (found?.labelKey) {
      const translated = this.i18n.t(found.labelKey)();
      if (translated) return translated;
    }
    return this.i18n.t(`game.diff_${diff}`)() || diff;
  }

  getDifficultyEmoji(diffId?: string): string {
    if (!diffId) return '🎯';
    const id = diffId.toLowerCase();
    if (id.includes('easy') || id.includes('beginner') || id.includes('3x3') || id.includes('casual')) return '🌱';
    if (id.includes('medium') || id.includes('normal') || id.includes('intermediate') || id.includes('4x4') || id.includes('timer')) return '⚡';
    if (id.includes('hard') || id.includes('advanced') || id.includes('5x5') || id.includes('speed')) return '🔥';
    if (id.includes('expert') || id.includes('professional') || id.includes('6x6') || id.includes('10x10')) return '😈';
    if (id.includes('master') || id.includes('8x8') || id.includes('12x12') || id.includes('25x25')) return '👑';
    if (id.includes('custom')) return '🛠️';
    if (id.includes('zen')) return '🧘';
    if (id.includes('classic')) return '📜';
    return '🎯';
  }

  ngOnDestroy() {
    this.clearAutoNextTimers();
    this.layoutService.setImmersiveGame(false);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentRoomId'] && changes['currentRoomId'].currentValue) {
      this.togglePkDrawer(false);
    }
    if (changes['gameId'] && this.gameId && this.availableDifficulties.length === 0) {
      const config = this.gameRegistry.getConfig(this.gameId);
      if (config && config.difficulties) {
        this.availableDifficulties = config.difficulties;
      }
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
    this.currentDifficultySignal.set(newDiff);
    if ((this.store as any)?.currentDifficulty?.set) {
      (this.store as any).currentDifficulty.set(newDiff);
    }
    if (this.gameId) {
      setSavedDifficulty(this.gameId, newDiff);
    }
    if (this.effectiveRoomMode() === GameMode.Single) {
      this.difficultyChange.emit(newDiff);
    }
  }

  onWaitingRoomDifficultyChange(newDiff: string) {
    this.currentDifficultySignal.set(newDiff);
    if (this.gameId) {
      setSavedDifficulty(this.gameId, newDiff);
    }
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
      difficulty: data.difficulty || this.effectiveDifficulty(),
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
      difficulty: this.effectiveDifficulty(),
      target: 1
    });
  }

  openChangeSettingsGlobal() {
    const rId = this.effectiveRoomId();
    if (rId) {
      this.editRoomService.open({
        roomId: rId,
        gameId: this.gameId,
        mode: this.effectiveRoomMode(),
        difficulty: this.effectiveDifficulty(),
        target: this.effectiveTarget(),
        bountyCoins: (this.store as any)?.bountyCoins?.() ?? 0
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
