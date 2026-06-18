import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameService, getLocalizedField } from '../../../core/services/game.service';
import { marked } from 'marked';
import { DragDropModule } from '@angular/cdk/drag-drop';

/**
 * Reusable game rules modal — any game can use this by providing its gameId.
 * Automatically fetches rules from the backend API and renders as Markdown.
 *
 * Usage:
 *   <app-game-rules-modal [gameId]="'minesweeper'" [isOpen]="showRules()" (closed)="showRules.set(false)">
 */
@Component({
  selector: 'app-game-rules-modal',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    @if (isOpen) {
      <!-- Overlay Container: Centers on mobile, floats top-right on PC. 
           On PC (lg), it has no backdrop and does not block clicks (pointer-events-none). -->
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4
                  lg:justify-end lg:items-start lg:p-8 lg:pt-24
                  bg-[var(--color-overlay)] backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none
                  pointer-events-auto lg:pointer-events-none"
           (click)="onBackdropClick($event)">
        
        <!-- Draggable Modal Window -->
        <div cdkDrag
             class="pointer-events-auto bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-2xl 
                    w-full max-w-2xl lg:max-w-md max-h-[80vh] flex flex-col overflow-hidden relative">
          
          <!-- Header (Drag Handle) -->
          <div cdkDragHandle 
               class="flex items-center justify-between p-5 border-b border-[var(--color-border-card)] 
                      lg:cursor-move lg:active:cursor-grabbing hover:bg-[var(--color-border-card)]/30 transition-colors">
            <h3 class="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              📖 {{ i18n.t('game.rules.title')() }}
            </h3>
            <button (click)="closed.emit()"
                    class="w-8 h-8 rounded-lg bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] transition-colors flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] z-10">
              ✕
            </button>
          </div>
          
          <!-- Content -->
          <div class="p-5 overflow-y-auto prose prose-invert prose-sm max-w-none
                      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-[var(--color-text-primary)] [&_h1]:mb-3
                      [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[var(--color-text-primary)] [&_h2]:mb-2 [&_h2]:mt-4
                      [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--color-text-primary)] [&_h3]:mb-2
                      [&_p]:text-[var(--color-text-secondary)] [&_p]:mb-3 [&_p]:leading-relaxed
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:text-[var(--color-text-secondary)]
                      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:text-[var(--color-text-secondary)]
                      [&_li]:mb-1
                      [&_strong]:text-[var(--color-text-primary)] [&_strong]:font-semibold
                      [&_code]:bg-[var(--color-bg-main)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs"
               [innerHTML]="parsedRulesHTML()">
          </div>
          
          <!-- Footer -->
          <div class="p-4 border-t border-[var(--color-border-card)] flex flex-col gap-3">
            <a [href]="'/docs/' + gameId" target="_blank"
               class="w-full py-2 text-center text-sm font-medium text-[var(--color-accent-from)] hover:text-[var(--color-accent-to)] hover:underline flex items-center justify-center gap-1">
              {{ i18n.t('docs.read_more')() || '📖 Read full tutorial & strategies' }}
            </a>
            <button (click)="closed.emit()"
                    class="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95">
              {{ i18n.t('game.rules.got_it')() }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class GameRulesModalComponent implements OnChanges {
  i18n = inject(I18nService);
  private gameService = inject(GameService);
  private sanitizer = inject(DomSanitizer);

  @Input({ required: true }) gameId!: string;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  private rawGameRules = signal<string | null>(null);

  private loaded = false;

  parsedRulesHTML = computed(() => {
    const rawRules = this.rawGameRules();
    if (rawRules === null) {
      return this.sanitizer.bypassSecurityTrustHtml(marked.parse(this.i18n.t('game.rules.loading')(), { async: false }) as string);
    }
    if (rawRules === 'NOT_FOUND') {
      return this.sanitizer.bypassSecurityTrustHtml(marked.parse(this.i18n.t('game.rules.not_found')(), { async: false }) as string);
    }
    const md = getLocalizedField(rawRules, this.i18n.currentLang());
    return this.sanitizer.bypassSecurityTrustHtml(marked.parse(md, { async: false }) as string);
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen && !this.loaded) {
      this.loadRules();
    }
  }

  private loadRules() {
    this.gameService.getAllGames().subscribe(games => {
      const game = games.find(g => g.id === this.gameId);
      if (game) {
        this.rawGameRules.set(game.rules);
      } else {
        this.rawGameRules.set('NOT_FOUND');
      }
      this.loaded = true;
    });
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
