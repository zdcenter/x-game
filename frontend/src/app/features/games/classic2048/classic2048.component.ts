import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { AdService } from '../../../core/services/ad.service';
import { computed, Component, inject, OnInit, OnDestroy, HostListener, ViewChild, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../core/auth/auth.store';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { Classic2048Store } from './store/classic2048.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameMode, GameStatus } from '../../../core/models/game.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SettingsService } from '../../../core/services/settings.service';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { boardSizePx } from '../../../core/utils/board-size.util';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { GameScoreCapsuleComponent } from '../../../shared/components/game-score-capsule/game-score-capsule.component';
import { ToastService } from '../../../core/services/toast.service';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';

import { AudioService } from '../../../core/services/audio.service';
import { HapticService } from '../../../core/services/haptic.service';
import { LeaderboardService } from '../../../core/services/leaderboard.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';

export type C2048Theme = 'classic' | 'neon' | 'glacier';

import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';

@Component({
  selector: 'app-classic2048',
  standalone: true,
  imports: [GameSpectatingOverlayComponent, 
    CommonModule,
    GameScoreCapsuleComponent,
    GameToolbarComponent, GameLayoutComponent, GamePkHudComponent, GameHandheldHeaderComponent],
  templateUrl: './classic2048.component.html',
  styleUrls: ['./classic2048.component.css'],
  providers: [Classic2048Store]
})
export class Classic2048Component extends BaseGameComponent implements OnInit, OnDestroy {
  worldRecord = signal<{ bestScore: number; username: string } | null>(null);

