import { Component, OnInit, OnDestroy, inject, computed, effect, untracked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { TentsStore } from './store/tents.store';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';
import { DifficultySelectorComponent, DifficultyOption } from '../../../shared/components/difficulty-selector/difficulty-selector.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { GameDifficulty, GameId, GameMode, GameStatus } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty, isBrowser } from '../../../core/utils/browser.util';
import { TentsCellState } from './store/tents-engine';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import {
  InteractiveTutorialStep,
  InteractiveTutorialBoardComponent,
  InteractiveTutorialPointerComponent,
  InteractiveTutorialSuccessComponent
} from '../../../shared/components/interactive-tutorial';

@Component({
  selector: 'app-tents',
  standalone: true,
  imports: [
    CommonModule,
    GameLayoutComponent,
    GamePkHudComponent,
    GameHandheldHeaderComponent,
    DifficultySelectorComponent,
    InteractiveTutorialBoardComponent,
    InteractiveTutorialPointerComponent,
    InteractiveTutorialSuccessComponent
  ],
  providers: [TentsStore],
  templateUrl: './tents.component.html',
  styleUrl: './tents.component.css'
})
export class TentsComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(TentsStore);

  CellState = TentsCellState;

  // ═══════════════════════════════════════════════════════════════════
  // 🎓 新手 4 步互动速成教程 (Interactive Step-by-Step Tutorial)
  // ═══════════════════════════════════════════════════════════════════
  isTutorialActive = signal(false);
  tutorialStep = signal(0);
  hasCompletedTutorial = signal(false);
  tutorialDismissed = signal(false);
  readonly isTutorialFinished = computed(() => this.tutorialStep() >= 4);

  readonly tutorialStepsData: InteractiveTutorialStep[] = [
    {
      step: 0,
      titleKey: 'tutorial.tents.step1_title',
      defaultTitle: '步骤 1/4 · 零数全草法则 (Zero Clue)',
      formula: '[ 提示 0 ] ➜ [ 🌿 🌿 🌿 🌿 ]',
      formulaBadge: '零数全草法则',
      descKey: 'tutorial.tents.step1_desc',
      defaultDesc: '边缘数字代表该行或该列所需的帐篷总数。当数字为「0」时，说明整行绝不可能有帐篷，所有空格必定全都是草丛 🌿！',
      actionKey: 'tutorial.tents.step1_action',
      defaultAction: '在第 2 行（提示0）的空格标上草地 🌿（或点击行号 0 快速铺草）',
      microActionKey: 'tutorial.tents.step1_micro',
      defaultMicroAction: '铺满草丛 🌿',
      targets: [
        { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }
      ],
      requiredState: TentsCellState.Grass,
      highlightRows: [1]
    },
    {
      step: 1,
      titleKey: 'tutorial.tents.step2_title',
      defaultTitle: '步骤 2/4 · 孤树唯一法则 (Single Neighbor)',
      formula: '[ 🌲 树木旁 ] ➜ [ ⛺ 正交必有帐篷 ]',
      formulaBadge: '孤树唯一法则',
      descKey: 'tutorial.tents.step2_desc',
      defaultDesc: '每棵树上下左右必须有一顶帐篷相邻。看左上角的树 (0,0)：上方与左侧是边界，下方已被 0 提示判定为草地，只剩下右边这 1 个空位！',
      actionKey: 'tutorial.tents.step2_action',
      defaultAction: '点击右侧空位 (0,1)，为这棵树搭设第一顶帐篷 ⛺',
      microActionKey: 'tutorial.tents.step2_micro',
      defaultMicroAction: '搭设帐篷 ⛺',
      targets: [
        { x: 1, y: 0 }
      ],
      requiredState: TentsCellState.Tent,
      highlightRows: [0],
      highlightCols: [1]
    },
    {
      step: 2,
      titleKey: 'tutorial.tents.step3_title',
      defaultTitle: '步骤 3/4 · 帐篷不挨法则 (No Adjacent Tents)',
      formula: '[ ⛺ 帐篷周围 8 格 ] ➜ [ 🌿 绝不能有其他帐篷 ]',
      formulaBadge: '帐篷不挨法则',
      descKey: 'tutorial.tents.step3_desc',
      defaultDesc: '露营核心法则：两顶帐篷之间绝对不能接触，包括正交与对角线共 8 个方向！刚刚搭好的帐篷周围必定全是草丛 🌿！第 3 列提示也是 0，一并标上草丛！',
      actionKey: 'tutorial.tents.step3_action',
      defaultAction: '在 (0,2)、(2,2)、(3,2) 标上草丛 🌿 隔开邻域',
      microActionKey: 'tutorial.tents.step3_micro',
      defaultMicroAction: '标草隔离 🌿',
      targets: [
        { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 3 }
      ],
      requiredState: TentsCellState.Grass,
      highlightCols: [2]
    },
    {
      step: 3,
      titleKey: 'tutorial.tents.step4_title',
      defaultTitle: '步骤 4/4 · 行列配对收官，点亮营地！',
      formula: '[ 🌲 ⛺ 1:1 配对 ] ➜ [ 🏕️ 露营营地完成 ]',
      formulaBadge: '行列配对法则',
      descKey: 'tutorial.tents.step4_desc',
      defaultDesc: '看第 2 列提示数字是「2」，该列还差 1 顶帐篷且对应下方树木；最后一棵树则对应右下角。搭设最后两顶帐篷，顺利点亮森林营地！',
      actionKey: 'tutorial.tents.step4_action',
      defaultAction: '搭设最后两顶帐篷 ⛺，点亮整座露营森林！',
      microActionKey: 'tutorial.tents.step4_micro',
      defaultMicroAction: '搭设帐篷 ⛺',
      targets: [
        { x: 1, y: 2 }, { x: 3, y: 3 }
      ],
      requiredState: TentsCellState.Tent,
      highlightRows: [2, 3],
      highlightCols: [1, 3]
    }
  ];

  readonly currentTutorialStepInfo = computed(() => {
    if (!this.isTutorialActive()) return null;
    const step = this.tutorialStep();
    return this.tutorialStepsData[step] || null;
  });

  readonly currentTutorialBubbleReason = computed(() => {
    if (!this.isTutorialActive()) return '';
    const info = this.currentTutorialStepInfo();
    if (!info) return '';
    return this.t(info.descKey)() || info.defaultDesc || '';
  });

  readonly currentTutorialBubbleAction = computed(() => {
    if (!this.isTutorialActive()) return '';
    const info = this.currentTutorialStepInfo();
    if (!info) return '';
    return this.t(info.actionKey)() || info.defaultAction || '';
  });

  readonly currentTutorialMicroAction = computed(() => {
    if (!this.isTutorialActive()) return '';
    const info = this.currentTutorialStepInfo();
    if (!info) return '';
    const microKey = info.microActionKey;
    const defaultMicro = info.defaultMicroAction || '';
    if (!microKey) return defaultMicro;
    return this.t(microKey)() || defaultMicro;
  });

  isTutorialTargetCell(r: number, c: number): boolean {
    if (!this.isTutorialActive()) return false;
    const info = this.currentTutorialStepInfo();
    if (!info) return false;
    const inTarget = info.targets.some(t => t.y === r && t.x === c);
    if (!inTarget) return false;
    return this.store.grid()[r]?.[c] !== info.requiredState;
  }

  isFirstTutorialTarget(r: number, c: number): boolean {
    if (!this.isTutorialActive()) return false;
    const info = this.currentTutorialStepInfo();
    if (!info) return false;
    const firstUnsatisfied = info.targets.find(t => this.store.grid()[t.y]?.[t.x] !== info.requiredState);
    return firstUnsatisfied ? (firstUnsatisfied.y === r && firstUnsatisfied.x === c) : false;
  }

  isTutorialRowHighlighted(r: number): boolean {
    if (!this.isTutorialActive()) return false;
    return this.currentTutorialStepInfo()?.highlightRows?.includes(r) ?? false;
  }

  isTutorialColHighlighted(c: number): boolean {
    if (!this.isTutorialActive()) return false;
    return this.currentTutorialStepInfo()?.highlightCols?.includes(c) ?? false;
  }

  startTutorial() {
    this.vibrateLight();
    this.isTutorialActive.set(true);
    this.tutorialStep.set(0);
    this.store.startTutorialPuzzle();
  }

  exitTutorial() {
    this.vibrateLight();
    this.isTutorialActive.set(false);
    this.tutorialStep.set(0);
    this.store.startLocalGame(this.store.currentDifficulty() as string, 0);
  }

  restartTutorial() {
    this.startTutorial();
  }

  completeTutorialAndPlay() {
    this.vibrateLight();
    this.isTutorialActive.set(false);
    this.hasCompletedTutorial.set(true);
    if (isBrowser()) {
      localStorage.setItem('tents_tutorial_completed', 'true');
    }
    this.store.startLocalGame('easy', 0);
  }

  dismissTutorialCapsule() {
    this.tutorialDismissed.set(true);
  }

  checkTutorialStepProgress() {
    if (!this.isTutorialActive()) return;
    const stepInfo = this.currentTutorialStepInfo();
    if (!stepInfo) return;

    const grid = this.store.grid();
    const allCompleted = stepInfo.targets.every(t => grid[t.y]?.[t.x] === stepInfo.requiredState);

    if (allCompleted) {
      const nextStep = this.tutorialStep() + 1;
      this.tutorialStep.set(nextStep);

      if (nextStep >= 4) {
        this.vibrateSuccess();
        this.celebrateVictory();
      } else {
        this.vibrateMedium();
      }
    }
  }

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
    if (isBrowser()) {
      const completed = localStorage.getItem('tents_tutorial_completed') === 'true';
      this.hasCompletedTutorial.set(completed);
    }
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
      const isTut = qp.get('tutorial') === 'true';
      if (isTut) {
        this.startTutorial();
        return;
      }
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
    if (this.isTutorialActive()) {
      this.restartTutorial();
      return;
    }
    if (this.store.status() === GameStatus.Finished) {
      this.store.nextLevel();
    } else {
      this.store.restartGame();
    }
  }

  override handleRestart(): void {
    if (this.isTutorialActive()) {
      this.restartTutorial();
      return;
    }
    this.store.restartGame();
  }

  onNextLevel(): void {
    this.store.nextLevel();
  }

  onCellClick(r: number, c: number): void {
    if (this.store.isSpectator()) return;

    // 🎓 Tutorial mode interception
    if (this.isTutorialActive()) {
      const stepInfo = this.currentTutorialStepInfo();
      if (!stepInfo) return;
      const isTarget = stepInfo.targets.some(t => t.y === r && t.x === c);
      if (!isTarget) {
        this.vibrateError();
        return;
      }
      this.store.setCell(r, c, stepInfo.requiredState);
      this.vibrateLight();
      this.checkTutorialStepProgress();
      return;
    }

    this.store.setCell(r, c);
    this.vibrateLight();
  }

  onCellContextMenu(event: MouseEvent, r: number, c: number): void {
    event.preventDefault();
    if (this.store.isSpectator()) return;

    // 🎓 Tutorial mode: if target is Grass, allow context menu to place it too
    if (this.isTutorialActive()) {
      this.onCellClick(r, c);
      return;
    }

    const current = this.store.grid()[r]?.[c];
    if (current === TentsCellState.Tree) return;
    const next = current === TentsCellState.Grass ? TentsCellState.Empty : TentsCellState.Grass;
    this.store.setCell(r, c, next);
    this.vibrateLight();
  }

  onRowClueClick(r: number): void {
    if (this.store.isSpectator()) return;

    // 🎓 Tutorial: clicking row 1 (0 clue) auto-fills all targets of step 0!
    if (this.isTutorialActive()) {
      if (this.tutorialStep() === 0 && r === 1) {
        for (const t of this.tutorialStepsData[0].targets) {
          this.store.setCell(t.y, t.x, TentsCellState.Grass);
        }
        this.vibrateLight();
        this.checkTutorialStepProgress();
      }
      return;
    }

    if (this.store.rowSatisfied()[r]) {
      this.store.autoGrassRow(r);
      this.vibrateLight();
    }
  }

  onColClueClick(c: number): void {
    if (this.store.isSpectator()) return;
    if (this.isTutorialActive()) return;

    if (this.store.colSatisfied()[c]) {
      this.store.autoGrassCol(c);
      this.vibrateLight();
    }
  }

  changeDifficulty(diff: string): void {
    if (this.isTutorialActive()) {
      this.isTutorialActive.set(false);
    }
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
