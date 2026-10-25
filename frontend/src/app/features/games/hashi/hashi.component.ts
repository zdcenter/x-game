import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
import { Component, inject, OnInit, OnDestroy, signal, effect, untracked, computed, HostListener } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { HashiStore } from './store/hashi.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { HashiLobbyComponent } from './components/hashi-lobby/hashi-lobby.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { environment } from '../../../../environments/environment';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';

@Component({
  selector: 'app-hashi',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GameResultOverlayComponent,
    GameToolbarComponent,
    HashiLobbyComponent,
    GameWaitingRoomComponent,
    GameStartingOverlayComponent,
    GameLayoutComponent,
    GamePkHudComponent
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
  
  // Interaction state
  selectedIsland = signal<{r: number, c: number} | null>(null);
  touchStartIsland = signal<{r: number, c: number} | null>(null);

  readonly gridWidth = computed(() => {
    const grid = this.store.boardGrid();
    return grid[0]?.length || this.store.engine.width || 7;
  });

  readonly gridHeight = computed(() => {
    const grid = this.store.boardGrid();
    return grid.length || this.store.engine.height || 7;
  });

  readonly boardDimensions = computed(() => {
    const { w: vw, h: vh } = this.windowSize.size();
    const gw = this.gridWidth();
    const gh = this.gridHeight();
    const ratio = gh / gw;
    const isPk = this.store.currentRoomMode() !== GameMode.Single;

    // Real vertical chrome:
    // Top Nav (64px) + Game Header (~55px) + Action Bar (~42px) + Card Padding (~24px)
    // + Level/Timer bar (~48px) + Board Toolbar (~60px) + Margins (~25px)
    // = ~318px on Desktop, ~280px on Tablet, ~240px on Mobile.
    // In PK mode, PK HUD adds ~65px.
    const chromeH = isPk
      ? (vw < 640 ? 300 : vw < 1024 ? 340 : 380)
      : (vw < 640 ? 240 : vw < 1024 ? 280 : 320);
    const padW = vw < 640 ? 20 : vw < 1024 ? 40 : 64;

    const availH = Math.max(240, vh - chromeH);
    const availW = Math.max(240, Math.min(vw - padW, 1300));

    // Dynamic max board dimension based on grid density:
    // 7x7: 460px (cell ~65px, large and comfortable)
    // 10x10: 580px (cell ~58px)
    // 15x15: 720px (cell ~48px)
    // 20x20: 820px (cell ~41px)
    let maxBoardW = 460;
    if (gw >= 20) {
      maxBoardW = 820;
    } else if (gw >= 15) {
      maxBoardW = 720;
    } else if (gw >= 10) {
      maxBoardW = 580;
    }

    const w = Math.max(240, Math.floor(Math.min(availW, availH / ratio, maxBoardW)));
    const h = Math.round(w * ratio);

    return {
      width: `${w}px`,
      height: `${h}px`,
      widthPx: w,
      heightPx: h
    };
  });
  
  hideLeftPanel = computed(() => {
    const grid = this.store.boardGrid();
    return grid.length > 15 || (grid[0] && grid[0].length > 15);
  });

  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    const isFinished = this.store.winners().includes(this.playerId);
    const totalIslands = this.store.islands().length;
    const targetBridges = totalIslands > 0 ? totalIslands * 2 : 100;
    const bridgeCount = this.store.bridges().length;
    const prog = targetBridges > 0 ? Math.min(100, Math.round((bridgeCount / targetBridges) * 100)) : 0;
    return {
      id: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: true,
      score: bridgeCount,
      progress: prog,
      status: isFinished ? GameStatus.Finished : GameStatus.Playing,
      metrics: [
        { label: this.i18n.t('game.bridges')() || '桥数', value: `${bridgeCount} / ${targetBridges}`, icon: '🌉', colorClass: 'text-sky-500 font-bold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    const totalIslands = this.store.islands().length;
    const targetBridges = totalIslands > 0 ? totalIslands * 2 : 100;
    const oppProg = this.store.opponentProgress();
    return this.store.playersList()
      .filter(p => p.id !== this.playerId)
      .map(p => {
        const isFinished = this.store.winners().includes(p.id);
        const count = oppProg[p.id] || 0;
        const prog = targetBridges > 0 ? Math.min(100, Math.round((count / targetBridges) * 100)) : 0;
        return {
          id: p.id,
          nickname: p.id,
          isHost: p.id === this.store.hostId(),
          isMe: false,
          score: count,
          progress: prog,
          status: isFinished ? GameStatus.Finished : GameStatus.Playing,
          metrics: [
            { label: this.i18n.t('game.bridges')() || '桥数', value: `${count} / ${targetBridges}`, icon: '🌉', colorClass: 'text-sky-500 font-bold' }
          ]
        };
      });
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return undefined;
    const oppId = this.opponentsPkStats()[0]?.id;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.playerId] || 0,
      opponent: wins[oppId] || 0
    };
  });

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
    setSavedDifficulty('hashi', diff);
    
    try {
      const levelsRes = await lastValueFrom(this.http.get<any>(`${environment.apiUrl}/hashi/levels/${diff}`));
      const firstLevel = levelsRes[0];
      if (firstLevel) {
        const puzzleRes = await lastValueFrom(this.http.get<any>(`${environment.apiUrl}/hashi/puzzle/${firstLevel.id}`));
        this.view.set('play');
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

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.view() !== 'play') return;
    const key = event.key.toLowerCase();
    if (key === 'r' && this.store.currentRoomMode() === GameMode.Single) {
      this.store.startSinglePlayer(this.store.currentPuzzleId(), this.store.currentPuzzleContent(), this.store.currentDifficulty(), this.store.localLevelIndex());
      event.preventDefault();
      return;
    }
    if (key === 'h' && this.store.currentRoomMode() === GameMode.Single) {
      this.store.applyHint();
      event.preventDefault();
      return;
    }
  }
}
