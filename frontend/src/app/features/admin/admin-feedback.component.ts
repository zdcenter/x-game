import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';

interface FeedbackItem {
  id: string;
  user_id?: string;
  username?: string;
  game_id: string;
  level: string;
  type: string;
  content: string;
  device_info: string;
  contact: string;
  status: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--color-border-card)]">
        <div>
          <h1 class="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>🐞</span>
            <span>玩家反馈与 Bug 监控中心</span>
          </h1>
          <p class="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            实时查看 18 款游戏玩家提交的问题报告、玩法建议与题目报错
          </p>
        </div>
        <button (click)="loadFeedbacks()" [disabled]="isLoading()"
                class="px-4 py-2 rounded-xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer">
          <span [class.animate-spin]="isLoading()">🔄</span>
          <span>刷新</span>
        </button>
      </div>

      <!-- Filter Controls -->
      <div class="flex flex-wrap items-center gap-3 p-3.5 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] text-xs">
        <!-- Game Filter -->
        <div class="flex items-center gap-1.5">
          <span class="text-[var(--color-text-muted)]">游戏:</span>
          <select [(ngModel)]="filterGame" (change)="applyFilters()"
                  class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none cursor-pointer">
            <option value="">全部游戏</option>
            @for (g of gameList; track g) {
              <option [value]="g">{{ g }}</option>
            }
          </select>
        </div>

        <!-- Type Filter -->
        <div class="flex items-center gap-1.5">
          <span class="text-[var(--color-text-muted)]">类型:</span>
          <select [(ngModel)]="filterType" (change)="applyFilters()"
                  class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none cursor-pointer">
            <option value="">全部类型</option>
            <option value="bug">🐛 Bug 报告</option>
            <option value="suggestion">💡 体验建议</option>
            <option value="wrong_answer">⚠️ 题目有误</option>
            <option value="other">💬 其它问题</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div class="flex items-center gap-1.5">
          <span class="text-[var(--color-text-muted)]">状态:</span>
          <select [(ngModel)]="filterStatus" (change)="applyFilters()"
                  class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none cursor-pointer">
            <option value="">全部状态</option>
            <option value="pending">⏳ 待处理</option>
            <option value="resolved">✅ 已解决</option>
            <option value="ignored">🚫 已忽略</option>
          </select>
        </div>

        <div class="ml-auto text-[var(--color-text-muted)] font-mono">
          共 {{ total() }} 条反馈
        </div>
      </div>

      <!-- Feedbacks List -->
      @if (isLoading()) {
        <div class="py-12 flex justify-center items-center text-[var(--color-text-muted)] text-sm">
          <span class="animate-spin mr-2">⏳</span> 加载反馈数据中...
        </div>
      } @else if (feedbacks().length === 0) {
        <div class="py-16 text-center bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] p-6">
          <span class="text-4xl block mb-2">🎉</span>
          <p class="text-sm font-bold text-[var(--color-text-main)]">暂无匹配的玩家反馈</p>
          <p class="text-xs text-[var(--color-text-muted)] mt-1">系统运行良好，或当前筛选条件暂无数据</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (item of feedbacks(); track item.id) {
            <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-4 sm:p-5 transition-all hover:border-[var(--color-border-card)]/80 shadow-sm">
              <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[var(--color-border-card)]/60 text-xs">
                <div class="flex flex-wrap items-center gap-2">
                  <!-- Type Badge -->
                  <span class="px-2 py-0.5 rounded-md font-bold"
                        [ngClass]="{
                          'bg-red-500/15 text-red-400 border border-red-500/30': item.type === 'bug',
                          'bg-amber-500/15 text-amber-400 border border-amber-500/30': item.type === 'wrong_answer',
                          'bg-blue-500/15 text-blue-400 border border-blue-500/30': item.type === 'suggestion',
                          'bg-purple-500/15 text-purple-400 border border-purple-500/30': item.type === 'other'
                        }">
                    {{ formatType(item.type) }}
                  </span>

                  <!-- Game & Level Badge -->
                  @if (item.game_id) {
                    <span class="px-2 py-0.5 rounded-md bg-[var(--color-bg-main)] border border-[var(--color-border-card)] font-bold text-[var(--color-text-main)]">
                      🎮 {{ item.game_id }}
                    </span>
                  }
                  @if (item.level) {
                    <span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-bold">
                      🎯 {{ item.level }}
                    </span>
                  }

                  <!-- User -->
                  <span class="text-[var(--color-text-muted)]">
                    👤 {{ item.username || '匿名玩家' }}
                  </span>
                </div>

                <div class="flex items-center gap-3">
                  <span class="text-[11px] text-[var(--color-text-muted)] font-mono">
                    {{ item.created_at | date:'yyyy-MM-dd HH:mm' }}
                  </span>

                  <!-- Status Badge -->
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        [ngClass]="{
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30': item.status === 'pending',
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30': item.status === 'resolved',
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30': item.status === 'ignored'
                        }">
                    {{ formatStatus(item.status) }}
                  </span>
                </div>
              </div>

              <!-- Main Content -->
              <p class="text-xs sm:text-sm text-[var(--color-text-main)] whitespace-pre-wrap leading-relaxed mb-3">
                {{ item.content }}
              </p>

              <!-- Extra Meta: Device & Contact -->
              <div class="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border-card)]/40">
                @if (item.device_info) {
                  <span class="truncate max-w-md" [title]="item.device_info">
                    📱 {{ item.device_info }}
                  </span>
                }
                @if (item.contact) {
                  <span class="px-2 py-0.5 rounded bg-[var(--color-bg-main)] font-mono text-[var(--color-text-secondary)]">
                    📬 联系方式: {{ item.contact }}
                  </span>
                }
                
                <!-- Action Controls -->
                <div class="ml-auto flex items-center gap-2">
                  @if (item.status === 'pending') {
                    <button (click)="updateStatus(item, 'resolved')"
                            class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-[11px] cursor-pointer">
                      ✓ 标为已解决
                    </button>
                    <button (click)="updateStatus(item, 'ignored')"
                            class="px-2.5 py-1 rounded-lg bg-slate-500/20 text-slate-400 hover:bg-slate-600 hover:text-white transition-all font-bold text-[11px] cursor-pointer">
                      🚫 忽略
                    </button>
                  } @else {
                    <button (click)="updateStatus(item, 'pending')"
                            class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white transition-all font-bold text-[11px] cursor-pointer">
                      ↺ 重新激活
                    </button>
                  }
                  <button (click)="deleteFeedback(item)"
                          class="px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-all text-[11px] cursor-pointer"
                          title="删除">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AdminFeedbackComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  feedbacks = signal<FeedbackItem[]>([]);
  total = signal(0);
  isLoading = signal(false);

  filterGame = '';
  filterType = '';
  filterStatus = '';

  gameList = [
    'minesweeper', 'sudoku', 'math24', 'sokoban', 'connect',
    'hashi', 'sliding', 'lightsout', 'towers', 'bridges',
    'hexa', 'block', 'classic2048', 'drop2048', 'gomoku',
    'tetris', 'word', 'memory', 'link', 'puzzle', 'idiom'
  ];

  ngOnInit() {
    this.loadFeedbacks();
  }

  loadFeedbacks() {
    this.isLoading.set(true);
    let params: any = { limit: 50 };
    if (this.filterGame) params.game_id = this.filterGame;
    if (this.filterType) params.type = this.filterType;
    if (this.filterStatus) params.status = this.filterStatus;

    this.http.get<{ data: FeedbackItem[]; total: number }>('/api/v1/admin/feedbacks', { params }).subscribe({
      next: (res) => {
        this.feedbacks.set(res.data || []);
        this.total.set(res.total || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('加载反馈列表失败');
        this.isLoading.set(false);
      }
    });
  }

  applyFilters() {
    this.loadFeedbacks();
  }

  updateStatus(item: FeedbackItem, status: string) {
    this.http.put(`/api/v1/admin/feedbacks/${item.id}`, { status }).subscribe({
      next: () => {
        item.status = status;
        this.toast.success('状态更新成功');
      },
      error: () => {
        this.toast.error('更新失败');
      }
    });
  }

  deleteFeedback(item: FeedbackItem) {
    if (!confirm('确定删除该反馈记录吗？')) return;
    this.http.delete(`/api/v1/admin/feedbacks/${item.id}`).subscribe({
      next: () => {
        this.feedbacks.update(list => list.filter(f => f.id !== item.id));
        this.total.update(n => n - 1);
        this.toast.success('已删除');
      },
      error: () => {
        this.toast.error('删除失败');
      }
    });
  }

  formatType(type: string): string {
    switch (type) {
      case 'bug': return '🐛 游戏Bug';
      case 'suggestion': return '💡 体验建议';
      case 'wrong_answer': return '⚠️ 题目有误';
      default: return '💬 其它';
    }
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'pending': return '待处理';
      case 'resolved': return '已解决';
      case 'ignored': return '已忽略';
      default: return status;
    }
  }
}
