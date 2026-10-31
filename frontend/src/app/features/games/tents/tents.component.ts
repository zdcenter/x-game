import { Component, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { TentsStore } from './store/tents.store';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { GameScoreCapsuleComponent } from '../../../shared/components/game-score-capsule/game-score-capsule.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { GameMode, GameStatus } from '../../../core/models/game.model';
import { TentsCellState } from './store/tents-engine';

@Component({
  selector: 'app-tents',
  standalone: true,
  imports: [
    CommonModule,
    GameLayoutComponent,
    GamePkHudComponent
  ],
  providers: [TentsStore],
  templateUrl: './tents.component.html',
  styleUrl: './tents.component.css'
})
export class TentsComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(TentsStore);

  CellState = TentsCellState;

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

  constructor() {
    super();

    // 通关多巴胺礼花喷射与触感回馈
    effect(() => {
      if (this.store.status() === GameStatus.Finished && this.store.currentRoomMode() === GameMode.Single) {
        this.celebrateVictory();
        this.vibrateSuccess();
      }
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.store.currentRoomMode() === GameMode.Single) {
      // 自动恢复玩家上次保存的等级/难度（无记录时默认为 easy）
      const diff = this.store.restoreSavedDifficulty('easy');
      this.store.startLocalGame(diff, 0);
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
