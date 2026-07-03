import { GameDifficulty, GameStatus } from '../../../../../core/models/game.model';
import { Component, EventEmitter, Output, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { storageGet, storageSet } from '../../../../../core/utils/browser.util';
import { environment } from '../../../../../../environments/environment';

interface LevelResponse {
  id: string;
  difficulty: string;
  content: string;
  progress?: {
    status: string;
    time_spent: number;
    stars: number;
  };
}

@Component({
  selector: 'app-hashi-lobby',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'flex-grow flex flex-col w-full h-full min-h-0' },
  template: `
    <div class="flex-1 flex flex-col p-2 lg:p-6 w-full h-full min-h-0">
      <div class="flex-1 flex flex-col h-full bg-[var(--color-bg-card)] rounded-2xl shadow-xl border border-[var(--color-border-card)] overflow-hidden min-w-0 min-h-0">
        <!-- Header Tabs -->
        <div class="flex border-b border-[var(--color-border-card)] bg-black/20">
          @for (diff of difficulties; track diff.id) {
            <button 
              (click)="selectDifficulty(diff.id)"
              class="flex-1 py-4 text-center font-bold text-lg transition-all border-b-2"
              [class.text-[var(--color-accent-from)]]="activeTab() === diff.id"
              [class.border-[var(--color-accent-from)]]="activeTab() === diff.id"
              [class.text-slate-400]="activeTab() !== diff.id"
              [class.border-transparent]="activeTab() !== diff.id"
              [class.hover:text-slate-200]="activeTab() !== diff.id">
              {{ i18n.t($any(diff.labelKey))() }}
            </button>
          }
        </div>

        <!-- Level Grid -->
        <div class="flex items-center justify-between px-6 pt-4 pb-2">
          <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            总关卡: {{ levels().length }}
          </span>
        </div>
        <div class="flex-1 px-6 pb-6 overflow-y-auto custom-scrollbar min-h-0">
          @if (loading()) {
            <div class="flex justify-center items-center h-full">
              <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-accent-from)]"></div>
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              @for (level of levels(); track level.id; let i = $index) {
                <button 
                  (click)="playLevel(level, i)"
                  class="flex flex-col items-center p-4 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] hover:border-[var(--color-accent-from)] hover:shadow-[0_0_15px_rgba(var(--color-accent-from-rgb),0.3)] transition-all group relative overflow-hidden"
                >
                  <!-- Status indicator -->
                  @if (level.progress?.status === 'playing') {
                    <div class="absolute top-0 right-0 w-8 h-8 bg-yellow-500/20 rotate-45 transform translate-x-4 -translate-y-4"></div>
                    <div class="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  }
                  
                  <span class="text-sm sm:text-lg font-black text-slate-300 group-hover:text-white transition-colors mb-2 whitespace-nowrap">
                    关卡 {{ i + 1 | number:'3.0-0' }}
                  </span>
                  
                  <!-- Stars -->
                  <div class="flex gap-1 h-4">
                    @if (level.progress?.status === 'finished') {
                      @for (star of [1,2,3]; track star) {
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" 
                             [class.text-yellow-400]="(level.progress?.stars || 3) >= star"
                             [class.text-slate-700]="(level.progress?.stars || 3) < star"
                             viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      }
                    }
                  </div>
                  
                  @if (level.progress?.status === 'playing') {
                    <span class="text-[10px] text-yellow-500 font-bold mt-2 uppercase tracking-wider">In Progress</span>
                  }
                </button>
              }
            </div>
            
            @if (levels().length === 0) {
              <div class="text-center text-[var(--color-text-muted)] mt-10">
                Coming soon
              </div>
            }
          }
        </div>
      </div>
    </div>
  `
})
export class HashiLobbyComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);

  @Output() levelSelect = new EventEmitter<{ id: string, puzzle: string, difficulty: string, levelIndex: number }>();

  difficulties = [
    { id: 'easy', labelKey: 'game.diff_hashi_easy' },
    { id: 'medium', labelKey: 'game.diff_hashi_medium' },
    { id: 'hard', labelKey: 'game.diff_hashi_hard' },
    { id: 'expert', labelKey: 'game.diff_hashi_expert' }
  ];

  activeTab = signal<string>(storageGet('hashi_single_diff') || 'easy');
  levels = signal<LevelResponse[]>([]);
  loading = signal<boolean>(false);

  ngOnInit() {
    this.loadLevels(this.activeTab());
  }

  selectDifficulty(diff: string) {
    storageSet('hashi_single_diff', diff);
    this.activeTab.set(diff);
    this.loadLevels(diff);
  }

  private loadLevels(difficulty: string) {
    this.loading.set(true);
    this.http.get<LevelResponse[]>(`${environment.apiUrl}/hashi/levels/${difficulty}`).subscribe({
      next: (data) => {
        this.levels.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  playLevel(level: LevelResponse, index: number) {
    this.http.get<any>(`${environment.apiUrl}/hashi/puzzle/${level.id}`).subscribe(res => {
      this.levelSelect.emit({ 
        id: res.puzzle.id, 
        puzzle: res.puzzle.content, // Using 'content' as defined in our Go struct
        difficulty: this.activeTab(),
        levelIndex: index 
      });
    });
  }
}
