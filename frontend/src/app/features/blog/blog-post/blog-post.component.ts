import { Component, inject, OnInit, signal, SecurityContext, computed, effect, untracked, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeHtml, Title, Meta } from '@angular/platform-browser';
import { BlogService, BlogPostMeta, BlogLanguageMeta } from '../../../core/services/blog.service';
import { I18nService, LANG_LOCALES } from '../../../core/i18n/i18n.service';
import { marked } from 'marked';

const PROD_ORIGIN = 'https://www.puzzlepk.com';
const DEFAULT_POST_SLUG = 'tilematch-strategy';

export interface BlogGameDef {
  id: string;
  nameKey: string;
  icon: string;
}

export interface BlogCategoryDef {
  id: string;
  icon: string;
  titleKey: string;
  defaultTitle: string;
  postIds: string[];
}

export interface BlogCategoryWithPosts extends BlogCategoryDef {
  posts: BlogPostMeta[];
}

const BLOG_TO_GAME_MAP: Record<string, BlogGameDef> = {
  'tilematch-strategy': { id: 'tilematch', nameKey: 'lobby.tilematch', icon: '🐑' },
  'tents-puzzle-guide': { id: 'tents', nameKey: 'lobby.tents', icon: '⛺' },
  'connect-colors-strategy': { id: 'connect', nameKey: 'lobby.connect', icon: '🟢' },
  'idiom-battle-strategy': { id: 'idiom', nameKey: 'lobby.idiom', icon: '📜' },
  'gomoku-strategy-guide': { id: 'gomoku', nameKey: 'lobby.gomoku', icon: '⚪' },
  'nonogram-strategy': { id: 'nonogram', nameKey: 'lobby.nonogram', icon: '🎨' },
  'water-sort-puzzle-guide': { id: 'watersort', nameKey: 'lobby.watersort', icon: '🧪' },
  'tetris-battle-strategy': { id: 'tetris', nameKey: 'lobby.tetris', icon: '🧱' },
  'sokoban-strategy': { id: 'sokoban', nameKey: 'lobby.sokoban', icon: '📦' },
  'minesweeper-logic': { id: 'minesweeper', nameKey: 'lobby.minesweeper', icon: '💣' },
  '1a2b-bulls-cows': { id: 'codebreaker', nameKey: 'lobby.codebreaker', icon: '🐮' },
  'sudoku-benefits': { id: 'sudoku', nameKey: 'lobby.sudoku', icon: '🔢' },
  'why-math24-is-the-best-brain-training-game-for-kids': { id: 'math24', nameKey: 'lobby.math24', icon: '➗' },
  'sudoku-for-kids-a-beginners-guide': { id: 'sudoku', nameKey: 'lobby.sudoku', icon: '✏️' },
  'benefits-of-multiplayer-educational-games': { id: 'lobby', nameKey: 'nav.lobby', icon: '🏆' },
  'block-puzzle-strategy': { id: 'block', nameKey: 'lobby.block', icon: '🧩' },
  'classic2048-strategy': { id: 'classic2048', nameKey: 'lobby.classic2048', icon: '🔢' },
  'hashi-bridges-strategy': { id: 'hashi', nameKey: 'lobby.hashi', icon: '🌉' },
  'hexa-puzzle-strategy': { id: 'hexa', nameKey: 'lobby.hexa', icon: '⬡' },
  'lights-out-puzzle-guide': { id: 'lightsout', nameKey: 'lobby.lightsout', icon: '💡' },
  'sliding-puzzle-strategy': { id: 'sliding', nameKey: 'lobby.sliding', icon: '🔲' },
};

const BLOG_ICON_MAP: Record<string, string> = {
  'tilematch-strategy': '🐑',
  'tents-puzzle-guide': '⛺',
  'connect-colors-strategy': '🟢',
  'idiom-battle-strategy': '📜',
  'gomoku-strategy-guide': '⚪',
  'nonogram-strategy': '🎨',
  'water-sort-puzzle-guide': '🧪',
  'tetris-battle-strategy': '🧱',
  'sokoban-strategy': '📦',
  'minesweeper-logic': '💣',
  '1a2b-bulls-cows': '🐮',
  'sudoku-benefits': '🔢',
  'why-math24-is-the-best-brain-training-game-for-kids': '➗',
  'sudoku-for-kids-a-beginners-guide': '✏️',
  'benefits-of-multiplayer-educational-games': '🏆',
  'block-puzzle-strategy': '🧩',
  'classic2048-strategy': '🔢',
  'hashi-bridges-strategy': '🌉',
  'hexa-puzzle-strategy': '⬡',
  'lights-out-puzzle-guide': '💡',
  'sliding-puzzle-strategy': '🔲',
};

