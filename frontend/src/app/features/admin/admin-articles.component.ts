import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  ContentService, ContentCategory, ContentCategoryInput,
  ContentArticleMeta, ContentArticleFull, ContentArticleInput,
  ContentDistributionRecord,
} from '../../core/services/content.service';
import { PlatformFormatterService, PlatformId, FormattablePost } from '../../core/services/platform-formatter.service';
import { PlatformDistribPanelComponent } from './platform-distrib-panel.component';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../core/i18n/i18n.service';

type ArticleEditTab = 'meta' | 'content_zh' | 'content_en';

interface FlatCatNode { cat: ContentCategory; depth: number; }

interface CatFormData {
  slug: string; name_zh: string; name_en: string;
  desc_zh: string; desc_en: string;
  parent_id: number | null; sort_order: number;
}

interface ArticleFormData {
  slug: string; category_id: number | null;
  title_en: string; title_zh: string;
  desc_en: string;  desc_zh: string;
  content_en: string; content_zh: string;
  tags_en_str: string; tags_zh_str: string;
  author_en: string; author_zh: string;
  source_url: string;
  published: boolean; sort_order: number; date: string;
}

// JSON import format — category_slug is optional (resolved to category_id at import time)
interface ImportArticleItem {
  slug: string;
  category_id?: number | null;
  category_slug?: string;
  title_zh: string; title_en?: string;
  desc_zh?: string; desc_en?: string;
  content_zh?: string; content_en?: string;
  tags_zh?: string[]; tags_en?: string[];
  author_zh?: string; author_en?: string;
  source_url?: string;
  published?: boolean;
  sort_order?: number;
  date?: string;
}

interface ImportProgress { done: number; total: number; errors: string[]; }

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  if (!ok) throw new Error('execCommand copy failed');
}

