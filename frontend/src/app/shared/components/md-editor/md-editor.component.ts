import {
  Component, ElementRef, ViewChild, forwardRef,
  signal, effect, input, PLATFORM_ID, inject, ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { marked } from 'marked';

interface ToolbarBtn {
  icon: string;
  title: string;
  action: () => void;
}

@Component({
  selector: 'app-md-editor',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MdEditorComponent),
    multi: true,
  }],
  template: `
    <div class="flex flex-col border border-[var(--color-border-card)] rounded-xl overflow-hidden"
         [class.h-full]="stretch()"
         [style.height]="stretch() ? null : (rows() * 1.625 + 6 + 'rem')">

      <!-- Toolbar -->
      <div class="flex items-center gap-0.5 px-2 py-1.5 bg-[var(--color-bg-main)]/80 border-b border-[var(--color-border-card)] flex-shrink-0 flex-wrap">
        @for (btn of toolbarBtns; track btn.title) {
          @if (btn.icon === '|') {
            <span class="w-px h-4 bg-[var(--color-border-card)] mx-1"></span>
          } @else {
            <button type="button" (click)="btn.action()" [title]="btn.title"
              class="px-2 py-1 text-xs font-mono rounded hover:bg-[var(--color-accent-from)]/15 hover:text-[var(--color-accent-from)] text-[var(--color-text-muted)] transition-colors">
              {{ btn.icon }}
            </button>
          }
        }
        <span class="ml-auto text-xs opacity-30 font-mono">{{ wordCount() }} {{ lang() === 'zh' ? '字' : 'words' }}</span>
      </div>

      <!-- Split pane -->
      <div class="flex flex-1 min-h-0">

        <!-- Left: editor -->
        <div class="flex-1 min-w-0 flex flex-col border-r border-[var(--color-border-card)]">
          <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-widest opacity-30 bg-[var(--color-bg-main)]/40 flex-shrink-0">Markdown</div>
          <textarea #editor
            [value]="md()"
            (input)="onInput($event)"
            spellcheck="false"
            class="flex-1 min-h-0 w-full px-4 py-3 bg-transparent text-sm font-mono leading-relaxed resize-none focus:outline-none text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]/40"
            placeholder="# 标题&#10;&#10;正文内容...">
          </textarea>
        </div>

        <!-- Right: preview -->
        <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-widest opacity-30 bg-[var(--color-bg-main)]/40 flex-shrink-0">Preview</div>
          <div class="flex-1 overflow-y-auto px-5 py-4 preview-pane text-sm"
               [innerHTML]="previewHtml()">
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    app-md-editor .preview-pane :is(h1,h2,h3,h4) { font-weight: 700; line-height: 1.35; color: var(--color-text-main); }
    app-md-editor .preview-pane h1 { font-size: 1.6rem; margin: 1.4rem 0 0.6rem; padding-bottom: 0.4rem; border-bottom: 2px solid var(--color-border-card); }
    app-md-editor .preview-pane h2 { font-size: 1.25rem; margin: 1.2rem 0 0.5rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--color-border-card); }
    app-md-editor .preview-pane h3 { font-size: 1.05rem; margin: 1rem 0 0.4rem; }
    app-md-editor .preview-pane h4 { font-size: 0.95rem; margin: 0.8rem 0 0.3rem; }
    app-md-editor .preview-pane p  { margin: 0 0 0.9rem; line-height: 1.85; color: var(--color-text-main); }
    app-md-editor .preview-pane ul, app-md-editor .preview-pane ol { padding-left: 1.5rem; margin: 0 0 0.9rem; color: var(--color-text-main); }
    app-md-editor .preview-pane li { margin: 0.25rem 0; line-height: 1.75; }
    app-md-editor .preview-pane blockquote { border-left: 3px solid #6366f1; padding: 0.4rem 1rem; background: #6366f10f; margin: 0.8rem 0; border-radius: 0 6px 6px 0; }
    app-md-editor .preview-pane blockquote p { margin: 0; color: #818cf8; }
    app-md-editor .preview-pane code { background: #7c3aed18; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; color: #7c3aed; font-family: monospace; }
    app-md-editor .preview-pane pre { background: #0f172a; padding: 1rem 1.25rem; border-radius: 8px; overflow-x: auto; margin: 0.9rem 0; }
    app-md-editor .preview-pane pre code { background: none; color: #e2e8f0; padding: 0; font-size: 0.85rem; }
    app-md-editor .preview-pane a { color: #4f46e5; text-decoration: underline; }
    app-md-editor .preview-pane strong { font-weight: 700; }
    app-md-editor .preview-pane em { font-style: italic; color: #818cf8; }
    app-md-editor .preview-pane hr { border: none; border-top: 2px solid var(--color-border-card); margin: 1.2rem 0; }
    app-md-editor .preview-pane table { width: 100%; border-collapse: collapse; margin: 0.9rem 0; font-size: 0.875rem; }
    app-md-editor .preview-pane th { background: #6366f10f; font-weight: 700; padding: 0.45rem 0.75rem; border: 1px solid var(--color-border-card); text-align: left; }
    app-md-editor .preview-pane td { padding: 0.45rem 0.75rem; border: 1px solid var(--color-border-card); }
    app-md-editor .preview-pane img { max-width: 100%; border-radius: 6px; margin: 0.75rem 0; }
  `],
})
export class MdEditorComponent implements ControlValueAccessor {
  @ViewChild('editor') editorRef!: ElementRef<HTMLTextAreaElement>;

