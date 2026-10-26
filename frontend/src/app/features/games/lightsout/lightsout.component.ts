import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
import { Component, inject, OnDestroy, OnInit, ViewChild, signal, effect, HostListener, computed } from '@angular/core';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { LightsoutStore } from './store/lightsout.store';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { RoomLifecycleHandle, setupRoomLifecycle } from '../../../core/services/room-lifecycle';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Router } from '@angular/router';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { CommonModule } from '@angular/common';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { HapticService } from '../../../core/services/haptic.service';
import { LeaderboardService } from '../../../core/services/leaderboard.service';
import { GameScoreCapsuleComponent } from '../../../shared/components/game-score-capsule/game-score-capsule.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';

@Component({
  selector: 'app-lightsout',
  standalone: true,
  imports: [
    CommonModule,
    GameLayoutComponent,
    GamePkHudComponent,
    GameScoreCapsuleComponent,
    GameToolbarComponent
  ],
  providers: [LightsoutStore],
  templateUrl: './lightsout.component.html',
  styles: [`
    @keyframes lo-shockwave-h {
      0%   { transform: scaleX(0.05); opacity: 1; }
      100% { transform: scaleX(1); opacity: 0; }
    }
    .lo-shockwave-h {
      animation: lo-shockwave-h 0.35s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
    }

    @keyframes lo-shockwave-v {
      0%   { transform: scaleY(0.05); opacity: 1; }
      100% { transform: scaleY(1); opacity: 0; }
    }
    .lo-shockwave-v {
      animation: lo-shockwave-v 0.35s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
    }

    @keyframes lo-spark {
      0%   { transform: translate(0, 0) scale(1.8); opacity: 1; filter: brightness(2.2); }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; filter: brightness(1); }
    }
    .lo-spark {
      animation: lo-spark 0.95s cubic-bezier(0.1, 1, 0.3, 1) forwards;
    }

    @keyframes lo-halo-pulse {
      0%, 100% { transform: scale(1); opacity: 0.85; }
      50%      { transform: scale(1.08); opacity: 1; }
    }
    .lo-halo-pulse {
      animation: lo-halo-pulse 1.4s ease-in-out infinite;
    }
  `]
})
export class LightsoutComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(LightsoutStore);

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  hintCell = signal<{r: number, c: number} | null>(null);
  keyboardCursor = signal<{ row: number; col: number }>({ row: 2, col: 2 });
  shockwave = signal<{ row: number; col: number; ts: number } | null>(null);
  particles = signal<{ id: string; color: string; size: number; tx: number; ty: number }[]>([]);
  worldRecord = signal<{ bestScore: number; username: string } | null>(null);

  private windowSize = inject(WindowSizeService);

  readonly boardSizePx = computed(() => {
    const { w: vw, h: vh } = this.windowSize.size();
    
    const isPk = this.store.currentRoomMode() !== GameMode.Single;
    const chromeH = isPk
      ? (vw < 640 ? 250 : vw < 1024 ? 270 : 290)
      : (vw < 640 ? 245 : vw < 1024 ? 265 : 285);
    const availH = Math.max(240, vh - chromeH);

    const padW = vw < 640 ? 24 : vw < 1024 ? 48 : 64;
    const availW = Math.max(240, Math.min(vw - padW, 1400));

    // Dynamic max board dimension
    const maxDim = vw < 640 ? 420 : (vw < 1024 ? 580 : 640);

    const dim = Math.max(240, Math.floor(Math.min(availW, availH, maxDim)));
    return `${dim}px`;
  });

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    return {
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.store.hostId() === this.playerId,
      isMe: true,
      status: this.store.isFinished() ? GameStatus.Finished : GameStatus.Playing,
      metrics: [
        { 
          label: this.store.targetMode() === 'on' 
            ? (this.i18n.t('lightsout.goal_lit')() || '待点亮') 
            : (this.i18n.t('lightsout.goal_extinguish')() || '待熄灭'), 
          value: this.store.remainingLights(), 
          icon: this.store.targetMode() === 'on' ? '💡' : '🌑', 
          colorClass: 'text-amber-400 font-bold' 
        },
        { label: this.i18n.t('game.pk.steps')(), value: this.store.moves(), icon: '🦶', colorClass: 'text-sky-400 font-semibold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return [];
    const room = this.store.room();
    const rawPlayers = room?.players;
    const players: any[] = Array.isArray(rawPlayers)
      ? rawPlayers
      : (rawPlayers && typeof rawPlayers === 'object' ? Object.values(rawPlayers) : []);

    return this.store.opponents().map(opp => {
      const pInfo = players.find((x: any) => x && (x.id === opp.id || x.playerId === opp.id));
      return {
        id: opp.id,
        nickname: pInfo?.nickname || opp.id,
        avatar: pInfo?.avatar,
        isHost: this.store.hostId() === opp.id,
        isMe: false,
        status: opp.finished ? GameStatus.Finished : GameStatus.Playing,
        metrics: [
          { label: this.i18n.t('game.pk.light_rem')(), value: opp.remainingLights, icon: '💡', colorClass: 'text-amber-400 font-bold' }
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

  getModeName() {
    const mode = this.store.currentRoomMode();
    const key = this.gameRegistry.getModeLabel('lightsout', mode);
    return key ? this.i18n.t(key)() : mode;
  }

  getDifficultyName() {
    const diff = this.store.currentRoomMode() === GameMode.Single
      ? this.store.currentDifficulty()
      : this.store.size() === 4 ? GameDifficulty.Easy : this.store.size() === 6 ? GameDifficulty.Hard : this.store.size() === 7 ? GameDifficulty.Expert : this.store.size() === 8 ? GameDifficulty.Master : GameDifficulty.Medium;
    const key = this.gameRegistry.getDifficultyLabel('lightsout', diff);
    return key ? this.i18n.t(key)() : diff;
  }

  getSubtitle(): string {
    const base = this.getModeName() + ' - ' + this.getDifficultyName();
    if (this.store.currentRoomMode() === GameMode.Single) {
      const modeBadge = this.store.targetMode() === 'on'
        ? (this.i18n.t('lightsout.mode_on')() || '点灯模式')
        : (this.i18n.t('lightsout.mode_off')() || '灭灯模式');
      return `${base} · ${modeBadge}`;
    }
    return base;
  }

  private roomLifecycle!: RoomLifecycleHandle;

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'lightsout',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });

    // Cross shockwave wave trigger
    effect(() => {
      const toggled = this.store.lastToggled();
      if (toggled) {
        this.shockwave.set(toggled);
        const timer = setTimeout(() => {
          if (this.shockwave()?.ts === toggled.ts) {
            this.shockwave.set(null);
          }
        }, 360);
      }
    });

    // Game Finished Overlay & Sparks
    effect((onCleanup) => {
      const isFin = this.store.status() === GameStatus.Finished;
      if (isFin) {
        if (this.getOverlayStatus() === 'win') {
          this.celebrateVictory();
        } else {
          this.vibrateError();
        }
        if (this.store.remainingLights() === 0) {
          const colors = ['#fde047', '#38bdf8', '#34d399', '#c084fc', '#ffffff'];
          const sparks = Array.from({ length: 36 }, (_, i) => ({
            id: `${Date.now()}-${i}`,
            color: colors[i % colors.length],
            size: 6 + Math.random() * 8,
            tx: Math.random() * 340 - 170,
            ty: Math.random() * 340 - 170,
          }));
          this.particles.set(sparks);
          setTimeout(() => this.particles.set([]), 1200);
        }
        const timer = setTimeout(() => this.showOverlay.set(true), 1200);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();

    this.leaderboardService.getWorldRecord('lightsout').subscribe(rec => {
      if (rec) this.worldRecord.set(rec);
    });

    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '', pending.target ?? 1);
      if (pending.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      const savedDiff = getSavedDifficulty('lightsout', GameDifficulty.Medium);
      this.store.joinRoom('', GameMode.Single, savedDiff);
    }
  }

  override handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string, target?: number}) {
    super.handleCreateRoom(event);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(this.store.roomId() || event.name, event.mode, event.difficulty, this.playerId);
    }
  }

  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string; password?: string }) {
    super.handleJoinRoom(params);
    if (params.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
  }

  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
    this.gameTimer.stopCountdown();
  }

  override openChangeSettings() {
    if (this.lobbyPanel && this.store.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.store.roomId(),
        game: 'lightsout',
        mode: this.store.currentRoomMode(),
        difficulty: this.store.size() === 4 ? GameDifficulty.Easy : this.store.size() === 6 ? GameDifficulty.Hard : this.store.size() === 7 ? GameDifficulty.Expert : this.store.size() === 8 ? GameDifficulty.Master : GameDifficulty.Medium,
        host: this.store.hostId()
      });
    }
  }

  changeDifficulty(event: Event | string) {
    const diff = typeof event === 'string' ? event : (event.target as HTMLSelectElement).value;
    setSavedDifficulty('lightsout', diff);
    this.gameTimer.stopCountdown();
    this.store.changeDifficulty(diff);
  }

  isConnected() {
    return this.wsService.isConnected();
  }

  getOverlayStatus(): 'win' | 'lose' {
    if (this.store.currentRoomMode() !== GameMode.Single) {
      return this.store.winners().includes(this.playerId) ? 'win' : 'lose';
    }
    return 'win';
  }

  getOverlayTitle(): string {
    const won = this.getOverlayStatus() === 'win';
    if (this.store.currentRoomMode() !== GameMode.Single && !this.store.isSeriesOver()) {
      return won ? this.i18n.t('game.round_won')() : this.i18n.t('game.round_lost')();
    }
    if (won) return this.i18n.t('game.you_win')();
    return this.i18n.t('game.you_lose')();
  }

  getOverlaySubtitle(): string {
    if (this.store.currentRoomMode() !== GameMode.Single) {
      if (!this.store.isSeriesOver()) {
        return this.store.pkScoreLabel();
      }
      return this.getOverlayStatus() === 'win'
        ? (this.i18n.t('game.cleared_first')() || 'You cleared the board first!')
        : (this.i18n.t('game.opponent_finished')() || 'An opponent cleared the board first!');
    }
    return this.store.targetMode() === 'on'
      ? (this.i18n.t('lightsout.all_lit_win')() || '全盘点亮！璀璨辉煌！')
      : (this.i18n.t('lightsout.all_out_win')() || this.i18n.t('game.all_lights_out')() || 'All lights out!');
  }

  getOverlayStats() {
    return [
      { label: this.i18n.t('game.moves')() || 'MOVES', value: this.store.moves() }
    ];
  }

  onCellClick(r: number, c: number) {
    this.hintCell.set(null);
    this.keyboardCursor.set({ row: r, col: c });
    this.haptic.vibrateLight();
    this.store.toggle(r, c);
  }

  undo() {
    if (this.store.canUndo()) {
      this.haptic.vibrateLight();
      this.store.undo();
    }
  }

  applyHint() {
    if (this.store.currentRoomMode() !== GameMode.Single || this.store.status() !== GameStatus.Playing) return;
    const sol = this.store.currentSolution();
    const size = this.store.size();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (sol[r] && sol[r][c]) {
          this.hintCell.set({ r, c });
          this.haptic.vibrateSnap();
          return;
        }
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    if (event.key.toLowerCase() === 'r' && this.store.currentRoomMode() === GameMode.Single) {
      this.store.startGame();
      event.preventDefault();
      return;
    }

    if (event.key.toLowerCase() === 'h' && this.store.currentRoomMode() === GameMode.Single) {
      this.applyHint();
      event.preventDefault();
      return;
    }

    if ((event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'u') && this.store.currentRoomMode() === GameMode.Single) {
      this.undo();
      event.preventDefault();
      return;
    }

    if (event.key.toLowerCase() === 'm' && this.store.currentRoomMode() === GameMode.Single) {
      this.store.toggleTargetMode();
      event.preventDefault();
      return;
    }

    // Number keys 1-5 to switch difficulty in single player mode
    if (this.store.currentRoomMode() === GameMode.Single && ['1', '2', '3', '4', '5'].includes(event.key)) {
      const diffs = [GameDifficulty.Easy, GameDifficulty.Medium, GameDifficulty.Hard, GameDifficulty.Expert, GameDifficulty.Master];
      const selected = diffs[parseInt(event.key, 10) - 1];
      if (selected && selected !== this.store.currentDifficulty()) {
        this.changeDifficulty(selected);
        event.preventDefault();
        return;
      }
    }

    // Arrow keys & WASD to move cursor
    const s = this.store.size();
    const cur = { ...this.keyboardCursor() };
    let moved = false;

    if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
      cur.row = Math.max(0, cur.row - 1);
      moved = true;
    } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
      cur.row = Math.min(s - 1, cur.row + 1);
      moved = true;
    } else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      cur.col = Math.max(0, cur.col - 1);
      moved = true;
    } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      cur.col = Math.min(s - 1, cur.col + 1);
      moved = true;
    }

    if (moved) {
      this.keyboardCursor.set(cur);
      event.preventDefault();
      return;
    }

    // Space or Enter to toggle
    if (event.key === ' ' || event.key === 'Enter') {
      if (this.store.status() === GameStatus.Playing && !this.store.isFinished()) {
        this.onCellClick(cur.row, cur.col);
        event.preventDefault();
        return;
      }
    }
  }
}