@Component({
  selector: 'app-admin-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, PlatformDistribPanelComponent],
  template: `
    <div class="space-y-4 h-full flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between flex-shrink-0 gap-3 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold">📣 {{ i18n.t('admin.articles.title')() }}</h2>
          <p class="text-[var(--color-text-muted)] mt-1 text-sm">{{ i18n.t('admin.articles.subtitle')() }}</p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Download template -->
          <button (click)="downloadTemplate()"
            class="px-4 py-2.5 rounded-xl border border-[var(--color-border-card)] text-sm font-medium hover:bg-[var(--color-bg-main)]/50 transition-colors flex items-center gap-2">
            ⬇️ 下载模板
          </button>
          <!-- Import JSON -->
          <label for="art-import-file"
            class="px-4 py-2.5 rounded-xl border border-cyan-500/40 text-cyan-400 text-sm font-medium hover:bg-cyan-500/10 transition-colors cursor-pointer flex items-center gap-2">
            📥 导入文章
          </label>
          <input id="art-import-file" type="file" accept=".json" multiple class="hidden" (change)="onFileChange($event)">
          <!-- New Article -->
          <button (click)="openCreateArticle()"
            class="px-5 py-2.5 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center gap-2 text-sm">
            ＋ {{ i18n.t('admin.articles.add')() }}
          </button>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="flex gap-4 flex-1 min-h-0">

        <!-- Left: Category Tree -->
        <div class="w-56 flex-shrink-0 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] flex flex-col overflow-hidden">
          <div class="p-3 border-b border-[var(--color-border-card)] flex-shrink-0">
            <span class="text-xs font-bold uppercase tracking-widest opacity-50">分类</span>
          </div>
          <div class="flex-1 overflow-y-auto py-2">
            <button (click)="selectedCategoryId.set(null)"
              class="w-full text-left px-3 py-2 text-sm transition-colors rounded-lg mx-1"
              [class]="selectedCategoryId() === null ? 'bg-[var(--color-accent-from)]/20 text-[var(--color-accent-from)] font-bold' : 'hover:bg-[var(--color-bg-main)]/50'">
              📁 {{ i18n.t('admin.articles.all_categories')() }}
            </button>
            @for (node of categoryFlat(); track node.cat.id) {
              <div class="flex items-center group" [style.paddingLeft.px]="12 + node.depth * 16">
                <button (click)="selectedCategoryId.set(node.cat.id)"
                  class="flex-1 text-left py-1.5 pr-2 text-sm transition-colors rounded-lg"
                  [class]="selectedCategoryId() === node.cat.id ? 'text-[var(--color-accent-from)] font-bold' : 'hover:text-[var(--color-text-main)] opacity-80'">
                  {{ node.depth > 0 ? '└ ' : '' }}📂 {{ node.cat.name_zh || node.cat.name_en }}
                </button>
                <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pr-2">
                  <button (click)="openEditCategory(node.cat)" title="编辑" class="p-1 hover:bg-[var(--color-bg-main)] rounded text-xs">✏️</button>
                  <button (click)="deleteCategory(node.cat)" title="删除" class="p-1 hover:bg-rose-500/20 rounded text-xs">🗑️</button>
                </div>
              </div>
            }
          </div>
          <div class="p-3 border-t border-[var(--color-border-card)] flex-shrink-0">
            <button (click)="openCreateCategory(null)" class="w-full py-2 text-xs font-bold border border-dashed border-[var(--color-border-card)] rounded-xl hover:border-[var(--color-accent-from)] hover:text-[var(--color-accent-from)] transition-colors">
              ＋ {{ i18n.t('admin.articles.new_category')() }}
            </button>
          </div>
        </div>

        <!-- Right: Article Table -->
        <div class="flex-1 min-w-0 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] overflow-hidden flex flex-col">
          <div class="overflow-y-auto flex-1">
            <table class="w-full text-left border-collapse text-sm">
              <thead class="sticky top-0 bg-[var(--color-bg-card)] z-10">
                <tr class="bg-[var(--color-bg-main)]/60 border-b border-[var(--color-border-card)]">
                  <th class="py-3 px-4 opacity-60 uppercase text-xs tracking-wider">{{ i18n.t('admin.articles.col.title')() }}</th>
                  <th class="py-3 px-4 w-32 opacity-60 uppercase text-xs tracking-wider hidden md:table-cell">{{ i18n.t('admin.articles.col.category')() }}</th>
                  <th class="py-3 px-4 w-28 opacity-60 uppercase text-xs tracking-wider hidden sm:table-cell">{{ i18n.t('admin.articles.col.date')() }}</th>
                  <th class="py-3 px-4 w-24 opacity-60 uppercase text-xs tracking-wider">{{ i18n.t('admin.articles.col.status')() }}</th>
                  <th class="py-3 px-4 w-36 opacity-60 uppercase text-xs tracking-wider text-right">{{ i18n.t('admin.articles.col.actions')() }}</th>
                </tr>
              </thead>
              <tbody>
                @for (art of filteredArticles(); track art.id) {
                  <tr class="border-b border-[var(--color-border-card)]/30 transition-colors group cursor-pointer select-none"
                      [class.border-b-0]="distribOpenId() === art.id"
                      [class.bg-cyan-500/5]="distribOpenId() === art.id"
                      (click)="toggleDistrib(art)">
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-1.5">
                        <div class="font-medium truncate max-w-xs">{{ art.title_zh || art.title_en }}</div>
                        <button (click)="copyTitle(art, 'zh'); $event.stopPropagation()" title="复制中文标题"
                          class="flex-shrink-0 px-1.5 py-0.5 text-xs rounded border transition-colors opacity-0 group-hover:opacity-100"
                          [class]="titleCopyKey() === art.id + '_zh'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'border-[var(--color-border-card)] text-[var(--color-text-muted)] hover:bg-violet-500/20 hover:text-violet-400 hover:border-violet-500/40'">
                          {{ titleCopyKey() === art.id + '_zh' ? '✓' : 'ZH' }}
                        </button>
                        <button (click)="copyTitle(art, 'en'); $event.stopPropagation()" title="复制英文标题"
                          class="flex-shrink-0 px-1.5 py-0.5 text-xs rounded border transition-colors opacity-0 group-hover:opacity-100"
                          [class]="titleCopyKey() === art.id + '_en'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'border-[var(--color-border-card)] text-[var(--color-text-muted)] hover:bg-violet-500/20 hover:text-violet-400 hover:border-violet-500/40'">
                          {{ titleCopyKey() === art.id + '_en' ? '✓' : 'EN' }}
                        </button>
                      </div>
                      <div class="text-[var(--color-text-muted)] text-xs mt-0.5 truncate max-w-xs">{{ art.title_en }}</div>
                      <div class="font-mono text-xs text-blue-400 opacity-60 mt-0.5">{{ art.slug }}</div>
                    </td>
                    <td class="py-3 px-4 hidden md:table-cell">
                      <span class="text-xs px-2 py-1 bg-[var(--color-bg-main)] rounded-lg border border-[var(--color-border-card)]/50">
                        {{ categoryName(art.category_id) }}
                      </span>
                    </td>
                    <td class="py-3 px-4 font-mono text-xs opacity-70 hidden sm:table-cell">{{ art.date }}</td>
                    <td class="py-3 px-4">
                      <button (click)="toggleArticle(art); $event.stopPropagation()"
                        class="px-2.5 py-1 rounded-full text-xs font-bold border transition-colors"
                        [class]="art.published
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'">
                        {{ art.published ? '✓' : '⏸' }}
                      </button>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="text-cyan-500/60 text-xs mr-1">
                          {{ distribOpenId() === art.id ? '▲' : '▼' }}
                        </span>
                        <button (click)="openEditArticle(art); $event.stopPropagation()" title="编辑"
                          class="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors">✏️</button>
                        <button (click)="deleteArticle(art); $event.stopPropagation()" title="删除"
                          class="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors">🗑️</button>
                      </div>
                    </td>
                  </tr>

                  <!-- 手风琴：分发面板 -->
                  @if (distribOpenId() === art.id) {
                    <tr class="border-b border-[var(--color-border-card)]/50">
                      <td colspan="5" class="px-4 pb-3 pt-0">
                        <div class="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                          <app-platform-distrib-panel
                            [distribKey]="distribKey()"
                            [loading]="distribLoading()"
                            (copy)="copyArticle($event.platformId, $event.lang, $event.url)">
                          </app-platform-distrib-panel>
                          @if (!distribLoading() && distributions().length > 0) {
                            <div class="mt-2 pt-2 border-t border-cyan-500/10 flex flex-wrap gap-1.5">
                              @for (d of distributions(); track d.id) {
                                <span class="text-xs px-2 py-0.5 bg-[var(--color-bg-main)] rounded border border-[var(--color-border-card)]/50 opacity-50">
                                  {{ d.platform }}/{{ d.lang }} ×{{ d.copy_count }}
                                </span>
                              }
                            </div>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr>
                    <td colspan="5" class="py-16 text-center text-sm opacity-40 italic">
                      {{ i18n.t('admin.articles.no_articles')() }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ Import Preview Modal ============ -->
    @if (importOpen()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl w-full max-w-2xl shadow-2xl my-8">
          <div class="flex items-center justify-between p-5 border-b border-[var(--color-border-card)]">
            <div>
              <h3 class="text-lg font-bold">📥 导入文章预览</h3>
              <p class="text-xs text-[var(--color-text-muted)] mt-0.5">共 {{ importPreview().length }} 篇，按 sort_order 排序，确认后开始导入</p>
            </div>
            <button (click)="closeImport()" [disabled]="importing()" class="p-2 hover:bg-[var(--color-bg-main)]/50 rounded-lg text-lg disabled:opacity-40">✕</button>
          </div>

          <!-- Article preview list -->
          @if (!importProgress()) {
            <div class="max-h-80 overflow-y-auto divide-y divide-[var(--color-border-card)]/50">
              @for (item of importPreview(); track item.slug) {
                <div class="px-5 py-3 flex items-start gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">{{ item.title_zh || item.title_en }}</div>
                    <div class="text-xs text-[var(--color-text-muted)] truncate">{{ item.title_en }}</div>
                    <div class="flex items-center gap-3 mt-1">
                      <span class="font-mono text-xs text-blue-400 opacity-70">{{ item.slug }}</span>
                      @if (resolvedCategory(item)) {
                        <span class="text-xs px-1.5 py-0.5 bg-[var(--color-bg-main)] rounded border border-[var(--color-border-card)]/50">
                          📂 {{ resolvedCategory(item) }}
                        </span>
                      }
                    </div>
                  </div>
                  <span class="flex-shrink-0 text-xs px-2 py-1 rounded-full border"
                    [class]="item.published !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'">
                    {{ item.published !== false ? '发布' : '草稿' }}
                  </span>
                </div>
              }
            </div>
          } @else {
            <!-- Progress -->
            <div class="p-6 space-y-4">
              <div class="flex items-center justify-between text-sm">
                <span>导入进度</span>
                <span class="font-mono font-bold">{{ importProgress()!.done }} / {{ importProgress()!.total }}</span>
              </div>
              <div class="w-full bg-[var(--color-bg-main)] rounded-full h-2.5 overflow-hidden">
                <div class="h-2.5 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] rounded-full transition-all duration-300"
                  [style.width.%]="importProgress()!.total ? importProgress()!.done / importProgress()!.total * 100 : 0">
                </div>
              </div>
              @if (importProgress()!.errors.length > 0) {
                <div class="text-xs text-rose-400 space-y-1 max-h-32 overflow-y-auto">
                  @for (e of importProgress()!.errors; track e) {
                    <div>❌ {{ e }}</div>
                  }
                </div>
              }
              @if (!importing() && importProgress()!.done === importProgress()!.total) {
                <div class="text-sm font-bold"
                  [class]="importProgress()!.errors.length === 0 ? 'text-emerald-400' : 'text-amber-400'">
                  {{ importProgress()!.errors.length === 0
                    ? '✅ 全部导入成功！'
                    : '⚠️ 导入完成，' + (importProgress()!.total - importProgress()!.errors.length) + ' 成功，' + importProgress()!.errors.length + ' 失败' }}
                </div>
              }
            </div>
          }

          <div class="flex items-center justify-between gap-3 p-5 border-t border-[var(--color-border-card)]">
            <span class="text-xs text-[var(--color-text-muted)]">
              @if (importParseError()) { ⚠️ {{ importParseError() }} }
              @else { slug 重复的文章将导入失败 }
            </span>
            <div class="flex gap-2">
              <button (click)="closeImport()" [disabled]="importing()"
                class="px-4 py-2 rounded-xl border border-[var(--color-border-card)] text-sm hover:bg-[var(--color-bg-main)]/50 transition-colors disabled:opacity-40">
                {{ importing() ? '导入中...' : '关闭' }}
              </button>
              @if (!importProgress()) {
                <button (click)="runImport()" [disabled]="importing() || importPreview().length === 0"
                  class="px-5 py-2 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold text-sm hover:brightness-110 disabled:opacity-50">
                  开始导入
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ============ Category Modal ============ -->
    @if (catModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl w-full max-w-md shadow-2xl">
          <div class="flex items-center justify-between p-5 border-b border-[var(--color-border-card)]">
            <h3 class="text-lg font-bold">{{ editingCatId() ? i18n.t('admin.articles.edit_category')() : i18n.t('admin.articles.new_category')() }}</h3>
            <button (click)="closeCatModal()" class="p-2 hover:bg-[var(--color-bg-main)]/50 rounded-lg text-lg">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs opacity-50 mb-1">Slug</label>
                <input [(ngModel)]="catForm.slug" type="text" placeholder="e.g. tutorials" class="input-field w-full font-mono">
              </div>
              <div>
                <label class="block text-xs opacity-50 mb-1">名称（中文）</label>
                <input [(ngModel)]="catForm.name_zh" type="text" class="input-field w-full">
              </div>
              <div>
                <label class="block text-xs opacity-50 mb-1">Name (EN)</label>
                <input [(ngModel)]="catForm.name_en" type="text" class="input-field w-full">
              </div>
              <div>
                <label class="block text-xs opacity-50 mb-1">父分类</label>
                <select [(ngModel)]="catForm.parent_id" class="input-field w-full">
                  <option [ngValue]="null">— 根分类 —</option>
                  @for (node of categoryFlat(); track node.cat.id) {
                    @if (node.cat.id !== editingCatId()) {
                      <option [ngValue]="node.cat.id">
                        {{ '　'.repeat(node.depth) }}{{ node.cat.name_zh || node.cat.name_en }}
                      </option>
                    }
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs opacity-50 mb-1">Sort Order</label>
                <input [(ngModel)]="catForm.sort_order" type="number" class="input-field w-full">
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 p-5 border-t border-[var(--color-border-card)]">
            <button (click)="closeCatModal()" class="px-4 py-2 rounded-xl border border-[var(--color-border-card)] text-sm hover:bg-[var(--color-bg-main)]/50 transition-colors">取消</button>
            <button (click)="saveCat()" [disabled]="savingCat()"
              class="px-5 py-2 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold text-sm hover:brightness-110 disabled:opacity-50">
              @if (savingCat()) { <span class="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1"></span> }
              {{ editingCatId() ? '保存' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ============ Article Edit Modal ============ -->
    @if (artModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl w-full max-w-4xl shadow-2xl my-8">
          <div class="flex items-center justify-between p-6 border-b border-[var(--color-border-card)]">
            <h3 class="text-xl font-bold">{{ editingArtId() ? i18n.t('admin.articles.edit')() : i18n.t('admin.articles.new')() }}</h3>
            <button (click)="closeArtModal()" class="p-2 hover:bg-[var(--color-bg-main)]/50 rounded-lg text-lg">✕</button>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-[var(--color-border-card)] px-6">
            @for (tab of artTabs; track tab.id) {
              <button (click)="artTab.set(tab.id)"
                class="px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px"
                [class]="artTab() === tab.id
                  ? 'border-[var(--color-accent-from)] text-[var(--color-accent-from)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'">
                {{ tab.label }}
              </button>
            }
          </div>

          <div class="p-6 space-y-4">

            @if (artTab() === 'meta') {
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs opacity-50 mb-1">Slug</label>
                  <input [(ngModel)]="artForm.slug" type="text" class="input-field w-full font-mono" placeholder="e.g. sudoku-guide-2025">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">分类</label>
                  <select [(ngModel)]="artForm.category_id" class="input-field w-full">
                    <option [ngValue]="null">— {{ i18n.t('admin.articles.uncategorized')() }} —</option>
                    @for (node of categoryFlat(); track node.cat.id) {
                      <option [ngValue]="node.cat.id">{{ '　'.repeat(node.depth) }}{{ node.cat.name_zh || node.cat.name_en }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">日期</label>
                  <input [(ngModel)]="artForm.date" type="date" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Sort Order</label>
                  <input [(ngModel)]="artForm.sort_order" type="number" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">原文链接（可选）</label>
                  <input [(ngModel)]="artForm.source_url" type="url" class="input-field w-full" placeholder="https://...">
                </div>
                <div class="flex items-center gap-3 pt-5">
                  <input [(ngModel)]="artForm.published" type="checkbox" id="art-pub" class="w-4 h-4 rounded accent-emerald-500">
                  <label for="art-pub" class="text-sm font-medium">已发布</label>
                </div>
              </div>

              <hr class="border-[var(--color-border-card)]">
              <h4 class="font-bold text-sm opacity-70">🇨🇳 中文元数据</h4>
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="block text-xs opacity-50 mb-1">标题（中文）</label>
                  <input [(ngModel)]="artForm.title_zh" type="text" class="input-field w-full">
                </div>
                <div class="col-span-2">
                  <label class="block text-xs opacity-50 mb-1">摘要（中文）</label>
                  <textarea [(ngModel)]="artForm.desc_zh" rows="2" class="input-field w-full resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">作者（中文）</label>
                  <input [(ngModel)]="artForm.author_zh" type="text" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">标签（逗号分隔）</label>
                  <input [(ngModel)]="artForm.tags_zh_str" type="text" class="input-field w-full" placeholder="策略, 教程">
                </div>
              </div>

              <hr class="border-[var(--color-border-card)]">
              <h4 class="font-bold text-sm opacity-70">🇺🇸 English Metadata</h4>
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="block text-xs opacity-50 mb-1">Title (EN)</label>
                  <input [(ngModel)]="artForm.title_en" type="text" class="input-field w-full">
                </div>
                <div class="col-span-2">
                  <label class="block text-xs opacity-50 mb-1">Description (EN)</label>
                  <textarea [(ngModel)]="artForm.desc_en" rows="2" class="input-field w-full resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Author (EN)</label>
                  <input [(ngModel)]="artForm.author_en" type="text" class="input-field w-full">
                </div>
                <div>
                  <label class="block text-xs opacity-50 mb-1">Tags (comma-separated)</label>
                  <input [(ngModel)]="artForm.tags_en_str" type="text" class="input-field w-full" placeholder="strategy, tutorial">
                </div>
              </div>
            }

            @if (artTab() === 'content_zh') {
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs font-semibold opacity-60">🇨🇳 中文内容（Markdown）</label>
                  <span class="text-xs opacity-40 font-mono">{{ artForm.content_zh.length }} chars</span>
                </div>
                <textarea [(ngModel)]="artForm.content_zh" rows="32"
                  class="w-full px-4 py-3 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl text-sm font-mono focus:outline-none focus:border-[var(--color-accent-from)] resize-y leading-relaxed"
                  placeholder="# 文章标题&#10;&#10;正文内容...">
                </textarea>
              </div>
            }

            @if (artTab() === 'content_en') {
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs font-semibold opacity-60">🇺🇸 English Content (Markdown)</label>
                  <span class="text-xs opacity-40 font-mono">{{ wordCount(artForm.content_en) }} words</span>
                </div>
                <textarea [(ngModel)]="artForm.content_en" rows="32"
                  class="w-full px-4 py-3 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl text-sm font-mono focus:outline-none focus:border-[var(--color-accent-from)] resize-y leading-relaxed"
                  placeholder="# Article Title&#10;&#10;Content here...">
                </textarea>
              </div>
            }
          </div>

          <div class="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border-card)]">
            <button (click)="closeArtModal()" class="px-5 py-2.5 rounded-xl border border-[var(--color-border-card)] hover:bg-[var(--color-bg-main)]/50 transition-colors text-sm font-medium">
              {{ i18n.t('admin.articles.cancel')() }}
            </button>
            <button (click)="saveArticle()" [disabled]="savingArt()"
              class="px-6 py-2.5 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg disabled:opacity-50 text-sm flex items-center gap-2">
              @if (savingArt()) { <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> }
              {{ editingArtId() ? i18n.t('admin.articles.save')() : i18n.t('admin.articles.create')() }}
            </button>
          </div>
        </div>
      </div>
    }

  `,
  styles: [`
    .input-field {
      padding: 0.5rem 1rem;
      background: var(--color-bg-main);
      border: 1px solid var(--color-border-card);
      border-radius: 0.75rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .input-field:focus { border-color: var(--color-accent-from); }
    select.input-field { appearance: auto; }
  `],
})
export class AdminArticlesComponent implements OnInit {
  private svc       = inject(ContentService);
  private formatter = inject(PlatformFormatterService);
  private toast     = inject(ToastService);
  i18n              = inject(I18nService);

