import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { GameStatsService, PKBattle } from '../../../../core/services/game-stats.service';
import { GameRegistryService } from '../../../../core/services/game-registry.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { CrossGameJoinService } from '../../../../core/services/cross-game-join.service';
import { GameMode } from '../../../../core/models/game.model';

@Component({
  selector: 'app-live-battle-feed',
  standalone: true,
  imports: [CommonModule],
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

      <!-- Mode Switcher Tabs: 正在交锋 (观战/迎战) vs 完赛战报 -->
      <div class="flex items-center gap-1.5 border-b border-[var(--color-border-card)]/60 pb-2">
        <button (click)="feedTab.set('live')"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95"
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
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95"
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

      <!-- Content Area (Bounded strictly to 3 items to match left Hall of Fame card height) -->
      <div class="flex flex-col gap-2 flex-grow overflow-hidden min-h-[220px]">

        <!-- TAB 1: 正在交锋 (活跃房间 · 支持实时观战与迎战) -->
        @if (feedTab() === 'live') {
          @if (activeRooms().length === 0) {
            <div class="py-10 flex flex-col items-center justify-center text-center gap-2 text-[var(--color-text-muted)] my-auto">
              <span class="text-3xl opacity-40">🏟️</span>
              <span class="text-xs font-bold">{{ i18n.t('lobby.no_ongoing_rooms')() || '当前暂无对战中的房间' }}</span>
              <button (click)="goToPkArena()"
                      class="mt-1 px-3 py-1.5 rounded-lg bg-[var(--color-accent-from)] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer">
                去多人竞技场开房 →
              </button>
            </div>
          } @else {
            @for (room of activeRooms().slice(0, 3); track room.id) {
              <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]/70 hover:border-amber-500/40 p-2.5 flex items-center justify-between gap-2.5 transition-all hover:shadow-2xs">
                <!-- Left info -->
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-9 h-9 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] flex items-center justify-center text-lg shrink-0">
                    {{ getGameEmoji(room.game) }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-black text-xs text-[var(--color-text-main)] truncate max-w-[85px] sm:max-w-[110px]">
                        {{ getGameTitle(room.game) }}
                      </span>
                      <span class="px-1.5 py-0.2 rounded text-[9px] font-bold" [ngClass]="getDifficultyBadgeClass(room.difficulty)">
                        {{ getDifficultyLabel(room.game, room.difficulty) }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] font-mono mt-0.5">
                      <span class="truncate max-w-[70px]">👤 {{ room.host }}</span>
                      <span>·</span>
                      @if (room.status === 'playing') {
                        <span class="text-rose-500 font-bold flex items-center gap-0.5">
                          <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          <span>激烈对决中</span>
                        </span>
                      } @else {
                        <span class="text-emerald-500 font-bold flex items-center gap-0.5">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>等候挑战者</span>
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Right Action Button: 观战 vs 迎战 -->
                <div class="shrink-0">
                  @if (room.status === 'playing') {
                    <button (click)="spectateRoom(room)"
                            class="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/20 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs">
                      <span>👁️</span>
                      <span>观战</span>
                    </button>
                  } @else {
                    <button (click)="joinRoom(room)"
                            class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs">
                      <span>⚔️</span>
                      <span>迎战</span>
                    </button>
                  }
                </div>
              </div>
            }
          }
        }

        <!-- TAB 2: 完赛战报 (最近热血决战结果 · 严格限制 3 条) -->
        @if (feedTab() === 'battles') {
          @if (loading() && battles().length === 0) {
            <div class="py-12 flex flex-col items-center justify-center gap-2 my-auto">
              <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span class="text-xs text-[var(--color-text-muted)]">同步战报中...</span>
            </div>
          } @else if (battles().length === 0) {
            <div class="py-10 flex flex-col items-center justify-center text-center gap-2 text-[var(--color-text-muted)] my-auto">
              <span class="text-3xl opacity-40">⚔️</span>
              <span class="text-xs font-bold">{{ i18n.t('lobby.no_recent_battles')() || '暂无最近战报，去开房打一把吧！' }}</span>
            </div>
          } @else {
            @for (b of battles().slice(0, 3); track b.id) {
              <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]/70 hover:border-emerald-500/40 p-2.5 flex flex-col gap-1.5 transition-all hover:shadow-2xs">
                
                <!-- Match Subheader: Game & Time -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-sm">{{ getGameEmoji(b.game_id) }}</span>
                    <span class="font-black text-[var(--color-text-main)]">{{ getGameTitle(b.game_id) }}</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-bold" [ngClass]="getDifficultyBadgeClass(b.difficulty)">
                      {{ getDifficultyLabel(b.game_id, b.difficulty) }}
                    </span>
                    @if (b.bounty_coins > 0) {
                      <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                        🪙 {{ b.bounty_coins }}
                      </span>
                    }
                  </div>
                  <span class="text-[10px] text-[var(--color-text-muted)] font-mono shrink-0">{{ formatTimeAgo(b.played_at) }}</span>
                </div>

                <!-- Head-to-Head Clash Bar with Win / Loss Visual Contrast -->
                <div class="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
                  
                  <!-- Winner Side -->
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="text-base shrink-0">👑</span>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1">
                        <span class="text-xs font-black text-amber-500 truncate max-w-[70px] sm:max-w-[90px]">
                          {{ b.winner?.username || 'Winner' }}
                        </span>
                        <span class="px-1 py-0.1 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-500 shrink-0">
                          胜
                        </span>
                      </div>
                      <span class="text-[11px] font-mono font-black text-emerald-500 block truncate">
                        {{ formatScoreOrTime(b.game_id, b.winner_time, b.winner_score, true) }}
                      </span>
                    </div>
                  </div>

                  <!-- Clash VS Indicator -->
                  <div class="flex flex-col items-center shrink-0 px-1.5">
                    <span class="text-[10px] font-black text-[var(--color-text-muted)] italic">VS</span>
                    @if (b.margin > 0) {
                      <span class="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded-sm whitespace-nowrap">
                        +{{ b.margin }}{{ isTimeGame(b.game_id) ? 's' : '' }}
                      </span>
                    }
                  </div>

                  <!-- Loser Side -->
                  <div class="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                    <div class="min-w-0">
                      <div class="flex items-center justify-end gap-1">
                        <span class="px-1 py-0.1 rounded text-[9px] font-semibold bg-zinc-500/15 text-[var(--color-text-muted)] shrink-0">
                          负
                        </span>
                        <span class="text-xs font-medium text-[var(--color-text-secondary)] truncate max-w-[70px] sm:max-w-[90px]">
                          {{ b.loser?.username || 'Opponent' }}
                        </span>
                      </div>
                      <span class="text-[11px] font-mono text-[var(--color-text-muted)] block truncate">
                        {{ formatScoreOrTime(b.game_id, b.loser_time, b.loser_score, false) }}
                      </span>
                    </div>
                    <span class="text-sm shrink-0 opacity-40">🛡️</span>
                  </div>

                </div>

              </div>
            }
          }
        }

      </div>

      <!-- Footer Disclaimer & Action (Links to /pk-arena) -->
      <div class="pt-2 border-t border-[var(--color-border-card)] flex items-center justify-between gap-2 text-[10px]">
        <span class="text-[var(--color-text-muted)] flex items-center gap-1">
          <span>🛡️</span>
          <span>{{ i18n.t('lobby.member_only_pk_tip')() || '仅双方均为会员时收录战报' }}</span>
        </span>

        <button (click)="goToPkArena()"
                class="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
          <span>⚔️</span>
          <span>{{ i18n.t('lobby.start_pk_btn')() || '发起对决' }}</span>
        </button>
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

  feedTab = signal<'live' | 'battles'>('battles');
  battles = signal<PKBattle[]>([]);
  loading = signal<boolean>(false);
  refreshing = signal<boolean>(false);

  // Active multiplayer rooms from websocket lobby
  activeRooms = computed(() => {
    const raw = this.wsService.activeRooms() || [];
    return raw.filter((r: any) => r && r.mode !== GameMode.Single);
  });

  private timer: any;

  ngOnInit(): void {
    this.fetchBattles();

    // Auto-select 'live' tab if there are active ongoing rooms
    if (this.activeRooms().length > 0) {
      this.feedTab.set('live');
    }

    // Auto-poll battles every 30 seconds
    this.timer = setInterval(() => {
      this.fetchBattles(false);
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  fetchBattles(showSpinner: boolean = true): void {
    if (showSpinner) this.loading.set(true);
    this.statsService.getRecentPKBattles(6).subscribe({
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

  isTimeGame(gameId: string): boolean {
    const timeGames = ['nonogram', 'minesweeper', 'sudoku', 'sliding', 'codebreaker', 'math24', 'watersort', 'sokoban', 'lightsout'];
    return timeGames.includes(gameId);
  }

  formatScoreOrTime(gameId: string, time: number, score: number, isWinner: boolean): string {
    if (this.isTimeGame(gameId)) {
      if (time > 0) {
        return `⚡ ${this.formatSeconds(time)}`;
      }
      return isWinner ? '⚡ 极速通关' : '🛡️ 未完成';
    }
    if (score > 0) {
      return `🏆 ${score}分`;
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
      const diffMs = Date.now() - new Date(dateStr).getTime();
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

  goToPkArena(): void {
    const lang = this.i18n.currentLang() || 'zh';
    this.router.navigate([`/${lang}/pk-arena`]);
  }
}
