import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, computed, effect, HostListener, inject, ViewChild, ElementRef, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { HexaStore } from './store/hexa.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { RoomLifecycleHandle, setupRoomLifecycle } from '../../../core/services/room-lifecycle';
import { HexaBoardComponent } from './components/hexa-board/hexa-board.component';
import { HexPiece, HexCoord } from './store/hexa-engine';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { ToastService } from '../../../core/services/toast.service';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { GamePlayerMiniHudComponent } from '../../../shared/components/game-player-mini-hud/game-player-mini-hud.component';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { GameScoreCapsuleComponent } from '../../../shared/components/game-score-capsule/game-score-capsule.component';
import { LeaderboardService } from '../../../core/services/leaderboard.service';


@Component({
  selector: 'app-hexa',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    HexaBoardComponent,
    GameWaitingRoomComponent,
    GameResultOverlayComponent,
    GameStartingOverlayComponent,
    GamePlayerMiniHudComponent, GameLayoutComponent, GamePkHudComponent, GameScoreCapsuleComponent],
  providers: [HexaStore],
  templateUrl: './hexa.component.html',
  styleUrl: './hexa.component.css'
})
export class HexaComponent extends BaseGameComponent implements OnInit, OnDestroy {
  GameDifficulty = GameDifficulty;
  GameStatus = GameStatus;
  GameMode = GameMode;
  override store = inject(HexaStore);
  private authStore = inject(AuthStore);
  public timerService = inject(GameTimerService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  override gameTimer = inject(GameTimerService);
  readonly i18n = inject(I18nService);
  private audioService = inject(AudioService);
  private haptic = inject(HapticService);
  private gameRegistry = inject(GameRegistryService);
  private leaderboardService = inject(LeaderboardService);

  worldRecord = signal<{ bestScore: number; username: string } | null>(null);
  showRules = signal(false);
  showOverlay = signal(false);
  isShaking = signal(false);
  floatItems = signal<{ id: number; text: string; tier: 1 | 2; xPct: number }[]>([]);
  particles = signal<{ id: string; color: string; size: number; tx: number; ty: number }[]>([]);
  Math = Math;
  get t() {
    return this.i18n.t.bind(this.i18n);
  }

  @ViewChild('boardArea') boardArea!: ElementRef<HTMLElement>;
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;
  @ViewChild(HexaBoardComponent) boardComponent!: HexaBoardComponent;

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    return {
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: true,
      score: this.store.score(),
      status: this.store.status() === GameStatus.Finished ? GameStatus.Finished : GameStatus.Playing,
      metrics: [
        ...(this.store.combo() > 1 ? [{ label: 'COMBO', value: `${this.store.combo()}x`, icon: '🔥', colorClass: 'text-amber-500 font-bold' }] : [])
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    const room = this.store.room();
    const players = room?.players || [];

    return this.store.otherPlayers().map(opp => {
      const pInfo = players.find((x: any) => x.id === opp.id);
      return {
        id: opp.id,
        playerId: opp.id,
        nickname: pInfo?.nickname || opp.id,
        avatar: pInfo?.avatar,
        isHost: opp.id === this.store.hostId(),
        isMe: false,
        score: opp.score,
        status: opp.finished ? GameStatus.Finished : GameStatus.Playing
      };
    });
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    if (this.currentRoomMode() === GameMode.Single) return undefined;
    const oppId = this.opponentsPkStats()[0]?.playerId;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.playerId] || 0,
      opponent: wins[oppId] || 0
    };
  });

  // Dragging state
  draggedPiece: HexPiece | null = null;
  draggedPieceIndex: number = -1;
  dragPos = { x: 0, y: 0 };
  previewOrigin: HexCoord | null = null;
  dragStartOffset = { x: 0, y: 0 };


  isDragging = false;
  
  // Need this for coordinate mapping
  svgRect: DOMRect | null = null;
  dragSize = { w: 96, h: 96 };
  fingerOffsetY = 0;
  fingerOffsetX = 0;
  rootOffset = { x: 0, y: 0 };
  
  private roomLifecycle: RoomLifecycleHandle;

  constructor() {
    super();

    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'hexa',
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });

    // Start single player by default if we land directly on page
    effect(() => {
      if (this.currentRoomMode() === GameMode.Single) {
        if (!this.store.loadSinglePlayer()) {
          this.store.startGame();
        }
      }
    });

    effect(() => {
      const trigger = this.store.shakeTrigger();
      if (trigger > 0) {
        this.isShaking.set(false);
        setTimeout(() => { this.isShaking.set(true); setTimeout(() => this.isShaking.set(false), 420); }, 0);
      }
    });

    effect(() => {
      const gain = this.store.lastScoreGain();
      if (!gain) return;

      if (gain.combo === 0) return;

      const lines = gain.lines || 1;
      let text = `✨ CLEAR! +${gain.score}`;
      let tier: 1 | 2 = 1;

      if (lines >= 3 || gain.combo >= 4) {
        text = `💥 TRIPLE CRUSH! +${gain.score}`;
        tier = 2;
      } else if (lines === 2) {
        text = `⚡ DOUBLE CLEAR! +${gain.score}`;
        tier = 2;
      } else if (gain.combo > 1) {
        text = `🔥 COMBO ×${gain.combo}  +${gain.score}`;
        tier = 2;
      }

      const item = { id: gain.ts, text, tier, xPct: 35 + Math.random() * 30 };
      this.floatItems.update(items => [...items, item]);
      setTimeout(() => this.floatItems.update(items => items.filter(i => i.id !== item.id)), 1250);

      // 全屏爆裂星芒火花粒子喷泉
      const colors = ['#fde047', '#fbbf24', '#f59e0b', '#38bdf8', '#c084fc', '#34d399', '#ffffff'];
      const count = tier === 2 ? 32 : 18;
      const sparks = Array.from({ length: count }, (_, i) => ({
        id: `${gain.ts}-${i}`,
        color: colors[i % colors.length],
        size: 5 + Math.random() * 10,
        tx: (Math.random() * 360 - 180),
        ty: (Math.random() * 360 - 180),
      }));
      this.particles.update(p => [...p, ...sparks]);
      setTimeout(() => {
        this.particles.update(p => p.filter(x => !x.id.startsWith(`${gain.ts}-`)));
      }, 950);
    });

    // Handle PK Start countdown
    effect((onCleanup) => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }
      
      if (status === GameStatus.Finished || this.store.gameOver()) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });
  }

  override ngOnInit(): void {
    super.ngOnInit(); // connects lobby WS automatically

    this.leaderboardService.getWorldRecord('hexa').subscribe(rec => {
      if (rec) this.worldRecord.set(rec);
    });
    
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '', pending.target ?? 1);
      if (pending.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    }
  }

  override handleJoinRoom(event: { roomId: string, mode: string, difficulty: string, host: string, password?: string }) {
    if (this.currentRoomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(event.roomId, event.mode, event.difficulty, event.host);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleCreateRoom(event: { name: string, mode: string, difficulty: string, password?: string }) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(event.name, event.mode, event.difficulty, this.playerId);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  // --- Drag and Drop Logic --- //

  onDragStart(event: MouseEvent | TouchEvent, piece: HexPiece, index: number, pieceElement: HTMLElement) {
    this.audioService.initAudio(); // fire-and-forget: warm up AudioContext without blocking drag

    if (this.store.gameOver() || (this.currentRoomMode() !== GameMode.Single && this.store.status() !== GameStatus.Playing)) return;

    event.preventDefault();
    this.isDragging = true;
    this.draggedPiece = piece;
    this.draggedPieceIndex = index;

    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : (event as MouseEvent).clientY;

    if (this.boardArea) {
      this.svgRect = this.boardArea.nativeElement.querySelector('svg')!.getBoundingClientRect();
      
      const size = 10;
      const radius = 4;
      const boardVbW = size * Math.sqrt(3) * (radius * 2 + 1) + 10;
      const boardVbH = size * (radius * 3 + 2) + 10;
      const scale = Math.min(this.svgRect.width / boardVbW, this.svgRect.height / boardVbH);
      
      const box = this.getPieceSvgViewBoxData(piece);
      this.dragSize = {
        w: box.vbW * scale,
        h: box.vbH * scale
      };
      
      const vbCenterX = box.vbX + box.vbW / 2;
      const vbCenterY = box.vbY + box.vbH / 2;
      
      this.rootOffset = {
        x: (0 - vbCenterX) * scale,
        y: (0 - vbCenterY) * scale
      };
    }

    const isTouch = 'touches' in event || event.type.startsWith('touch');
    this.fingerOffsetY = isTouch ? 70 : 0;
    this.fingerOffsetX = isTouch ? 40 : 0; // Move piece left to avoid thumb

    this.dragStartOffset = {
      x: this.dragSize.w / 2 + this.fingerOffsetX,
      y: this.dragSize.h / 2 + this.fingerOffsetY
    };

    this.dragPos = {
      x: clientX,
      y: clientY
    };
    this.haptic.vibrateLight();
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onDragMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging || !this.draggedPiece || !this.svgRect) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : (event as MouseEvent).clientY;

    this.dragPos = {
      x: clientX,
      y: clientY
    };

    // Calculate hover hex using visual center
    const visualCenterX = this.dragPos.x - this.fingerOffsetX;
    const visualCenterY = this.dragPos.y - this.fingerOffsetY;

    const rootX = visualCenterX + this.rootOffset.x;
    const rootY = visualCenterY + this.rootOffset.y;

    const hoveredHex = this.boardComponent.pixelToHex(rootX, rootY, this.svgRect);
    
    if (hoveredHex && this.store.canPlacePiece(this.draggedPiece, hoveredHex)) {
      this.previewOrigin = hoveredHex;
    } else {
      this.previewOrigin = null;
    }
  }

  @HostListener('document:mouseup', ['$event'])
  @HostListener('document:touchend', ['$event'])
  onDragEnd(event: MouseEvent | TouchEvent) {
    if (!this.isDragging || !this.draggedPiece) return;

    if (this.previewOrigin) {
      this.store.placePiece(this.draggedPiece, this.previewOrigin, this.draggedPieceIndex);
      this.haptic.vibrateSnap();
    }

    this.isDragging = false;
    this.draggedPiece = null;
    this.draggedPieceIndex = -1;
    this.previewOrigin = null;
    this.svgRect = null;
  }

  // Helpers
  getElapsedMs(): number {
    const startAt = this.currentRoomMode() === GameMode.Single ? 0 : this.store.globalStartAt();
    if (!startAt) return 0;
    return Math.max(0, Date.now() - startAt);
  }

  formatTime(ms: number): string {
    return this.gameTimer.formatTime(ms);
  }

  currentRoomMode(): string {
    return this.store.currentRoomMode();
  }

  currentRoomId(): string {
    return this.store.roomId();
  }



  getSubtitle(): string {
    return this.currentRoomMode() === 'diff_pk_score' ? this.t('hexa.mode.diff_pk_score')() : this.t('hexa.mode.single')();
  }



  override openChangeSettings() {
    if (this.lobbyPanel && this.currentRoomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.currentRoomId(),
        game: 'hexa',
        mode: this.currentRoomMode(),
        difficulty: '',
        host: this.store.hostId()
      });
    }
  }

  // Draw helpers for the piece palette
  getPieceSvgViewBoxData(piece: HexPiece) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const size = 10;
    for (const p of piece.shape) {
      const x = size * Math.sqrt(3) * (p.q + p.r / 2);
      const y = size * (3 / 2) * p.r;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const hexWidth = size * Math.sqrt(3);
    const hexHeight = size * 2;
    
    const pad = 5;
    const vbX = minX - hexWidth / 2 - pad;
    const vbY = minY - hexHeight / 2 - pad;
    const vbW = (maxX - minX) + hexWidth + pad * 2;
    const vbH = (maxY - minY) + hexHeight + pad * 2;
    
    return { vbX, vbY, vbW, vbH };
  }



  getPieceSvgViewBox(piece: HexPiece): string {
    const d = this.getPieceSvgViewBoxData(piece);
    return `${d.vbX} ${d.vbY} ${d.vbW} ${d.vbH}`;
  }

  getPieceHexPoints(q: number, r: number): string {
    const size = 10;
    const x = size * Math.sqrt(3) * (q + r / 2);
    const y = size * (3 / 2) * r;
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle_deg = 60 * i - 30;
      const angle_rad = Math.PI / 180 * angle_deg;
      const pointX = x + size * Math.cos(angle_rad);
      const pointY = y + size * Math.sin(angle_rad);
      points.push(`${pointX},${pointY}`);
    }
    return points.join(' ');
  }

  getPieceFacetPoints(q: number, r: number): string {
    const size = 10;
    const x = size * Math.sqrt(3) * (q + r / 2);
    const y = size * (3 / 2) * r;
    const points = [`${x},${y}`];
    for (let i of [3, 4, 5]) {
      const angle_deg = 60 * i - 30;
      const angle_rad = Math.PI / 180 * angle_deg;
      const pointX = x + (size - 0.6) * Math.cos(angle_rad);
      const pointY = y + (size - 0.6) * Math.sin(angle_rad);
      points.push(`${pointX},${pointY}`);
    }
    return points.join(' ');
  }

  resolveColor(color?: string): string {
    if (!color) return 'url(#pieceGrad)';
    const theme = this.store.colorTheme();
    if (theme === 'gold') {
      if (color.includes('amber') || color.includes('red')) return 'url(#grad-gold-bright)';
      if (color.includes('blue') || color.includes('purple')) return 'url(#grad-gold-deep)';
      return 'url(#grad-gold-mid)';
    }
    if (theme === 'ocean') {
      if (color.includes('blue')) return 'url(#grad-ocean-bright)';
      if (color.includes('green') || color.includes('amber')) return 'url(#grad-ocean-cyan)';
      return 'url(#grad-ocean-deep)';
    }
    return color;
  }
}
