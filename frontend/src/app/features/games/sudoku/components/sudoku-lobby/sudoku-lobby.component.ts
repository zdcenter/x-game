import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';

import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { SudokuStore } from '../../store/sudoku.store';
import { AuthStore } from '../../../../../core/auth/auth.store';
import { WebSocketService } from '../../../../../core/services/websocket.service';
import { storageGet, storageSet, getSavedDifficulty, setSavedDifficulty } from '../../../../../core/utils/browser.util';

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

export const sudokuDifficulties = [
  { id: 'easy', labelKey: 'game.diff_sudoku_easy', descKey: 'game.diff_sudoku_easy_desc', desc: '9x9 (40+)' },
  { id: GameDifficulty.Medium, labelKey: 'game.diff_sudoku_medium', descKey: 'game.diff_sudoku_medium_desc', desc: '9x9 (30+)' },
  { id: GameDifficulty.Hard, labelKey: 'game.diff_sudoku_hard', descKey: 'game.diff_sudoku_hard_desc', desc: '9x9 (25+)' },
  { id: GameDifficulty.Expert, labelKey: 'game.diff_sudoku_expert', descKey: 'game.diff_sudoku_expert_desc', desc: '9x9 (20+)' }
];

@Component({
  selector: 'app-sudoku-lobby',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'flex-grow flex flex-col w-full h-full min-h-0' },
  templateUrl: './sudoku-lobby.component.html',
  styleUrl: './sudoku-lobby.component.css'})
export class SudokuLobbyComponent implements OnInit {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private router = inject(Router);
  store = inject(SudokuStore);
  wsService = inject(WebSocketService);
  authStore = inject(AuthStore);
  
  playerId = this.authStore.currentUser()?.username || this.authStore.guestId;

  @Output() openLobby = new EventEmitter<void>();
  @Output() levelSelect = new EventEmitter<{id: string, puzzle: string, solution?: string, savedState?: string, timeSpent?: number, difficulty?: string}>();
  @Output() difficultyChange = new EventEmitter<string>();

  sanitizeDifficulty(diff: string | undefined | null): string {
    if (!diff) return GameDifficulty.Easy;
    const lower = diff.toLowerCase();
    const match = this.difficulties.find(d => d.id === lower);
    if (match) return match.id;
    for (const d of this.difficulties) {
      if (lower.includes(d.id)) return d.id;
    }
    return GameDifficulty.Easy;
  }

  @Input() set currentDifficulty(val: string | undefined) {
    const valid = this.sanitizeDifficulty(val);
    if (valid !== this.activeTab()) {
      this.activeTab.set(valid);
      this.loadLevels(valid);
    }
  }

  sudokuModes = [
    { id: GameMode.Steal, labelKey: 'game.sudoku_same_pk_steal_label', icon: '⚡', descKey: 'game.sudoku_same_pk_steal_desc' },
    { id: GameMode.Speed, labelKey: 'game.sudoku_same_pk_speed_label', icon: '⏱️', descKey: 'game.sudoku_same_pk_speed_desc' }
  ];

  difficulties = sudokuDifficulties;

  activeTab = signal<string>(this.sanitizeDifficulty(getSavedDifficulty('sudoku', GameDifficulty.Easy)));
  levels = signal<LevelResponse[]>([]);
  loading = signal<boolean>(false);

  ngOnInit() {
    const initialDiff = this.sanitizeDifficulty(this.activeTab());
    this.activeTab.set(initialDiff);
    this.loadLevels(initialDiff);
  }

  selectDifficulty(diff: string) {
    const sanitized = this.sanitizeDifficulty(diff);
    setSavedDifficulty('sudoku', sanitized);
    this.activeTab.set(sanitized);
    this.difficultyChange.emit(sanitized);
    this.loadLevels(sanitized);
  }

  private loadLevels(difficulty: string) {
    const sanitized = this.sanitizeDifficulty(difficulty);
    this.loading.set(true);
    this.http.get<LevelResponse[]>(`${environment.apiUrl}/sudoku/levels/${sanitized}`).subscribe({
      next: (data) => {
        this.levels.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  playNextOrFirstLevel(): void {
    const list = this.levels();
    if (!list || list.length === 0) return;
    const target = list.find(l => l.progress?.status === GameStatus.Playing)
      || list.find(l => l.progress?.status !== GameStatus.Finished)
      || list[0];
    if (target) {
      this.playLevel(target);
    }
  }

  getNextOrFirstLevelIndex(): number {
    const list = this.levels();
    if (!list || list.length === 0) return 1;
    const playingIdx = list.findIndex(l => l.progress?.status === GameStatus.Playing);
    if (playingIdx !== -1) return playingIdx + 1;
    const uncompletedIdx = list.findIndex(l => l.progress?.status !== GameStatus.Finished);
    if (uncompletedIdx !== -1) return uncompletedIdx + 1;
    return 1;
  }

  playLevel(level: LevelResponse) {
    // Fetch the actual puzzle string
    this.http.get<any>(`${environment.apiUrl}/sudoku/puzzle/${level.id}`).subscribe(res => {
      this.levelSelect.emit({
        id: res.puzzle.id,
        puzzle: res.puzzle.puzzle,
        solution: res.puzzle.solution,
        savedState: res.progress?.current_state,
        timeSpent: res.progress?.time_spent,
        difficulty: this.sanitizeDifficulty(level.difficulty || res.puzzle?.difficulty || this.activeTab())
      });
    });
  }
}
