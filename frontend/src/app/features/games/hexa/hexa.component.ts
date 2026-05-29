import { Component, computed, effect, HostListener, inject, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { HexaStore, GameStatus } from './store/hexa.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { HexaBoardComponent } from './components/hexa-board/hexa-board.component';
import { HexPiece, HexCoord } from './store/hexa-engine';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-hexa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HexaBoardComponent,
    GameWaitingRoomComponent,
    GameLobbyPanelComponent
  ],
  templateUrl: './hexa.component.html'
})
export class HexaComponent extends BaseGameComponent implements OnInit {
  override store = inject(HexaStore);
  private authStore = inject(AuthStore);
  private crossGameJoin = inject(CrossGameJoinService);
  override gameTimer = inject(GameTimerService);
  readonly i18n = inject(I18nService);
  private audioService = inject(AudioService);

  get t() {
    return this.i18n.t.bind(this.i18n);
  }

  gameModes = [
    { id: 'pk_score', labelKey: 'sliding.mode.pk_speed', icon: '⏱️', descKey: 'game.pk_score_desc' }
  ];

  difficulties = [
    { id: 'medium', labelKey: 'sliding.difficulty.medium', desc: 'Standard' }
  ];

  @ViewChild('boardArea') boardArea!: ElementRef<HTMLElement>;
  @ViewChild(HexaBoardComponent) boardComponent!: HexaBoardComponent;

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

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

  constructor() {
    super();

    // Start single player by default if we land directly on page
    effect(() => {
      if (this.currentRoomMode() === 'single') {
        if (!this.store.loadSinglePlayer()) {
          this.store.startSinglePlayer();
        }
      }
    }, { allowSignalWrites: true });

    // Handle PK Start countdown
    effect(() => {
      const status = this.store.status();
      if (status === GameStatus.STARTING) {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    const pending = this.crossGameJoin.consumePendingJoin('hexa');
    if (pending) {
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host);
    }
  }

  // --- Drag and Drop Logic --- //

  onDragStart(event: MouseEvent | TouchEvent, piece: HexPiece, index: number, pieceElement: HTMLElement) {
    // 触发并恢复音频上下文，因为这是用户的明确交互
    this.audioService.initAudio();

    if (this.store.gameOver() || (this.currentRoomMode() !== 'single' && this.store.status() !== GameStatus.PLAYING)) return;
    
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
      const scaleX = this.svgRect.width / boardVbW;
      
      const box = this.getPieceSvgViewBoxData(piece);
      this.dragSize = {
        w: box.vbW * scaleX,
        h: box.vbH * scaleX
      };
      
      const vbCenterX = box.vbX + box.vbW / 2;
      const vbCenterY = box.vbY + box.vbH / 2;
      
      this.rootOffset = {
        x: (0 - vbCenterX) * scaleX,
        y: (0 - vbCenterY) * scaleX
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
    }

    this.isDragging = false;
    this.draggedPiece = null;
    this.draggedPieceIndex = -1;
    this.previewOrigin = null;
    this.svgRect = null;
  }

  // Helpers
  getElapsedMs(): number {
    const startAt = this.currentRoomMode() === 'single' ? 0 : this.store.globalStartAt();
    if (!startAt) return 0;
    return Math.max(0, Date.now() - startAt);
  }

  formatTime(ms: number): string {
    return this.gameTimer.formatTime(ms);
  }

  currentRoomMode(): string {
    return this.store.currentMode();
  }

  currentRoomId(): string {
    return this.store.roomId();
  }

  returnToLobby(): void {
    history.back();
  }

  goBack(): void {
    history.back();
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
}
