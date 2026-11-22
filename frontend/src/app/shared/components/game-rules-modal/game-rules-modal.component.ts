import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from "@angular/platform-browser";
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
          <div class="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto markdown-body text-[var(--color-text-secondary)] text-xs sm:text-sm leading-relaxed">
            @if (currentQuickTips().length > 0) {
              <div class="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[var(--color-text-main)] shadow-sm">
                <div class="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-500 mb-2.5">
                  <span>💡</span>
                  <span>{{ i18n.t('game.rules.quick_start')() || '10 秒快速上手要诀' }}</span>
                </div>
                <ul class="space-y-1.5 list-none pl-0 text-xs text-[var(--color-text-secondary)]">
                  @for (tip of currentQuickTips(); track $index) {
                    <li class="flex items-start gap-2">
                      <span class="w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {{ $index + 1 }}
                      </span>
                      <span class="leading-relaxed">{{ tip }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
            <div [innerHTML]="parsedRulesHTML()"></div>
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

  static readonly QUICK_TIPS: Record<string, { zh: string[]; en: string[] }> = {
    tents: {
      zh: [
        '每棵树必须且仅能绑定一顶相邻（上下左右）的帐篷',
        '两顶帐篷之间绝不能相邻，包括对角线也不能挨着',
        '网格边沿的数字代表该行或该列必须包含的帐篷总数'
      ],
      en: [
        'Each tree must be paired with exactly one tent horizontally or vertically adjacent',
        'Tents never touch each other, not even diagonally',
        'Numbers along the edges indicate how many tents are in that row or column'
      ]
    },
    hashi: {
      zh: [
        '岛上的数字代表与该岛连接的桥梁总数',
        '桥梁只能横向或纵向延伸，且不能与其他桥梁交叉',
        '两个岛之间最多只能连 2 座桥，所有岛屿最终必须连通为一体'
      ],
      en: [
        'The number on an island shows how many bridges connect to it',
        'Bridges run horizontally or vertically and never cross each other',
        'At most 2 bridges between any two islands, and all islands must be connected'
      ]
    },
    codebreaker: {
      zh: [
        '绿色指示符代表颜色与位置完全正确',
        '黄色指示符代表颜色存在但位置不对',
        '灰色代表该颜色不在目标密码组合中'
      ],
      en: [
        'Green indicator: color and position are both correct',
        'Yellow indicator: color is in the code but wrong position',
        'Gray indicator: color is not in the secret code'
      ]
    },
    nonogram: {
      zh: [
        '行和列两侧的数字代表该行/列连续涂黑方块的长度',
        '多个连续数字之间必须至少由一个空白格隔开',
        '右键或长按可标记叉号（确定为空白），排除不可能的格子'
      ],
      en: [
        'Numbers indicate lengths of consecutive shaded blocks in that line',
        'Multiple numbers must have at least one empty cell between them',
        'Use cross markers (right-click / toggle) to eliminate impossible cells'
      ]
    },
    watersort: {
      zh: [
        '只能将同一种颜色的水倒入同色水上方，或倒入空试管中',
        '目标试管必须有足够的剩余空间容纳倒入的水',
        '所有试管中的颜色全部归类纯净即获胜'
      ],
      en: [
        'You can only pour water onto the same color or into an empty tube',
        'The destination tube must have enough room for the poured liquid',
        'Sort all colors so each tube contains only one color to win'
      ]
    },
    minesweeper: {
      zh: [
        '数字代表该格子周围九宫格范围内的地雷总数',
        '善用标记模式插旗锁定确定的地雷位置',
        '数字周围插旗数等于该数字时，双击数字可自动翻开剩余安全格'
      ],
      en: [
        'A number indicates how many mines are hidden in the 8 adjacent cells',
        'Use flag mode to lock known mine positions safely',
        'Chording: clicking a satisfied number automatically reveals remaining safe cells'
      ]
    },
    sudoku: {
      zh: [
        '每一行、每一列必须包含数字 1 到 9 且不重复',
        '每个 3×3 的粗线宫格内也必须包含 1 到 9 且不重复',
        '优先观察出现次数最多的数字或候选数最少的格子'
      ],
      en: [
        'Every row and column must contain digits 1 to 9 without repeats',
        'Each 3x3 block must also contain digits 1 to 9 without duplicates',
        'Focus first on digits that appear most frequently or cells with few candidates'
      ]
    },
    block: {
      zh: [
        '将底部手牌方块拖入 8×8 棋盘中填满整行或整列进行消除',
        '尽可能同时消除多行/多列触发连击（COMBO）获取高倍得分',
        '棋盘无法再放入当前 3 张手牌中的任意一张时游戏结束，善用换一组道具'
      ],
      en: [
        'Drag hand shapes into the 8x8 grid to fill full rows or columns to clear',
        'Clear multiple lines simultaneously to trigger combos for huge score multipliers',
        'Game over when no pieces can fit; use the swap button when stuck'
      ]
    },
    hexa: {
      zh: [
        '将不同角度的蜂巢方块放入六角棋盘中',
        '沿六边形的三个方向（横向、左斜、右斜）连成整行即可消除',
        '预留中间开阔区域，避免大块手牌无处落子'
      ],
      en: [
        'Place poly-hex pieces onto the hexagonal grid',
        'Full lines along any of the 3 directions will be cleared',
        'Keep the center open to fit larger upcoming pieces'
      ]
    }
  };

  readonly currentQuickTips = computed(() => {
    const tips = GameRulesModalComponent.QUICK_TIPS[this.gameId];
    if (!tips) return [];
    return this.i18n.currentLang() === 'zh' ? tips.zh : tips.en;
  });

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
