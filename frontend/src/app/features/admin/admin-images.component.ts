import { Component, inject, OnInit, signal, computed, HostListener, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageService, ImageItem } from '../../core/services/image.service';
import { ToastService } from '../../core/services/toast.service';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatDate(s: string): string {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

@Component({
  selector: 'app-admin-images',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Drag overlay -->
    @if (dragging()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-accent-from)]/20 backdrop-blur-sm pointer-events-none">
        <div class="border-4 border-dashed border-[var(--color-accent-from)] rounded-3xl px-16 py-10 text-center">
          <div class="text-5xl mb-3">🖼</div>
          <p class="text-xl font-bold text-[var(--color-accent-from)]">松开即上传</p>
        </div>
      </div>
    }

    <!-- ── Lightbox ──────────────────────────────────────────────────────────── -->
    @if (preview()) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md"
           (click)="closePreview()">
        <div class="relative flex flex-col items-center gap-4 max-w-[95vw] max-h-[95vh]"
             (click)="$event.stopPropagation()">

          <!-- Close -->
          <button (click)="closePreview()"
            class="absolute -top-10 right-0 text-white/60 hover:text-white text-2xl leading-none transition-colors">✕</button>

          <!-- Prev / Next -->
          @if (filtered().length > 1) {
            <button (click)="navigate(-1)"
              class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center transition-colors">‹</button>
            <button (click)="navigate(1)"
              class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center transition-colors">›</button>
          }

          <!-- Full image -->
          <img [src]="preview()!.url" [alt]="preview()!.key"
            class="max-h-[75vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            (load)="onPreviewLoad($event)">

          <!-- Info bar -->
          <div class="flex items-center gap-6 px-6 py-3 bg-white/5 rounded-2xl backdrop-blur text-sm text-white/70 flex-wrap justify-center">
            <span class="font-mono text-white/90 text-xs truncate max-w-[200px]" [title]="preview()!.key">{{ shortName(preview()!.key) }}</span>
            @if (previewDims()) {
              <span class="flex items-center gap-1">
                <span class="opacity-50">📐</span>
                {{ previewDims()!.w }} × {{ previewDims()!.h }}
              </span>
            }
            <span>{{ formatBytes(preview()!.size) }}</span>
            <span>{{ formatDate(preview()!.last_modified) }}</span>

            <button (click)="copyUrl(preview()!)"
              class="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
              [class]="copied() === preview()!.key ? 'bg-emerald-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'">
              {{ copied() === preview()!.key ? '✓ 已复制' : '📋 复制链接' }}
            </button>
            <a [href]="preview()!.url" target="_blank" rel="noopener"
              class="px-3 py-1 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-colors">
              🔗 原图
            </a>
            <button (click)="deleteSingle(preview()!); closePreview()"
              class="px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/70 hover:bg-rose-500 text-white transition-colors">
              🗑 删除
            </button>
          </div>

          <!-- Counter -->
          @if (filtered().length > 1) {
            <p class="text-white/30 text-xs">{{ previewIndex() + 1 }} / {{ filtered().length }}</p>
          }
        </div>
      </div>
    }

    <div class="h-full flex flex-col gap-4"
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave($event)"
         (drop)="onDrop($event)">

      <!-- Header -->
      <div class="flex items-center justify-between flex-shrink-0 flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold">🖼 图片管理</h2>
          <p class="text-[var(--color-text-muted)] mt-1 text-sm">Cloudflare R2 · {{ images().length }} 张图片</p>
        </div>
        <div class="flex items-center gap-2">
          @if (selected().size > 0) {
            <button (click)="deleteSelected()"
              class="px-4 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 text-sm font-bold hover:bg-rose-500/10 transition-colors flex items-center gap-2">
              🗑 删除已选 {{ selected().size }} 张
            </button>
          }
          <label for="img-upload"
            class="px-5 py-2.5 bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center gap-2 text-sm cursor-pointer"
            [class.opacity-60]="uploading()">
            @if (uploading()) {
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              上传中...
            } @else {
              📤 上传图片
            }
          </label>
          <input id="img-upload" type="file" accept="image/*" multiple class="hidden"
            (change)="onFileInput($event)" [disabled]="uploading()">
        </div>
      </div>

      <!-- Search bar -->
      <div class="flex items-center gap-3 flex-shrink-0">
        <div class="flex-1 relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 text-sm">🔍</span>
          <input [(ngModel)]="searchQuery" type="text" placeholder="搜索文件名..."
            class="w-full pl-9 pr-4 py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-accent-from)]">
        </div>
        @if (selected().size > 0) {
          <button (click)="clearSelection()" class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">
            取消选择
          </button>
        }
        <span class="text-xs text-[var(--color-text-muted)] opacity-60 whitespace-nowrap">
          {{ filtered().length }} / {{ images().length }}
        </span>
      </div>

      <!-- Image grid -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        @if (loading()) {
          <div class="flex items-center justify-center h-48 opacity-40">
            <span class="w-8 h-8 border-2 border-[var(--color-accent-from)]/30 border-t-[var(--color-accent-from)] rounded-full animate-spin"></span>
          </div>
        } @else if (filtered().length === 0) {
          <div class="flex flex-col items-center justify-center h-48 opacity-40 gap-3">
            <div class="text-5xl">🖼</div>
            <p class="text-sm">{{ images().length === 0 ? '还没有图片，点击上传或拖拽文件' : '没有匹配的图片' }}</p>
          </div>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-4">
            @for (img of filtered(); track img.key) {
              <div class="group relative rounded-xl overflow-hidden border-2 transition-all select-none flex flex-col"
                   [class]="selected().has(img.key)
                     ? 'border-[var(--color-accent-from)] shadow-lg shadow-[var(--color-accent-from)]/20'
                     : 'border-[var(--color-border-card)] hover:border-[var(--color-accent-from)]/50'">

                <!-- Thumbnail — click = preview -->
                <div class="aspect-square bg-[var(--color-bg-main)] overflow-hidden cursor-zoom-in relative"
                     (click)="openPreview(img)">
                  <img [src]="img.url" [alt]="img.key"
                    class="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    (load)="onThumbLoad($event, img.key)"
                    (error)="onImgError($event)">

                  <!-- Hover zoom hint -->
                  <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span class="text-white text-2xl drop-shadow">🔍</span>
                  </div>

                  <!-- Selection checkbox (top-left) -->
                  <div class="absolute top-2 left-2 transition-opacity"
                       [class]="selected().has(img.key) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                       (click)="toggleSelect(img, $event); $event.stopPropagation()">
                    <div class="w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-colors"
                         [class]="selected().has(img.key)
                           ? 'bg-[var(--color-accent-from)]'
                           : 'bg-black/50 border border-white/50'">
                      @if (selected().has(img.key)) {
                        <span class="text-white text-[10px] font-bold">✓</span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Info + action bar -->
                <div class="px-2 pt-1.5 pb-2 bg-[var(--color-bg-card)] border-t border-[var(--color-border-card)] flex flex-col gap-1.5">
                  <!-- Filename -->
                  <p class="text-[10px] font-mono truncate opacity-70" [title]="img.key">{{ shortName(img.key) }}</p>

                  <!-- Size + dimensions -->
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[10px] opacity-40">{{ formatBytes(img.size) }}</span>
                    @if (dims().get(img.key); as d) {
                      <span class="text-[10px] opacity-40 font-mono">{{ d.w }}×{{ d.h }}</span>
                    }
                  </div>

                  <!-- Action buttons -->
                  <div class="flex items-center gap-1">
                    <button (click)="copyUrl(img)"
                      class="flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors border"
                      [class]="copied() === img.key
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-transparent border-[var(--color-border-card)] text-[var(--color-text-muted)] hover:border-[var(--color-accent-from)]/60 hover:text-[var(--color-accent-from)]'">
                      {{ copied() === img.key ? '✓ 已复制' : '📋 复制' }}
                    </button>
                    @if (img.key.endsWith('.svg')) {
                      <button (click)="convertToPng(img)" [disabled]="converting() === img.key"
                        title="转换为 PNG"
                        class="px-2 py-1 rounded-lg text-[10px] font-bold border border-[var(--color-border-card)] text-amber-400 hover:border-amber-500/50 transition-colors disabled:opacity-40">
                        @if (converting() === img.key) {
                          <span class="inline-block w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin"></span>
                        } @else { 🔄 }
                      </button>
                    }
                    <button (click)="deleteSingle(img)"
                      class="px-2 py-1 rounded-lg text-[10px] font-bold border border-[var(--color-border-card)] text-[var(--color-text-muted)] hover:border-rose-500/50 hover:text-rose-400 transition-colors">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminImagesComponent implements OnInit {
  private svc        = inject(ImageService);
  private toast      = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  images   = signal<ImageItem[]>([]);
  loading  = signal(true);
  uploading = signal(false);
  dragging = signal(false);
  copied   = signal('');
  selected = signal<Set<string>>(new Set());
  searchQuery = '';

  // key → {w, h}
  dims = signal<Map<string, {w: number; h: number}>>(new Map());

  converting = signal<string | null>(null);

  // lightbox
  preview      = signal<ImageItem | null>(null);
  previewIndex = signal(0);
  previewDims  = signal<{w: number; h: number} | null>(null);

  private dragCounter = 0;

  filtered = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    return q ? this.images().filter(i => i.key.toLowerCase().includes(q)) : this.images();
  });

  formatBytes = formatBytes;
  formatDate  = formatDate;

  ngOnInit() { this.load(); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.preview()) return;
    if (e.key === 'Escape') { this.closePreview(); }
    else if (e.key === 'ArrowLeft')  { this.navigate(-1); }
    else if (e.key === 'ArrowRight') { this.navigate(1); }
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (items) => { this.images.set(items); this.loading.set(false); },
      error: () => { this.toast.show('加载失败', 'error'); this.loading.set(false); },
    });
  }

  // ── SVG → PNG conversion ─────────────────────────────────────────────────────

  async convertToPng(img: ImageItem) {
    if (!img.key.endsWith('.svg')) return;
    this.converting.set(img.key);
    this.svc.getImageRaw(img.key).subscribe({
      next: async (svgText) => {
        try {
          const { svgToPng } = await import('../../core/utils/svg-to-png');
          const blob = await svgToPng(svgText, 1200, 630);
          const pngName = img.key.replace(/\.svg$/, '.png').split('/').pop()!;
          this.svc.uploadBlob(blob, pngName).subscribe({
            next: (newImg) => {
              this.svc.deleteMany([img.key]).subscribe(() => {
                this.images.update(list => [newImg, ...list.filter(i => i.key !== img.key)]);
                this.toast.show('✓ 已转换为 PNG', 'success');
                this.converting.set(null);
              });
            },
            error: () => { this.toast.show('上传失败', 'error'); this.converting.set(null); },
          });
        } catch {
          this.toast.show('PNG 转换失败', 'error');
          this.converting.set(null);
        }
      },
      error: () => { this.toast.show('获取 SVG 失败', 'error'); this.converting.set(null); },
    });
  }

  // ── Thumbnail dimension tracking ─────────────────────────────────────────────

  onThumbLoad(e: Event, key: string) {
    const img = e.target as HTMLImageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    this.dims.update(m => { const n = new Map(m); n.set(key, {w, h}); return n; });
  }

  // ── Lightbox ─────────────────────────────────────────────────────────────────

  openPreview(img: ImageItem) {
    const idx = this.filtered().findIndex(i => i.key === img.key);
    this.previewIndex.set(idx >= 0 ? idx : 0);
    this.preview.set(img);
    this.previewDims.set(this.dims().get(img.key) ?? null);
  }

  closePreview() { this.preview.set(null); this.previewDims.set(null); }

  navigate(dir: -1 | 1) {
    const list = this.filtered();
    if (!list.length) return;
    const next = (this.previewIndex() + dir + list.length) % list.length;
    this.previewIndex.set(next);
    const img = list[next];
    this.preview.set(img);
    this.previewDims.set(this.dims().get(img.key) ?? null);
  }

  onPreviewLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w && h) this.previewDims.set({w, h});
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  onFileInput(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    if (files.length) this.doUpload(files);
    (e.target as HTMLInputElement).value = '';
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragCounter++;
    this.dragging.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragCounter--;
    if (this.dragCounter <= 0) { this.dragCounter = 0; this.dragging.set(false); }
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragCounter = 0;
    this.dragging.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    if (files.length) this.doUpload(files);
  }

  private doUpload(files: File[]) {
    this.uploading.set(true);
    this.svc.upload(files).subscribe({
      next: (uploaded) => {
        this.images.update(list => [...uploaded, ...list]);
        this.toast.show(`✓ 上传 ${uploaded.length} 张成功`, 'success');
        this.uploading.set(false);
      },
      error: () => { this.toast.show('上传失败', 'error'); this.uploading.set(false); },
    });
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  toggleSelect(img: ImageItem, e: MouseEvent) {
    this.selected.update(s => {
      const next = new Set(s);
      if (next.has(img.key)) next.delete(img.key);
      else next.add(img.key);
      return next;
    });
  }

  clearSelection() { this.selected.set(new Set()); }

  // ── Copy ─────────────────────────────────────────────────────────────────────

  async copyUrl(img: ImageItem) {
    try {
      await navigator.clipboard.writeText(img.url);
      this.copied.set(img.key);
      setTimeout(() => this.copied.set(''), 2000);
      this.toast.show('URL 已复制', 'success');
    } catch {
      this.toast.show('复制失败', 'error');
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  deleteSingle(img: ImageItem) {
    if (!confirm(`删除 ${this.shortName(img.key)}？`)) return;
    this.svc.deleteMany([img.key]).subscribe({
      next: () => {
        this.images.update(list => list.filter(i => i.key !== img.key));
        this.selected.update(s => { const n = new Set(s); n.delete(img.key); return n; });
        this.toast.show('已删除', 'success');
      },
      error: () => this.toast.show('删除失败', 'error'),
    });
  }

  deleteSelected() {
    const keys = Array.from(this.selected());
    if (!keys.length) return;
    if (!confirm(`删除选中的 ${keys.length} 张图片？此操作不可撤销。`)) return;
    this.svc.deleteMany(keys).subscribe({
      next: () => {
        this.images.update(list => list.filter(i => !keys.includes(i.key)));
        this.selected.set(new Set());
        this.toast.show(`已删除 ${keys.length} 张`, 'success');
      },
      error: () => this.toast.show('删除失败', 'error'),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  shortName(key: string): string {
    return key.split('/').pop() ?? key;
  }

  onImgError(e: Event) {
    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23334155"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-size="32">🖼</text></svg>';
  }
}