  categories         = signal<ContentCategory[]>([]);
  articles           = signal<ContentArticleMeta[]>([]);
  selectedCategoryId = signal<number | null>(null);

  // Category modal
  catModalOpen  = signal(false);
  editingCatId  = signal<number | null>(null);
  savingCat     = signal(false);
  catForm: CatFormData = this.emptyCatForm();

  // Article modal
  artModalOpen = signal(false);
  editingArtId = signal<number | null>(null);
  savingArt    = signal(false);
  artTab       = signal<ArticleEditTab>('meta');
  artForm: ArticleFormData = this.emptyArtForm();

  // Distribute
  distribOpenId  = signal<number | null>(null);
  distribArt     = signal<ContentArticleFull | null>(null);
  distribLoading = signal(false);
  distribKey     = signal('');
  distributions  = signal<ContentDistributionRecord[]>([]);
  titleCopyKey   = signal('');

  // Import
  importOpen       = signal(false);
  importPreview    = signal<ImportArticleItem[]>([]);
  importProgress   = signal<ImportProgress | null>(null);
  importParseError = signal('');
  importing        = signal(false);

  readonly artTabs: { id: ArticleEditTab; label: string }[] = [
    { id: 'meta',       label: '📋 元数据' },
    { id: 'content_zh', label: '🇨🇳 中文内容' },
    { id: 'content_en', label: '🇺🇸 English Content' },
  ];

