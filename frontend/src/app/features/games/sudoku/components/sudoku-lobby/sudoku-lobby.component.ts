import { Component, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { SudokuStore } from '../../store/sudoku.store';
import { AuthStore } from '../../../../../core/auth/auth.store';
import { WebSocketService } from '../../../../../core/services/websocket.service';

interface LevelResponse {
  id: string;
  difficulty: string;
  progress: {
    status: string;
    current_state: string;
    time_spent: number;
    stars: number;
  };
}

@Component({
  selector: 'app-sudoku-lobby',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'flex-grow flex flex-col w-full h-full min-h-0' },
  template: `
    <div class="flex-grow flex flex-col lg:flex-row p-2 lg:p-6 gap-4 lg:gap-6 w-full h-full overflow-y-auto lg:overflow-hidden">
      <!-- LEFT: Level Grid -->
      <div class="flex-grow flex flex-col h-full bg-[var(--color-bg-card)] rounded-2xl shadow-xl border border-[var(--color-border-card)] overflow-hidden min-w-0">
      <!-- Lobby Header -->
      <div class="relative bg-gradient-to-r from-blue-900/30 to-emerald-900/30 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between border-b border-[var(--color-border-card)]">
        <div class="flex items-center gap-4 w-full">
          <button (click)="goBack()" class="p-2 bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] rounded-full transition-colors text-[var(--color-text-main)] hover:text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight uppercase">
                {{ i18n.t('lobby.sudoku')() || 'Sudoku' }}
              </h1>
              <p class="text-xs sm:text-sm text-[var(--color-text-main)] opacity-70 font-medium mt-1">
                Select a difficulty and level to start playing
              </p>
            </div>
          </div>
        </div>
      </div>

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
      <div class="flex-grow p-6 overflow-y-auto">
        @if (loading()) {
          <div class="flex justify-center items-center h-full">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-accent-from)]"></div>
          </div>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            @for (level of levels(); track level.id; let i = $index) {
              <button 
                (click)="playLevel(level)"
                class="flex flex-col items-center p-4 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] hover:border-[var(--color-accent-from)] hover:shadow-[0_0_15px_rgba(var(--color-accent-from-rgb),0.3)] transition-all group relative overflow-hidden"
              >
                <!-- Status indicator -->
                @if (level.progress.status === 'playing') {
                  <div class="absolute top-0 right-0 w-8 h-8 bg-yellow-500/20 rotate-45 transform translate-x-4 -translate-y-4"></div>
                  <div class="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                }
                
                <span class="text-2xl font-black text-slate-300 group-hover:text-white transition-colors mb-2">
                  {{ i + 1 | number:'2.0' }}
                </span>
                
                <!-- Stars -->
                <div class="flex gap-1 h-4">
                  @if (level.progress.status === 'finished') {
                    @for (star of [1,2,3]; track star) {
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" 
                           [class.text-yellow-400]="level.progress.stars >= star"
                           [class.text-slate-700]="level.progress.stars < star"
                           viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    }
                  }
                </div>
                
                @if (level.progress.status === 'playing') {
                  <span class="text-[10px] text-yellow-500 font-bold mt-2 uppercase tracking-wider">In Progress</span>
                }
              </button>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class SudokuLobbyComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private router = inject(Router);
  store = inject(SudokuStore);
  wsService = inject(WebSocketService);
  authStore = inject(AuthStore);
  
  playerId = this.authStore.currentUser()?.username || this.authStore.guestId;

  @Output() levelSelect = new EventEmitter<{id: string, puzzle: string, savedState?: string, timeSpent?: number}>();

  sudokuModes = [
    { id: 'pk_steal', labelKey: 'game.sudoku_pk_steal_label', icon: '⚡', descKey: 'game.sudoku_pk_steal_desc' },
    { id: 'pk_speed', labelKey: 'game.sudoku_pk_speed_label', icon: '⏱️', descKey: 'game.sudoku_pk_speed_desc' }
  ];

  difficulties = [
    { id: 'easy', labelKey: 'game.diff_easy', desc: 'A gentle start' },
    { id: 'medium', labelKey: 'game.diff_medium', desc: 'A fair challenge' },
    { id: 'hard', labelKey: 'game.diff_hard', desc: 'For experienced players' },
    { id: 'expert', labelKey: 'game.diff_expert', desc: 'True test of skill' }
  ];

  activeTab = signal<string>('easy');
  levels = signal<LevelResponse[]>([]);
  loading = signal<boolean>(false);

  ngOnInit() {
    this.loadLevels('easy');
  }

  selectDifficulty(diff: string) {
    this.activeTab.set(diff);
    this.loadLevels(diff);
  }

  private loadLevels(difficulty: string) {
    this.loading.set(true);
    this.http.get<LevelResponse[]>(`/api/v1/sudoku/levels/${difficulty}`).subscribe({
      next: (data) => {
        this.levels.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  playLevel(level: LevelResponse) {
    // Fetch the actual puzzle string
    this.http.get<any>(`/api/v1/sudoku/puzzle/${level.id}`).subscribe(res => {
      this.levelSelect.emit({
        id: res.puzzle.id,
        puzzle: res.puzzle.puzzle,
        savedState: res.progress?.current_state,
        timeSpent: res.progress?.time_spent
      });
    });
  }

  goBack() {
    this.router.navigate(['/lobby']);
  }
}
