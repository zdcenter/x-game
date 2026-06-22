import {
  Component, forwardRef, inject, signal, computed, OnInit, PLATFORM_ID,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ImageService, ImageItem } from '../../../core/services/image.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-image-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ImagePickerComponent),
    multi: true,
  }],
  template: `
    <!-- Compact trigger row -->
    <div class="flex items-start gap-3">

      <!-- Preview thumbnail -->
      <div class="flex-shrink-0 w-28 h-20 rounded-xl overflow-hidden border border-[var(--color-border-card)] bg-[var(--color-bg-main)] flex items-center justify-center">
        @if (value()) {
          <img [src]="value()" alt="cover" class="w-full h-full object-cover"
               (error)="value.set('')">
        } @else {
          <span class="text-2xl opacity-20">🖼</span>
        }
      </div>

      <!-- URL input + action buttons -->
      <div class="flex-1 min-w-0 flex flex-col gap-2">
        <input [value]="value()" (input)="onInput($event)" type="url"
          [disabled]="disabled()"
          placeholder="https://image.puzzlepk.com/covers/..."
          class="w-full px-3 py-2 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-accent-from)] font-mono transition-colors">
        <div class="flex items-center gap-2">
          <button type="button" (click)="openPicker()" [disabled]="disabled()"
            class="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--color-border-card)] hover:border-[var(--color-accent-from)] hover:text-[var(--color-accent-from)] transition-colors flex items-center gap-1.5 disabled:opacity-40">
            🖼 选择图片
          </button>
          @if (value()) {
            <button type="button" (click)="clear()" [disabled]="disabled()"
              class="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--color-border-card)] hover:border-rose-500/50 hover:text-rose-400 transition-colors disabled:opacity-40">
              ✕ 清除
            </button>
          }
        </div>
      </div>
    </div>

    <!-- ── Image picker modal ────────────────────────────────────────────── -->
    @if (pickerOpen()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
           (click)="closePicker()">
        <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col"
             style="max-height: 80vh"
             (click)="$event.stopPropagation()">

          <!-- Modal header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-card)] flex-shrink-0">
            <h3 class="text-base font-bold">🖼 选择封面图片</h3>
            <div class="flex items-center gap-3">
              <label for="picker-upload"
                class="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--color-border-card)] hover:border-[var(--color-accent-from)] hover:text-[var(--color-accent-from)] transition-colors cursor-pointer flex items-center gap-1.5"
                [class.opacity-40]="uploading()">
                @if (uploading()) {
                  <span class="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin"></span>
                } @else { 📤 }
                上传新图片
              </label>
              <input id="picker-upload" type="file" accept="image/*" multiple class="hidden"
                [disabled]="uploading()" (change)="onUpload($event)">
              <button type="button" (click)="closePicker()"
                class="p-1.5 hover:bg-[var(--color-bg-main)]/50 rounded-lg text-lg leading-none transition-colors">
                ✕
              </button>
            </div>
          </div>

          <!-- Search -->
          <div class="px-5 py-3 border-b border-[var(--color-border-card)] flex-shrink-0">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40">🔍</span>
              <input [(ngModel)]="searchQuery" type="text" placeholder="搜索文件名..."
                class="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-accent-from)]">
            </div>
          </div>

          <!-- Grid -->
          <div class="flex-1 overflow-y-auto p-4">
            @if (loadingImages()) {
              <div class="flex items-center justify-center h-40 opacity-40">
                <span class="w-8 h-8 border-2 border-[var(--color-accent-from)]/30 border-t-[var(--color-accent-from)] rounded-full animate-spin"></span>
              </div>
            } @else if (filteredImages().length === 0) {
              <div class="flex flex-col items-center justify-center h-40 gap-3 opacity-40">
                <span class="text-4xl">🖼</span>
                <p class="text-sm">{{ images().length === 0 ? '还没有图片，点击上传' : '没有匹配的图片' }}</p>
              </div>
            } @else {
              <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                @for (img of filteredImages(); track img.key) {
                  <div class="group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all"
                       [class]="value() === img.url
                         ? 'border-[var(--color-accent-from)] shadow-lg shadow-[var(--color-accent-from)]/20'
                         : 'border-[var(--color-border-card)] hover:border-[var(--color-accent-from)]/60'"
                       (click)="selectImage(img)">

                    <div class="aspect-square bg-[var(--color-bg-main)] overflow-hidden">
                      <img [src]="img.url" [alt]="img.key"
                        class="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                        (error)="onImgError($event)">
                    </div>

                    <!-- Currently selected indicator -->
                    @if (value() === img.url) {
                      <div class="absolute top-1.5 right-1.5 w-5 h-5 bg-[var(--color-accent-from)] rounded-full flex items-center justify-center shadow-lg">
                        <span class="text-white text-[10px] font-bold">✓</span>
                      </div>
                    }

                    <!-- Hover overlay -->
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p class="text-white text-[10px] font-mono truncate w-full">{{ shortName(img.key) }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Footer hint -->
          <div class="px-5 py-3 border-t border-[var(--color-border-card)] flex-shrink-0">
            <p class="text-xs text-[var(--color-text-muted)] opacity-50">单击图片即可选中并使用 · {{ images().length }} 张图片</p>
          </div>
        </div>
      </div>
    }
  `,
})
export class ImagePickerComponent implements ControlValueAccessor, OnInit {
  private imgSvc     = inject(ImageService);
  private toast      = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  value        = signal('');
  disabled     = signal(false);
  pickerOpen   = signal(false);
  images       = signal<ImageItem[]>([]);
  loadingImages = signal(false);
  uploading    = signal(false);
  searchQuery  = '';

  filteredImages = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    return q ? this.images().filter(i => i.key.toLowerCase().includes(q)) : this.images();
  });

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void         = () => {};

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.loadImages();
  }

  // ── ControlValueAccessor ─────────────────────────────────────────────────
  writeValue(v: string)                 { this.value.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void)     { this.onTouched = fn; }
  setDisabledState(d: boolean)          { this.disabled.set(d); }

  onInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.value.set(v);
    this.onChange(v);
  }

  clear() {
    this.value.set('');
    this.onChange('');
    this.onTouched();
  }

  // ── Picker ───────────────────────────────────────────────────────────────
  openPicker() {
    if (!this.images().length) this.loadImages();
    this.pickerOpen.set(true);
  }

  closePicker() { this.pickerOpen.set(false); }

  selectImage(img: ImageItem) {
    this.value.set(img.url);
    this.onChange(img.url);
    this.onTouched();
    this.closePicker();
  }

  private loadImages() {
    this.loadingImages.set(true);
    this.imgSvc.list().subscribe({
      next: (items) => { this.images.set(items); this.loadingImages.set(false); },
      error: () => { this.loadingImages.set(false); },
    });
  }

  onUpload(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    this.uploading.set(true);
    this.imgSvc.upload(files).subscribe({
      next: (uploaded) => {
        this.images.update(list => [...uploaded, ...list]);
        this.toast.show(`✓ 上传 ${uploaded.length} 张`, 'success');
        this.uploading.set(false);
        (e.target as HTMLInputElement).value = '';
      },
      error: () => { this.toast.show('上传失败', 'error'); this.uploading.set(false); },
    });
  }

  shortName(key: string): string { return key.split('/').pop() ?? key; }

  onImgError(e: Event) {
    (e.target as HTMLImageElement).src =
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23334155"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-size="32">🖼</text></svg>';
  }
}