  categoryFlat = computed<FlatCatNode[]>(() => {
    const cats = this.categories();
    const result: FlatCatNode[] = [];
    const visit = (parentId: number | null, depth: number) => {
      cats
        .filter(c => (c.parent_id ?? null) === parentId)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        .forEach(c => {
          result.push({ cat: c, depth });
          visit(c.id, depth + 1);
        });
    };
    visit(null, 0);
    return result;
  });

  filteredArticles = computed(() => {
    const catId = this.selectedCategoryId();
    if (catId === null) return this.articles();
    return this.articles().filter(a => a.category_id === catId);
  });

  ngOnInit() {
    this.loadCategories();
    this.loadArticles();
  }

  loadCategories() {
    this.svc.listCategories().subscribe({ next: cats => this.categories.set(cats) });
  }

  loadArticles() {
    this.svc.listArticles().subscribe({ next: arts => this.articles.set(arts) });
  }

  categoryName(id: number | null): string {
    if (!id) return this.i18n.t('admin.articles.uncategorized')();
    const cat = this.categories().find(c => c.id === id);
    return cat ? (cat.name_zh || cat.name_en) : '—';
  }

  // ===== Import =====

  /** 下载 JSON 模板文件 */
  downloadTemplate() {
    const today = new Date().toISOString().split('T')[0];
    const template: ImportArticleItem[] = [
      {
        slug: 'my-first-article',
        category_slug: '',
        title_zh: '我是如何一步步把这个益智游戏网站做好的',
        title_en: 'How I Built a Puzzle Game Website Step by Step',
        desc_zh: '分享从零开始做益智游戏平台的完整经历，包括技术选型、运营推广和用户增长。',
        desc_en: 'Sharing the full journey of building a puzzle gaming platform from scratch — tech choices, marketing, and growth.',
        content_zh: `## 起因

一切始于 2024 年初，我想做一个能在全球推广的益智游戏平台...

## 技术选型

- **前端**：Angular 21 + TailwindCSS v4，支持 SSR/SSG
- **后端**：Go + Fiber v3，PostgreSQL 数据库
- **部署**：Cloudflare Pages + 边缘函数

## 游戏开发历程

最开始只有数独，后来一步步加入了...

## 推广策略

### 内容营销
通过知乎、B站等平台发布游戏教程...

### SEO 优化
针对双语用户优化了 54 个预渲染路由...

## 总结

做独立产品最重要的是坚持，不断迭代...`,
        content_en: `## Why I Started

It all began in early 2024, when I decided to build a globally accessible puzzle gaming platform...

## Tech Stack

- **Frontend**: Angular 21 + TailwindCSS v4 with SSR/SSG
- **Backend**: Go + Fiber v3, PostgreSQL
- **Hosting**: Cloudflare Pages with edge functions

## Game Development Journey

We started with just Sudoku, then gradually added...

## Marketing Strategy

### Content Marketing
Publishing tutorials on various platforms...

### SEO
Optimized 54 prerendered routes for bilingual users...

## Conclusion

The most important thing for indie products is persistence and constant iteration...`,
        tags_zh: ['独立开发', '益智游戏', '创业经历', '技术分享'],
        tags_en: ['indie dev', 'puzzle game', 'startup', 'tech'],
        author_zh: 'Puzzle PK 团队',
        author_en: 'Puzzle PK Team',
        source_url: 'https://puzzlepk.com',
        published: false,
        sort_order: 0,
        date: today,
      },
      {
        slug: 'sudoku-strategy-guide',
        category_slug: '',
        title_zh: '数独解题技巧完全指南',
        title_en: 'Complete Sudoku Strategy Guide',
        desc_zh: '从入门到进阶的数独解题方法，包括排除法、候选数、XY-Wing 等技巧。',
        desc_en: 'From beginner to advanced Sudoku solving techniques including elimination, candidates, XY-Wing and more.',
        content_zh: `## 基础技巧

### 1. 单一候选数法（Naked Single）

如果一个格子只有一个可能的数字，直接填入...

### 2. 隐性单一（Hidden Single）

某行/列/宫中，某个数字只能出现在一个位置...

## 进阶技巧

### XY-Wing

适用于中等难度谜题的消除技巧...`,
        content_en: `## Basic Techniques

### 1. Naked Single

If only one number can go in a cell, place it immediately...

### 2. Hidden Single

If a number can only go in one cell within a row/column/box...

## Advanced Techniques

### XY-Wing

An elimination technique for medium-difficulty puzzles...`,
        tags_zh: ['数独', '解题技巧', '教程'],
        tags_en: ['sudoku', 'strategy', 'tutorial'],
        author_zh: 'Puzzle PK 团队',
        author_en: 'Puzzle PK Team',
        source_url: '',
        published: false,
        sort_order: 10,
        date: today,
      },
    ];
    this.triggerDownload('article-template.json', JSON.stringify(template, null, 2));
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    const readFile = (file: File): Promise<ImportArticleItem[]> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const raw = JSON.parse(e.target?.result as string);
            resolve(Array.isArray(raw) ? raw : [raw]);
          } catch {
            reject(new Error(`${file.name}：JSON 解析失败`));
          }
        };
        reader.readAsText(file, 'utf-8');
      });

    Promise.all(files.map(readFile)).then((results) => {
      const all: ImportArticleItem[] = results.flat();
      if (all.length === 0) {
        this.importParseError.set('所有文件均为空');
        this.importOpen.set(true);
        return;
      }
      const invalid = all.findIndex(i => !i.slug || !i.title_zh);
      if (invalid >= 0) {
        this.importParseError.set(`第 ${invalid + 1} 条缺少 slug 或 title_zh`);
        this.importPreview.set([]);
        this.importOpen.set(true);
        return;
      }
      // 按 sort_order 排序，方便预览时确认顺序
      all.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      this.importParseError.set('');
      this.importPreview.set(all);
      this.importProgress.set(null);
      this.importOpen.set(true);
    }).catch((err: Error) => {
      this.importParseError.set(err.message);
      this.importPreview.set([]);
      this.importOpen.set(true);
    });
  }

  /** 在预览 modal 中显示已解析的分类名 */
  resolvedCategory(item: ImportArticleItem): string {
    if (item.category_slug) {
      const cat = this.categories().find(c => c.slug === item.category_slug);
      return cat ? (cat.name_zh || cat.name_en) : `(分类 slug 未找到: ${item.category_slug})`;
    }
    if (item.category_id) {
      return this.categoryName(item.category_id);
    }
    return '';
  }

  async runImport() {
    const items = this.importPreview();
    this.importing.set(true);
    const errors: string[] = [];
    let done = 0;
    this.importProgress.set({ done, total: items.length, errors });

    for (const item of items) {
      try {
        const catId = this.resolveCategoryId(item);
        const input: ContentArticleInput = {
          slug: item.slug,
          category_id: catId,
          title_zh: item.title_zh,
          title_en: item.title_en ?? '',
          desc_zh: item.desc_zh ?? '',
          desc_en: item.desc_en ?? '',
          content_zh: item.content_zh ?? '',
          content_en: item.content_en ?? '',
          tags_zh: item.tags_zh ?? [],
          tags_en: item.tags_en ?? [],
          author_zh: item.author_zh ?? '',
          author_en: item.author_en ?? '',
          source_url: item.source_url ?? '',
          published: item.published ?? false,
          sort_order: item.sort_order ?? 0,
          date: item.date ?? new Date().toISOString().split('T')[0],
        };
        await firstValueFrom(this.svc.createArticle(input));
      } catch (e: any) {
        const msg = e?.error?.error || e?.message || 'unknown error';
        errors.push(`${item.slug}: ${msg}`);
      }
      done++;
      this.importProgress.set({ done, total: items.length, errors: [...errors] });
    }

    this.importing.set(false);
    this.loadArticles();

    if (errors.length === 0) {
      this.toast.show(`成功导入 ${done} 篇文章`, 'success');
    } else {
      this.toast.show(`导入完成：${done - errors.length} 成功，${errors.length} 失败`, 'error');
    }
  }

  closeImport() {
    if (this.importing()) return;
    this.importOpen.set(false);
    this.importPreview.set([]);
    this.importProgress.set(null);
    this.importParseError.set('');
  }

  private resolveCategoryId(item: ImportArticleItem): number | null {
    if (item.category_slug) {
      const cat = this.categories().find(c => c.slug === item.category_slug);
      return cat?.id ?? null;
    }
    return item.category_id ?? null;
  }

  private triggerDownload(filename: string, content: string) {
    const blob = new Blob([content], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ===== Category CRUD =====
  openCreateCategory(parentId: number | null) {
    this.catForm = { ...this.emptyCatForm(), parent_id: parentId };
    this.editingCatId.set(null);
    this.catModalOpen.set(true);
  }

  openEditCategory(cat: ContentCategory) {
    this.catForm = {
      slug: cat.slug, name_zh: cat.name_zh, name_en: cat.name_en,
      desc_zh: cat.desc_zh, desc_en: cat.desc_en,
      parent_id: cat.parent_id, sort_order: cat.sort_order,
    };
    this.editingCatId.set(cat.id);
    this.catModalOpen.set(true);
  }

  closeCatModal() { this.catModalOpen.set(false); }

  saveCat() {
    if (!this.catForm.slug.trim()) { this.toast.show('Slug 不能为空', 'error'); return; }
    this.savingCat.set(true);
    const input: ContentCategoryInput = {
      slug: this.catForm.slug, name_zh: this.catForm.name_zh, name_en: this.catForm.name_en,
      desc_zh: this.catForm.desc_zh, desc_en: this.catForm.desc_en,
      parent_id: this.catForm.parent_id, sort_order: this.catForm.sort_order,
    };
    const id = this.editingCatId();
    const req = id ? this.svc.updateCategory(id, input) : this.svc.createCategory(input);
    req.subscribe({
      next: () => {
        this.toast.show(this.i18n.t('admin.articles.save_success')(), 'success');
        this.savingCat.set(false);
        this.closeCatModal();
        this.loadCategories();
      },
      error: () => {
        this.toast.show(this.i18n.t('admin.articles.save_error')(), 'error');
        this.savingCat.set(false);
      },
    });
  }

  deleteCategory(cat: ContentCategory) {
    if (!confirm(this.i18n.t('admin.articles.delete_category_confirm')())) return;
    this.svc.deleteCategory(cat.id).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('admin.articles.delete_success')(), 'success');
        if (this.selectedCategoryId() === cat.id) this.selectedCategoryId.set(null);
        this.loadCategories();
      },
      error: (err) => {
        const msg = err?.error?.error === 'has_children' ? '请先删除子分类' :
                    err?.error?.error === 'has_articles' ? '请先移除该分类下的文章' :
                    this.i18n.t('admin.articles.delete_error')();
        this.toast.show(msg, 'error');
      },
    });
  }

  // ===== Article CRUD =====
  openCreateArticle() {
    this.artForm = { ...this.emptyArtForm(), category_id: this.selectedCategoryId() };
    this.editingArtId.set(null);
    this.artTab.set('meta');
    this.artModalOpen.set(true);
  }

  openEditArticle(art: ContentArticleMeta) {
    this.svc.getArticle(art.id).subscribe({
      next: (full) => {
        const parseTags = (s: string) => { try { return JSON.parse(s || '[]'); } catch { return []; } };
        this.artForm = {
          slug: full.slug, category_id: full.category_id,
          title_en: full.title_en, title_zh: full.title_zh,
          desc_en: full.desc_en, desc_zh: full.desc_zh,
          content_en: full.content_en, content_zh: full.content_zh,
          tags_en_str: parseTags(full.tags_en).join(', '),
          tags_zh_str: parseTags(full.tags_zh).join(', '),
          author_en: full.author_en, author_zh: full.author_zh,
          source_url: full.source_url,
          published: full.published, sort_order: full.sort_order, date: full.date,
        };
        this.editingArtId.set(full.id);
        this.artTab.set('meta');
        this.artModalOpen.set(true);
      },
    });
  }

  closeArtModal() { this.artModalOpen.set(false); }

  saveArticle() {
    if (!this.artForm.slug.trim()) { this.toast.show('Slug 不能为空', 'error'); return; }
    this.savingArt.set(true);
    const input: ContentArticleInput = {
      slug: this.artForm.slug, category_id: this.artForm.category_id,
      title_en: this.artForm.title_en, title_zh: this.artForm.title_zh,
      desc_en: this.artForm.desc_en, desc_zh: this.artForm.desc_zh,
      content_en: this.artForm.content_en, content_zh: this.artForm.content_zh,
      tags_en: this.artForm.tags_en_str.split(',').map(t => t.trim()).filter(Boolean),
      tags_zh: this.artForm.tags_zh_str.split(',').map(t => t.trim()).filter(Boolean),
      author_en: this.artForm.author_en, author_zh: this.artForm.author_zh,
      source_url: this.artForm.source_url,
      published: this.artForm.published, sort_order: this.artForm.sort_order, date: this.artForm.date,
    };
    const id = this.editingArtId();
    const req = id ? this.svc.updateArticle(id, input) : this.svc.createArticle(input);
    req.subscribe({
      next: () => {
        this.toast.show(this.i18n.t('admin.articles.save_success')(), 'success');
        this.savingArt.set(false);
        this.closeArtModal();
        this.loadArticles();
      },
      error: () => {
        this.toast.show(this.i18n.t('admin.articles.save_error')(), 'error');
        this.savingArt.set(false);
      },
    });
  }

  toggleArticle(art: ContentArticleMeta) {
    this.svc.toggleArticle(art.id).subscribe({
      next: (res) => {
        this.articles.update(list => list.map(a => a.id === art.id ? { ...a, published: res.published } : a));
      },
    });
  }

  deleteArticle(art: ContentArticleMeta) {
    if (!confirm(this.i18n.t('admin.articles.delete_confirm')())) return;
    this.svc.deleteArticle(art.id).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('admin.articles.delete_success')(), 'success');
        this.articles.update(list => list.filter(a => a.id !== art.id));
      },
      error: () => this.toast.show(this.i18n.t('admin.articles.delete_error')(), 'error'),
    });
  }

  // ===== Distribute =====
  toggleDistrib(art: ContentArticleMeta) {
    if (this.distribOpenId() === art.id) {
      this.distribOpenId.set(null);
      this.distribArt.set(null);
      return;
    }
    this.distribOpenId.set(art.id);
    this.distribArt.set(null);
    this.distribLoading.set(true);
    this.distribKey.set('');
    this.distributions.set([]);
    this.svc.getArticle(art.id).subscribe({
      next: (full) => {
        this.distribArt.set(full);
        this.distribLoading.set(false);
        this.svc.getDistributions(art.id).subscribe({ next: ds => this.distributions.set(ds) });
      },
      error: () => this.distribLoading.set(false),
    });
  }

  async copyTitle(art: ContentArticleMeta, lang: 'zh' | 'en') {
    const title = lang === 'zh' ? art.title_zh : art.title_en;
    if (!title) return;
    const key = `${art.id}_${lang}`;
    try {
      await copyToClipboard(title);
      this.titleCopyKey.set(key);
      setTimeout(() => { if (this.titleCopyKey() === key) this.titleCopyKey.set(''); }, 2000);
    } catch {
      this.toast.show('复制失败', 'error');
    }
  }

  async copyArticle(platformId: PlatformId, lang: 'en' | 'zh', url: string) {
    const full = this.distribArt();
    if (!full) return;
    const key = `${platformId}_${lang}`;
    this.distribKey.set(key);
    try {
      const parseTags = (s: string) => { try { return JSON.parse(s || '[]'); } catch { return []; } };
      const post: FormattablePost = {
        id: full.slug,
        sourceUrl: full.source_url || undefined,
        en: { title: full.title_en, description: full.desc_en, content: full.content_en, tags: parseTags(full.tags_en) },
        zh: { title: full.title_zh, description: full.desc_zh, content: full.content_zh, tags: parseTags(full.tags_zh) },
      };
      const text = await this.formatter.formatForPlatform(platformId, post, lang);
      await copyToClipboard(text);
      // 复制成功后再打开平台页，避免 focus 转移导致 clipboard API 失败
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      this.svc.recordDistribution(full.id, platformId, lang).subscribe({
        next: () => this.svc.getDistributions(full.id).subscribe({ next: ds => this.distributions.set(ds) }),
      });
      this.toast.show(this.i18n.t('admin.articles.copied')(), 'success');
    } catch {
      this.toast.show(this.i18n.t('admin.articles.copy_error')(), 'error');
    }
    setTimeout(() => {
      if (this.distribKey() === key) this.distribKey.set('');
    }, 2000);
  }


  wordCount(text: string): number {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  private emptyCatForm(): CatFormData {
    return { slug: '', name_zh: '', name_en: '', desc_zh: '', desc_en: '', parent_id: null, sort_order: 0 };
  }

  private emptyArtForm(): ArticleFormData {
    const today = new Date().toISOString().split('T')[0];
    return {
      slug: '', category_id: null,
      title_en: '', title_zh: '', desc_en: '', desc_zh: '',
      content_en: '', content_zh: '',
      tags_en_str: '', tags_zh_str: '',
      author_en: '', author_zh: '',
      source_url: '',
      published: true, sort_order: 0, date: today,
    };
  }
}
