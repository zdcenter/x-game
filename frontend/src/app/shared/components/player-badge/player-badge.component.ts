import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-player-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Card Layout (used for Steal, Hexa, Sliding, Codebreaker) -->
    <ng-container *ngIf="layout === 'card'">
      <div class="flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-300 relative overflow-hidden"
           [ngClass]="{
             'border-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.15)]': isMe,
             'border-[var(--color-border-card)] bg-[var(--color-bg-card)]': !isMe,
             'opacity-60 grayscale': status === 'frozen' || status === 'spectating',
             'border-emerald-500 bg-emerald-500/10': status === 'finished'
           }">
        
        <!-- Avatar -->
        <div class="w-10 h-10 rounded-full bg-[var(--color-bg-main)] flex items-center justify-center font-bold text-lg border border-[var(--color-border-card)] shadow-inner relative z-10 shrink-0">
          <span *ngIf="isHost && !isSpectating()" class="absolute -top-2 -right-2 text-base drop-shadow-md z-20">👑</span>
          <span *ngIf="isSpectating()" class="absolute -top-2 -right-2 text-base drop-shadow-md z-20">👁️</span>
          {{ avatarChar }}
        </div>
        
        <!-- Info Column -->
        <div class="flex flex-col min-w-0 z-10 flex-1">
          <span class="text-sm font-bold truncate" 
                [class.text-blue-400]="isMe"
                [class.text-[var(--color-text-muted)]]="!isMe">
            {{ isMe ? (i18n.t('game.you')() || 'You') : $any(playerName) }}
          </span>
          
          <div class="flex items-end gap-1 mt-0.5 truncate">
            <ng-container *ngIf="score !== undefined">
              <span class="text-lg font-black leading-none text-[var(--color-text-main)]">{{ score }}</span>
              <span class="text-[10px] text-[var(--color-text-muted)] font-bold mb-0.5">pts</span>
            </ng-container>
            <ng-container *ngIf="subText">
              <span class="text-xs font-mono font-bold text-[var(--color-text-main)] truncate">{{ subText }}</span>
            </ng-container>
            <ng-container *ngIf="score === undefined && !subText">
               <span class="text-xs text-transparent">.</span>
            </ng-container>
          </div>
        </div>

        <!-- Finished State Overlay -->
        <div *ngIf="status === 'finished'" class="absolute inset-0 bg-emerald-500/10 flex items-center justify-center z-0">
          <span class="text-2xl opacity-20 transform -rotate-12 whitespace-nowrap font-black">{{ $any(i18n.t('game.finished')()) || 'FINISHED' }}</span>
        </div>

        <!-- Frozen Overlay -->
        <div *ngIf="status === 'frozen'" class="absolute inset-0 flex flex-col items-center justify-center bg-blue-900/60 backdrop-blur-[2px] z-20">
          <span class="text-xl animate-pulse">🥶</span>
          <span *ngIf="freezeCountdown !== undefined" class="text-xs text-white font-bold mt-0.5">{{ freezeCountdown }}s</span>
        </div>
      </div>
    </ng-container>

    <!-- Bar Layout (used for Math24 Speed) -->
    <ng-container *ngIf="layout === 'bar'">
      <div class="flex items-center gap-3 w-full relative" [class.opacity-50]="status === 'frozen' || status === 'spectating'">
        <!-- Frozen Icon Overlay -->
        <div *ngIf="status === 'frozen'" class="absolute -left-6 z-20">
          <span class="text-lg animate-pulse">🥶</span>
          <span class="text-[10px] font-bold absolute top-4 left-1 text-blue-300 drop-shadow-md">{{ freezeCountdown }}</span>
        </div>
        
        <!-- Name -->
        <span class="w-16 md:w-24 text-xs md:text-sm font-bold text-right truncate shrink-0 flex items-center justify-end gap-1" [class.text-blue-400]="isMe">
          <span *ngIf="isHost">👑</span>
          <span *ngIf="isSpectating()">👁️</span>
          {{ isMe ? (i18n.t('game.you')() || 'You') : $any(playerName) }}
        </span>

        <!-- Progress Bar -->
        <div class="flex-1 h-6 bg-[var(--color-bg-main)] rounded-full overflow-hidden relative border border-[var(--color-border-card)] shadow-inner min-w-[100px]">
          <div class="h-full transition-all duration-500 rounded-full relative"
               [ngClass]="{
                 'bg-gradient-to-r from-blue-600 to-blue-400': isMe && status !== 'finished',
                 'bg-gradient-to-r from-emerald-600 to-emerald-400': status === 'finished',
                 'bg-gradient-to-r from-gray-500 to-gray-400': !isMe && status !== 'finished'
               }"
               [style.width]="progressPercent + '%'">
            <div class="absolute inset-0 bg-white/20" style="background-image: linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent); background-size: 1rem 1rem;"></div>
          </div>
        </div>

        <!-- Progress Text -->
        <span class="w-12 text-xs md:text-sm font-bold text-[var(--color-text-muted)] shrink-0" [class.text-emerald-500]="status === 'finished'">
          <ng-container *ngIf="progress">{{ progress.current }}/{{ progress.total }}</ng-container>
          <ng-container *ngIf="!progress">-</ng-container>
        </span>
      </div>
    </ng-container>
  `
})
export class PlayerBadgeComponent {
  i18n = inject(I18nService);

  @Input() layout: 'card' | 'bar' = 'card';
  @Input({ required: true }) playerName!: string;
  @Input() isHost: boolean = false;
  @Input() isMe: boolean = false;
  @Input() score?: number;
  @Input() progress?: { current: number, total: number };
  @Input() subText?: string;
  @Input() status?: 'playing' | 'frozen' | 'finished' | 'spectating' | string = 'playing';
  @Input() freezeCountdown?: number;

  get avatarChar(): string {
    return this.playerName ? this.playerName.charAt(0).toUpperCase() : '?';
  }

  get progressPercent(): number {
    if (!this.progress || this.progress.total === 0) return 0;
    return Math.min(100, Math.max(0, (this.progress.current / this.progress.total) * 100));
  }

  isSpectating(): boolean {
    return this.status === 'spectating';
  }
}
