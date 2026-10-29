import { Component, Input, Output, EventEmitter, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../../core/services/device.service';
import { CoinService } from '../../../core/services/coin.service';
import { CoinGuideService } from '../../../core/services/coin-guide.service';
import { ZenModeService } from '../../../core/services/zen-mode.service';
import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameSwitchService } from '../../../core/services/game-switch.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { CoinIconComponent } from '../coin-icon/coin-icon.component';

@Component({
  selector: 'app-game-handheld-header',
  standalone: true,
  imports: [CommonModule, CoinIconComponent],
  host: {
    class: 'w-full block shrink-0 z-30 pointer-events-auto'
  },
  template: `
    <div class="w-full flex items-center justify-between px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-3.5 bg-[var(--color-bg-card)]/90 backdrop-blur-md border-b border-[var(--color-border-card)] shadow-xs select-none sticky top-0 z-30 shrink-0 min-h-[50px] sm:min-h-[64px] md:min-h-[68px]">
      
      <!-- Left: Back + Rules (极左翼锚定) -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        @if (showBack) {
          <button (click)="back.emit()"
                  class="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-[var(--color-text-main)] hover:text-white flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer group"
                  [class.border-rose-500/40]="effectiveIsSpectator()"
                  [class.text-rose-500]="effectiveIsSpectator()"
                  [title]="effectiveIsSpectator() ? (i18n.t('game.leave_spectate')() || '退出观战') : (i18n.t('game.back')() || '返回')">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        }

        @if (showRules) {
          <button (click)="rules.emit()"
                  class="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer"
                  [title]="i18n.t('game.rules')() || '玩法规则'">
            <span class="text-sm sm:text-lg md:text-xl">📖</span>
          </button>
        }
      </div>

      <!-- Center: Slot for game-specific status and difficulty (中央宽敞弹性区) -->
      <div class="flex items-center justify-center mx-1 sm:mx-3 flex-1 min-w-0">
        <ng-content></ng-content>
      </div>

      <!-- Right: PK + Tools Menu (极右翼锚定) -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative tools-menu-container">
        @if (showPk) {
          <button (click)="pk.emit()"
                  class="h-9 sm:h-11 md:h-12 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/30 flex items-center gap-1 sm:gap-1.5 shadow-xs active:scale-95 transition-all text-xs sm:text-sm font-bold cursor-pointer shrink-0"
                  [title]="i18n.t('game.quick_pk')() || '开房PK'">
            <span class="text-xs sm:text-base">⚔️</span>
            <span class="text-xs sm:text-sm font-bold">PK</span>
          </button>
        }

        <!-- ⚙️ 设置与全功能工具箱按钮 -->
        <button (click)="toggleToolsMenu()"
                class="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer group"
                [class.border-[var(--color-accent-from)]]="isToolsMenuOpen()"
                [title]="i18n.t('game.settings')() || '游戏设置与工具'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-transform group-hover:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <!-- 下拉功能弹窗浮层 -->
        @if (isToolsMenuOpen()) {
          <div class="absolute right-0 top-full mt-2 w-60 sm:w-64 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-2xl p-2.5 z-50 flex flex-col gap-1 backdrop-blur-xl animate-scale-up"
               (click)="$event.stopPropagation()">
            <!-- 更换对战游戏 / 难度 (在联机对战中且为房主) -->
            @if (canSwitchGame()) {
              <button (click)="openSwitchGame(); closeToolsMenu()"
                      class="w-full flex items-center justify-between p-2 rounded-xl text-xs sm:text-sm font-semibold text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer border-b border-[var(--color-border-card)]/60 pb-2 mb-0.5">
                <span class="flex items-center gap-2">
                  <span>🎮</span>
                  <span>{{ i18n.t('game.switch_pk_game')() || '更换对战游戏' }}</span>
                </span>
                <span class="text-xs opacity-75">›</span>
              </button>
            }

            <!-- 脑力金币 -->
            @if (coinService.isAuthenticated()) {
              <button (click)="coinGuideService.open(); closeToolsMenu()"
                      class="w-full flex items-center justify-between p-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer border-b border-[var(--color-border-card)]/60 pb-2 mb-0.5">
                <span class="flex items-center gap-2">
                  <app-coin-icon size="xs" />
                  <span>{{ i18n.t('game.coins_balance')() || '脑力金币' }}</span>
                </span>
                <span class="font-mono text-amber-500 font-bold">{{ coinService.coins() }}</span>
              </button>
            }

            <!-- 音效开关 -->
            <button (click)="audio.toggleMute()"
                    class="w-full flex items-center justify-between p-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer">
              <span class="flex items-center gap-2">
                <span>{{ audio.isMuted() ? '🔇' : '🔊' }}</span>
                <span>{{ i18n.t('audio.sound_effects')() || '音效开关' }}</span>
              </span>
              <span class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-mono"
                    [class.bg-emerald-500/15]="!audio.isMuted()"
                    [class.text-emerald-500]="!audio.isMuted()"
                    [class.bg-red-500/15]="audio.isMuted()"
                    [class.text-red-500]="audio.isMuted()">
                {{ audio.isMuted() ? (i18n.t('audio.mute')() || '关闭') : (i18n.t('audio.unmute')() || '开启') }}
              </span>
            </button>

            <!-- 触感震动 -->
            <button (click)="haptic.toggleVibration()"
                    class="w-full flex items-center justify-between p-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer">
              <span class="flex items-center gap-2">
                <span>📳</span>
                <span>{{ i18n.t('audio.vibration')() || '触感震动' }}</span>
              </span>
              <span class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-mono"
                    [class.bg-emerald-500/15]="haptic.isVibrationEnabled()"
                    [class.text-emerald-500]="haptic.isVibrationEnabled()"
                    [class.bg-gray-500/15]="!haptic.isVibrationEnabled()"
                    [class.text-[var(--color-text-muted)]]="!haptic.isVibrationEnabled()">
                {{ haptic.isVibrationEnabled() ? 'ON' : 'OFF' }}
              </span>
            </button>

            <!-- 全屏沉浸 -->
            <button (click)="toggleZen(); closeToolsMenu()"
                    class="w-full flex items-center justify-between p-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer">
              <span class="flex items-center gap-2">
                <span>🧘</span>
                <span>{{ zenService.isZenMode() ? (i18n.t('game.exit_zen_mode')() || '退出全屏') : (i18n.t('game.zen_mode')() || '全屏沉浸') }}</span>
              </span>
              <span class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-mono bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">
                {{ zenService.isZenMode() ? 'Exit' : 'Enter' }}
              </span>
            </button>

            <!-- 意见建议与 Bug 反馈 -->
            <button (click)="feedbackService.open({ gameId: gameId, gameTitle: gameTitle }); closeToolsMenu()"
                    class="w-full flex items-center justify-between p-2 rounded-xl text-xs sm:text-sm font-semibold text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer border-t border-[var(--color-border-card)]/50 pt-2 mt-0.5">
              <span class="flex items-center gap-2">
                <span>🐞</span>
                <span>{{ i18n.t('feedback.tooltip')() || '意见建议与 Bug 反馈' }}</span>
              </span>
              <span class="text-xs">›</span>
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class GameHandheldHeaderComponent {
  @Input() gameId = '';
  @Input() gameTitle = '';
  @Input() showBack = true;
  @Input() showRules = true;
  @Input() showPk = false;
  @Input() isPkMode = false;
  @Input() isHost = false;
  @Input() roomId?: string;
  @Input() difficulty?: string;
  @Input() isSpectator?: boolean;

  readonly effectiveIsSpectator = computed<boolean>(() => {
    if (this.isSpectator !== undefined) return this.isSpectator;
    return this.wsService.isCurrentSpectator();
  });

  @Output() back = new EventEmitter<void>();
  @Output() rules = new EventEmitter<void>();
  @Output() pk = new EventEmitter<void>();

  deviceService = inject(DeviceService);
  coinService = inject(CoinService);
  coinGuideService = inject(CoinGuideService);
  zenService = inject(ZenModeService);
  audio = inject(AudioService);
  haptic = inject(HapticService);
  feedbackService = inject(FeedbackService);
  i18n = inject(I18nService);
  wsService = inject(WebSocketService);
  gameSwitchService = inject(GameSwitchService);
  private elementRef = inject(ElementRef);

  readonly isInPkRoom = () => !!this.wsService.currentRoomId() || this.isPkMode;

  readonly isHostEffective = computed(() => {
    if (this.isHost) return true;
    const gs = this.wsService.gameState();
    const guestId = typeof window !== 'undefined' ? (localStorage.getItem('guest_player_id') || localStorage.getItem('player_id')) : '';
    return !!(gs && gs.host && guestId && gs.host === guestId);
  });

  readonly canSwitchGame = computed(() => {
    return this.isInPkRoom() && this.isHostEffective();
  });

  openSwitchGame() {
    if (!this.canSwitchGame()) return;
    this.gameSwitchService.open({
      roomId: this.roomId || this.wsService.currentRoomId(),
      currentGameId: this.gameId || this.wsService.activeGameId(),
      currentDifficulty: this.difficulty || this.wsService.currentDifficulty(),
      currentMode: 'pk',
      isPkMatch: true
    });
  }

  readonly isToolsMenuOpen = signal<boolean>(false);

  toggleToolsMenu() {
    this.isToolsMenuOpen.update(v => !v);
  }

  closeToolsMenu() {
    this.isToolsMenuOpen.set(false);
  }

  toggleZen() {
    this.zenService.toggle();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isToolsMenuOpen()) return;
    const target = event.target as HTMLElement;
    const container = this.elementRef.nativeElement.querySelector('.tools-menu-container');
    if (container && !container.contains(target)) {
      this.closeToolsMenu();
    }
  }
}
