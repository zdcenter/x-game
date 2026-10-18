import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

@Component({
  selector: 'app-avatar-frame',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-flex items-center justify-center select-none" [ngClass]="containerClasses()">
      <!-- Animated Frame Glow / Ring -->
      @if (frame() === 'frame-flame') {
        <div class="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 animate-pulse blur-[2px] opacity-80 pointer-events-none"></div>
        <div class="absolute inset-[-2px] rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 p-[2px] shadow-[0_0_12px_rgba(249,115,22,0.6)]"></div>
      } @else if (frame() === 'frame-neon') {
        <div class="absolute inset-[-4px] rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-indigo-500 animate-spin blur-[2px] opacity-75 [animation-duration:6s] pointer-events-none"></div>
        <div class="absolute inset-[-2px] rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-indigo-500 p-[2px] shadow-[0_0_12px_rgba(217,70,239,0.5)]"></div>
      } @else if (frame() === 'frame-gold') {
        <div class="absolute inset-[-4px] rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 blur-[2px] opacity-70 pointer-events-none"></div>
        <div class="absolute inset-[-2px] rounded-full bg-gradient-to-tr from-amber-200 via-yellow-400 to-yellow-600 p-[2px] shadow-[0_0_14px_rgba(234,179,8,0.7)]"></div>
      } @else if (frame() === 'frame-cosmic') {
        <div class="absolute inset-[-5px] rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-teal-400 animate-spin blur-[3px] opacity-75 [animation-duration:8s] pointer-events-none"></div>
        <div class="absolute inset-[-2px] rounded-full bg-gradient-to-r from-purple-500 via-teal-400 to-indigo-600 p-[2px] shadow-[0_0_14px_rgba(168,85,247,0.6)]"></div>
      } @else {
        <div class="absolute inset-0 rounded-full border border-[var(--color-border-card)]"></div>
      }

      <!-- Core Avatar Circle -->
      <div class="relative z-10 rounded-full overflow-hidden flex items-center justify-center bg-[var(--color-bg-card)] border-2 border-[var(--color-bg-main)] shadow-inner"
           [ngClass]="innerSizeClasses()">
        @if (avatarUrl()) {
          <img [src]="avatarUrl()" alt="Avatar" class="w-full h-full object-cover">
        } @else {
          <div class="w-full h-full bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-white"
               [ngClass]="emojiSizeClasses()">
            {{ avatarEmoji() || '👤' }}
          </div>
        }
      </div>

      <!-- Crown / Icon Accent Badge on Top Right for special frames -->
      @if (frame() === 'frame-gold') {
        <span class="absolute -top-2 -right-1 z-20 text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">👑</span>
      } @else if (frame() === 'frame-flame') {
        <span class="absolute -top-1.5 -right-1 z-20 text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">🔥</span>
      } @else if (frame() === 'frame-neon') {
        <span class="absolute -top-1.5 -right-1 z-20 text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">⚡</span>
      } @else if (frame() === 'frame-cosmic') {
        <span class="absolute -top-1.5 -right-1 z-20 text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">🌌</span>
      }
    </div>
  `,
})
export class AvatarFrameComponent {
  frame = input<string>('none');
  size = input<AvatarSize>('md');
  avatarUrl = input<string | undefined>(undefined);
  avatarEmoji = input<string | undefined>(undefined);

  containerClasses = computed(() => {
    switch (this.size()) {
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-12 h-12';
      case 'lg': return 'w-16 h-16';
      case 'xl': return 'w-20 h-20';
      case '2xl': return 'w-24 h-24';
      default: return 'w-12 h-12';
    }
  });

  innerSizeClasses = computed(() => {
    switch (this.size()) {
      case 'sm': return 'w-7 h-7';
      case 'md': return 'w-11 h-11';
      case 'lg': return 'w-15 h-15';
      case 'xl': return 'w-19 h-19';
      case '2xl': return 'w-22 h-22';
      default: return 'w-11 h-11';
    }
  });

  emojiSizeClasses = computed(() => {
    switch (this.size()) {
      case 'sm': return 'text-xs';
      case 'md': return 'text-lg';
      case 'lg': return 'text-2xl';
      case 'xl': return 'text-3xl';
      case '2xl': return 'text-4xl';
      default: return 'text-lg';
    }
  });
}
