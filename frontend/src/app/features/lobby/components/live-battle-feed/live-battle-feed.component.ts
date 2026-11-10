import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { GameStatsService, PKBattle } from '../../../../core/services/game-stats.service';
import { GameRegistryService } from '../../../../core/services/game-registry.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { CrossGameJoinService } from '../../../../core/services/cross-game-join.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { GameMode } from '../../../../core/models/game.model';

@Component({
  selector: 'app-live-battle-feed',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes battleGlow {
      0%, 100% {
        box-shadow: 0 0 10px rgba(245, 158, 11, 0.45), 0 0 0 0 rgba(245, 158, 11, 0.5);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 22px rgba(249, 115, 22, 0.75), 0 0 0 3px rgba(245, 158, 11, 0.25);
        transform: scale(1.03);
      }
    }
    .animate-battle-glow {
      animation: battleGlow 1.6s ease-in-out infinite;
    }
  `],
  template: `
    <div class="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3 h-full">
      
      <!-- Top Title Bar -->
      <div class="flex items-center justify-between gap-2 border-b border-[var(--color-border-card)] pb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl sm:text-2xl drop-shadow-sm">⚔️</span>
          <div>
            <h2 class="text-sm sm:text-base font-black tracking-tight text-[var(--color-text-main)] flex items-center gap-1.5">
              <span>{{ i18n.t('lobby.live_battles_title')() || '全网对决实况' }}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>LIVE</span>
              </span>
            </h2>
            <p class="text-[11px] text-[var(--color-text-secondary)] line-clamp-1">
              {{ i18n.t('lobby.live_battles_desc')() || '真实会员热血对决战报，见证巅峰交锋' }}
            </p>
          </div>
        </div>

        <button (click)="refresh()" 
                title="刷新实况"
                class="p-1.5 rounded-lg hover:bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" [class.animate-spin]="refreshing()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- Mode Switcher Tabs: 全部实况 (默认) / 正在交锋 / 完赛战报 -->
      <div class="flex items-center gap-1.5 border-b border-[var(--color-border-card)]/60 pb-2">
        <button (click)="feedTab.set('all')"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border active:scale-95 whitespace-nowrap"
                [class.bg-[var(--color-accent-from)]]="feedTab() === 'all'"
                [class.text-white]="feedTab() === 'all'"
                [class.border-transparent]="feedTab() === 'all'"
                [class.shadow-2xs]="feedTab() === 'all'"
                [class.bg-[var(--color-bg-main)]]="feedTab() !== 'all'"
                [class.text-[var(--color-text-secondary)]]="feedTab() !== 'all'"
                [class.border-[var(--color-border-card)]]="feedTab() !== 'all'">
          <span>⚡</span>
          <span>{{ i18n.t('lobby.all_battles_tab')() || '全部实况' }}</span>
        </button>

        <button (click)="feedTab.set('live')"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95 whitespace-nowrap"
                [class.bg-[var(--color-accent-from)]]="feedTab() === 'live'"
                [class.text-white]="feedTab() === 'live'"
                [class.border-transparent]="feedTab() === 'live'"
                [class.shadow-2xs]="feedTab() === 'live'"
                [class.bg-[var(--color-bg-main)]]="feedTab() !== 'live'"
                [class.text-[var(--color-text-secondary)]]="feedTab() !== 'live'"
                [class.border-[var(--color-border-card)]]="feedTab() !== 'live'">
          <span>🔥</span>
          <span>{{ i18n.t('lobby.live_rooms_tab')() || '正在交锋' }}</span>
          @if (activeRooms().length > 0) {
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-[10px] font-mono opacity-90">({{ activeRooms().length }})</span>
          }
        </button>

        <button (click)="feedTab.set('battles')"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95 whitespace-nowrap"
                [class.bg-[var(--color-accent-from)]]="feedTab() === 'battles'"
                [class.text-white]="feedTab() === 'battles'"
                [class.border-transparent]="feedTab() === 'battles'"
                [class.shadow-2xs]="feedTab() === 'battles'"
                [class.bg-[var(--color-bg-main)]]="feedTab() !== 'battles'"
                [class.text-[var(--color-text-secondary)]]="feedTab() !== 'battles'"
                [class.border-[var(--color-border-card)]]="feedTab() !== 'battles'">
          <span>🏆</span>
          <span>{{ i18n.t('lobby.finished_battles_tab')() || '完赛战报' }}</span>
        </button>
      </div>

      <!-- Real-time Live Breaking News Banner (WS Push Event) -->
      @if (latestLiveCommentary()) {
        <div class="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between gap-2 shadow-2xs animate-pulse">
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-sm shrink-0">📢</span>
            <span class="font-black text-amber-500 text-[11px] shrink-0">战报快讯:</span>
            <span class="text-[11px] text-[var(--color-text-main)] truncate font-semibold">
              {{ latestLiveCommentary() }}
            </span>
          </div>
          <span class="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono shrink-0">REALTIME</span>
        </div>
      }

      <!-- Main Scrollable Content Area -->
      <div class="flex flex-col gap-2.5 flex-grow overflow-y-auto max-h-[420px] sm:max-h-[460px] pr-1 scrollbar-thin">

        <!-- ========================================== -->
        <!-- SECTION 1: 正在交锋 (Live Matches & Open Challenges) -->
        <!-- ========================================== -->
        @if (feedTab() === 'all' || feedTab() === 'live') {

          <!-- 1A: 激烈交锋中 (2/2 人对战) -> 仅提供【实时观战】 -->
          @if (playingRooms().length > 0) {
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between text-xs font-bold text-rose-500 px-0.5">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>{{ i18n.t('lobby.live_matches_group')() || '🔥 激战直播' }} ({{ playingRooms().length }})</span>
                </span>
                <span class="text-[10px] font-normal text-[var(--color-text-muted)]">点击进入观战视角</span>
              </div>

              @for (room of playingRooms(); track room.id) {
                <div class="rounded-xl border border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60 p-2.5 flex flex-col gap-2 transition-all hover:shadow-2xs">
                  <!-- Top Row: Game Info & Live Spectator Counter -->
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] flex items-center justify-center text-base shrink-0">
                        {{ getGameEmoji(room.game) }}
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="font-black text-xs text-[var(--color-text-main)] truncate max-w-[90px] sm:max-w-[120px]">
                            {{ getGameTitle(room.game) }}
                          </span>
                          <span class="px-1.5 py-0.2 rounded text-[9px] font-bold" [ngClass]="getDifficultyBadgeClass(room.difficulty)">
                            {{ getDifficultyLabel(room.game, room.difficulty) }}
                          </span>
                          <span class="px-1.5 py-0.2 rounded bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[9px] font-semibold text-[var(--color-text-secondary)]">
                            {{ getRoomRoundLabel(room) }}
                          </span>
                          @if (room.bountyCoins > 0) {
                            <span class="px-1 py-0.1 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                              🪙 {{ room.bountyCoins }}
                            </span>
                          }
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/20 flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <span>交锋中 ({{ room.players }}/{{ getMaxPlayers(room.game) }})</span>
                      </span>
                      @if (room.spectators > 0) {
                        <span class="text-[10px] text-[var(--color-text-muted)] font-mono flex items-center gap-0.5">
                          <span>👁️</span>
                          <span>{{ room.spectators }}人观战</span>
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Middle Row: Clash VS Bar + Dedicated Spectate Action -->
                  <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
                    <!-- Head to Head Matchup -->
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <span class="text-xs font-black text-amber-500 truncate max-w-[85px] sm:max-w-[110px] flex items-center gap-0.5">
                        <span>👑</span>
                        <span>{{ room.host }}</span>
                      </span>
                      <span class="text-rose-500 font-extrabold text-[11px] italic shrink-0">VS</span>
                      <span class="text-xs font-black truncate max-w-[90px] sm:max-w-[120px]"
                            [class.text-rose-500]="room.opponent"
                            [class.text-blue-500]="!room.opponent && room.players > 1">
                        @if (room.opponent) {
                          <span>⚔️ {{ room.opponent }}</span>
                        } @else if (room.players > 1) {
                          <span>👥 共 {{ room.players }} 选手</span>
                        } @else {
                          <span class="text-[var(--color-text-muted)]">等候挑战</span>
                        }
                      </span>
                    </div>

                    <!-- Action: 参战者提供【返回对决】，旁观者提供【实时观战】 -->
                    @if (isUserInRoom(room)) {
                      <button (click)="reconnectRoom(room)"
                              class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50 animate-pulse shrink-0">
                        <span class="relative flex h-2 w-2 shrink-0">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span>⚡</span>
                        <span>{{ i18n.t('lobby.reconnect_match_btn')() || '返回对决' }}</span>
                      </button>
                    } @else {
                      <button (click)="spectateRoom(room)"
                              class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0">
                        <span>👁️</span>
                        <span>{{ i18n.t('lobby.spectate_btn')() || '实时观战' }}</span>
                      </button>
                    }
                  </div>

                  <!-- Real-time Commentary -->
                  <div class="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1">
                    <span>⚔️</span>
                    <span class="truncate">
                      @if (room.opponent) {
                        【{{ room.host }}】与【{{ room.opponent }}】巅峰对决进行中，胜负悬念拉满！
                      } @else {
                        【{{ room.host }}】领衔多人竞速狂飙中，胜负悬念拉满！
                      }
                    </span>
                  </div>
                </div>
              }
            </div>
          }

          <!-- 1B: 开放擂台等候中 (游戏未开始 status !== 'playing') -> 优先提供【立即参战】 -->
          @if (waitingRooms().length > 0) {
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between text-xs font-bold text-emerald-500 px-0.5">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>{{ i18n.t('lobby.open_challenges_group')() || '⚔️ 擂台迎战' }} ({{ waitingRooms().length }})</span>
                </span>
                <span class="text-[10px] font-normal text-[var(--color-text-muted)]">等候开局中 · 随入随战</span>
              </div>

              @for (room of waitingRooms(); track room.id) {
                <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 p-2.5 flex flex-col gap-2 transition-all hover:shadow-2xs">
                  <!-- Top Row: Game Info & Waiting Badge -->
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] flex items-center justify-center text-base shrink-0">
                        {{ getGameEmoji(room.game) }}
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="font-black text-xs text-[var(--color-text-main)] truncate max-w-[90px] sm:max-w-[120px]">
                            {{ getGameTitle(room.game) }}
                          </span>
                          <span class="px-1.5 py-0.2 rounded text-[9px] font-bold" [ngClass]="getDifficultyBadgeClass(room.difficulty)">
                            {{ getDifficultyLabel(room.game, room.difficulty) }}
                          </span>
                          <span class="px-1.5 py-0.2 rounded bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[9px] font-semibold text-[var(--color-text-secondary)]">
                            {{ getRoomRoundLabel(room) }}
                          </span>
                          @if (room.bountyCoins > 0) {
                            <span class="px-1 py-0.1 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                              🪙 {{ room.bountyCoins }}
                            </span>
                          }
                        </div>
                      </div>
                    </div>

                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>{{ isRoomFull(room) ? '满员备战中' : '等候迎战' }} ({{ room.players }}/{{ getMaxPlayers(room.game) }})</span>
                    </span>
                  </div>

                  <!-- Middle Row: Host Challenge Callout + Dedicated Join Duel Action -->
                  <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1 text-xs">
                        <span class="font-black text-[var(--color-text-main)] truncate max-w-[90px] sm:max-w-[120px]">
                          👤 {{ room.host }}
                        </span>
                        @if (room.players > 1) {
                          <span class="text-[10px] text-emerald-500 font-bold">等 {{ room.players }} 人已参战</span>
                        } @else {
                          <span class="text-[10px] text-amber-500 font-bold">已摆擂台</span>
                        }
                      </div>
                      <p class="text-[10px] text-[var(--color-text-muted)] truncate">
                        @if (isRoomFull(room)) {
                          席位已满，房主即将发车！
                        } @else if (room.players > 1) {
                          尚余 {{ (room.maxPlayers || getMaxPlayers(room.game)) - room.players }} 个空位，火速参战！
                        } @else {
                          虚位以待，速来挑战！
                        }
                      </p>
                    </div>

                    <!-- Action: 参战 / 观战 / 回房 -->
                    <div class="flex items-center gap-1.5 shrink-0">
                      @if (isUserInRoom(room)) {
                        <button (click)="joinRoom(room)"
                                class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs">
                          <span>🏠</span>
                          <span>返回我的房间</span>
                        </button>
                      } @else if (!isRoomFull(room)) {
                        <!-- 立即迎战 (高能金橙渐变 + 呼吸微震光晕 + 雷达脉冲) -->
                        <button (click)="joinRoom(room)"
                                class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 text-white text-xs font-black flex items-center gap-1.5 transition-all duration-300 active:scale-95 cursor-pointer shadow-md shadow-orange-500/35 ring-2 ring-amber-400/60 animate-battle-glow shrink-0">
                          <span class="relative flex h-2 w-2 shrink-0">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                          <span>⚔️</span>
                          <span class="tracking-wide">{{ i18n.t('lobby.join_duel_btn')() || '立即迎战' }}</span>
                        </button>
                        <!-- 旁观入口 (带文字表达) -->
                        <button (click)="spectateRoom(room)"
                                class="px-2.5 py-1.5 rounded-lg border border-[var(--color-border-card)] hover:border-violet-500/60 bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-violet-500 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                                title="实时观战">
                          <span>👁️</span>
                          <span>{{ i18n.t('lobby.spectate_btn')() || '观战' }}</span>
                        </button>
                      } @else {
                        <!-- 满员时只能观战 -->
                        <button (click)="spectateRoom(room)"
                                class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs">
                          <span>👁️</span>
                          <span>{{ i18n.t('lobby.spectate_btn')() || '观战' }}</span>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Empty Live Rooms State -->
          @if (activeRooms().length === 0 && feedTab() === 'live') {
            <div class="py-10 flex flex-col items-center justify-center text-center gap-2 text-[var(--color-text-muted)] my-auto">
              <span class="text-3xl opacity-40">🏟️</span>
              <span class="text-xs font-bold">{{ i18n.t('lobby.no_ongoing_rooms')() || '当前暂无对战中的房间' }}</span>
              <button (click)="goToPkArena()"
                      class="mt-1 px-3 py-1.5 rounded-lg bg-[var(--color-accent-from)] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer">
                去多人竞技场开房 →
              </button>
            </div>
          }
        }

        <!-- ========================================== -->
        <!-- SECTION 2: 完赛战报 (Finished Battle Records) -->
        <!-- ========================================== -->
        @if (feedTab() === 'all' || feedTab() === 'battles') {
          <div class="flex flex-col gap-2">
            @if (feedTab() === 'all') {
              <div class="flex items-center justify-between text-xs font-bold text-amber-500 px-0.5 pt-1 border-t border-[var(--color-border-card)]/50">
                <span class="flex items-center gap-1">
                  <span>🏆</span>
                  <span>{{ i18n.t('lobby.finished_battles_tab')() || '完赛战报' }}</span>
                </span>
                <span class="text-[10px] font-normal text-[var(--color-text-muted)]">全网最新决战记录</span>
              </div>
            }

            @if (loading() && battles().length === 0) {
              <div class="py-8 flex flex-col items-center justify-center gap-2 my-auto">
                <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-xs text-[var(--color-text-muted)]">同步战报中...</span>
              </div>
            } @else if (battles().length === 0) {
              <div class="py-8 flex flex-col items-center justify-center text-center gap-2 text-[var(--color-text-muted)] my-auto">
                <span class="text-2xl opacity-40">⚔️</span>
                <span class="text-xs font-bold">{{ i18n.t('lobby.no_recent_battles')() || '暂无最近战报，去开房打一把吧！' }}</span>
              </div>
            } @else {
              @for (b of battles().slice(0, feedTab() === 'all' ? 3 : 6); track b.id) {
                <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]/60 hover:bg-[var(--color-bg-main)] hover:border-emerald-500/40 p-2 sm:p-2.5 flex flex-col gap-1.5 transition-all hover:shadow-xs">
                  
                  <!-- Match Header: Game & Difficulty & Winner Center Pill & Time -->
                  <div class="flex items-center justify-between text-xs gap-2">
                    <!-- Left: Game Info & Bounty -->
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span class="text-sm shrink-0">{{ getGameEmoji(b.game_id) }}</span>
                      <span class="font-black text-[var(--color-text-main)] truncate max-w-[75px] sm:max-w-[105px]">{{ getGameTitle(b.game_id) }}</span>
                      <span class="px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0" [ngClass]="getDifficultyBadgeClass(b.difficulty)">
                        {{ getDifficultyLabel(b.game_id, b.difficulty) }}
                      </span>
                      @if (b.bounty_coins > 0) {
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20 shrink-0">
                          🪙 {{ b.bounty_coins }}
                        </span>
                      }
                    </div>

                    <!-- Center: 获胜者居中高光徽记 (完美的居中视觉锚点) -->
                    <div class="flex-1 flex items-center justify-center min-w-0 px-1">
                      <span class="inline-flex items-center gap-1 text-[11px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25 shadow-2xs truncate">
                        <span>🏆</span>
                        <span class="truncate max-w-[100px] sm:max-w-[140px]">{{ b.winner?.username || 'Winner' }} 胜出</span>
                      </span>
                    </div>

                    <!-- Right: Round & Time -->
                    <div class="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-[var(--color-text-muted)]">
                      <span class="px-1.5 py-0.2 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[9px] font-semibold text-[var(--color-text-secondary)]">
                        {{ getRoundLabel(b) }}
                      </span>
                      <span>{{ formatTimeAgo(b.played_at) }}</span>
                    </div>
                  </div>

                  <!-- Head-to-Head Clash Row (Winner Gold/Emerald VS Loser Crimson Rose) -->
                  <div class="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]/80 text-xs shadow-2xs">
                    
                    <!-- Winner Side (Left: Gold & Emerald) -->
                    <div class="flex items-center gap-1.5 min-w-0 flex-1">
                      <span class="text-sm shrink-0">👑</span>
                      <span class="font-black text-amber-500 dark:text-amber-400 truncate max-w-[80px] sm:max-w-[105px]">
                        {{ b.winner?.username || 'Winner' }}
                      </span>
                      <span class="px-1 py-0.1 rounded text-[9px] font-black bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shrink-0">
                        胜
                      </span>
                      <span class="font-mono font-black text-emerald-500 truncate text-[11px] flex items-center gap-0.5">
                        <span class="text-xs">⚡</span>
                        <span>{{ formatScoreOrTime(b.game_id, b.winner_time, b.winner_score, true) }}</span>
                      </span>
                    </div>

                    <!-- VS Divider with optional margin -->
                    <div class="flex items-center gap-1 shrink-0 px-1">
                      <span class="text-[10px] font-black text-[var(--color-text-muted)] italic">VS</span>
                      @if (b.margin > 0) {
                        <span class="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded-sm whitespace-nowrap hidden sm:inline">
                          +{{ b.margin }}{{ isTimeGame(b.game_id) ? 's' : '' }}
                        </span>
                      }
                    </div>

                    <!-- Loser Side (Right: Defeated Crimson Rose, Meaningful & High-Contrast) -->
                    <div class="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                      <span class="font-mono text-[11px] text-rose-500/80 truncate">
                        {{ formatScoreOrTime(b.game_id, b.loser_time, b.loser_score, false) }}
                      </span>
                      <span class="px-1 py-0.1 rounded text-[9px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
                        负
                      </span>
                      <span class="font-bold text-rose-600 dark:text-rose-400 truncate max-w-[80px] sm:max-w-[105px]">
                        {{ b.loser?.username || 'Opponent' }}
                      </span>
                    </div>

                  </div>

                </div>
              }
            }
          </div>
        }

      </div>

      <!-- Footer Disclaimer & Action (Links to /pk-arena) -->
      <div class="pt-2 border-t border-[var(--color-border-card)] flex items-center justify-between gap-2 text-[10px]">
        <span class="text-[var(--color-text-muted)] flex items-center gap-1">
          <span>🛡️</span>
          <span>{{ i18n.t('lobby.member_only_pk_tip')() || '仅双方均为会员时收录战报' }}</span>
        </span>

        <div class="flex items-center gap-1.5 shrink-0">
          <button (click)="quickMatch()"
                  class="px-2.5 py-1 rounded-lg bg-[var(--color-bg-main)] hover:bg-[var(--color-bg-card)] border border-amber-500/40 text-amber-500 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer">
            <span>⚡</span>
            <span>快速匹配</span>
          </button>
          <button (click)="goToPkArena()"
                  class="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer">
            <span>⚔️</span>
            <span>{{ i18n.t('lobby.start_pk_btn')() || '发起对决' }}</span>
          </button>
        </div>
      </div>

    </div>
  `
})
export class LiveBattleFeedComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  private statsService = inject(GameStatsService);
  private gameRegistry = inject(GameRegistryService);
  private wsService = inject(WebSocketService);
  private crossGameJoin = inject(CrossGameJoinService);
  private router = inject(Router);
  private auth = inject(AuthStore);

  readonly currentUserId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);

  // Default to 'all' so users can see ongoing battles & finished outcomes without toggling
  feedTab = signal<'all' | 'live' | 'battles'>('all');
  battles = signal<PKBattle[]>([]);
  loading = signal<boolean>(false);
  refreshing = signal<boolean>(false);
  readonly currentTime = signal<number>(Date.now());
  readonly latestLiveCommentary = signal<string | null>(null);

  // Active multiplayer rooms from websocket lobby
  activeRooms = computed(() => {
    const raw = this.wsService.activeRooms() || [];
    return raw.filter((r: any) => r && r.mode !== GameMode.Single && r.status !== 'finished');
  });

  // Rooms actively dueling / in-game (Status is playing/starting AND has at least 2 players) -> Strictly Spectate
  playingRooms = computed(() => {
    return this.activeRooms().filter((r: any) =>
      r &&
      (r.status === 'playing' || r.status === 'starting') &&
      ((r.players && r.players > 1) || (r.opponent && r.opponent.trim() !== ''))
    );
  });

  // Rooms waiting for challenger / contestants in lobby (Status is NOT playing, or only 1 player waiting) -> Prioritize Join
  waitingRooms = computed(() => {
    return this.activeRooms().filter((r: any) =>
      r &&
      ((r.status !== 'playing' && r.status !== 'starting') || ((r.players || 0) <= 1 && (!r.opponent || r.opponent.trim() === '')))
    );
  });

  isRoomFull(room: any): boolean {
    const max = room.maxPlayers || this.getMaxPlayers(room.game) || 2;
    return (room.players || 0) >= max;
  }

  isUserInRoom(room: any): boolean {
    const myId = this.currentUserId();
    if (!myId || !room) return false;
    if (this.isRoomForfeited(room.id)) return false;
    const clean = (s: string) => (s || '').toLowerCase().trim();
    const m = clean(myId);
    if (clean(room.host) === m || clean(room.opponent) === m) return true;
    if (Array.isArray(room.contestants) && room.contestants.some((c: string) => clean(c) === m)) return true;
    if (Array.isArray(room.playersList) && room.playersList.some((c: string) => clean(c) === m)) return true;
    return false;
  }

  isRoomForfeited(roomId: string): boolean {
    if (!roomId || typeof sessionStorage === 'undefined') return false;
    try {
      const list = JSON.parse(sessionStorage.getItem('forfeited_rooms') || '[]');
      return Array.isArray(list) && list.includes(roomId);
    } catch {
      return false;
    }
  }

  private timer: any;

  constructor() {
    // Listen to real-time finished battle event pushed by backend via WebSocket
    effect(() => {
      const liveBattle = this.wsService.liveBattleFinishedEvent();
      if (liveBattle) {
        this.handleLiveBattleFinished(liveBattle);
      }
    });
  }

  ngOnInit(): void {
    this.fetchBattles();

    // Auto-poll battles every 30 seconds
    this.timer = setInterval(() => {
      this.currentTime.set(Date.now());
      this.fetchBattles(false);
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  fetchBattles(showSpinner: boolean = true): void {
    this.currentTime.set(Date.now());
    if (showSpinner) this.loading.set(true);
    this.statsService.getRecentPKBattles(10).subscribe({
      next: res => {
        this.battles.set(res || []);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
      }
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.fetchBattles(false);
  }

  private handleLiveBattleFinished(battle: any): void {
    const winner = battle.winner?.username || '胜者';
    const loser = battle.loser?.username || '对手';
    const gameTitle = this.getGameTitle(battle.game_id);
    const isTime = this.isTimeGame(battle.game_id);
    const scoreOrTime = isTime ? `${battle.winner_time}s` : `${battle.winner_score}分`;
    const text = `🏆 玩家【${winner}】在《${gameTitle}》力克【${loser}】(${scoreOrTime})！`;
    this.latestLiveCommentary.set(text);

    // Prepend to battles list if not already present
    this.battles.update(list => {
      const exists = list.some(b => b.id === battle.id);
      if (exists) return list;
      return [battle, ...list].slice(0, 10);
    });
  }

  getBattleCommentary(b: PKBattle): { headline: string; loseNote: string; bountyNote: string } {
    const isTime = this.isTimeGame(b.game_id);
    const winnerName = b.winner?.username || '胜者';
    const loserName = b.loser?.username || '对手';
    const unit = isTime ? 's' : '分';
    const marginStr = b.margin > 0 ? `${b.margin}${unit}` : '';

    let headline = '';
    let loseNote = '';
    const bountyNote = b.bounty_coins > 0 ? `· 斩获 🪙${b.bounty_coins} 悬赏` : '';

    if (isTime) {
      if (b.winner_time > 0 && b.margin > 0 && b.margin <= 3) {
        headline = `【${winnerName}】以 ${b.winner_time}s 绝杀胜出！(领先 ${marginStr})`;
        loseNote = `【${loserName}】微弱劣势惜败，相差仅 ${marginStr}`;
      } else if (b.winner_time > 0) {
        headline = `【${winnerName}】以 ${b.winner_time}s 强势登顶！${marginStr ? `(领先 ${marginStr})` : ''}`;
        loseNote = `【${loserName}】遗憾战败，等待下轮复仇`;
      } else {
        headline = `【${winnerName}】率先极速通关获胜！`;
        loseNote = `【${loserName}】未能在限时内完成`;
      }
    } else {
      if (b.margin > 0 && b.margin <= 10) {
        headline = `【${winnerName}】以 ${b.winner_score}分 险胜！(领先 +${marginStr})`;
        loseNote = `【${loserName}】以 ${b.loser_score}分 惜败`;
      } else {
        headline = `【${winnerName}】以 ${b.winner_score}分 制霸战场！${marginStr ? `(领先 +${marginStr})` : ''}`;
        loseNote = `【${loserName}】获得 ${b.loser_score}分 居次席`;
      }
    }

    return { headline, loseNote, bountyNote };
  }

  getRoundLabel(b: PKBattle): string {
    if (b.mode === 'bo3') return 'BO3';
    if (b.mode === 'bo5') return 'BO5';
    return '单局决胜';
  }

  getRoomRoundLabel(room: any): string {
    if (room.targetRounds === 3 || room.mode === 'bo3') return 'BO3';
    if (room.targetRounds === 5 || room.mode === 'bo5') return 'BO5';
    return '单局';
  }

  reconnectRoom(room: any): void {
    const lang = this.i18n.currentLang() || 'zh';
    this.crossGameJoin.setPendingJoin({
      game: room.game,
      roomId: room.id,
      mode: room.mode,
      difficulty: room.difficulty,
      host: room.host,
      action: 'join',
      spectate: false,
    });
    this.router.navigate([`/${lang}/games/${room.game}`]);
  }

  spectateRoom(room: any): void {
    const lang = this.i18n.currentLang() || 'zh';
    this.crossGameJoin.setPendingJoin({
      game: room.game,
      roomId: room.id,
      mode: room.mode,
      difficulty: room.difficulty,
      host: room.host,
      action: 'spectate',
      spectate: true,
      password: room.hasPassword ? undefined : undefined,
    });
    this.router.navigate([`/${lang}/games/${room.game}`]);
  }

  joinRoom(room: any): void {
    const lang = this.i18n.currentLang() || 'zh';
    if (room.hasPassword) {
      this.router.navigate([`/${lang}/pk-arena`], { queryParams: { room: room.id } });
      return;
    }
    this.crossGameJoin.setPendingJoin({
      game: room.game,
      roomId: room.id,
      mode: room.mode,
      difficulty: room.difficulty,
      host: room.host,
      action: 'join',
      spectate: false,
    });
    this.router.navigate([`/${lang}/games/${room.game}`]);
  }

  getGameTitle(gameId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config?.titleKey) {
      return this.i18n.t(config.titleKey)() || gameId;
    }
    return gameId;
  }

  getGameEmoji(gameId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    return config?.iconEmoji || '🎮';
  }

  getMaxPlayers(gameId: string): number {
    return this.gameRegistry.getMaxPlayers(gameId);
  }

  isTimeGame(gameId: string): boolean {
    const timeGames = ['nonogram', 'minesweeper', 'sudoku', 'sliding', 'codebreaker', 'math24', 'watersort', 'sokoban', 'lightsout'];
    return timeGames.includes(gameId);
  }

  formatScoreOrTime(gameId: string, time: number, score: number, isWinner: boolean): string {
    if (this.isTimeGame(gameId)) {
      if (time > 0) {
        return this.formatSeconds(time);
      }
      return isWinner ? '极速通关' : '未完成';
    }
    if (score > 0) {
      return `${score}分`;
    }
    return isWinner ? '胜出' : '0分';
  }

  getDifficultyLabel(gameId: string, diffId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config?.difficulties) {
      const match = config.difficulties.find(d => d.id === diffId);
      if (match) {
        return match.labelKey ? (this.i18n.t(match.labelKey)() || match.id) : match.id;
      }
    }
    const dict: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
      expert: '专家',
      master: '大师'
    };
    return dict[diffId] || diffId;
  }

  getDifficultyBadgeClass(diff: string): string {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'hard':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'expert':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'master':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  }

  formatSeconds(sec: number): string {
    if (!sec || sec <= 0) return '0s';
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m${s > 0 ? s + 's' : ''}`;
  }

  formatTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const diffMs = this.currentTime() - new Date(dateStr).getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      if (diffMin < 1) return '刚刚';
      if (diffMin < 60) return `${diffMin}分钟前`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}小时前`;
      return `${Math.floor(diffHours / 24)}天前`;
    } catch {
      return '';
    }
  }

  quickMatch(): void {
    const curUser = this.currentUserId();
    const rooms = this.activeRooms() || [];
    const openRoom = rooms.find((r: any) => 
      r.status === 'waiting' && 
      !r.hasPassword && 
      (r.players || 1) < this.gameRegistry.getMaxPlayers(r.game || 'minesweeper') &&
      r.host !== curUser
    );

    if (openRoom) {
      this.crossGameJoin.setPendingJoin({
        game: openRoom.game,
        roomId: openRoom.id,
        mode: openRoom.mode,
        difficulty: openRoom.difficulty,
        host: openRoom.host,
        action: 'join',
        spectate: false
      });
      const lang = this.i18n.currentLang() || 'zh';
      this.router.navigate([`/${lang}/games/${openRoom.game}`]);
    } else {
      this.goToPkArena();
    }
  }

  goToPkArena(): void {
    const lang = this.i18n.currentLang() || 'zh';
    this.router.navigate([`/${lang}/pk-arena`]);
  }
}
