import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { AdService } from '../../../core/services/ad.service';
import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, HostListener, OnDestroy, OnInit, inject, effect, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { TetrisStore } from './store/tetris.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { ToastService } from '../../../core/services/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { FloatingTextService } from '../../../core/services/floating-text.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { TETRIS_COLS, TETRIS_ROWS, TETROMINO_COLORS, Tetromino, TETROMINO_SHAPES, TETROMINO_THEMES } from './models/tetris.model';
import { HapticService } from '../../../core/services/haptic.service';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';

import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { GameScoreCapsuleComponent } from '../../../shared/components/game-score-capsule/game-score-capsule.component';
import { LeaderboardService } from '../../../core/services/leaderboard.service';
import { WindowSizeService } from '../../../core/services/window-size.service';


import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';

@Component({
  selector: 'app-tetris',
  standalone: true,
  imports: [GameSpectatingOverlayComponent, CommonModule, GameLayoutComponent, GamePkHudComponent, GameScoreCapsuleComponent, GameHandheldHeaderComponent],
  templateUrl: './tetris.component.html',
  styleUrls: ['./tetris.component.css'],
  providers: [TetrisStore]
})
export class TetrisComponent extends BaseGameComponent implements OnInit, OnDestroy {
  worldRecord = signal<{ bestScore: number; username: string } | null>(null);
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => {
    const opps = this.store.opponents().map(opp => ({
      id: opp.id,
      score: opp.score || 0,
      status: opp.finished ? 'finished' : 'playing'
    }));
    const me = {
      id: this.playerId,
      score: this.store.score(),
      status: this.store.status() === GameStatus.Finished ? 'finished' : 'playing'
    };
    return [me, ...opps];
  });

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    return {
      id: this.playerId,
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: !this.store.isSpectator(),
      score: this.store.score(),
      status: this.store.status() === GameStatus.Finished ? GameStatus.Finished : GameStatus.Playing,
      metrics: [
        { label: this.i18n.t('game.pk.lines')(), value: this.store.lines(), icon: '≣', colorClass: 'text-amber-500 font-bold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    const isSpec = this.store.isSpectator();
    const myId = this.playerId;

    return this.store.opponents()
      .filter(opp => isSpec || opp.id !== myId)
      .map(opp => {
        return {
          id: opp.id,
          nickname: opp.id,
          isHost: opp.id === this.store.hostId(),
          isMe: !isSpec && opp.id === myId,
          score: opp.score,
          status: opp.finished ? GameStatus.Finished : this.store.status(),
          metrics: [
            { label: this.i18n.t('game.pk.lines')(), value: opp.lines, icon: '≣', colorClass: 'text-amber-500 font-bold' }
          ]
        };
      });
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    if (this.currentRoomMode() === GameMode.Single) return undefined;
    const oppId = this.opponentsPkStats()[0]?.id;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.playerId] || 0,
      opponent: wins[oppId] || 0
    };
  });
  @ViewChild('boardArea') boardArea!: ElementRef<HTMLDivElement>;
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;
  override store = inject(TetrisStore);
  private floatingText = inject(FloatingTextService);
  private windowSize = inject(WindowSizeService);

  readonly boardHeightPx = computed(() => {
    const { w: vw, h: vh } = this.windowSize.size();
    
    // Chrome height:
    // Mobile (<768px): Header + mobile hold/next bar + ScoreCapsule + Virtual Controller (~310px)
    // Tablet (768-1024px): Header + ScoreCapsule + Stage margins (~200px)
    // Desktop (>=1024px): Header + ScoreCapsule + Stage margins (~220px)
    const chromeH = vw < 768 ? 310 : (vw < 1024 ? 200 : 220);
    const availH = Math.max(380, vh - chromeH);

    // Left and right wings on tablet/desktop:
    // w-32 lg:w-40 on both sides + gap (~260px to 320px)
    const wingsW = vw < 768 ? 0 : (vw < 1024 ? 260 : 320);
    const availW = Math.max(240, vw - wingsW - 32);
    // Board has 1:2 aspect ratio, so board width = height / 2.
    // The maximum height allowed by available width is availW * 2.
    const maxHByW = Math.floor(availW * 2);

    // Max height limits:
    // Mobile: up to 500px
    // Tablet (iPad 768-1024px): up to 600px (so board width is 300px, leaving plenty of space for wings!)
    // Desktop: up to 740px
    const maxH = vw < 768 ? 500 : (vw < 1024 ? 600 : 740);

    const targetH = Math.max(360, Math.min(availH, maxH, maxHByW));
    return `${targetH}px`;
  });

  getRemainingBufferSeconds(): string {
    return this.store.bufferSecondsLeft();
  }

  readonly COLS = TETRIS_COLS;
  readonly ROWS = TETRIS_ROWS;
  readonly COLORS = TETROMINO_COLORS;
  currentRoomMode = this.store.currentRoomMode;
  currentRoomId = computed(() => this.wsService.gameState()?.roomId || '');

  showLevelUp = signal(false);
  levelUpNum = signal(0);
  showTetrisBanner = signal(false);

  // Touch Handling properties
  private touchStartX = 0;
  private touchStartY = 0;
  private lastProcessedX = 0;
  private lastProcessedY = 0;
  private touchStartTime = 0;
  private hasMoved = false;

  private roomLifecycle: RoomLifecycleHandle;

  constructor() {
    super();
    effect((onCleanup) => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }

      if (status === GameStatus.Finished) {
        if (this.store.isVictory()) {
          this.celebrateVictory();
        } else {
          this.vibrateError();
        }
      }
    });

    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'tetris',
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });

    effect(() => {
      const lv = this.store.levelUpSignal();
      if (lv > 0) {
        this.vibrateMedium();
        this.levelUpNum.set(lv);
        this.showLevelUp.set(true);
        setTimeout(() => this.showLevelUp.set(false), 1600);
      }
    });

    effect(() => {
      const t = this.store.tetrisTrigger();
      if (t > 0) {
        this.vibrateCombo();
        this.showTetrisBanner.set(true);
        setTimeout(() => this.showTetrisBanner.set(false), 1400);
      }
    });

    effect(() => {
      const c = this.store.comboTrigger();
      if (c > 0) {
        this.vibrateSnap();
        if (this.boardArea) {
          const rect = this.boardArea.nativeElement.getBoundingClientRect();
          this.floatingText.show(`🔥 COMBO ×${c}!`, rect.left + rect.width / 2, rect.top + rect.height / 2, { size: 'lg', color: '#fbbf24' });
        }
      }
    });

    // Battle PK Attack FX
    effect(() => {
      const atk = this.store.attackLaser();
      if (atk && this.boardArea) {
        const rect = this.boardArea.nativeElement.getBoundingClientRect();
        this.floatingText.show(`🚀 ATTACK +${atk.lines} LINES!`, rect.left + rect.width / 2, rect.top + rect.height * 0.35, { size: 'lg', color: '#f43f5e' });
      }
    });

    // Battle PK Counter Defense FX
    effect(() => {
      const cnt = this.store.counterNotice();
      if (cnt && this.boardArea) {
        const rect = this.boardArea.nativeElement.getBoundingClientRect();
        this.floatingText.show(`🛡️ COUNTER -${cnt.lines} BLOCKED!`, rect.left + rect.width / 2, rect.top + rect.height * 0.45, { size: 'lg', color: '#10b981' });
      }
    });

    // Battle PK Incoming Alert FX
    effect(() => {
      const inc = this.store.incomingNotice();
      if (inc && this.boardArea) {
        const rect = this.boardArea.nativeElement.getBoundingClientRect();
        const alertTitle = this.i18n.t('tetris.incoming_alert')() || 'INCOMING ATTACK';
        const linesText = this.i18n.t('tetris.lines')() || 'LINES';
        this.floatingText.show(`⚠️ ${alertTitle}: +${inc.lines} ${linesText} (2.5s)!`, rect.left + rect.width / 2, rect.top + rect.height * 0.22, { size: 'lg', color: '#f43f5e' });
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();

    this.leaderboardService.getWorldRecord('tetris').subscribe(rec => {
      if (rec) this.worldRecord.set(rec);
    });
    
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.isCreate) {
        this.handleCreateRoom(pending);
      } else {
        this.handleJoinRoom(pending);
      }
    } else {
      this.store.joinRoom('', GameMode.Single, 'normal', '');
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  override goBack() {
    this.roomLifecycle?.clearReconnectInfo();
    super.goBack();
  }

  override handleJoinRoom(event: any) {
    if (this.currentRoomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    const action = event.isSpectator ? 'spectate' : 'join';
    this.wsService.setPendingAction(action);
    this.store.joinRoom(
      event.roomId,
      event.mode,
      event.difficulty,
      event.host,
      event.target ?? 1,
      event.password || '',
      event.bountyCoins || 0,
      event.isSpectator || false
    );
    if (event.mode !== GameMode.Single && !event.isSpectator) {
      this.roomLifecycle.saveReconnectInfo(event.roomId, event.mode, event.difficulty, event.host);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleCreateRoom(config: any) {
    if (config.password) this.wsService.setPendingPassword(config.password);
    this.wsService.setPendingAction('create');
    const roomId = config.name || config.roomId;
    this.store.joinRoom(
      roomId,
      config.mode,
      config.difficulty,
      this.playerId,
      config.target ?? 1,
      config.password || '',
      config.bountyCoins || 0,
      false
    );
    if (config.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(roomId, config.mode, config.difficulty, this.playerId);
    }
    this.isMobileSidebarOpen.set(false);
  }

  

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.code === 'KeyR' && this.currentRoomMode() === GameMode.Single) {
      this.store.startGame();
      event.preventDefault();
      return;
    }

    if (this.store.isSpectator() || this.store.status() !== GameStatus.Playing) return;
    
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.store.moveLeft();
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.store.moveRight();
        event.preventDefault();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'KeyZ':
        this.store.rotate();
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.store.softDrop();
        event.preventDefault();
        break;
      case 'Space':
        this.store.hardDrop();
        event.preventDefault();
        break;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.store.hold();
        event.preventDefault();
        break;
    }
  }

  onTouchStart(e: TouchEvent) {
    if (this.store.isSpectator() || this.store.status() !== GameStatus.Playing) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.lastProcessedX = this.touchStartX;
    this.lastProcessedY = this.touchStartY;
    this.touchStartTime = Date.now();
    this.hasMoved = false;
  }

  onTouchMove(e: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const dx = currentX - this.lastProcessedX;
    const dy = currentY - this.lastProcessedY;

    // Horizontal movement
    if (Math.abs(dx) > 25) {
      if (dx > 0) {
        this.store.moveRight();
      } else {
        this.store.moveLeft();
      }
      this.haptic.vibrateLight();
      this.lastProcessedX = currentX;
      this.hasMoved = true;
    }

    // Vertical soft drop (only downwards)
    if (dy > 35) {
      this.store.softDrop();
      this.lastProcessedY = currentY;
      this.hasMoved = true;
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    const currentX = e.changedTouches[0].clientX;
    const currentY = e.changedTouches[0].clientY;
    const totalDx = currentX - this.touchStartX;
    const totalDy = currentY - this.touchStartY;
    const duration = Date.now() - this.touchStartTime;

    if (!this.hasMoved && duration < 300 && Math.abs(totalDx) < 10 && Math.abs(totalDy) < 10) {
      // Tap -> Rotate
      this.store.rotate();
      this.haptic.vibrateLight();
    } else if (totalDy > 60 && duration < 300 && totalDy > Math.abs(totalDx)) {
      // Fast flick down -> Hard Drop
      this.store.hardDrop();
      this.haptic.vibrateImpact();
    }
  }

  getPieceColor(type: Tetromino): string {
    const theme = this.store.colorTheme();
    return TETROMINO_THEMES[theme]?.[type] || TETROMINO_COLORS[type] || 'transparent';
  }

  getThemeName(theme: string): string {
    switch (theme) {
      case 'crystal': return this.i18n.t('tetris.theme.crystal')();
      case 'gold': return this.i18n.t('tetris.theme.gold')();
      case 'ocean': return this.i18n.t('tetris.theme.ocean')();
      default: return theme;
    }
  }

  getShapeArray(type: Tetromino): number[][] {
    return TETROMINO_SHAPES[type] || [];
  }

  // Used for rendering the board with classic 3D bevel and ghost piece
  viewGrid = computed(() => {
    let grid = this.store.grid();
    let current = this.store.currentPiece();
    let ghostY = this.store.ghostY();
    const theme = this.store.colorTheme();
    const colors = TETROMINO_THEMES[theme] || this.COLORS;
    let clearingRows = this.store.clearingRows();
    let dissolvingRows = this.store.dissolvingRows();
    let isDissolving = this.store.isDissolving();

    if (this.store.isSpectator()) {
      const focus = this.store.focusedPlayerId();
      const opps = this.store.opponents();
      const target = (focus ? opps.find(o => o.id === focus) : null) || opps[0];
      if (target?.matrix && Array.isArray(target.matrix) && target.matrix.length > 0) {
        grid = target.matrix;
      }
      current = null;
      ghostY = -1;
      clearingRows = [];
      dissolvingRows = [];
      isDissolving = false;
    }

    const minDissolveRow = dissolvingRows.length > 0 ? Math.min(...dissolvingRows) : 0;
    
    const result: {
      bg: string;
      border: string;
      shadow: string;
      isGhost: boolean;
      isFilled: boolean;
      isClearing: boolean;
      isDissolving: boolean;
      dissolveDelay: number;
    }[][] = [];

    for (let y = 0; y < this.ROWS; y++) {
      const isClearingRow = clearingRows.includes(y);
      const isDissolveRow = isDissolving && dissolvingRows.includes(y);
      const row = [];

      for (let x = 0; x < this.COLS; x++) {
        let bg = 'transparent';
        let border = 'none';
        let shadow = 'none';
        let isGhost = false;
        let isFilled = false;
        let isClearing = false;
        let isCellDissolving = false;
        let dissolveDelay = 0;
        
        if (grid[y] && grid[y][x] !== 0) {
          bg = colors[grid[y][x] as Tetromino];
          isFilled = true;
          if (isClearingRow) {
            isClearing = true;
          }
          if (isDissolveRow) {
            isCellDissolving = true;
            dissolveDelay = (y - minDissolveRow) * 30 + x * 8;
          }
        } else if (current &&
            x >= current.x && x < current.x + current.shape[0].length &&
            y >= current.y && y < current.y + current.shape.length &&
            current.shape[y - current.y][x - current.x] !== 0) {
          bg = colors[current.type];
          isFilled = true;
        } else if (ghostY !== -1 && current && (ghostY - current.y >= 2) &&
            x >= current.x && x < current.x + current.shape[0].length &&
            y >= ghostY && y < ghostY + current.shape.length &&
            current.shape[y - ghostY]?.[x - current.x] !== 0) {
          // 仅在落点距离较远时显示底部轻量着陆虚影，与方块相邻时完全不显示，杜绝贴身暗色尾影
          isGhost = true;
          const pieceColor = colors[current.type] || '#38bdf8';
          bg = pieceColor + '18';
          border = `1.5px solid ${pieceColor}66`;
          shadow = 'none';
        }
        
        if (isClearing) {
          bg = '#ffffff';
          border = '1px solid #ffffff';
          shadow = '0 0 24px #ffffff, inset 0 0 12px #ffffff';
        } else if (isFilled) {
          // 纯内嵌微晶宝石切面倒角（严格无任何向外扩散的暗部阴影，杜绝位移产生的拖影）
          shadow = `inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -2px 2px rgba(0,0,0,0.35), inset 2px 0 2px rgba(255,255,255,0.2), inset -2px 0 2px rgba(0,0,0,0.2)`;
          border = '1px solid rgba(255,255,255,0.2)';
        }
        
        row.push({
          bg,
          border,
          shadow,
          isGhost,
          isFilled,
          isClearing,
          isDissolving: isCellDissolving,
          dissolveDelay
        });
      }
      result.push(row);
    }
    return result;
  });



  getSubtitle(): string {
    const mode = this.currentRoomMode();
    if (mode === GameMode.Single) {
      return this.i18n.t('tetris.mode.single')();
    }
    const labelKey = this.gameRegistry.getModeLabel('tetris', mode);
    return labelKey ? this.i18n.t(labelKey)() : this.i18n.t('tetris.mode.diff_pk_attack')();
  }





  override openChangeSettings() {
    if (this.lobbyPanel && this.currentRoomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.currentRoomId(),
        game: 'tetris',
        mode: this.currentRoomMode(),
        difficulty: '',
        host: this.store.hostId()
      });
    }
  }

  getPlayerScores(): Array<{id: string; score: number}> {
    const scores = this.store.opponents().map(opp => ({
      id: opp.id,
      score: opp.score
    }));
    scores.push({ id: this.playerId, score: this.store.score() });
    return scores;
  }
  
  handleRevive() {
    this.store.reviveGame();
  }
  
  getOverlayStats() {
    const stats: { label: string, value: string | number }[] = [
      { label: this.i18n.t('tetris.score')() || 'SCORE', value: this.store.score() }
    ];
    if (this.currentRoomMode() === GameMode.Single) {
      const best = this.store.bestScore();
      if (best > 0) {
        stats.push({ label: 'BEST', value: best });
      }
    }
    return stats;
  }

  isOpponentCritical(matrix: number[][]): boolean {
    if (!matrix || matrix.length === 0) return false;
    // Check if blocks have stacked up into danger territory (rows 0 to 5 out of 20)
    for (let r = 0; r < Math.min(6, matrix.length); r++) {
      if (matrix[r]?.some(c => c !== 0)) return true;
    }
    return false;
  }
}
