import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';

export interface RewardCelebrationData {
  title?: string;
  subtitle?: string;
  icon?: string;
  xp?: number;
  coins?: number;
  freezes?: number;
  leveledUp?: boolean;
  newLevel?: number;
  milestoneTitle?: string;
  milestoneDesc?: string;
}

@Component({
  selector: 'app-reward-celebration-modal',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes spinSlow {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.7) translateY(24px); }
      65% { opacity: 1; transform: scale(1.05) translateY(-4px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes fadeOut {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.9) translateY(-16px); }
    }
    @keyframes sparkFloat {
      0% { opacity: 1; transform: translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.2); }
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.9; transform: scale(1.08); }
    }
    .animate-spin-slow {
      animation: spinSlow 24s linear infinite;
    }
    .animate-pop-in {
      animation: popIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-fade-out {
      animation: fadeOut 0.3s ease-in forwards;
    }
    .animate-spark {
      animation: sparkFloat 1.2s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
    }
    .animate-pulse-glow {
      animation: pulseGlow 2.5s ease-in-out infinite;
    }
  `],
  template: `
    <!-- 全屏柔和微光蒙层 (点击任意处或等待3.5秒自动收下) -->
    <div class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs transition-opacity duration-300 select-none cursor-pointer"
         [class.animate-fade-out]="isClosing()"
         (click)="close()">

      <!-- 中央多巴胺庆祝容器 -->
      <div class="relative w-full max-w-md flex flex-col items-center justify-center pointer-events-auto cursor-default"
           (click)="$event.stopPropagation()">

        <!-- 1. 背后放射太阳光芒 (Sunburst Rays) -->
        <div class="absolute -inset-16 flex items-center justify-center pointer-events-none overflow-hidden">
          <svg class="w-[500px] h-[500px] text-amber-500/20 dark:text-amber-400/20 animate-spin-slow" viewBox="0 0 200 200" fill="currentColor">
            <g transform="translate(100, 100)">
              @for (ray of rays; track $index) {
                <polygon points="0,0 -8,-100 8,-100" [attr.transform]="'rotate(' + (ray * 30) + ')'" />
              }
            </g>
          </svg>
          <div class="absolute inset-0 bg-radial from-amber-500/30 via-transparent to-transparent animate-pulse-glow"></div>
        </div>

        <!-- 2. 全屏爆裂星芒火花粒子喷泉 -->
        <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
          @for (spark of sparks(); track spark.id) {
            <span class="absolute rounded-full animate-spark"
                  [style.width.px]="spark.size"
                  [style.height.px]="spark.size"
                  [style.backgroundColor]="spark.color"
                  [style.--tx.px]="spark.tx"
                  [style.--ty.px]="spark.ty"></span>
          }
        </div>

        <!-- 3. 主奖励卡片 (Grand Celebration Card) -->
        <div class="relative w-full rounded-3xl bg-[var(--color-bg-card)] border-2 border-amber-500/40 shadow-[0_15px_50px_rgba(245,158,11,0.25)] p-6 sm:p-7 flex flex-col items-center text-center animate-pop-in overflow-hidden"
             [class.animate-fade-out]="isClosing()">

          <!-- 顶部装饰氛围光 -->
          <div class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"></div>

          <!-- 核心大徽标 (带跳动动效) -->
          <div class="relative mb-2.5 flex items-center justify-center">
            <div class="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-amber-500/30 border border-amber-500/50 flex items-center justify-center text-4xl sm:text-5xl shadow-inner shadow-amber-500/30">
              {{ data?.icon || '🎁' }}
            </div>
            <div class="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
          </div>

          <!-- 标题与副标题 -->
          <h2 class="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 tracking-tight leading-tight">
            {{ data?.title || t('quests.reward_title')() }}
          </h2>
          <p class="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5 max-w-xs line-clamp-2">
            {{ data?.subtitle || t('quests.all_claimed')() }}
          </p>

          <!-- 升级专属特别横幅 (若达成升级) -->
          @if (data?.leveledUp) {
            <div class="my-2.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 border border-purple-500/40 flex items-center gap-1.5 animate-pulse shadow-sm">
              <span class="text-sm">🎉</span>
              <span class="text-xs font-black text-purple-600 dark:text-purple-300 uppercase tracking-wider">
                {{ t('quests.level_up_congrats')() }} Lv.{{ data?.newLevel }}!
              </span>
            </div>
          }

          <!-- 里程碑达成特别横幅 -->
          @if (data?.milestoneTitle) {
            <div class="my-2 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <span>👑</span>
              <span>{{ data?.milestoneTitle }}: {{ data?.milestoneDesc }}</span>
            </div>
          }

          <!-- 4. 奖励资产展示舱 (XP + 脑力金币 + 冰冻卡) -->
          <div class="grid grid-cols-2 gap-2.5 w-full my-4 max-w-xs">
            <!-- 经验值奖励卡 -->
            @if ((data?.xp || 0) > 0) {
              <div class="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gradient-to-b from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20 shadow-sm transition-transform hover:scale-105">
                <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                  EXP
                </span>
                <span class="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-300 mt-0.5 tabular-nums">
                  +{{ displayXp() }}
                </span>
              </div>
            }

            <!-- 脑力金币奖励卡 -->
            @if ((data?.coins || 0) > 0) {
              <div class="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gradient-to-b from-amber-500/10 to-amber-500/5 border border-amber-500/20 shadow-sm transition-transform hover:scale-105">
                <span class="text-[11px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center gap-1">
                  <span>🪙</span> 金币
                </span>
                <span class="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-300 mt-0.5 tabular-nums">
                  +{{ displayCoins() }}
                </span>
              </div>
            }

            <!-- 连胜冰冻卡奖励卡 (如果有) -->
            @if ((data?.freezes || 0) > 0) {
              <div class="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400 text-xs font-bold">
                <span class="text-sm">🧊</span>
                <span>获得连胜冰冻保护卡 +{{ data?.freezes }} 张！</span>
              </div>
            }
          </div>

          <!-- 5. 自动存入资产指示器 (无需玩家手动确认，3.5秒自动存入并关闭，点击即可秒关) -->
          <div class="w-full mt-2 flex flex-col items-center gap-1.5 cursor-pointer group"
               (click)="close()"
               title="点击立即关闭">
            <div class="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{{ t('quests.reward_autosaved')() }}</span>
              <span class="font-mono text-[11px] opacity-75">({{ remainingSeconds() }}s)</span>
            </div>
            
            <!-- 自动倒计时平滑进度条 -->
            <div class="w-full h-1.5 rounded-full bg-amber-500/15 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 rounded-full transition-all duration-100 ease-linear"
                   [style.width.%]="progressPercent()"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class RewardCelebrationModalComponent implements OnInit, OnDestroy {
  private i18n = inject(I18nService);
  private audio = inject(AudioService);

  @Input() data: RewardCelebrationData | null = null;
  @Output() confirmed = new EventEmitter<void>();

  rays = Array.from({ length: 12 }, (_, i) => i);
  sparks = signal<{ id: number; color: string; size: number; tx: number; ty: number }[]>([]);

  displayXp = signal(0);
  displayCoins = signal(0);
  remainingSeconds = signal(3);
  progressPercent = signal(100);
  isClosing = signal(false);

  private animTimer?: any;
  private progressTimer?: any;
  private autoCloseTimer?: any;

  get t() {
    return this.i18n.t.bind(this.i18n);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === ' ' || event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  ngOnInit() {
    // 播放华丽庆祝音效
    this.audio.playWin();

    // 生成五彩爆裂星芒火花粒子
    const colors = ['#f59e0b', '#fbbf24', '#fde047', '#818cf8', '#c084fc', '#34d399', '#ffffff'];
    const generated = Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
      const distance = 110 + Math.random() * 140;
      return {
        id: i,
        color: colors[i % colors.length],
        size: 5 + Math.random() * 7,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance
      };
    });
    this.sparks.set(generated);

    // 数字滚动递增动效 (Count-up Animation)
    const targetXp = this.data?.xp || 0;
    const targetCoins = this.data?.coins || 0;
    const steps = 15;
    let step = 0;

    this.animTimer = setInterval(() => {
      step++;
      const progress = Math.min(1, step / steps);
      this.displayXp.set(Math.round(targetXp * progress));
      this.displayCoins.set(Math.round(targetCoins * progress));
      if (step >= steps) {
        clearInterval(this.animTimer);
      }
    }, 30);

    // 3.5秒自动到账倒计时：无需用户手动点击确定，水到渠成自动收下
    const totalDurationMs = 3500;
    const startTime = Date.now();

    this.progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, totalDurationMs - elapsed);
      this.remainingSeconds.set(Math.max(1, Math.ceil(remainingMs / 1000)));
      this.progressPercent.set(Math.max(0, (remainingMs / totalDurationMs) * 100));

      if (remainingMs <= 0) {
        clearInterval(this.progressTimer);
      }
    }, 50);

    this.autoCloseTimer = setTimeout(() => {
      this.close();
    }, totalDurationMs);
  }

  ngOnDestroy() {
    if (this.animTimer) clearInterval(this.animTimer);
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
  }

  close() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    if (this.animTimer) clearInterval(this.animTimer);
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);

    // 优雅平滑退场后发出通知
    setTimeout(() => {
      this.confirmed.emit();
    }, 200);
  }
}
