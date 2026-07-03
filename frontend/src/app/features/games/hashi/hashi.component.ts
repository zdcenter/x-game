import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, inject, OnInit, OnDestroy, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { HashiStore } from './store/hashi.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { HintButtonComponent } from '../../../shared/components/hint-button/hint-button.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { HashiLobbyComponent } from './components/hashi-lobby/hashi-lobby.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { boardSizePx } from '../../../core/utils/board-size.util';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { SettingsService } from '../../../core/services/settings.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-hashi',
  standalone: true,
  imports: [
    CommonModule,
    GameHeaderComponent,
    GameResultOverlayComponent,
    GameLobbyPanelComponent,
    GameToolbarComponent,
    HashiLobbyComponent,
  ],
  providers: [HashiStore],
  templateUrl: './hashi.component.html'
})
export class HashiComponent extends BaseGameComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  GameStatus = GameStatus;
  
  store = inject(HashiStore);
  private authStore = inject(AuthStore);
  private roomLifecycle!: RoomLifecycleHandle;
  i18n = inject(I18nService);
  private windowSize = inject(WindowSizeService);
  http = inject(HttpClient);

  view = signal<'lobby' | 'play'>('lobby');
  
  // Calculate board size
  boardSizePx = boardSizePx(this.windowSize, { mobile: 320, tablet: 400, pc: 500 });
  
  // Interaction state
  selectedIsland = signal<{r: number, c: number} | null>(null);

  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'hashi',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });

    effect(() => {
      if (this.store.localStatus() === GameStatus.Waiting) {
        untracked(() => this.view.set('lobby'));
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    // Only Single Player Mode supported for now
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  startLevel(event: { id: string, puzzle: string, difficulty: string, levelIndex: number }) {
    this.view.set('play');
    this.store.startSinglePlayer(event.id, event.puzzle, event.difficulty, event.levelIndex);
    this.selectedIsland.set(null);
  }

  override goBack(): void {
    if (this.view() === 'lobby') {
      super.goBack();
    } else {
      this.store.leaveRoom();
    }
  }

  // Handle island click for drawing bridges
  onIslandClick(r: number, c: number) {
    if (this.store.localStatus() !== GameStatus.Playing) return;

    const current = this.selectedIsland();
    if (!current) {
      this.selectedIsland.set({r, c});
    } else {
      // If clicking same island, deselect
      if (current.r === r && current.c === c) {
        this.selectedIsland.set(null);
      } else {
        // Try to draw bridge
        this.store.toggleBridge(current.r, current.c, r, c);
        this.selectedIsland.set(null); // Keep or deselect based on UX preference
      }
    }
  }

  playPreviousLevel() {
    this.navigateLevel(-1);
  }

  playNextLevel() {
    this.navigateLevel(1);
  }

  getRange(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  private navigateLevel(delta: number) {
    const currentId = this.store.currentPuzzleId();
    if (!currentId) return;
    const match = currentId.match(/^(.*)_(\d+)$/);
    if (!match) {
      this.view.set('lobby');
      return;
    }
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + delta;
    if (nextNum < 1) return;
    
    const nextId = `${prefix}_${nextNum}`;
    
    this.http.get<any>(`${environment.apiUrl}/hashi/puzzle/${nextId}`).subscribe({
      next: (res) => {
        this.startLevel({
          id: res.puzzle.id,
          puzzle: res.puzzle.content,
          difficulty: this.store.currentDifficulty(),
          levelIndex: this.store.localLevelIndex() + delta
        });
      },
      error: () => {
        (this.store as any).toast?.show(this.i18n.t('lobby.coming_soon')(), 'info');
        this.view.set('lobby');
      }
    });
  }
}
