import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface TableInfo {
  name: string;
  row_count: number;
  size: string;
}

interface BackupEntry {
  name: string;
  size: number;
  created_at: string;
  tables: string[];
}

type AdminDbTab = 'backup' | 'restore' | 'history';

@Component({
  selector: 'app-admin-database',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="p-6 max-w-5xl mx-auto flex flex-col gap-6">

  <!-- Header -->
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-xl">🗄️</div>
    <div>
      <h1 class="text-xl font-black text-[var(--color-text-main)]">数据库管理</h1>
      <p class="text-xs text-[var(--color-text-secondary)]">备份、恢复、管理 gm_ 数据表</p>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 p-1 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] w-fit">
    @for (tab of tabs; track tab.id) {
      <button (click)="activeTab.set(tab.id)"
        class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
        [class]="activeTab() === tab.id
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]'">
        {{ tab.label }}
      </button>
    }
  </div>

  <!-- ── BACKUP TAB ── -->
  @if (activeTab() === 'backup') {
    <div class="flex flex-col gap-4">

      <!-- Table selection -->
      <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-card)] bg-[var(--color-bg-main)]">
          <span class="text-sm font-black text-[var(--color-text-main)]">选择要备份的表</span>
          <div class="flex items-center gap-3">
            <span class="text-xs text-[var(--color-text-secondary)]">已选 {{ selectedBackupTables().length }} / {{ tables().length }}</span>
            <button (click)="toggleAllBackup()" class="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
              {{ allBackupSelected() ? '取消全选' : '全选' }}
            </button>
          </div>
        </div>
        @if (loadingTables()) {
          <div class="px-5 py-8 text-center text-sm text-[var(--color-text-secondary)] animate-pulse">加载中…</div>
        } @else {
          <div class="divide-y divide-[var(--color-border-card)] max-h-96 overflow-y-auto">
            @for (t of tables(); track t.name) {
              <label class="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-bg-main)] cursor-pointer transition-colors">
                <input type="checkbox"
                  [checked]="backupSelection()[t.name]"
                  (change)="toggleBackupTable(t.name)"
                  class="w-4 h-4 accent-cyan-500 cursor-pointer">
                <span class="font-mono text-sm text-[var(--color-text-main)] flex-1">{{ t.name }}</span>
                <span class="text-xs text-[var(--color-text-secondary)] tabular-nums">{{ t.row_count | number }} 行</span>
                <span class="text-xs text-[var(--color-text-secondary)] w-16 text-right">{{ t.size }}</span>
              </label>
            }
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-3">
        <button (click)="downloadBackup()"
          [disabled]="backupLoading() || selectedBackupTables().length === 0"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow shadow-cyan-500/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          @if (backupLoading()) {
            <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
            备份中…
          } @else {
            ⬇ 下载备份 ZIP
          }
        </button>
        <button (click)="saveBackup()"
          [disabled]="backupLoading() || selectedBackupTables().length === 0"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          💾 保存到服务器
        </button>
      </div>

      @if (backupMsg()) {
        <div class="px-4 py-3 rounded-xl text-sm font-bold"
          [class]="backupMsgOk() ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'">
          {{ backupMsg() }}
        </div>
      }
    </div>
  }

  <!-- ── RESTORE TAB ── -->
  @if (activeTab() === 'restore') {
    <div class="flex flex-col gap-4 max-w-xl">

      <!-- File upload -->
      <div class="rounded-2xl border-2 border-dashed border-[var(--color-border-card)] p-6 text-center transition-colors"
        [class]="restoreFile() ? 'border-cyan-500/50 bg-cyan-500/5' : 'hover:border-cyan-500/30'"
        (dragover)="$event.preventDefault()"
        (drop)="onRestoreDrop($event)">
        @if (restoreFile()) {
          <div class="flex flex-col items-center gap-2">
            <span class="text-3xl">📦</span>
            <p class="font-black text-[var(--color-text-main)]">{{ restoreFile()!.name }}</p>
            <p class="text-xs text-[var(--color-text-secondary)]">{{ formatBytes(restoreFile()!.size) }}</p>
            <button (click)="clearRestoreFile()" class="text-xs text-red-400 hover:text-red-300 mt-1">✕ 移除</button>
          </div>
        } @else {
          <div class="flex flex-col items-center gap-2">
            <span class="text-3xl text-[var(--color-text-secondary)]">📂</span>
            <p class="text-sm text-[var(--color-text-secondary)]">拖拽备份 ZIP 文件到这里，或</p>
            <label class="px-4 py-2 rounded-xl border border-cyan-500/40 text-cyan-400 text-sm font-bold cursor-pointer hover:bg-cyan-500/10 transition-colors">
              选择文件
              <input type="file" accept=".zip" class="hidden" (change)="onRestoreFileChange($event)">
            </label>
          </div>
        }
      </div>

      <!-- Parsed manifest info -->
      @if (restoreManifest()) {
        <div class="rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-4 flex flex-col gap-2">
          <p class="text-xs font-black text-[var(--color-text-secondary)] uppercase tracking-wider">备份信息</p>
          <p class="text-xs text-[var(--color-text-secondary)]">创建时间：<span class="text-[var(--color-text-main)]">{{ restoreManifest()!.created_at | date:'yyyy-MM-dd HH:mm:ss' }}</span></p>
          <p class="text-xs text-[var(--color-text-secondary)]">包含 <span class="font-bold text-cyan-400">{{ restoreManifest()!.tables.length }}</span> 张表</p>

          <!-- Table selection for restore -->
          <div class="mt-2 border-t border-[var(--color-border-card)] pt-2">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-[var(--color-text-main)]">选择要恢复的表</span>
              <button (click)="toggleAllRestore()" class="text-xs font-bold text-cyan-400 hover:text-cyan-300">
                {{ allRestoreSelected() ? '取消全选' : '全选' }}
              </button>
            </div>
            <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
              @for (t of restoreManifest()!.tables; track t) {
                <label class="flex items-center gap-2 text-xs cursor-pointer hover:text-[var(--color-text-main)] text-[var(--color-text-secondary)]">
                  <input type="checkbox" [checked]="restoreSelection()[t]" (change)="toggleRestoreTable(t)" class="accent-cyan-500">
                  <span class="font-mono">{{ t }}</span>
                </label>
              }
            </div>
          </div>
        </div>
      }

      <!-- Confirm input -->
      <div class="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex flex-col gap-3">
        <div class="flex items-start gap-2">
          <span class="text-lg">⚠️</span>
          <div>
            <p class="text-sm font-black text-red-400">危险操作</p>
            <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">恢复将清空并覆盖所选表的全部数据，此操作不可撤销。</p>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-[var(--color-text-secondary)]">输入 <span class="text-red-400 font-black">CONFIRM</span> 确认</label>
          <input [(ngModel)]="restoreConfirm"
            type="text"
            placeholder="CONFIRM"
            class="px-3 py-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] text-sm text-[var(--color-text-main)] focus:outline-none focus:border-red-500/60 font-mono">
        </div>
      </div>

      <button (click)="doRestore()"
        [disabled]="restoreLoading() || !restoreFile() || restoreConfirm !== 'CONFIRM' || selectedRestoreTables().length === 0"
        class="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-red-500 to-rose-600 text-white shadow shadow-red-500/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
        @if (restoreLoading()) {
          <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
          恢复中…
        } @else {
          🔄 开始恢复
        }
      </button>

      @if (restoreMsg()) {
        <div class="px-4 py-3 rounded-xl text-sm font-bold"
          [class]="restoreMsgOk() ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'">
          {{ restoreMsg() }}
        </div>
      }
    </div>
  }

  <!-- ── HISTORY TAB ── -->
  @if (activeTab() === 'history') {
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-sm font-black text-[var(--color-text-main)]">服务器备份文件</span>
        <button (click)="loadHistory()" class="text-xs text-cyan-400 hover:text-cyan-300 font-bold transition-colors">↺ 刷新</button>
      </div>

      @if (loadingHistory()) {
        <div class="text-center py-8 text-sm text-[var(--color-text-secondary)] animate-pulse">加载中…</div>
      } @else if (backupHistory().length === 0) {
        <div class="text-center py-12 flex flex-col items-center gap-2">
          <span class="text-4xl text-[var(--color-text-secondary)]">📭</span>
          <p class="text-sm text-[var(--color-text-secondary)]">暂无服务器备份，可在「备份」页点击「保存到服务器」</p>
        </div>
      } @else {
        <div class="rounded-2xl border border-[var(--color-border-card)] overflow-hidden">
          <div class="divide-y divide-[var(--color-border-card)]">
            @for (entry of backupHistory(); track entry.name) {
              <div class="flex items-center gap-3 px-5 py-4 hover:bg-[var(--color-bg-main)] transition-colors">
                <span class="text-xl shrink-0">📦</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-black text-[var(--color-text-main)] truncate">{{ entry.name }}</p>
                  <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {{ formatBytes(entry.size) }} · {{ entry.created_at | date:'MM-dd HH:mm' }} ·
                    <span class="text-cyan-400">{{ entry.tables.length }} 张表</span>
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button (click)="downloadSaved(entry.name)"
                    class="px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-400 text-xs font-bold hover:bg-cyan-500/10 transition-colors">
                    ⬇ 下载
                  </button>
                  <button (click)="restoreFromHistory(entry)"
                    class="px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-400 text-xs font-bold hover:bg-amber-500/10 transition-colors">
                    🔄 恢复
                  </button>
                  <button (click)="deleteBackup(entry.name)"
                    class="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors">
                    🗑
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  }

</div>
  `
})
export class AdminDatabaseComponent implements OnInit {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/db`;

  tabs = [
    { id: 'backup' as AdminDbTab, label: '📦 备份' },
    { id: 'restore' as AdminDbTab, label: '🔄 恢复' },
    { id: 'history' as AdminDbTab, label: '📋 备份历史' },
  ];

  activeTab = signal<AdminDbTab>('backup');

  // ── Backup tab ──
  tables = signal<TableInfo[]>([]);
  loadingTables = signal(false);
  backupSelection = signal<Record<string, boolean>>({});
  backupLoading = signal(false);
  backupMsg = signal('');
  backupMsgOk = signal(false);

  selectedBackupTables = computed(() =>
    Object.entries(this.backupSelection()).filter(([, v]) => v).map(([k]) => k)
  );
  allBackupSelected = computed(() =>
    this.tables().length > 0 && this.selectedBackupTables().length === this.tables().length
  );

  // ── Restore tab ──
  restoreFile = signal<File | null>(null);
  restoreManifest = signal<{ created_at: string; tables: string[] } | null>(null);
  restoreSelection = signal<Record<string, boolean>>({});
  restoreConfirm = '';
  restoreLoading = signal(false);
  restoreMsg = signal('');
  restoreMsgOk = signal(false);

  selectedRestoreTables = computed(() =>
    Object.entries(this.restoreSelection()).filter(([, v]) => v).map(([k]) => k)
  );
  allRestoreSelected = computed(() => {
    const m = this.restoreManifest();
    if (!m) return false;
    return m.tables.length > 0 && this.selectedRestoreTables().length === m.tables.length;
  });

  // ── History tab ──
  backupHistory = signal<BackupEntry[]>([]);
  loadingHistory = signal(false);

  ngOnInit() {
    this.loadTables();
    this.loadHistory();
  }

  loadTables() {
    this.loadingTables.set(true);
    this.http.get<TableInfo[]>(`${this.base}/tables`).subscribe({
      next: tables => {
        this.tables.set(tables);
        const sel: Record<string, boolean> = {};
        tables.forEach(t => sel[t.name] = true);
        this.backupSelection.set(sel);
        this.loadingTables.set(false);
      },
      error: () => this.loadingTables.set(false),
    });
  }

  loadHistory() {
    this.loadingHistory.set(true);
    this.http.get<BackupEntry[]>(`${this.base}/backups`).subscribe({
      next: list => { this.backupHistory.set(list); this.loadingHistory.set(false); },
      error: () => this.loadingHistory.set(false),
    });
  }

  toggleAllBackup() {
    const sel: Record<string, boolean> = {};
    const setTo = !this.allBackupSelected();
    this.tables().forEach(t => sel[t.name] = setTo);
    this.backupSelection.set(sel);
  }

  toggleBackupTable(name: string) {
    this.backupSelection.update(s => ({ ...s, [name]: !s[name] }));
  }

  downloadBackup() {
    this.backupLoading.set(true);
    this.backupMsg.set('');
    const tables = this.selectedBackupTables();
    this.http.post(`${this.base}/backup/download`, { tables }, { responseType: 'blob' }).subscribe({
      next: blob => {
        this.triggerDownload(blob, `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`);
        this.backupLoading.set(false);
        this.backupMsg.set('✅ 备份下载成功');
        this.backupMsgOk.set(true);
      },
      error: () => {
        this.backupLoading.set(false);
        this.backupMsg.set('❌ 备份失败，请查看控制台');
        this.backupMsgOk.set(false);
      },
    });
  }

  saveBackup() {
    this.backupLoading.set(true);
    this.backupMsg.set('');
    const tables = this.selectedBackupTables();
    this.http.post<{ filename: string; size: number }>(`${this.base}/backup/save`, { tables }).subscribe({
      next: res => {
        this.backupLoading.set(false);
        this.backupMsg.set(`✅ 已保存到服务器：${res.filename}（${this.formatBytes(res.size)}）`);
        this.backupMsgOk.set(true);
        this.loadHistory();
      },
      error: () => {
        this.backupLoading.set(false);
        this.backupMsg.set('❌ 保存失败');
        this.backupMsgOk.set(false);
      },
    });
  }

  onRestoreFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.setRestoreFile(file);
  }

  onRestoreDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file?.name.endsWith('.zip')) this.setRestoreFile(file);
  }

  private setRestoreFile(file: File) {
    this.restoreFile.set(file);
    this.restoreMsg.set('');
    this.parseRestoreManifest(file);
  }

  clearRestoreFile() {
    this.restoreFile.set(null);
    this.restoreManifest.set(null);
    this.restoreSelection.set({});
    this.restoreConfirm = '';
    this.restoreMsg.set('');
  }

  private parseRestoreManifest(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    this.http.post<{ version: string; created_at: string; tables: string[] }>(
      `${this.base}/backup/inspect`, formData
    ).subscribe({
      next: manifest => {
        this.restoreManifest.set(manifest);
        const sel: Record<string, boolean> = {};
        manifest.tables?.forEach(t => sel[t] = true);
        this.restoreSelection.set(sel);
      },
      error: () => {
        this.restoreManifest.set({ created_at: new Date().toISOString(), tables: [] });
      },
    });
  }

  toggleAllRestore() {
    const m = this.restoreManifest();
    if (!m) return;
    const setTo = !this.allRestoreSelected();
    const sel: Record<string, boolean> = {};
    m.tables.forEach(t => sel[t] = setTo);
    this.restoreSelection.set(sel);
  }

  toggleRestoreTable(name: string) {
    this.restoreSelection.update(s => ({ ...s, [name]: !s[name] }));
  }

  doRestore() {
    if (this.restoreConfirm !== 'CONFIRM' || !this.restoreFile()) return;
    this.restoreLoading.set(true);
    this.restoreMsg.set('');

    const formData = new FormData();
    formData.append('file', this.restoreFile()!);
    formData.append('confirm', 'CONFIRM');
    const tables = this.selectedRestoreTables();
    if (tables.length > 0) {
      formData.append('tables', JSON.stringify(tables));
    }

    this.http.post<{ ok: boolean; restored: string[] }>(`${this.base}/restore`, formData).subscribe({
      next: res => {
        this.restoreLoading.set(false);
        this.restoreMsg.set(`✅ 恢复成功，共 ${res.restored.length} 张表`);
        this.restoreMsgOk.set(true);
        this.restoreConfirm = '';
      },
      error: (err) => {
        this.restoreLoading.set(false);
        this.restoreMsg.set('❌ ' + (err.error?.error ?? '恢复失败'));
        this.restoreMsgOk.set(false);
      },
    });
  }

  downloadSaved(name: string) {
    window.open(`${this.base}/backups/${encodeURIComponent(name)}/download`, '_blank');
  }

  deleteBackup(name: string) {
    if (!confirm(`确认删除备份 ${name}？`)) return;
    this.http.delete(`${this.base}/backups/${encodeURIComponent(name)}`).subscribe({
      next: () => this.loadHistory(),
    });
  }

  restoreFromHistory(entry: BackupEntry) {
    this.activeTab.set('restore');
    // Pre-fill manifest info so user can see what's available
    this.restoreManifest.set({ created_at: entry.created_at, tables: entry.tables ?? [] });
    const sel: Record<string, boolean> = {};
    entry.tables?.forEach(t => sel[t] = true);
    this.restoreSelection.set(sel);
    this.restoreMsg.set('请上传备份文件后点击「开始恢复」');
    this.restoreMsgOk.set(true);
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}
