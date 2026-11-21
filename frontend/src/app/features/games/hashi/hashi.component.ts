import { GameMode, GameStatus } from "../../../core/models/game.model";
import { getSavedDifficulty, setSavedDifficulty, isBrowser } from "../../../core/utils/browser.util";
import { isTutorialCompleted, markTutorialCompleted } from "../../../core/utils/tutorial.util";
import { Component, inject, OnInit, OnDestroy, signal, effect, untracked, computed, HostListener } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { HashiStore } from './store/hashi.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { HashiLobbyComponent } from './components/hashi-lobby/hashi-lobby.component';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { environment } from '../../../../environments/environment';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';
import { InteractiveTutorialBoardComponent } from '../../../shared/components/interactive-tutorial/interactive-tutorial-board.component';
import { InteractiveTutorialPointerComponent } from '../../../shared/components/interactive-tutorial/interactive-tutorial-pointer.component';
import { InteractiveTutorialSuccessComponent } from '../../../shared/components/interactive-tutorial/interactive-tutorial-success.component';
import { HASHI_TUTORIAL_STEPS, HashiTutorialStep, HashiTutorialBridgeTarget } from './store/hashi-tutorial';

@Component({
  selector: 'app-hashi',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GameToolbarComponent,
    HashiLobbyComponent,
    GameLayoutComponent,
    GamePkHudComponent,
    GameHandheldHeaderComponent,
    InteractiveTutorialBoardComponent,
    InteractiveTutorialPointerComponent,
    InteractiveTutorialSuccessComponent
  ],
  providers: [HashiStore],
  templateUrl: './hashi.component.html'
})
export class HashiComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(HashiStore);
  private roomLifecycle!: RoomLifecycleHandle;
  private windowSize = inject(WindowSizeService);
  http = inject(HttpClient);

  view = signal<'lobby' | 'play'>('lobby');
  
  // Interaction state
  selectedIsland = signal<{r: number, c: number} | null>(null);
  touchStartIsland = signal<{r: number, c: number} | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // 🎓 新手 4 步互动速成教程 (Interactive Step-by-Step Tutorial)
  // ═══════════════════════════════════════════════════════════════════
  isTutorialActive = signal(false);
  tutorialStep = signal(0);
  hasCompletedTutorial = signal(false);
  tutorialDismissed = signal(false);
  readonly isTutorialFinished = computed(() => this.tutorialStep() >= HASHI_TUTORIAL_STEPS.length);

  readonly currentTutorialStepInfo = computed<HashiTutorialStep | null>(() => {
    if (!this.isTutorialActive()) return null;
    const step = this.tutorialStep();
    return HASHI_TUTORIAL_STEPS[step] || null;
  });

  readonly currentTutorialBubbleReason = computed(() => {
    if (!this.isTutorialActive()) return '';
    const info = this.currentTutorialStepInfo();
    if (!info) return '';
    return this.i18n.t(info.descKey)() || info.defaultDesc || '';
  });

  readonly currentTutorialBubbleAction = computed(() => {
    if (!this.isTutorialActive()) return '';
    const info = this.currentTutorialStepInfo();
    if (!info) return '';
    return this.i18n.t(info.actionKey)() || info.defaultAction || '';
  });

  readonly currentTutorialMicroAction = computed(() => {
    if (!this.isTutorialActive()) return '';
    const info = this.currentTutorialStepInfo();
    if (!info) return '';
    const microKey = info.microActionKey;
    const defaultMicro = info.defaultMicroAction || '';
    if (!microKey) return defaultMicro;
    return this.i18n.t(microKey)() || defaultMicro;
  });

  // 当前步骤中尚未达成 requiredCount 的首个连桥目标
  readonly currentTutorialTargetBridge = computed<HashiTutorialBridgeTarget | null>(() => {
    const stepInfo = this.currentTutorialStepInfo();
    if (!stepInfo) return null;
    const bridges = this.store.bridges();
    for (const target of stepInfo.bridgeTargets) {
      const norm = this.normalizeCoords(target.r1, target.c1, target.r2, target.c2);
      const existing = bridges.find(b => b.r1 === norm.r1 && b.c1 === norm.c1 && b.r2 === norm.r2 && b.c2 === norm.c2);
      const count = existing ? existing.count : 0;
      if (count < target.requiredCount) {
        return target;
      }
    }
    return null;
  });

  readonly tutorialPointerCoords = computed(() => {
    const target = this.currentTutorialTargetBridge();
    if (!target) return null;
    const gw = this.gridWidth();
    const gh = this.gridHeight();
    const totalW = gw + 0.4;
    const totalH = gh + 0.4;
    const midX = (target.c1 + target.c2) / 2;
    const midY = (target.r1 + target.r2) / 2;
    const leftPercent = ((midX + 0.7) / totalW) * 100;
    const topPercent = ((midY + 0.7) / totalH) * 100;
    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
      direction: topPercent < 35 ? 'up' : 'down' as 'up' | 'down'
    };
  });

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
      isMe: !this.store.isSpectator(),
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
    const isSpec = this.store.isSpectator();
    return this.store.playersList()
      .filter(p => isSpec || p.id !== this.playerId)
      .map(p => {
        const isFinished = this.store.winners().includes(p.id);
        const count = oppProg[p.id] || 0;
        const prog = targetBridges > 0 ? Math.min(100, Math.round((count / targetBridges) * 100)) : 0;
        return {
          id: p.id,
          nickname: p.id,
          isHost: p.id === this.store.hostId(),
          isMe: !isSpec && p.id === this.playerId,
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
      if (st === GameStatus.Finished) {
        if (this.store.currentRoomMode() === GameMode.Single || this.store.winners().includes(this.playerId)) {
          this.celebrateVictory();
        } else {
          this.vibrateError();
        }
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    if (isBrowser()) {
      const completed = isTutorialCompleted('hashi');
      this.hasCompletedTutorial.set(completed);
    }
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.isCreate) {
        this.handleCreateRoom(pending);
      } else {
        this.joinRoom(
          pending.roomId,
          pending.mode,
          pending.difficulty,
          pending.host || '',
          pending.target ?? 1,
          pending.password || '',
          pending.bountyCoins || 0,
          pending.isSpectator || false
        );
      }
    } else {
      const qp = this._baseRoute.snapshot.queryParamMap;
      const requestedDiff = qp.get('difficulty') || qp.get('diff');
      if (!requestedDiff && !isTutorialCompleted('hashi')) {
        this.startTutorial();
        return;
      }
      const targetDiff = requestedDiff || getSavedDifficulty('hashi', 'easy');
      this.store.currentDifficulty.set(targetDiff);
      setSavedDifficulty('hashi', targetDiff);
      this.store.joinRoom('', GameMode.Single, targetDiff);
      if (!requestedDiff) {
        this.checkAndPromptResumeSession('hashi');
      }
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  startLevel(event: { id: string, puzzle: string, difficulty: string, levelIndex: number }) {
    this.isTutorialActive.set(false);
    this.view.set('play');
    this.store.startSinglePlayer(event.id, event.puzzle, event.difficulty, event.levelIndex);
    this.selectedIsland.set(null);
  }

  async loadFirstLevelOf(diff: string) {
    this.store.currentDifficulty.set(diff);
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
      console.error('Failed to load level', e);
    }
  }

  async onDifficultyChange(event: Event | string) {
    const diff = typeof event === 'string' ? event : (event.target as HTMLSelectElement).value;
    if (diff === this.store.currentDifficulty()) return;
    await this.loadFirstLevelOf(diff);
  }

  goToLobby() {
    this.isTutorialActive.set(false);
    this.store.stopTimer();
    this.view.set('lobby');
  }

  override goBack(): void {
    if (this.isTutorialActive()) {
      this.exitTutorial();
      return;
    }
    if (this.view() === 'lobby' && this.store.currentRoomMode() === GameMode.Single) {
      super.goBack();
    } else if (this.store.currentRoomMode() !== GameMode.Single) {
      super.goBack();
    } else {
      this.store.leaveRoom();
      this.view.set('lobby');
    }
  }

  joinRoom(
    roomId: string,
    mode: string,
    difficulty: string,
    hostId?: string,
    target: number = 1,
    password: string = '',
    bounty: number = 0,
    isSpectator: boolean = false,
    action?: string
  ) {
    if (!isSpectator) {
      this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, hostId);
    }
    const finalAction = action || (isSpectator ? 'spectate' : 'join');
    this.wsService.setPendingAction(finalAction);
    this.store.joinRoom(roomId, mode, difficulty, hostId, target, password, bounty, isSpectator, finalAction);
    this.view.set('play');
  }

  override handleJoinRoom(event: any) {
    if (this.store.roomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinRoom(
      event.roomId,
      event.mode,
      event.difficulty,
      event.host,
      event.target ?? 1,
      event.password || '',
      event.bountyCoins || 0,
      event.isSpectator || false,
      event.isSpectator ? 'spectate' : 'join'
    );
  }

  override handleCreateRoom(event: any) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.wsService.setPendingAction('create');
    const roomId = event.name || event.roomId;
    this.joinRoom(
      roomId,
      event.mode,
      event.difficulty,
      this.playerId,
      event.target ?? 1,
      event.password || '',
      event.bountyCoins || 0,
      false,
      'create'
    );
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

  // ═══════════════════════════════════════════════════════════════════
  // 🎓 Tutorial Helper & Interaction Methods
  // ═══════════════════════════════════════════════════════════════════

  normalizeCoords(r1: number, c1: number, r2: number, c2: number) {
    if (r1 > r2 || c1 > c2) {
      return { r1: r2, c1: c2, r2: r1, c2: c1 };
    }
    return { r1, c1, r2, c2 };
  }

  isTutorialTargetIsland(r: number, c: number): boolean {
    if (!this.isTutorialActive()) return false;
    const target = this.currentTutorialTargetBridge();
    if (!target) return false;
    return (r === target.r1 && c === target.c1) || (r === target.r2 && c === target.c2);
  }

  private checkTutorialStepProgress() {
    if (!this.isTutorialActive()) return;
    const stepInfo = this.currentTutorialStepInfo();
    if (!stepInfo) return;
    const bridges = this.store.bridges();
    const allSatisfied = stepInfo.bridgeTargets.every(target => {
      const norm = this.normalizeCoords(target.r1, target.c1, target.r2, target.c2);
      const existing = bridges.find(b => b.r1 === norm.r1 && b.c1 === norm.c1 && b.r2 === norm.r2 && b.c2 === norm.c2);
      const count = existing ? existing.count : 0;
      return count >= target.requiredCount;
    });

    if (allSatisfied) {
      const nextStep = this.tutorialStep() + 1;
      this.tutorialStep.set(nextStep);
      if (nextStep >= HASHI_TUTORIAL_STEPS.length) {
        this.vibrateSuccess();
        this.celebrateVictory();
        this.hasCompletedTutorial.set(true);
        if (isBrowser()) {
          localStorage.setItem('hashi_tutorial_completed', 'true');
        }
      } else {
        this.vibrateMedium();
      }
    }
  }

  private executeTutorialBridge(r1: number, c1: number, r2: number, c2: number, target: HashiTutorialBridgeTarget) {
    const norm = this.normalizeCoords(r1, c1, r2, c2);
    const bridges = this.store.bridges();
    const existing = bridges.find(b => b.r1 === norm.r1 && b.c1 === norm.c1 && b.r2 === norm.r2 && b.c2 === norm.c2);
    const currentCount = existing ? existing.count : 0;

    if (currentCount < target.requiredCount) {
      this.store.toggleBridge(r1, c1, r2, c2);
      this.vibrateSnap();
      this.checkTutorialStepProgress();
    } else {
      this.vibrateLight();
    }
  }

  onBridgeClick(r1: number, c1: number, r2: number, c2: number) {
    if (this.store.localStatus() !== GameStatus.Playing || this.store.isSpectator()) return;

    if (!this.isTutorialActive()) {
      this.store.toggleBridge(r1, c1, r2, c2);
      this.vibrateSnap();
      return;
    }

    const target = this.currentTutorialTargetBridge();
    if (!target) return;
    const normClick = this.normalizeCoords(r1, c1, r2, c2);
    const normTarget = this.normalizeCoords(target.r1, target.c1, target.r2, target.c2);
    if (normClick.r1 === normTarget.r1 && normClick.c1 === normTarget.c1 &&
        normClick.r2 === normTarget.r2 && normClick.c2 === normTarget.c2) {
      this.executeTutorialBridge(normClick.r1, normClick.c1, normClick.r2, normClick.c2, target);
    } else {
      this.vibrateError();
    }
  }

  // Handle island click for drawing bridges
  onIslandClick(r: number, c: number) {
    if (this.store.localStatus() !== GameStatus.Playing || this.store.isSpectator()) return;

    if (this.isTutorialActive()) {
      const current = this.selectedIsland();
      if (!current) {
        const target = this.currentTutorialTargetBridge();
        if (!target) return;
        const isPartOfTarget = (r === target.r1 && c === target.c1) || (r === target.r2 && c === target.c2);
        if (!isPartOfTarget) {
          this.vibrateError();
          return;
        }
        this.selectedIsland.set({ r, c });
        this.vibrateLight();
      } else {
        if (current.r === r && current.c === c) {
          this.selectedIsland.set(null);
        } else {
          const target = this.currentTutorialTargetBridge();
          if (!target) {
            this.selectedIsland.set(null);
            return;
          }
          const normClick = this.normalizeCoords(current.r, current.c, r, c);
          const normTarget = this.normalizeCoords(target.r1, target.c1, target.r2, target.c2);
          if (normClick.r1 === normTarget.r1 && normClick.c1 === normTarget.c1 &&
              normClick.r2 === normTarget.r2 && normClick.c2 === normTarget.c2) {
            this.executeTutorialBridge(normClick.r1, normClick.c1, normClick.r2, normClick.c2, target);
          } else {
            this.vibrateError();
          }
          this.selectedIsland.set(null);
        }
      }
      return;
    }

    const current = this.selectedIsland();
    if (!current) {
      this.selectedIsland.set({r, c});
      this.vibrateLight();
    } else {
      // If clicking same island, deselect
      if (current.r === r && current.c === c) {
        this.selectedIsland.set(null);
      } else {
        // Try to draw bridge
        this.store.toggleBridge(current.r, current.c, r, c);
        this.vibrateSnap();
        this.selectedIsland.set(null);
      }
    }
  }

  onTouchStart(event: TouchEvent, r: number, c: number) {
    if (this.store.localStatus() !== GameStatus.Playing || this.store.isSpectator()) return;
    this.touchStartIsland.set({r, c});
  }

  onTouchEnd(event: TouchEvent) {
    const start = this.touchStartIsland();
    this.touchStartIsland.set(null);
    if (!start) return;

    if (this.store.localStatus() !== GameStatus.Playing || this.store.isSpectator()) return;
    
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
             if (this.isTutorialActive()) {
               const tutTarget = this.currentTutorialTargetBridge();
               if (tutTarget) {
                 const normClick = this.normalizeCoords(start.r, start.c, endR, endC);
                 const normTarget = this.normalizeCoords(tutTarget.r1, tutTarget.c1, tutTarget.r2, tutTarget.c2);
                 if (normClick.r1 === normTarget.r1 && normClick.c1 === normTarget.c1 &&
                     normClick.r2 === normTarget.r2 && normClick.c2 === normTarget.c2) {
                   this.executeTutorialBridge(normClick.r1, normClick.c1, normClick.r2, normClick.c2, tutTarget);
                 } else {
                   this.vibrateError();
                 }
               }
             } else {
               this.store.toggleBridge(start.r, start.c, endR, endC);
               this.vibrateSnap();
             }
             event.preventDefault();
          }
       }
    }
  }

  startTutorial() {
    this.vibrateLight();
    this.view.set('play');
    this.tutorialStep.set(0);
    this.isTutorialActive.set(true);
    this.selectedIsland.set(null);
    this.store.startTutorialPuzzle();
  }

  restartTutorial() {
    this.vibrateLight();
    this.tutorialStep.set(0);
    this.selectedIsland.set(null);
    this.store.startTutorialPuzzle();
  }

  exitTutorial() {
    this.vibrateLight();
    this.isTutorialActive.set(false);
    this.hasCompletedTutorial.set(true);
    markTutorialCompleted('hashi');
    this.goToLobby();
  }

  async completeTutorialAndPlay() {
    this.vibrateLight();
    this.isTutorialActive.set(false);
    this.hasCompletedTutorial.set(true);
    markTutorialCompleted('hashi');
    await this.loadFirstLevelOf('easy');
  }

  dismissTutorialCapsule() {
    this.tutorialDismissed.set(true);
    markTutorialCompleted('hashi');
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