  getSubtitle(): string {
    const mode = this.store.currentRoomMode();
    if (mode === GameMode.Single) {
      return this.i18n.t('game.single_mode')();
    }
    const labelKey = this.gameRegistry.getModeLabel('classic2048', mode);
    return labelKey ? this.i18n.t(labelKey)() : this.i18n.t('game.speed_mode')();
  }

  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => {
    return this.store.playersList().map(p => {
      const board = this.store.pkBoards()[p.id];
      return {
        id: p.id,
        score: board?.score || 0,
        status: board?.status || 'playing'
      };
    });
  });

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    let maxT = 0;
    const cells = this.store.displayCells();
    for (const row of cells) {
      for (const val of row) {
        if (val > maxT) maxT = val;
      }
    }

    return {
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: !this.store.isSpectator(),
      score: this.store.displayScore(),
      status: this.store.status(),
      metrics: [
        ...(maxT > 0 ? [{ label: this.i18n.t('game.pk.max_tile')(), value: maxT, icon: '🏆', colorClass: 'text-amber-500 font-bold' }] : []),
        { label: this.i18n.t('game.pk.steps')(), value: this.store.localMoves(), icon: '🔄', colorClass: 'text-sky-500 font-semibold' }
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
    const pkBoards = this.store.pkBoards();

    const isSpec = this.store.isSpectator();
    return this.store.playersList()
      .filter(p => isSpec || p.id !== this.playerId)
      .map(p => {
        const pInfo = players.find((x: any) => x && (x.id === p.id || x.playerId === p.id));
        const board = pkBoards[p.id];
        let maxT = 0;
        if (board?.cells) {
          for (const row of board.cells) {
            for (const val of row) {
              if (val > maxT) maxT = val;
            }
          }
        }
        return {
          id: p.id,
          playerId: p.id,
          nickname: pInfo?.nickname || p.id,
          avatar: pInfo?.avatar,
          isHost: p.id === this.store.hostId(),
          isMe: !isSpec && p.id === this.playerId,
          score: board?.score || 0,
          status: (board?.status as any) || this.store.status(),
          metrics: [
            ...(maxT > 0 ? [{ label: this.i18n.t('game.pk.max_tile')(), value: maxT, icon: '🏆', colorClass: 'text-amber-500 font-bold' }] : []),
          ]
        };
      });
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return undefined;
    const oppId = this.opponentsPkStats()[0]?.playerId;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.playerId] || 0,
      opponent: wins[oppId] || 0
    };
  });

  override store = inject(Classic2048Store);
  
  bestScore = signal<number>(0);
  scoreDelta = signal<number>(0);
  showDelta = signal<boolean>(false);
  currentTheme = signal<C2048Theme>('classic');
  private prevScore = 0;

  comboCount = signal<number>(0);
  private comboTimer: any = null;
  comboFloatItems = signal<Array<{ id: number; text: string; tier: 1 | 2 | 3; xPct: number }>>([]);

  private lifecycle!: RoomLifecycleHandle;

  timeSeconds = 0;
  private timerInterval: any;

  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;

  constructor() {
    super();
    this.lifecycle = setupRoomLifecycle({
      gameId: 'classic2048',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.lifecycle.clearReconnectInfo();
      },
    });

    if (typeof localStorage !== 'undefined') {
      const savedBest = localStorage.getItem('classic2048_best_score');
      if (savedBest) this.bestScore.set(parseInt(savedBest, 10) || 0);

      const savedTheme = localStorage.getItem('classic2048_theme') as C2048Theme;
      if (savedTheme && ['classic', 'neon', 'glacier'].includes(savedTheme)) {
        this.currentTheme.set(savedTheme);
      }
    }

    effect(() => {
      if (this.store.status() === GameStatus.Finished && this.store.currentRoomMode() === GameMode.Single) {
        this.vibrateError();
        this.submitScore();
      }
    });

    effect(() => {
      const s = this.store.status();
      if (s === GameStatus.Playing) {
        if (this.store.localMoves() === 0 && this.store.localScore() === 0) {
          this.timeSeconds = 0;
        }
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => { this.timeSeconds++; }, 1000);
      } else {
        clearInterval(this.timerInterval);
      }
    });

    effect(() => {
      const score = this.store.localScore();
      if (score > this.prevScore) {
        const delta = score - this.prevScore;
        this.scoreDelta.set(delta);
        this.showDelta.set(true);
        setTimeout(() => this.showDelta.set(false), 800);

        // 连击计时与步进
        if (this.comboTimer) {
          clearTimeout(this.comboTimer);
          this.comboCount.update(c => Math.min(c + 1, 8));
        } else {
          this.comboCount.set(1);
        }
        this.comboTimer = setTimeout(() => {
          this.comboCount.set(0);
          this.comboTimer = null;
        }, 2200);

        const currentCombo = this.comboCount();
        this.audio.playDrop2048('merge', currentCombo);

        if (currentCombo >= 3 || delta >= 256) {
          this.vibrateCombo();
        } else if (currentCombo >= 2 || delta >= 64) {
          this.vibrateMedium();
        } else {
          this.vibrateLight();
        }

        // 浮空连击/高分特效
        if (currentCombo >= 2 || delta >= 128) {
          const tier: 1 | 2 | 3 = (delta >= 512 || currentCombo >= 5) ? 3 : (delta >= 128 || currentCombo >= 3) ? 2 : 1;
          let text = '';
          if (delta >= 1024) {
            text = `🌟 1024+  +${delta}`;
          } else if (delta >= 512) {
            text = `⚡ EPIC  +${delta}`;
          } else if (currentCombo >= 4) {
            text = `🔥 UNSTOPPABLE ×${currentCombo}  +${delta}`;
          } else if (currentCombo >= 3) {
            text = `⚡ SUPER ×${currentCombo}  +${delta}`;
          } else {
            text = `✨ COMBO ×${currentCombo}  +${delta}`;
          }
          const id = Date.now() + Math.random();
          const xPct = 50 + (Math.random() * 24 - 12);
          this.comboFloatItems.update(items => [...items, { id, text, tier, xPct }]);
          setTimeout(() => {
            this.comboFloatItems.update(items => items.filter(it => it.id !== id));
          }, 850);
        }

        // 局内破个人纪录即时仪式感
        if (this.prevScore > 0 && this.prevScore <= this.bestScore() && score > this.bestScore()) {
          const id = Date.now() + Math.random();
          this.comboFloatItems.update(items => [...items, { id, text: `👑 NEW RECORD!`, tier: 3, xPct: 50 }]);
          this.vibrateSuccess();
          setTimeout(() => {
            this.comboFloatItems.update(items => items.filter(it => it.id !== id));
          }, 1200);
        }

        if (score > this.bestScore()) {
          this.bestScore.set(score);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('classic2048_best_score', score.toString());
          }
        }
      } else if (score === 0) {
        this.prevScore = 0;
        this.comboCount.set(0);
        if (this.comboTimer) {
          clearTimeout(this.comboTimer);
          this.comboTimer = null;
        }
      }
      this.prevScore = score;
    });
  }

  setTheme(theme: C2048Theme) {
    this.currentTheme.set(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('classic2048_theme', theme);
    }
    this.audio.playClick();
  }

  cycleTheme() {
    const themes: C2048Theme[] = ['classic', 'neon', 'glacier'];
    const currIdx = themes.indexOf(this.currentTheme());
    const nextTheme = themes[(currIdx + 1) % themes.length];
    this.setTheme(nextTheme);
  }

  readonly currentThemeIcon = computed(() => {
    switch (this.currentTheme()) {
      case 'neon': return '⚡';
      case 'glacier': return '🧊';
      default: return '🪵';
    }
  });

  readonly currentThemeName = computed(() => {
    switch (this.currentTheme()) {
      case 'neon': return this.i18n.t('game.classic2048.theme_neon')();
      case 'glacier': return this.i18n.t('game.classic2048.theme_glacier')();
      default: return this.i18n.t('game.classic2048.theme_classic')();
    }
  });

  get timeDisplay() {
    const m = Math.floor(this.timeSeconds / 60);
    const s = this.timeSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  override ngOnInit() {
    super.ngOnInit();

    this.leaderboardService.getWorldRecord('classic2048').subscribe(rec => {
      if (rec) this.worldRecord.set(rec);
    });

    const pending = this.lifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.isCreate) {
        this.handleCreateRoom(pending);
      } else {
        this.handleJoinRoom(pending);
      }
    } else {
      if (this.store.currentRoomMode() === GameMode.Single && this.store.status() === GameStatus.Waiting) {
        this.store.startGame();
      }
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  override handleJoinRoom(params: any) {
    super.handleJoinRoom(params);
    if (params.mode !== GameMode.Single && !params.isSpectator) {
      this.lifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
  }

  override handleCreateRoom(params: any) {
    super.handleCreateRoom(params);
    if (params.mode !== GameMode.Single) {
      this.lifecycle.saveReconnectInfo(params.name, params.mode, params.difficulty, this.playerId);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // R to quickly restart in single player
    if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey) {
      if (this.store.currentRoomMode() === GameMode.Single) {
        this.store.startGame();
        event.preventDefault();
        return;
      }
    }

    // Z to undo
    if ((event.key === 'z' || event.key === 'Z') && !event.shiftKey) {
      if (this.store.currentRoomMode() === GameMode.Single) {
        this.store.undo();
        event.preventDefault();
        return;
      }
    }

    if (this.store.isSpectator() || this.store.status() !== GameStatus.Playing) return;
    
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.store.move('up');
        this.audio.playDrop2048('move');
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.store.move('down');
        this.audio.playDrop2048('move');
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.store.move('left');
        this.audio.playDrop2048('move');
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.store.move('right');
        this.audio.playDrop2048('move');
        event.preventDefault();
        break;
    }
  }

  // Swipe handling
  private touchStartX = 0;
  private touchStartY = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.store.isSpectator() || this.store.status() !== GameStatus.Playing) return;
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    const touchEndX = event.changedTouches[0].screenX;
    const touchEndY = event.changedTouches[0].screenY;
    
    const dx = touchEndX - this.touchStartX;
    const dy = touchEndY - this.touchStartY;
    
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return; // Ignore small movements
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) this.store.move('right');
      else this.store.move('left');
    } else {
      if (dy > 0) this.store.move('down');
      else this.store.move('up');
    }
    this.audio.playDrop2048('move');
    this.haptic.vibrateSwipe();
  }

  getTileClass(value: number): string {
    return value <= 2048 ? `tile-${value}` : 'tile-super';
  }

  getTileFontSize(value: number): string {
    if (value < 100) return '2rem';
    if (value < 1000) return '1.5rem';
    return '1.2rem';
  }

  getOverlayTitle(): string {
    const won = this.store.winners().includes(this.playerId);
    return won ? this.i18n.t('game.you_win')() : this.i18n.t('game.you_lose')();
  }

  submitScore() {
    if (this.store.currentRoomMode() === GameMode.Single) {
      this.store.finishLocalGame({
        score: this.store.localScore(),
        time: this.timeSeconds,
        won: true
      });
    }
  }

  handleRevive() {
    this.store.reviveGame();
  }
}
