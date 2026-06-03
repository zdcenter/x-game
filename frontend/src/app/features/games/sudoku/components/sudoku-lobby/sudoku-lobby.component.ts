import { GameHeaderComponent } from '../../../../../shared/components/game-header/game-header.component';
import { Component, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { SudokuStore } from '../../store/sudoku.store';
import { AuthStore } from '../../../../../core/auth/auth.store';
import { WebSocketService } from '../../../../../core/services/websocket.service';
import { GameRulesModalComponent } from '../../../../../shared/components/game-rules-modal/game-rules-modal.component';
import { environment } from '../../../../../../environments/environment';

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
  imports: [CommonModule, GameRulesModalComponent, GameHeaderComponent],
  host: { class: 'flex-grow flex flex-col w-full h-full min-h-0' },
  templateUrl: './sudoku-lobby.component.html',
  styleUrl: './sudoku-lobby.component.css'})
export class SudokuLobbyComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private router = inject(Router);
  store = inject(SudokuStore);
  wsService = inject(WebSocketService);
  authStore = inject(AuthStore);
  
  playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
  showRules = signal(false);

  @Output() openLobby = new EventEmitter<void>();
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
    this.http.get<LevelResponse[]>(`${environment.apiUrl}/sudoku/levels/${difficulty}`).subscribe({
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
    this.http.get<any>(`${environment.apiUrl}/sudoku/puzzle/${level.id}`).subscribe(res => {
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
