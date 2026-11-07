import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameService, getLocalizedField } from '../../../core/services/game.service';
import { marked } from 'marked';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';

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
  imports: [CommonModule, DragDropModule, RouterLink],
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
                    w-full max-w-2xl lg:max-w-xl max-h-[85vh] flex flex-col overflow-hidden relative">
          
          <!-- Header (Drag Handle) -->
          <div cdkDragHandle 
               class="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--color-border-card)] 
                      lg:cursor-move lg:active:cursor-grabbing hover:bg-[var(--color-border-card)]/30 transition-colors">
            <h3 class="text-base sm:text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span>📖</span>
              <span>{{ i18n.t('game.rules.title')() || '玩法规则与快捷键指南' }}</span>
            </h3>
            <button (click)="closed.emit()"
                    class="w-8 h-8 rounded-lg bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] transition-colors flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] z-10 cursor-pointer">
              ✕
            </button>
          </div>
          
          <!-- Content: Render Quick Rules & Controls Guide with full markdown-body styling -->
          <div class="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto markdown-body text-[var(--color-text-secondary)] text-xs sm:text-sm leading-relaxed"
               [innerHTML]="parsedRulesHTML()">
          </div>
          
          <!-- Footer: Direct links to Deep Strategy Document (/docs/:gameId) and Blog Guide (/blog/:slug) -->
          <div class="p-4 border-t border-[var(--color-border-card)] flex flex-col gap-2.5 bg-[var(--color-bg-main)]/60">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a [routerLink]="['/', i18n.currentLang(), 'docs', gameId]" target="_blank"
                 class="py-2.5 px-3 rounded-xl border border-[var(--color-accent-from)]/30 bg-[var(--color-accent-from)]/10 text-center text-xs font-bold text-[var(--color-accent-from)] hover:bg-[var(--color-accent-from)]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <span>📚</span>
                <span class="truncate">{{ i18n.t('game.read_docs_guide')() || '进阶推演手册' }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
              @if (relatedGuideSlug) {
                <a [routerLink]="['/', i18n.currentLang(), 'blog', relatedGuideSlug]" target="_blank"
                   class="py-2.5 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center text-xs font-bold text-amber-500 hover:bg-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                  <span>📖</span>
                  <span class="truncate">{{ i18n.t('game.read_guide')() || '实战图解通关秘籍' }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              }
            </div>
            <button (click)="closed.emit()"
                    class="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-95 cursor-pointer text-xs sm:text-sm">
              {{ i18n.t('game.rules.got_it')() || '我知道了' }}
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

  static readonly RELATED_GUIDES: Record<string, string> = {
    minesweeper: 'minesweeper-logic',
    sudoku: 'sudoku-benefits',
    gomoku: 'gomoku-strategy-guide',
    nonogram: 'nonogram-strategy',
    sokoban: 'sokoban-strategy',
    watersort: 'water-sort-puzzle-guide',
    tetris: 'tetris-battle-strategy',
    codebreaker: '1a2b-bulls-cows',
    math24: 'why-math24-is-the-best-brain-training-game-for-kids',
    sliding: 'sliding-puzzle-strategy',
    hexa: 'hexa-puzzle-strategy',
    block: 'block-puzzle-strategy',
    lightsout: 'lights-out-puzzle-guide',
    classic2048: 'classic2048-strategy',
    hashi: 'hashi-bridges-strategy',
    drop2048: 'classic2048-strategy',
    connect: 'connect-colors-strategy',
    idiom: 'idiom-battle-strategy',
    tilematch: 'tilematch-strategy',
    tents: 'tents-puzzle-guide',
  };

  get relatedGuideSlug(): string | null {
    return GameRulesModalComponent.RELATED_GUIDES[this.gameId] || null;
  }

  private rawGameRules = signal<string | null>(null);
  private loaded = false;

  parsedRulesHTML = computed(() => {
    // 优先加载专为快速上手打造的规则与操作指南 (来自 i18n，包含按键表格和防坑提示)
    const quickGuideKey = `game.${this.gameId}.seo_desc`;
    const quickGuide = this.i18n.t(quickGuideKey)();
    if (quickGuide && quickGuide.trim().length > 0 && quickGuide !== quickGuideKey) {
      return this.sanitizer.bypassSecurityTrustHtml(quickGuide);
    }

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
      // 只有在没有针对当前游戏的 i18n quickGuide 时才需要去请求单个规则文件
      const quickGuideKey = `game.${this.gameId}.seo_desc`;
      const quickGuide = this.i18n.t(quickGuideKey)();
      if (!quickGuide || quickGuide === quickGuideKey) {
        this.loadRules();
      }
    }
  }

  private loadRules() {
    this.gameService.getGameDoc(this.gameId).subscribe({
      next: (doc) => {
        if (doc && doc.rules) {
          this.rawGameRules.set(doc.rules);
        } else {
          this.rawGameRules.set('NOT_FOUND');
        }
        this.loaded = true;
      },
      error: () => {
        this.rawGameRules.set('NOT_FOUND');
        this.loaded = true;
      }
    });
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
