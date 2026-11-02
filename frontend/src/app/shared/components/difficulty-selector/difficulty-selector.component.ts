import { Component, Input, Output, EventEmitter, inject, signal, ViewChild, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';

export interface DifficultyOption {
  id: string;
  labelKey: string;
  descKey?: string;
  desc?: string;
}

@Component({
  selector: 'app-difficulty-selector',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes popoverDown {
      0% {
        opacity: 0;
        transform: translateY(-8px) scale(0.96);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .animate-popover-down {
      animation: popoverDown 0.16s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `],
  template: `
    <!-- Trigger Capsule Button (轻盈微胶囊，仅展示简短标记，彻底省略长规格以极致节约顶部空间) -->
    <div class="relative z-30 flex items-center">
      <button #triggerBtn
              type="button"
              (click)="toggleDropdown($event)"
              class="flex items-center gap-1 sm:gap-1.5 bg-[var(--color-bg-card)]/95 border border-[var(--color-border-card)] hover:border-amber-500/60 text-[var(--color-text-main)] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs hover:shadow-md active:scale-95 transition-all backdrop-blur-md select-none cursor-pointer group"
              [title]="i18n.t('game.difficulty')() || '选择难度规格'">
        <span class="text-xs sm:text-sm shrink-0">🎯</span>
        <!-- 仅展示极简核心文字（如“简单”、“中等”），不展示冗长的 5x5、10x10 等规格 -->
        <span class="truncate font-bold text-xs sm:text-sm">{{ currentLabelShort }}</span>
        <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 transition-transform duration-200 shrink-0"
             [class.rotate-180]="isOpen()"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <!-- Downward Popover / Dropdown Menu (视口级绝对定位，紧贴按钮正下方，100% 完整防截断展示) -->
      @if (isOpen()) {
        <!-- 全局透明点击遮罩 (用于点击外部任意处平滑关闭) -->
        <div class="fixed inset-0 z-40 bg-black/15 backdrop-blur-[1px]"
             (click)="closeDropdown()"
             (touchstart)="closeDropdown()">
        </div>

        <!-- 下拉面板：fixed 视口级绝对定位，永远在按钮正下方，且左右安全边界 12px 智能钳位保底 -->
        <div #popoverRef
             class="fixed z-50 bg-[var(--color-bg-card)]/98 backdrop-blur-2xl border border-[var(--color-border-card)] rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.35)] p-2.5 flex flex-col gap-1.5 select-none animate-popover-down origin-top"
             [style.top]="popoverStyle().top"
             [style.left]="popoverStyle().left"
             [style.width]="popoverStyle().width"
             (click)="$event.stopPropagation()"
             (touchstart)="$event.stopPropagation()">
          
          <!-- 顶头小标题栏 -->
          <div class="flex items-center justify-between px-2 py-1 border-b border-[var(--color-border-card)]/60 text-xs font-black text-[var(--color-text-muted)]">
            <span class="flex items-center gap-1.5">
              <span>🎯</span>
              <span>{{ i18n.t('game.difficulty')() || '选择难度规格' }}</span>
            </span>
            <button type="button"
                    (click)="closeDropdown()"
                    class="w-5 h-5 rounded-full hover:bg-[var(--color-border-card)] flex items-center justify-center text-xs opacity-70 hover:opacity-100 transition-all cursor-pointer">
              ✕
            </button>
          </div>

          <!-- 难度选项列表 (在弹出框中完整展现大字名称与具体规格，丰富直观) -->
          <div class="flex flex-col gap-1 max-h-[60vh] overflow-y-auto overscroll-contain pr-0.5 pt-1">
            @for (diff of availableDifficulties; track diff.id) {
              <button type="button"
                      (click)="selectDifficulty(diff.id)"
                      class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between border transition-all active:scale-[0.98] cursor-pointer"
                      [ngClass]="currentDifficulty === diff.id ? 'bg-amber-500/15 border-amber-500/80 shadow-xs ring-1 ring-amber-400/30' : 'bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] border-[var(--color-border-card)]/60 text-[var(--color-text-main)]'">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="text-xl shrink-0">{{ getDifficultyEmoji(diff.id) }}</span>
                  <div class="flex flex-col text-left min-w-0">
                    <div class="text-xs sm:text-sm font-black truncate"
                         [class.text-amber-500]="currentDifficulty === diff.id">
                      {{ i18n.t(diff.labelKey)() }}
                    </div>
                    @if (diff.descKey || diff.desc) {
                      <div class="text-[11px] text-[var(--color-text-muted)] font-mono leading-none mt-0.5 truncate">
                        {{ diff.descKey ? i18n.t(diff.descKey)() : diff.desc }}
                      </div>
                    }
                  </div>
                </div>

                @if (currentDifficulty === diff.id) {
                  <span class="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                    ✓
                  </span>
                }
              </button>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class DifficultySelectorComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private readonly audio = inject(AudioService);
  private readonly haptic = inject(HapticService);
  private readonly elementRef = inject(ElementRef);

  @ViewChild('triggerBtn') triggerBtn?: ElementRef<HTMLElement>;
  @ViewChild('popoverRef') popoverRef?: ElementRef<HTMLElement>;

  @Input({ required: true }) availableDifficulties: DifficultyOption[] = [];
  @Input({ required: true }) currentDifficulty: string = '';
  @Output() difficultyChange = new EventEmitter<string>();

  readonly isOpen = signal<boolean>(false);
  readonly popoverStyle = signal<{ top: string; left: string; width: string }>({
    top: '56px',
    left: '12px',
    width: '280px'
  });

  /**
   * 采用捕获阶段 (Capture Phase) 指针监听：
   * 即使扫雷等棋盘内部单元格阻止了冒泡 (stopPropagation)，
   * 在顶层捕获阶段也能第一时间感知到玩家点击/触摸了棋盘或外部，瞬间自动关闭消失！
   */
  private onCapturePointerDown = (event: PointerEvent) => {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    if (!target) return;

    // 如果点击的是下拉面板内部，不自动关闭
    if (this.popoverRef?.nativeElement?.contains(target)) {
      return;
    }

    // 如果点击的是微胶囊触发按钮自身，交由按钮自身的 click 处理
    if (this.triggerBtn?.nativeElement?.contains(target)) {
      return;
    }

    // 点击/触摸了棋盘任意格子、背景或页面任意空白处：瞬间关闭消失！
    this.closeDropdown();
  };

  ngOnInit() {
    if (typeof window !== 'undefined') {
      // capture: true 确保不受任何子组件 stopPropagation 干扰
      window.addEventListener('pointerdown', this.onCapturePointerDown, true);
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.onCapturePointerDown, true);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.closeDropdown();
    }
  }

  get currentDiffItem(): DifficultyOption | undefined {
    return this.availableDifficulties.find(d => d.id === this.currentDifficulty) || this.availableDifficulties[0];
  }

  get currentLabelShort(): string {
    const item = this.currentDiffItem;
    return item ? this.i18n.t(item.labelKey)() : '';
  }

  toggleDropdown(event?: MouseEvent) {
    if (event) event.stopPropagation();
    const nextState = !this.isOpen();
    if (nextState) {
      if (typeof window !== 'undefined' && event?.currentTarget) {
        const btn = event.currentTarget as HTMLElement;
        const rect = btn.getBoundingClientRect();
        const vw = window.innerWidth;
        const cardWidth = Math.min(290, vw - 24);
        
        // 垂直位置：精确位于按钮正下方 8px
        const top = `${rect.bottom + 8}px`;
        
        // 水平位置：默认以按钮中心为基准，同时进行左右边界 12px 智能防遮挡钳位
        const btnCenter = rect.left + rect.width / 2;
        let left = btnCenter - cardWidth / 2;
        
        // 严格边界保底：左侧距离屏幕边缘不少于 12px（绝不被屏幕左边缘截断！）
        if (left < 12) {
          left = 12;
        }
        // 右侧距离屏幕边缘不少于 12px
        else if (left + cardWidth > vw - 12) {
          left = Math.max(12, vw - 12 - cardWidth);
        }

        this.popoverStyle.set({
          top,
          left: `${Math.round(left)}px`,
          width: `${Math.round(cardWidth)}px`
        });
      }
      this.audio.playClick();
      this.haptic.light();
    }
    this.isOpen.set(nextState);
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  selectDifficulty(diffId: string) {
    if (this.currentDifficulty !== diffId) {
      this.difficultyChange.emit(diffId);
      this.audio.playClick();
      this.haptic.medium();
    }
    this.closeDropdown();
  }

  getDifficultyEmoji(diff: string): string {
    const d = (diff || '').toLowerCase();
    if (d.includes('easy') || d === 'simple' || d === 'beginner') return '🌱';
    if (d.includes('medium') || d === 'normal' || d === 'standard') return '⚡';
    if (d.includes('hard') || d === 'advanced') return '🔥';
    if (d.includes('expert') || d === 'master' || d === 'pro') return '😈';
    if (d.includes('insane') || d === 'hell' || d === 'nightmare') return '👑';
    return '🎯';
  }
}
