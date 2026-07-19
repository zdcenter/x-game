import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, inject, OnInit, OnDestroy, signal, effect, untracked, computed } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { HashiStore } from './store/hashi.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { HashiLobbyComponent } from './components/hashi-lobby/hashi-lobby.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { boardSizePx } from '../../../core/utils/board-size.util';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { SettingsService } from '../../../core/services/settings.service';
import { environment } from '../../../../environments/environment';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GamePkModeBadgeComponent } from '../../../shared/components/game-pk-mode-badge/game-pk-mode-badge.component';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';


@Component({
  selector: 'app-hashi',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    
    GameResultOverlayComponent,
    
    GameToolbarComponent,
    HashiLobbyComponent,
    GameWaitingRoomComponent,
    PlayerBadgeComponent,
    GameStartingOverlayComponent, GameLayoutComponent],
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
  
  // Interaction state
  selectedIsland = signal<{r: number, c: number} | null>(null);
  touchStartIsland = signal<{r: number, c: number} | null>(null);
  
  hideLeftPanel = computed(() => {
    const grid = this.store.boardGrid();
    return grid.length > 15 || (grid[0] && grid[0].length > 15);
  });

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
      if (this.store.localStatus() === GameStatus.Waiting && this.store.currentRoomMode() === GameMode.Single) {
        untracked(() => this.view.set('lobby'));
      }
    });

    effect(() => {
      const st = this.store.localStatus();
      if (st === GameStatus.Starting) {
        untracked(() => this.gameTimer.startCountdown());
      } else {
        untracked(() => this.gameTimer.stopCountdown());
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '', pending.target ?? 1);
    } else {
      this.store.joinRoom('', GameMode.Single);
    }
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

  async onDifficultyChange(event: Event | string) {
    const diff = typeof event === 'string' ? event : (event.target as HTMLSelectElement).value;
    if (diff === this.store.currentDifficulty()) return;
    
    try {
      const levelsRes = await lastValueFrom(this.http.get<any>(`${environment.apiUrl}/hashi/levels/${diff}`));
      const firstLevel = levelsRes[0];
      if (firstLevel) {
        const puzzleRes = await lastValueFrom(this.http.get<any>(`${environment.apiUrl}/hashi/puzzle/${firstLevel.id}`));
        this.store.startSinglePlayer(firstLevel.id, puzzleRes.puzzle.content, diff, 0);
        this.selectedIsland.set(null);
      }
    } catch (e) {
      console.error('Failed to switch difficulty', e);
    }
  }

  override goBack(): void {
    if (this.view() === 'lobby' && this.store.currentRoomMode() === GameMode.Single) {
      super.goBack();
    } else {
      this.store.leaveRoom();
      this.view.set('lobby');
    }
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId: string, target: number = 1) {
    this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, hostId);
    this.store.joinRoom(roomId, mode, difficulty, hostId, target);
    this.view.set('play');
  }

  override handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string, password?: string}) {
    if (this.store.roomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
  }

  override handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string}) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
  }

  getElapsedMs(startAt: number): number {
    return this.store.timeSpent() * 1000;
  }

  formatTime(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  getOverlayTitle(): string {
    if (this.store.currentRoomMode() === GameMode.Single) return this.i18n.t('game.you_win')();
    const won = this.store.winners().includes(this.playerId);
    if (!this.store.isSeriesOver()) {
      return won ? this.i18n.t('game.round_won')() : this.i18n.t('game.round_lost')();
    }
    return won ? this.i18n.t('game.you_win')() : this.i18n.t('game.you_lose')();
  }

  getOverlaySubtitle(): string {
    if (this.store.currentRoomMode() !== GameMode.Single && !this.store.isSeriesOver()) {
      return this.store.pkScoreLabel();
    }
    return `${this.i18n.t('game.timer')()}: ${this.formatTime(this.getElapsedMs(0))}`;
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

  onTouchStart(event: TouchEvent, r: number, c: number) {
    if (this.store.localStatus() !== GameStatus.Playing) return;
    this.touchStartIsland.set({r, c});
  }

  onTouchEnd(event: TouchEvent) {
    const start = this.touchStartIsland();
    this.touchStartIsland.set(null);
    if (!start) return;

    if (this.store.localStatus() !== GameStatus.Playing) return;
    
    if (event.changedTouches.length === 0) return;
    const touch = event.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (target && target instanceof Element) {
       let current: Element | null = target;
       let endR: number | null = null;
       let endC: number | null = null;

       while (current && current.tagName.toLowerCase() !== 'svg') {
         if (current.hasAttribute('data-r') && current.hasAttribute('data-c')) {
           endR = parseInt(current.getAttribute('data-r')!, 10);
           endC = parseInt(current.getAttribute('data-c')!, 10);
           break;
         }
         current = current.parentElement;
       }

       if (endR !== null && endC !== null) {
          if (endR !== start.r || endC !== start.c) {
             // Swiped to a different island!
             this.store.toggleBridge(start.r, start.c, endR, endC);
             event.preventDefault();
          }
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