  rows    = input(28);
  lang    = input<'en' | 'zh'>('zh');
  stretch = input(false); // fill parent height instead of rows-based height

  private platformId = inject(PLATFORM_ID);
  private isBrowser  = isPlatformBrowser(this.platformId);

  md          = signal('');
  previewHtml = signal('');
  disabled    = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void         = () => {};

  wordCount = () => {
    const text = this.md().trim();
    if (!text) return 0;
    return this.lang() === 'zh'
      ? text.replace(/\s/g, '').length
      : text.split(/\s+/).length;
  };

  constructor() {
    effect(() => {
      const content = this.md();
      if (!this.isBrowser) return;
      const result = marked.parse(content);
      this.previewHtml.set(typeof result === 'string' ? result : '');
    });
  }

  // ── ControlValueAccessor ────────────────────────────────────────────────────
  writeValue(v: string) { this.md.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void)         { this.onTouched = fn; }
  setDisabledState(d: boolean)              { this.disabled.set(d); }

  onInput(e: Event) {
    const val = (e.target as HTMLTextAreaElement).value;
    this.md.set(val);
    this.onChange(val);
    this.onTouched();
  }

  // ── Toolbar actions ─────────────────────────────────────────────────────────
  readonly toolbarBtns: ToolbarBtn[] = [
    { icon: 'H1',  title: 'Heading 1',     action: () => this.prefixLine('# ') },
    { icon: 'H2',  title: 'Heading 2',     action: () => this.prefixLine('## ') },
    { icon: 'H3',  title: 'Heading 3',     action: () => this.prefixLine('### ') },
    { icon: '|',   title: '',              action: () => {} },
    { icon: '**B**', title: 'Bold',        action: () => this.wrap('**', '**', '粗体') },
    { icon: '_I_', title: 'Italic',        action: () => this.wrap('_', '_', '斜体') },
    { icon: '~~',  title: 'Strikethrough', action: () => this.wrap('~~', '~~', '删除线') },
    { icon: '|',   title: '',              action: () => {} },
    { icon: '`c`', title: 'Inline code',   action: () => this.wrap('`', '`', 'code') },
    { icon: '```', title: 'Code block',    action: () => this.wrap('```\n', '\n```', 'code here') },
    { icon: '|',   title: '',              action: () => {} },
    { icon: '❝',   title: 'Blockquote',   action: () => this.prefixLine('> ') },
    { icon: '—',   title: 'HR',            action: () => this.insertRaw('\n\n---\n\n') },
    { icon: '•',   title: 'List item',     action: () => this.prefixLine('- ') },
    { icon: '1.',  title: 'Ordered list',  action: () => this.prefixLine('1. ') },
    { icon: '|',   title: '',              action: () => {} },
    { icon: '🔗',  title: 'Link',          action: () => this.wrap('[', '](url)', '链接文字') },
    { icon: '🖼',  title: 'Image',         action: () => this.insertRaw('![alt text](url)\n') },
  ];

  private getTA(): HTMLTextAreaElement | null {
    return this.editorRef?.nativeElement ?? null;
  }

  private wrap(before: string, after: string, placeholder: string) {
    const ta = this.getTA();
    if (!ta) return;
    const start    = ta.selectionStart;
    const end      = ta.selectionEnd;
    const selected = ta.value.slice(start, end) || placeholder;
    const inserted = before + selected + after;
    const newVal   = ta.value.slice(0, start) + inserted + ta.value.slice(end);
    this.applyValue(ta, newVal, start + before.length, start + before.length + selected.length);
  }

  private prefixLine(prefix: string) {
    const ta = this.getTA();
    if (!ta) return;
    const start     = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd   = ta.value.indexOf('\n', start);
    const end       = lineEnd === -1 ? ta.value.length : lineEnd;
    const line      = ta.value.slice(lineStart, end);
    const toggled   = line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line;
    const newVal    = ta.value.slice(0, lineStart) + toggled + ta.value.slice(end);
    const cursor    = lineStart + toggled.length;
    this.applyValue(ta, newVal, cursor, cursor);
  }

  private insertRaw(text: string) {
    const ta = this.getTA();
    if (!ta) return;
    const pos    = ta.selectionStart;
    const newVal = ta.value.slice(0, pos) + text + ta.value.slice(pos);
    this.applyValue(ta, newVal, pos + text.length, pos + text.length);
  }

  private applyValue(ta: HTMLTextAreaElement, newVal: string, selStart: number, selEnd: number) {
    ta.value = newVal;
    this.md.set(newVal);
    this.onChange(newVal);
    ta.focus();
    setTimeout(() => ta.setSelectionRange(selStart, selEnd), 0);
  }
}