const BLOG_CATEGORIES: BlogCategoryDef[] = [
  {
    id: 'featured',
    icon: '🔥',
    titleKey: 'blog.cat.featured',
    defaultTitle: '热门通关秘籍',
    postIds: [
      'tilematch-strategy',
      'minesweeper-logic',
      'sliding-puzzle-strategy',
      'idiom-battle-strategy',
      'water-sort-puzzle-guide'
    ]
  },
  {
    id: 'logic',
    icon: '🧩',
    titleKey: 'blog.cat.logic',
    defaultTitle: '空间拓扑与连线',
    postIds: [
      'tents-puzzle-guide',
      'connect-colors-strategy',
      'hashi-bridges-strategy',
      'nonogram-strategy',
      'sokoban-strategy',
      'lights-out-puzzle-guide'
    ]
  },
  {
    id: 'math',
    icon: '🔢',
    titleKey: 'blog.cat.math',
    defaultTitle: '数字与逻辑计算',
    postIds: [
      'sudoku-benefits',
      'sudoku-for-kids-a-beginners-guide',
      'why-math24-is-the-best-brain-training-game-for-kids',
      'classic2048-strategy'
    ]
  },
  {
    id: 'board',
    icon: '⚔️',
    titleKey: 'blog.cat.board',
    defaultTitle: '棋盘与消除对战',
    postIds: [
      'gomoku-strategy-guide',
      'tetris-battle-strategy',
      'block-puzzle-strategy',
      'hexa-puzzle-strategy',
      '1a2b-bulls-cows',
      'benefits-of-multiplayer-educational-games'
    ]
  }
];

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] text-[var(--color-text-main)] py-4 sm:py-8">
      
      <!-- Mobile Drawer Overlay -->
      @if (isMobileMenuOpen()) {
        <div class="fixed inset-0 bg-black/50 z-40 lg:hidden" (click)="isMobileMenuOpen.set(false)"></div>
      }

      <div class="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-6 items-start relative">
        
        <!-- Left Sidebar (Strategy Guides Navigation) -->
        <aside class="fixed inset-y-0 left-0 pt-16 z-50 w-72 sm:w-80 bg-[var(--color-bg-card)] border-r border-[var(--color-border-card)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:pt-0 lg:z-auto lg:w-80 lg:shrink-0 lg:rounded-2xl lg:border lg:border-[var(--color-border-card)] lg:shadow-sm lg:sticky lg:top-20 flex flex-col max-h-[calc(100vh-5rem)]"
               [class.-translate-x-full]="!isMobileMenuOpen()"
               [class.translate-x-0]="isMobileMenuOpen()">
          
          <div class="p-3.5 flex flex-col gap-3 h-full overflow-y-auto">
            
            <!-- Sidebar Header -->
            <div class="px-2 pb-3 border-b border-[var(--color-border-card)] flex items-center justify-between">
              <div>
                <h2 class="text-base font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
                  <span class="text-lg">📝</span>
                  <span>{{ i18n.t('blog.sidebar_title')() || '解谜攻略目录' }}</span>
                </h2>
                <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {{ i18n.t('blog.sidebar_subtitle')() || '21篇通关攻略与胜率秘籍' }}
                </p>
              </div>
              <button class="lg:hidden p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer" 
                      (click)="isMobileMenuOpen.set(false)"
                      aria-label="Close menu">✕</button>
            </div>

            <!-- Instant Search Input -->
            <div class="px-1">
              <div class="relative">
                <input type="text"
                       [value]="searchQuery()"
                       (input)="onSearchInput($event)"
                       [placeholder]="i18n.t('blog.search_placeholder')() || '搜索攻略、技巧或游戏...'"
                       class="w-full px-3 py-2 pl-8 text-xs rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-from)] transition-all" />
                <svg class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                @if (searchQuery()) {
                  <button (click)="clearSearch()" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">✕</button>
                }
              </div>
            </div>

            <!-- Category Accordion Navigation -->
            <div class="flex flex-col gap-2.5 flex-1">
              @for (cat of filteredCategories(); track cat.id) {
                <div class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]/40 overflow-hidden transition-all">
                  
                  <!-- Category Header Toggle -->
                  <button type="button"
                          (click)="toggleCategory(cat.id)"
                          class="w-full px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer select-none">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-base shrink-0">{{ cat.icon }}</span>
                      <span class="truncate">{{ i18n.t(cat.titleKey)() || cat.defaultTitle }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0 ml-1.5">
                      <span class="px-2 py-0.5 text-[11px] rounded-full bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border-card)] font-mono font-medium">
                        {{ cat.posts.length }}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" 
                           class="w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-200"
                           [class.rotate-180]="isCategoryExpanded(cat.id)"
                           viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </button>

                  <!-- Category Posts -->
                  @if (isCategoryExpanded(cat.id)) {
                    <div class="px-1.5 pb-2 pt-1 flex flex-col gap-1 border-t border-[var(--color-border-card)]/50">
                      @for (post of cat.posts; track post.id) {
                        @let pMeta = getPostDisplayMeta(post);
                        <a [routerLink]="['/', i18n.currentLang(), 'blog', post.id]"
                           (click)="onSelectPost()"
                           class="px-2.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between group"
                           [class.bg-[var(--color-accent-from)]/15]="currentId() === post.id"
                           [class.text-[var(--color-accent-from)]]="currentId() === post.id"
                           [class.font-bold]="currentId() === post.id"
                           [class.text-[var(--color-text-secondary)]]="currentId() !== post.id"
                           [class.hover:bg-[var(--color-bg-card)]]="currentId() !== post.id"
                           [class.hover:text-[var(--color-text-primary)]]="currentId() !== post.id">
                          <div class="flex items-center gap-2 min-w-0 pr-1">
                            <span class="text-sm shrink-0">{{ getPostIcon(post.id) }}</span>
                            <span class="truncate leading-tight">{{ pMeta.title }}</span>
                          </div>
                          @if (currentId() === post.id) {
                            <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-from)] shrink-0"></span>
                          }
                        </a>
                      }
                    </div>
                  }
                </div>
              }

              @if (filteredCategories().length === 0) {
                <div class="text-center py-8 text-xs text-[var(--color-text-muted)]">
                  {{ i18n.t('blog.no_search_results')() || '未找到匹配的攻略文章' }}
                </div>
              }
            </div>

          </div>
        </aside>

        <!-- Right Main Column: Full Article Content (Aligned with Docs style) -->
        <main class="flex-1 min-w-0 w-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-5 sm:p-8 lg:p-10 shadow-sm relative">
          
          <!-- Mobile Header (Quick Drawer Opener) -->
          <div class="lg:hidden mb-6 pb-4 border-b border-[var(--color-border-card)] flex items-center justify-between">
            <button (click)="isMobileMenuOpen.set(true)" 
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-xs sm:text-sm font-bold text-[var(--color-text-primary)] cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>{{ i18n.t('blog.mobile_menu_btn')() || '展开攻略目录' }}</span>
            </button>
            <span class="text-xs font-bold text-[var(--color-text-muted)] truncate max-w-[180px]">
              {{ displayMeta()?.title }}
            </span>
          </div>

          @if (loading()) {
            <div class="flex flex-col items-center justify-center py-24 gap-4">
              <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-xs text-[var(--color-text-secondary)]">加载攻略中...</p>
            </div>
          } @else if (error()) {
            <div class="text-center py-20 text-red-400 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-2xl p-8 max-w-xl mx-auto shadow-sm">
              <h2 class="text-xl font-black mb-2">{{ i18n.t('blog.not_found_title')() || '文章未找到' }}</h2>
              <p class="text-xs sm:text-sm text-[var(--color-text-secondary)]">{{ i18n.t('blog.not_found_desc')() || '您要寻找的文章不存在或已被删除。' }}</p>
            </div>
          } @else {
            <article class="w-full">
              
              <!-- Article Header -->
              <header class="border-b border-[var(--color-border-card)] pb-6 mb-8">
                <div class="flex flex-wrap items-center gap-2 mb-4">
                  @for (tag of displayMeta()?.tags; track tag) {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-accent-from)]/10 text-[var(--color-accent-from)] border border-[var(--color-accent-from)]/20">
                      {{ tag }}
                    </span>
                  }
                  @if (relatedGame(); as game) {
                    <a [routerLink]="['/', i18n.currentLang(), 'games', game.id]"
                       class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-bg-main)] text-[var(--color-text-secondary)] border border-[var(--color-border-card)] hover:text-[var(--color-accent-from)] hover:border-[var(--color-accent-from)]/40 transition-colors">
                      <span>{{ game.icon }}</span>
                      <span>{{ i18n.t(game.nameKey)() }}</span>
                    </a>
                  }
                </div>
                
                <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-transparent bg-clip-text mb-4 leading-tight"
                    style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                  {{ displayMeta()?.title }}
                </h1>

                <p class="text-sm sm:text-base text-[var(--color-text-secondary)] mb-5 leading-relaxed">
                  {{ displayMeta()?.description }}
                </p>

                <div class="flex flex-wrap items-center text-xs text-[var(--color-text-secondary)] gap-4 sm:gap-6 pt-2 border-t border-[var(--color-border-card)]/60">
                  <span class="flex items-center gap-1.5 font-semibold text-[var(--color-text-main)]">
                    <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white flex items-center justify-center text-[10px] font-black">
                      PK
                    </div>
                    {{ displayMeta()?.author }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    {{ rawMeta()?.date }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {{ displayMeta()?.readTime }}
                  </span>
                </div>
              </header>

              <!-- Markdown Rendered Prose Body -->
              <div class="prose prose-invert prose-emerald max-w-none text-sm sm:text-base leading-relaxed" 
                   [innerHTML]="contentHtml()">
              </div>

              <!-- Interactive Arena & Practice Gateway -->
              @if (relatedGame(); as game) {
                <div class="mt-12 p-6 sm:p-8 rounded-2xl border border-[var(--color-accent-from)]/30 bg-gradient-to-br from-[var(--color-accent-from)]/10 via-[var(--color-bg-card)] to-[var(--color-bg-main)] shadow-sm">
                  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-3.5">
                      <div class="text-3xl sm:text-4xl shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] flex items-center justify-center shadow-inner">
                        {{ game.icon }}
                      </div>
                      <div>
                        <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--color-accent-from)]/15 text-[var(--color-accent-from)] border border-[var(--color-accent-from)]/30 uppercase tracking-wide">
                          <span>🎯</span>
                          <span>{{ i18n.t('blog.interactive_practice_badge')() }}</span>
                        </div>
                        <h3 class="text-base sm:text-lg font-black text-[var(--color-text-main)] mt-0.5">
                          {{ i18n.t(game.nameKey)() }}
                        </h3>
                        <p class="text-xs text-[var(--color-text-secondary)] mt-0.5 max-w-md">
                          {{ i18n.t('blog.interactive_practice_desc')() }}
                        </p>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
                      <a [routerLink]="game.id === 'lobby' ? ['/', i18n.currentLang(), 'lobby'] : ['/', i18n.currentLang(), 'games', game.id]"
                         class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] shadow-md hover:opacity-95 active:scale-95 transition-all">
                        <span>🕹️</span>
                        <span>{{ i18n.t('blog.cta_play_solo')() }}</span>
                      </a>
                      @if (game.id !== 'lobby') {
                        <a [routerLink]="['/', i18n.currentLang(), 'pk-arena']"
                           [queryParams]="{ game: game.id }"
                           class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] hover:border-[var(--color-accent-from)]/50 active:scale-95 transition-all">
                          <span>⚔️</span>
                          <span>{{ i18n.t('blog.cta_play_pk')() }}</span>
                        </a>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- Team Bio (E-E-A-T Signal) -->
              <div class="mt-8 p-5 sm:p-6 rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)]">
                <div class="flex items-start gap-4">
                  <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent-from)] to-[var(--color-accent-to)] flex items-center justify-center text-sm sm:text-base font-black shrink-0 text-white shadow-xs">
                    PK
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 class="font-bold text-sm sm:text-base text-[var(--color-text-main)] mb-1">{{ displayMeta()?.author }}</h3>
                    <p class="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">{{ i18n.t('blog.author_bio')() }}</p>
                    <a [routerLink]="['/', i18n.currentLang(), 'legal', 'about']" class="inline-block mt-2.5 text-xs font-bold text-[var(--color-accent-from)] hover:underline">
                      {{ i18n.t('blog.author_more')() }} →
                    </a>
                  </div>
                </div>
              </div>

              <!-- Recommended Next Masterclasses -->
              @if (recommendedPosts().length > 0) {
                <div class="mt-10 pt-8 border-t border-[var(--color-border-card)]">
                  <div class="mb-5">
                    <h3 class="text-lg font-black text-[var(--color-text-main)] flex items-center gap-2">
                      <span>📖</span>
                      <span>{{ i18n.t('blog.related_guides_title')() }}</span>
                    </h3>
                    <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {{ i18n.t('blog.related_guides_subtitle')() }}
                    </p>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    @for (post of recommendedPosts(); track post.id) {
                      @let pMeta = getPostDisplayMeta(post);
                      <a [routerLink]="['/', i18n.currentLang(), 'blog', post.id]"
                         class="group flex flex-col justify-between p-4 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] hover:border-[var(--color-accent-from)]/40 hover:bg-[var(--color-bg-card)] transition-all shadow-xs">
                        <div>
                          <div class="flex items-center gap-2 mb-2">
                            <span class="text-base">{{ getPostIcon(post.id) }}</span>
                            <span class="text-[10px] text-[var(--color-text-secondary)] font-mono">{{ pMeta?.readTime }}</span>
                          </div>
                          <h4 class="text-xs sm:text-sm font-bold text-[var(--color-text-main)] group-hover:text-[var(--color-accent-from)] transition-colors line-clamp-2 leading-snug">
                            {{ pMeta?.title }}
                          </h4>
                        </div>
                        <div class="mt-3 flex items-center text-xs font-bold text-[var(--color-accent-from)] group-hover:translate-x-1 transition-transform">
                          <span>阅读攻略</span>
                          <svg class="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        </div>
                      </a>
                    }
                  </div>
                </div>
              }

            </article>
          }

        </main>

      </div>
    </div>
  `,
  styles: [`
    ::ng-deep .prose-invert {
      color: var(--color-text-secondary);
    }
    ::ng-deep .prose-invert h1, 
    ::ng-deep .prose-invert h2, 
    ::ng-deep .prose-invert h3, 
    ::ng-deep .prose-invert h4 {
      color: var(--color-text-main);
      font-weight: 800;
      margin-top: 1.8em;
      margin-bottom: 0.8em;
      letter-spacing: -0.01em;
    }
    ::ng-deep .prose-invert h2 {
      border-bottom: 1px solid var(--color-border-card);
      padding-bottom: 0.3em;
    }
    ::ng-deep .prose-invert p {
      margin-top: 1em;
      margin-bottom: 1em;
      line-height: 1.8;
    }
    ::ng-deep .prose-invert a {
      color: var(--color-accent-from);
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    ::ng-deep .prose-invert strong {
      color: var(--color-text-main);
    }
    ::ng-deep .prose-invert ul {
      list-style-type: disc;
      padding-left: 1.5em;
      margin-top: 1em;
      margin-bottom: 1em;
    }
    ::ng-deep .prose-invert li {
      margin-top: 0.4em;
      margin-bottom: 0.4em;
    }
    ::ng-deep .prose-invert blockquote {
      border-left-width: 4px;
      border-left-color: var(--color-accent-from);
      background: var(--color-bg-main);
      padding: 0.8em 1em;
      border-radius: 0 0.75rem 0.75rem 0;
      margin: 1.2em 0;
      font-style: normal;
      color: var(--color-text-main);
    }
    ::ng-deep .prose-invert code {
      color: var(--color-accent-from);
      background-color: var(--color-bg-main);
      padding: 0.2em 0.4em;
      border-radius: 0.375rem;
      border: 1px solid var(--color-border-card);
      font-size: 0.875em;
    }
    ::ng-deep .prose-invert hr {
      border-color: var(--color-border-card);
      margin: 2em 0;
    }
  `]
})
export class BlogPostComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogService = inject(BlogService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private sanitizer = inject(DomSanitizer);
  private doc = inject(DOCUMENT);
  i18n = inject(I18nService);

  readonly categories = BLOG_CATEGORIES;
  expandedCategories = signal<Record<string, boolean>>({
    'featured': true,
    'logic': true,
    'math': false,
    'board': false,
    'more': false
  });

  isMobileMenuOpen = signal(false);
  searchQuery = signal<string>('');

  rawMeta = signal<BlogPostMeta | null>(null);
  allPosts = signal<BlogPostMeta[]>([]);
  currentId = signal<string | null>(null);

  loading = signal(true);
  error = signal(false);
  contentHtml = signal<SafeHtml>('');

  displayMeta = computed(() => {
    const raw = this.rawMeta();
    if (!raw) return null;
    const lang = this.i18n.currentLang() as keyof BlogPostMeta;
    return (raw[lang] as BlogLanguageMeta) || raw.en;
  });

  relatedGame = computed<BlogGameDef | null>(() => {
    const slug = this.currentId();
    if (slug && BLOG_TO_GAME_MAP[slug]) {
      return BLOG_TO_GAME_MAP[slug];
    }
    const raw = this.rawMeta();
    if (raw?.relatedGameId) {
      return { id: raw.relatedGameId, nameKey: `lobby.${raw.relatedGameId}`, icon: '🎮' };
    }
    return null;
  });

  recommendedPosts = computed<BlogPostMeta[]>(() => {
    const current = this.currentId();
    return this.allPosts()
      .filter(p => p.id !== current)
      .slice(0, 3);
  });

  // Categorized posts computed
  categoriesWithPosts = computed<BlogCategoryWithPosts[]>(() => {
    const posts = this.allPosts();
    const postMap = new Map(posts.map(p => [p.id, p]));
    const categorizedIds = new Set<string>();

    const result: BlogCategoryWithPosts[] = this.categories.map(cat => {
      const catPosts: BlogPostMeta[] = [];
      for (const pid of cat.postIds) {
        const p = postMap.get(pid);
        if (p) {
          catPosts.push(p);
          categorizedIds.add(pid);
        }
      }
      return {
        ...cat,
        posts: catPosts
      };
    }).filter(c => c.posts.length > 0);

    const remainingPosts = posts.filter(p => !categorizedIds.has(p.id));
    if (remainingPosts.length > 0) {
      result.push({
        id: 'more',
        icon: '🎮',
        titleKey: 'blog.cat.more',
        defaultTitle: '更多解谜指南',
        postIds: remainingPosts.map(p => p.id),
        posts: remainingPosts
      });
    }

    return result;
  });

  // Filtered categories based on instant search query
  filteredCategories = computed<BlogCategoryWithPosts[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cats = this.categoriesWithPosts();
    if (!q) return cats;

    return cats.map(cat => {
      const matchingPosts = cat.posts.filter(p => {
        const meta = this.getPostDisplayMeta(p);
        const titleMatch = meta.title?.toLowerCase().includes(q);
        const descMatch = meta.description?.toLowerCase().includes(q);
        const tagMatch = meta.tags?.some(t => t.toLowerCase().includes(q));
        const slugMatch = p.id.toLowerCase().includes(q);
        return titleMatch || descMatch || tagMatch || slugMatch;
      });
      return {
        ...cat,
        posts: matchingPosts
      };
    }).filter(c => c.posts.length > 0);
  });

  constructor() {
    // Re-render content + SEO when language or loaded post changes
    effect(() => {
      const lang = this.i18n.currentLang();
      const meta = this.displayMeta();
      const raw = this.rawMeta();

      if (!meta || !raw) return;

      untracked(() => {
        this.titleService.setTitle(`${meta.title} - ${this.i18n.t('app.title')()} Blog`);
        this.metaService.updateTag({ name: 'description', content: meta.description });
        this.metaService.updateTag({ name: 'keywords', content: meta.keywords });
        this.metaService.updateTag({ property: 'og:title', content: `${meta.title} - ${this.i18n.t('app.title')()} Blog` });
        this.metaService.updateTag({ property: 'og:description', content: meta.description });

        const origin = (typeof window !== 'undefined' && window.location?.origin) || PROD_ORIGIN;
        const coverImg = raw.cover_image ? raw.cover_image : `${origin}/og-cover.png`;
        this.metaService.updateTag({ property: 'og:image', content: coverImg });
        this.setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: meta.title,
          description: meta.description,
          author: { '@type': 'Organization', name: meta.author || 'Puzzle PK Team' },
          publisher: { '@type': 'Organization', name: this.i18n.t('app.title')(), logo: { '@type': 'ImageObject', url: `${origin}/assets/icons/icon-192x192.png` } },
          datePublished: raw.date,
          dateModified: raw.date,
          url: `${origin}/${lang}/blog/${raw.id}`,
          mainEntityOfPage: { '@type': 'WebPage', '@id': `${origin}/${lang}/blog/${raw.id}` },
          keywords: meta.keywords,
          image: raw.cover_image || `${origin}/og-cover.png`,
          inLanguage: LANG_LOCALES[lang],
        });

        const markdownStr = meta.content ?? '';
        const rawHtml = marked.parse(markdownStr) as string;
        const safeHtml = this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) || '';
        this.contentHtml.set(safeHtml);
        this.loading.set(false);
      });
    });

    // Auto expand the category holding the current active post
    effect(() => {
      const currentId = this.currentId();
      const categories = this.categoriesWithPosts();
      if (currentId) {
        const found = categories.find(c => c.posts.some(p => p.id === currentId));
        if (found) {
          this.expandedCategories.update(state => ({
            ...state,
            [found.id]: true
          }));
        }
      }
    });
  }

  ngOnInit() {
    // 1. Load blog post list first
    this.blogService.getBlogPosts().subscribe({
      next: (posts) => {
        const list = posts || [];
        this.allPosts.set(list);

        // 2. Listen to route param
        this.route.paramMap.subscribe(params => {
          const slug = params.get('id');
          if (slug) {
            this.currentId.set(slug);
            this.loadPost(slug);
          } else {
            // If on /blog without :id, default to the first post or DEFAULT_POST_SLUG
            const fallbackSlug = list[0]?.id || DEFAULT_POST_SLUG;
            this.currentId.set(fallbackSlug);
            this.loadPost(fallbackSlug);
          }

          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      },
      error: () => {
        this.route.paramMap.subscribe(params => {
          const slug = params.get('id') || DEFAULT_POST_SLUG;
          this.currentId.set(slug);
          this.loadPost(slug);
        });
      }
    });
  }

  onSelectPost() {
    this.isMobileMenuOpen.set(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggleCategory(catId: string) {
    this.expandedCategories.update(state => ({
      ...state,
      [catId]: !state[catId]
    }));
  }

  isCategoryExpanded(catId: string): boolean {
    if (this.searchQuery().trim()) {
      return true; // Auto expand all categories during active search
    }
    return !!this.expandedCategories()[catId];
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  getPostDisplayMeta(post: BlogPostMeta): BlogLanguageMeta {
    const lang = this.i18n.currentLang() as keyof BlogPostMeta;
    return (post[lang] as BlogLanguageMeta) || post.en;
  }

  getPostIcon(postId: string): string {
    return BLOG_ICON_MAP[postId] || '📄';
  }

  private setJsonLd(data: Record<string, unknown>): void {
    const head = this.doc.head;
    if (!head) return;
    const elemId = 'blog-post-jsonld';
    let script = head.querySelector(`#${elemId}`) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.id = elemId;
      script.type = 'application/ld+json';
      head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  private loadPost(slug: string) {
    this.loading.set(true);
    this.error.set(false);

    this.blogService.getBlogPost(slug).subscribe({
      next: (post) => {
        this.rawMeta.set(post);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
