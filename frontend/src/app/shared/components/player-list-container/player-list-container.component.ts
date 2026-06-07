import { Component, Input, TemplateRef, ContentChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-list-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Mobile: Drawer Trigger Button -->
    <div class="lg:hidden flex-none ml-2">
      <button (click)="isDrawerOpen = true" class="px-3 py-1.5 md:py-2 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl flex items-center gap-1.5 md:gap-2 shadow-sm active:scale-95 transition-all">
        <span class="text-sm">👥</span>
        <span class="font-bold text-sm text-[var(--color-text-main)]">{{ opponentsCount }}</span>
      </button>
    </div>

    <!-- Desktop: Horizontal List -->
    <div class="hidden lg:flex flex-1 gap-3 xl:gap-4 overflow-x-auto pb-2 custom-scrollbar px-2 max-w-full">
      <ng-container *ngTemplateOutlet="listTemplate"></ng-container>
    </div>

    <!-- Mobile Drawer Overlay -->
    @if(isDrawerOpen) {
      <div class="fixed inset-0 z-[100] lg:hidden flex flex-col justify-start">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-sm transition-opacity duration-300" (click)="isDrawerOpen = false"></div>
        
        <!-- Drawer Content -->
        <div class="relative bg-[var(--color-bg-main)] rounded-b-2xl p-4 pt-6 md:pt-8 flex flex-col gap-3 max-h-[80vh] border-b border-[var(--color-border-card)] shadow-[0_10px_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 translate-y-0">
          
          <!-- Header -->
          <div class="flex justify-between items-center mb-2 px-1">
            <h3 class="font-bold text-lg text-[var(--color-text-main)] flex items-center gap-2">
              👥 <span>对手状态 ({{ opponentsCount }})</span>
            </h3>
            <button (click)="isDrawerOpen = false" class="p-1.5 rounded-full bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors border border-[var(--color-border-card)]">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- List Body -->
          <div class="flex flex-col gap-2 overflow-y-auto custom-scrollbar px-1">
            <ng-container *ngTemplateOutlet="listTemplate"></ng-container>
          </div>

          <!-- Handle bar for visual cue -->
          <div class="w-12 h-1.5 bg-[var(--color-border-thick)] rounded-full mx-auto mt-2"></div>
        </div>
      </div>
    }
  `
})
export class PlayerListContainerComponent {
  @Input({ required: true }) opponentsCount!: number;
  @ContentChild('opponentsList') listTemplate!: TemplateRef<any>;
  isDrawerOpen = false;
}
