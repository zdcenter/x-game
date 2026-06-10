import { GameHeaderComponent } from '../../../../../shared/components/game-header/game-header.component';
import { Component, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { SokobanStore } from '../../store/sokoban.store';
import { AuthStore } from '../../../../../core/auth/auth.store';
import { WebSocketService } from '../../../../../core/services/websocket.service';
import { GameRulesModalComponent } from '../../../../../shared/components/game-rules-modal/game-rules-modal.component';
import { environment } from '../../../../../../environments/environment';

interface LevelResponse {
  id: string;
  difficulty: string;
  level_num: number;
  puzzle: string;
  progress: {
    status: string;
    stars: number;
  };
}

@Component({
  selector: 'app-sokoban-lobby',
  standalone: true,
  imports: [CommonModule, GameRulesModalComponent, GameHeaderComponent],
  host: { class: 'flex-grow flex flex-col w-full h-full min-h-0' },
  templateUrl: './sokoban-lobby.component.html',
  styleUrl: './sokoban-lobby.component.css'
})
export class SokobanLobbyComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private router = inject(Router);
  store = inject(SokobanStore);
  wsService = inject(WebSocketService);
  authStore = inject(AuthStore);
  
  playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
  showRules = signal(false);

  @Output() openLobby = new EventEmitter<void>();
  @Output() levelSelect = new EventEmitter<{id: string, puzzle: string, difficulty: string, levelNum: number}>();

  difficulties = [
    { id: 'beginner', labelKey: 'game.diff_sokoban_beginner', desc: 'A gentle start' },
    { id: 'intermediate', labelKey: 'game.diff_sokoban_intermediate', desc: 'A fair challenge' },
    { id: 'advanced', labelKey: 'game.diff_sokoban_advanced', desc: 'For experienced players' },
    { id: 'professional', labelKey: 'game.diff_sokoban_professional', desc: 'True test of skill' }
  ];

  activeTab = signal<string>('beginner');
  levels = signal<LevelResponse[]>([]);
  loading = signal<boolean>(false);

  ngOnInit() {
    this.loadLevels('beginner');
  }

  selectDifficulty(diff: string) {
    this.activeTab.set(diff);
    this.loadLevels(diff);
  }

  private loadLevels(difficulty: string) {
    this.loading.set(true);
    this.http.get<LevelResponse[]>(`${environment.apiUrl}/sokoban/levels/${difficulty}`).subscribe({
      next: (data) => {
        // Sort levels by level_num
        const sorted = (data || []).sort((a, b) => a.level_num - b.level_num);
        this.levels.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  playLevel(level: LevelResponse) {
    this.levelSelect.emit({
      id: level.id,
      puzzle: level.puzzle,
      difficulty: level.difficulty,
      levelNum: level.level_num
    });
  }

  goBack() {
    this.router.navigate(['/lobby']);
  }
}
