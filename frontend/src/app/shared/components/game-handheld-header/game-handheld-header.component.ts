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
import { PwaService } from '../../../core/services/pwa.service';
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
            <span class="text-xs sm:text-sm font-bold whitespace-nowrap">{{ i18n.t('game.quick_pk')() || '开房PK' }}</span>
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
            <!-- 更换对战游戏 / 难度 (在联机对战中且为房主) -->
            @if (canSwitchGame()) {
              <button type="button"
                      (click)="openSwitchGame(); closeToolsMenu(); audio.playClick(); haptic.light()"
                      class="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-purple-400 hover:bg-purple-500/10 active:bg-purple-500/20 active:scale-[0.98] transition-all cursor-pointer border-b border-[var(--color-border-card)]/60 pb-2 mb-0.5 select-none">
                <span class="flex items-center gap-2 pointer-events-none">
                  <span>🎮</span>
                  <span>{{ i18n.t('game.switch_pk_game')() || '更换对战游戏' }}</span>
                </span>
                <span class="text-xs opacity-75 pointer-events-none">›</span>
              </button>
            }

            <!-- 脑力金币 -->
            @if (coinService.isAuthenticated()) {
              <button type="button"
                      (click)="coinGuideService.open(); closeToolsMenu(); audio.playClick(); haptic.light()"
                      class="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] active:bg-[var(--color-border-card)]/50 active:scale-[0.98] transition-all cursor-pointer border-b border-[var(--color-border-card)]/60 pb-2 mb-0.5 select-none">
                <span class="flex items-center gap-2 pointer-events-none">
                  <app-coin-icon size="xs" />
                  <span>{{ i18n.t('game.coins_balance')() || '脑力金币' }}</span>
                </span>
                <span class="font-mono text-amber-500 font-bold pointer-events-none">{{ coinService.coins() }}</span>
              </button>
            }

            <!-- 音效开关 (整行有效点击) -->
            <button type="button"
                    (click)="audio.toggleMute(); audio.playClick(); haptic.light()"
                    class="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] active:bg-[var(--color-border-card)]/50 active:scale-[0.98] transition-all cursor-pointer select-none">
              <span class="flex items-center gap-2 pointer-events-none">
                <span>{{ audio.isMuted() ? '🔇' : '🔊' }}</span>
                <span>{{ i18n.t('audio.sound_effects')() || '音效开关' }}</span>
              </span>
              <span class="text-[10px] sm:text-xs px-2 py-0.5 rounded font-mono pointer-events-none"
                    [class.bg-emerald-500/15]="!audio.isMuted()"
                    [class.text-emerald-500]="!audio.isMuted()"
                    [class.bg-red-500/15]="audio.isMuted()"
                    [class.text-red-500]="audio.isMuted()">
                {{ audio.isMuted() ? (i18n.t('audio.mute')() || '关闭') : (i18n.t('audio.unmute')() || '开启') }}
              </span>
            </button>

            <!-- 触感震动 (整行有效点击) -->
            <button type="button"
                    (click)="haptic.toggleVibration(); audio.playClick(); haptic.light()"
                    class="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] active:bg-[var(--color-border-card)]/50 active:scale-[0.98] transition-all cursor-pointer select-none">
              <span class="flex items-center gap-2 pointer-events-none">
                <span>📳</span>
                <span>{{ i18n.t('audio.vibration')() || '触感震动' }}</span>
              </span>
              <span class="text-[10px] sm:text-xs px-2 py-0.5 rounded font-mono pointer-events-none"
                    [class.bg-emerald-500/15]="haptic.isVibrationEnabled()"
                    [class.text-emerald-500]="haptic.isVibrationEnabled()"
                    [class.bg-gray-500/15]="!haptic.isVibrationEnabled()"
                    [class.text-[var(--color-text-muted)]]="!haptic.isVibrationEnabled()">
                {{ haptic.isVibrationEnabled() ? 'ON' : 'OFF' }}
              </span>
            </button>

            <!-- 全屏沉浸 (整行有效点击) -->
            <button type="button"
                    (click)="toggleZen(); closeToolsMenu(); audio.playClick(); haptic.light()"
                    class="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] active:bg-[var(--color-border-card)]/50 active:scale-[0.98] transition-all cursor-pointer select-none">
              <span class="flex items-center gap-2 pointer-events-none">
                <span>🧘</span>
                <span>{{ zenService.isZenMode() ? (i18n.t('game.exit_zen_mode')() || '退出全屏') : (i18n.t('game.zen_mode')() || '全屏沉浸') }}</span>
              </span>
              <span class="text-[10px] sm:text-xs px-2 py-0.5 rounded font-mono bg-[var(--color-bg-main)] border border-[var(--color-border-card)] pointer-events-none">
                {{ zenService.isZenMode() ? 'Exit' : 'Enter' }}
              </span>
            </button>

            <!-- 📱 安装到桌面 / 手机主屏幕 (离线畅玩，若已安装则自动隐匿) -->
            @if (!pwa.isStandalone() && !pwa.isAppInstalledOnDevice()) {
              <button type="button"
                      (click)="pwa.triggerInstall(); closeToolsMenu(); audio.playClick(); haptic.light()"
                      class="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-emerald-500 hover:bg-emerald-500/10 active:bg-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer border-b border-[var(--color-border-card)]/60 pb-2 mb-0.5 select-none">
                <span class="flex items-center gap-2 pointer-events-none">
                  <span>📱</span>
                  <span>{{ i18n.t('pwa.install_desktop')() || '安装到手机桌面 (离线秒开)' }}</span>
                </span>
                <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 pointer-events-none">
                  PRO
                </span>
              </button>
            }

            <!-- 意见建议与 Bug 反馈 -->
            <button type="button"
                    (click)="feedbackService.open({ gameId: gameId, gameTitle: gameTitle }); closeToolsMenu(); audio.playClick(); haptic.light()"
                    class="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-amber-500 hover:bg-amber-500/10 active:bg-amber-500/20 active:scale-[0.98] transition-all cursor-pointer border-t border-[var(--color-border-card)]/50 pt-2 mt-0.5 select-none">
              <span class="flex items-center gap-2 pointer-events-none">
                <span>🐞</span>
                <span>{{ i18n.t('feedback.tooltip')() || '意见建议与 Bug 反馈' }}</span>
              </span>
              <span class="text-xs pointer-events-none">›</span>
            </button>
          </div>
        }
      </div>
    </div>

    <!-- iOS 安装向导 (棋盘局内兼容) -->
    @if (pwa.showIosGuide()) {
      <div class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
           (click)="pwa.closeIosGuide()">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-2xl flex flex-col gap-4 text-center z-10"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-black text-[var(--color-text-main)] flex items-center gap-2">
              <span>📱</span>
              <span>{{ i18n.t('pwa.install_guide_title')() || '添加到手机主屏幕' }}</span>
            </h3>
            <button (click)="pwa.closeIosGuide()" class="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
          </div>
          <div class="flex flex-col gap-3 text-xs sm:text-sm text-left text-[var(--color-text-secondary)]">
            <div class="flex items-start gap-2.5 bg-[var(--color-bg-main)] p-3 rounded-2xl border border-[var(--color-border-card)]">
              <span class="text-lg">1️⃣</span>
              <span>点击 Safari 底部或右上角分享按钮（<strong class="text-[var(--color-text-main)]">⎋ 分享</strong>）</span>
            </div>
            <div class="flex items-start gap-2.5 bg-[var(--color-bg-main)] p-3 rounded-2xl border border-[var(--color-border-card)]">
              <span class="text-lg">2️⃣</span>
              <span>向下滑动找到并点击【<strong class="text-emerald-500">➕ 添加到主屏幕</strong>】</span>
            </div>
          </div>
          <button (click)="pwa.closeIosGuide()" class="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 text-white shadow-md active:scale-95 transition-all cursor-pointer">
            我知道了 (Got it)
          </button>
        </div>
      </div>
    }

    <!-- 通用桌面 / 安卓浏览器安装向导 (棋盘局内兼容) -->
    @if (pwa.showGeneralGuide()) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
           (click)="pwa.closeGeneralGuide()">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-sm rounded-3xl p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-2xl flex flex-col gap-4 text-center z-10"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-black text-[var(--color-text-main)] flex items-center gap-2">
              <span>💻</span>
              <span>{{ i18n.t('pwa.install_desktop')() || '安装桌面应用' }}</span>
            </h3>
            <button (click)="pwa.closeGeneralGuide()" class="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
          </div>
          <div class="flex flex-col gap-2.5 text-xs sm:text-sm text-left text-[var(--color-text-secondary)]">
            <div class="bg-[var(--color-bg-main)] p-3 rounded-2xl border border-[var(--color-border-card)]">
              <p class="font-bold text-[var(--color-text-main)] mb-1">桌面 Chrome / Edge 浏览器：</p>
              <p>点击网址栏右侧的【<strong class="text-emerald-500">⊕ 安装</strong>】图标，或点击右上角菜单 (⋮) 选择【安装应用】。</p>
            </div>
            <div class="bg-[var(--color-bg-main)] p-3 rounded-2xl border border-[var(--color-border-card)]">
              <p class="font-bold text-[var(--color-text-main)] mb-1">手机浏览器：</p>
              <p>点击浏览器菜单 (⋮) -> 选择【添加到主屏幕 / 安装到手机】。</p>
            </div>
          </div>
          <button (click)="pwa.closeGeneralGuide()" class="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 text-white shadow-md active:scale-95 transition-all cursor-pointer">
            我知道了 (Got it)
          </button>
        </div>
      </div>
    }
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
  pwa = inject(PwaService);
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
