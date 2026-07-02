import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { GameStatus } from '../../../../core/models/game.model';
import { ConnectStore } from '../connect.store';

@Component({
  selector: 'app-connect-lobby',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'flex-grow flex flex-col w-full h-full min-h-0' },
  template: `
    <div class="flex-1 flex flex-col p-2 lg:p-6 w-full h-full min-h-0">
      <div class="flex-1 flex flex-col h-full bg-[var(--color-bg-card)] rounded-2xl shadow-xl border border-[var(--color-border-card)] overflow-hidden min-w-0 min-h-0">
      
      <!-- Header Tabs -->
      <div class="flex border-b border-[var(--color-border-card)] bg-black/20">
        <button *ngFor="let diff of difficulties"
            (click)="selectDifficulty(diff.id)"
            class="flex-1 py-4 text-center font-bold text-lg transition-all border-b-2"
            [class.text-[var(--color-accent-from)]]="store.currentDifficulty() === diff.id"
            [class.border-[var(--color-accent-from)]]="store.currentDifficulty() === diff.id"
            [class.text-slate-400]="store.currentDifficulty() !== diff.id"
            [class.border-transparent]="store.currentDifficulty() !== diff.id"
            [class.hover:text-slate-200]="store.currentDifficulty() !== diff.id">
          {{ i18n.t(diff.labelKey)() }}
        </button>
      </div>

      <!-- Level Grid -->
      <div class="flex items-center justify-between px-6 pt-4 pb-2">
        <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          {{ i18n.t('game.total_levels')() }}: {{ store.levelsList().length }}
        </span>
      </div>
      <div class="flex-1 px-6 pb-6 overflow-y-auto custom-scrollbar min-h-0">
        <div *ngIf="store.levelsList().length === 0" class="flex justify-center items-center h-full">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-accent-from)]"></div>
        </div>
        
        <div *ngIf="store.levelsList().length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <button *ngFor="let level of store.levelsList(); let i = index"
            (click)="startLevel.emit(level.id)"
            class="flex flex-col items-center p-4 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-main)] hover:border-[var(--color-accent-from)] hover:shadow-[0_0_15px_rgba(var(--color-accent-from-rgb),0.3)] transition-all group relative overflow-hidden"
          >
            <!-- Status indicator -->
            <div *ngIf="level.progress?.status === GameStatus.Playing" class="absolute top-0 right-0 w-8 h-8 bg-yellow-500/20 rotate-45 transform translate-x-4 -translate-y-4"></div>
            <div *ngIf="level.progress?.status === GameStatus.Playing" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
            
            <span class="text-sm sm:text-lg font-black text-slate-300 group-hover:text-white transition-colors mb-2 whitespace-nowrap">
              关卡 {{ i + 1 | number:'3.0-0' }}
            </span>
            
            <!-- Stars -->
            <div class="flex gap-1 h-4">
              <ng-container *ngIf="level.progress?.status === GameStatus.Finished">
                <span *ngFor="let star of [1,2,3]" 
                      [class.text-yellow-400]="star <= (level.progress.stars || 3)"
                      [class.text-slate-700]="star > (level.progress.stars || 3)"
                      class="drop-shadow-[0_0_2px_rgba(250,204,21,0.5)] text-xs">
                  ★
                </span>
              </ng-container>
            </div>
            
            <span *ngIf="level.progress?.status === GameStatus.Playing" class="text-[10px] text-yellow-500 font-bold mt-2 uppercase tracking-wider">In Progress</span>
          </button>
        </div>
      </div>

      </div>
    </div>
  `
})
export class ConnectLobbyComponent implements OnInit {
  store = inject(ConnectStore);
  i18n = inject(I18nService);
  GameStatus = GameStatus;

  @Output() startLevel = new EventEmitter<string>();

  difficulties = [
    { id: 'easy', labelKey: 'game.diff_easy' },
    { id: 'medium', labelKey: 'game.diff_medium' },
    { id: 'hard', labelKey: 'game.diff_hard' },
    { id: 'expert', labelKey: 'game.diff_expert' }
  ];

  ngOnInit() {
    if (this.store.levelsList().length === 0) {
      this.store.fetchLevelsAndLoad(this.store.currentDifficulty() || 'easy');
    }
  }

  selectDifficulty(diff: string) {
    this.store.changeSingleDifficulty(diff);
  }
}

