import { GameDifficulty, GameMode, GameStatus } from '../../../../../core/models/game.model';
import { Component, EventEmitter, Output, inject, signal, OnInit, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../../../core/i18n/i18n.service';

import { Math24Store } from '../../store/math24.store';
import { environment } from '../../../../../../environments/environment';

interface LevelResponse {
  id: string;
  difficulty: string;
  cards: string;
  progress?: {
    status: string;
    time_spent: number;
    stars: number;
  };
}

@Component({
  selector: 'app-math24-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './math24-lobby.component.html'
})
export class Math24LobbyComponent implements OnInit {
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  store = inject(Math24Store);

  @Output() levelSelect = new EventEmitter<{ id: string, puzzle: string, difficulty: string, levelIndex: number }>();
  @Output() openLobby = new EventEmitter<void>();

  difficulties = [
    { id: 'easy', labelKey: 'game.diff_math24_easy' },
    { id: GameDifficulty.Medium, labelKey: 'game.diff_math24_medium' },
    { id: GameDifficulty.Hard, labelKey: 'game.diff_math24_hard' },
    { id: GameDifficulty.Expert, labelKey: 'game.diff_math24_expert' }
  ];

  activeTab = signal<string>(GameDifficulty.Easy);
  levels = signal<LevelResponse[]>([]);
  loading = signal<boolean>(false);

  @ViewChild('scrollContainer') scrollContainer?: ElementRef;

  // Pagination
  currentPage = signal<number>(1);
  pageSize = 100;
  
  paginatedLevels = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.levels().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.levels().length / this.pageSize));

  ngOnInit() {
    this.loadLevels(GameDifficulty.Easy);
  }

  selectDifficulty(diff: string) {
    this.activeTab.set(diff);
    this.currentPage.set(1);
    this.loadLevels(diff);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.scrollToTop();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.scrollToTop();
    }
  }

  private scrollToTop() {
    if (this.scrollContainer?.nativeElement) {
      this.scrollContainer.nativeElement.scrollTop = 0;
    }
  }

  private loadLevels(difficulty: string) {
    this.loading.set(true);
    this.http.get<LevelResponse[]>(`${environment.apiUrl}/math24/levels/${difficulty}`).subscribe({
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
    this.http.get<any>(`${environment.apiUrl}/math24/puzzle/${level.id}`).subscribe(res => {
      this.levelSelect.emit({ 
        id: res.puzzle.id, 
        puzzle: res.puzzle.cards,
        difficulty: this.activeTab(),
        levelIndex: index 
      });
    });
  }
}
