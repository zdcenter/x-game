import { Component, OnInit, OnDestroy, inject, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { TentsStore } from './store/tents.store';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';
import { DifficultySelectorComponent, DifficultyOption } from '../../../shared/components/difficulty-selector/difficulty-selector.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { GameDifficulty, GameId, GameMode, GameStatus } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
import { TentsCellState } from './store/tents-engine';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';

@Component({
  selector: 'app-tents',
  standalone: true,
  imports: [
    CommonModule,
    GameLayoutComponent,
    GamePkHudComponent,
    GameHandheldHeaderComponent,
    DifficultySelectorComponent
  ],
  providers: [TentsStore],
  templateUrl: './tents.component.html',
  styleUrl: './tents.component.css'
})
export class TentsComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(TentsStore);

  CellState = TentsCellState;

  readonly availableDifficulties: DifficultyOption[] = [
    { id: 'easy', labelKey: 'game.diff_easy', desc: '6×6' },
    { id: 'medium', labelKey: 'game.diff_medium', desc: '8×8' },
    { id: 'hard', labelKey: 'game.diff_hard', desc: '10×10' }
  ];

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    return {
      id: this.playerId,
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: true,
      score: this.store.localScore(),
      status: this.store.status()
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return [];
    const myId = this.playerId;
    const room = this.store.room();
    const rawPlayers = room?.players || [];
    return rawPlayers
      .filter((p: any) => p.id !== myId)
      .map((p: any) => ({
        id: p.id,
        playerId: p.id,
        nickname: p.nickname || p.id,
        avatar: p.avatar,
        isHost: p.id === this.store.hostId(),
        isMe: false,
        score: p.score || 0,
        status: p.status || this.store.status()
      }));
  });

  private roomLifecycle: RoomLifecycleHandle;

  constructor() {
    super();

    this.roomLifecycle = setupRoomLifecycle({
      gameId: GameId.Tents,
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        if (this.roomLifecycle) {
          this.roomLifecycle.clearReconnectInfo();
        }
      },
    });

    // 通关多巴胺礼花喷射与触感回馈
    effect(() => {
      if (this.store.status() === GameStatus.Starting) {
        untracked(() => this.gameTimer.startCountdown());
      }
      if (this.store.status() === GameStatus.Finished && this.store.currentRoomMode() === GameMode.Single) {
        this.celebrateVictory();
        this.vibrateSuccess();
      }
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      this.pendingResumeSession.set(null);
      this.store.joinRoom(
        pending.roomId,
        pending.mode,
        pending.difficulty,
        pending.host || '',
        pending.target ?? 1,
        pending.password,
        pending.bountyCoins,
        pending.isSpectator
      );
    } else if (this.store.currentRoomMode() === GameMode.Single) {
      const qp = this._baseRoute.snapshot.queryParamMap;
      const requestedDiff = qp.get('difficulty') || qp.get('diff');
      const diff = requestedDiff || this.store.restoreSavedDifficulty('easy');
      if (requestedDiff) {
        setSavedDifficulty('tents', requestedDiff);
      }
      this.store.startLocalGame(diff, 0);
      if (!requestedDiff) {
        this.checkAndPromptResumeSession('tents');
      }
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  onPlayAgain(): void {
    if (this.store.status() === GameStatus.Finished) {
      this.store.nextLevel();
    } else {
      this.store.restartGame();
    }
  }

  onNextLevel(): void {
    this.store.nextLevel();
  }

  onCellClick(r: number, c: number): void {
    if (this.store.isSpectator()) return;
    this.store.setCell(r, c);
    this.vibrateLight();
  }

  onCellContextMenu(event: MouseEvent, r: number, c: number): void {
    event.preventDefault();
    if (this.store.isSpectator()) return;
    const current = this.store.grid()[r]?.[c];
    if (current === TentsCellState.Tree) return;
    const next = current === TentsCellState.Grass ? TentsCellState.Empty : TentsCellState.Grass;
    this.store.setCell(r, c, next);
    this.vibrateLight();
  }

  onRowClueClick(r: number): void {
    if (this.store.isSpectator()) return;
    if (this.store.rowSatisfied()[r]) {
      this.store.autoGrassRow(r);
      this.vibrateLight();
    }
  }

  onColClueClick(c: number): void {
    if (this.store.isSpectator()) return;
    if (this.store.colSatisfied()[c]) {
      this.store.autoGrassCol(c);
      this.vibrateLight();
    }
  }

  changeDifficulty(diff: string): void {
    this.store.currentDifficulty.set(diff);
    this.store.startLocalGame(diff, 0);
  }

  trackByRow(index: number): number {
    return index;
  }

  trackByCol(index: number): number {
    return index;
  }
}
