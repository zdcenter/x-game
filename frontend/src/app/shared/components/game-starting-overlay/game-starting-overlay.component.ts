import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-game-starting-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-2xl">
      <div class="flex flex-col items-center animate-pulse">
        <span class="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">
          {{ countdown }}
        </span>
        <span class="text-2xl text-white mt-4 font-bold tracking-[0.3em] uppercase opacity-90">
          <ng-container i18n="@@game.starting">game.starting</ng-container>
        </span>
      </div>
    </div>
  `
})
export class GameStartingOverlayComponent {
  i18n = inject(I18nService);
  @Input({ required: true }) countdown!: string | number;
}
