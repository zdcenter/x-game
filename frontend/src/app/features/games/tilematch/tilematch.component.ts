import { Component, OnInit, OnDestroy, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { TilematchStore } from './store/tilematch.store';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { TILE_EMOJIS, TileCard } from './store/tilematch-engine';
import { DeviceService } from '../../../core/services/device.service';
import { ZenModeService } from '../../../core/services/zen-mode.service';

interface FloatingFeedback {
  id: number;
  text: string;
  subText?: string;
  combo: number;
}

export interface FlyingTile {
  id: number;
  type: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

export interface ClearingMatchEvent {
  type: string;
  indices: number[];
  simulatedSlot: TileCard[];
  combo: number;
}

@Component({
  selector: 'app-tilematch',
  standalone: true,
  imports: [
    CommonModule,
    GameLayoutComponent,
    GamePkHudComponent
  ],
  providers: [TilematchStore],
  templateUrl: './tilematch.component.html',
  styleUrl: './tilematch.component.css'
})
export class TilematchComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(TilematchStore);
  zenService = inject(ZenModeService);

  readonly isImmersionActive = computed(() => {
    return this.deviceService.isHandheld() || this.zenService.isZenMode();
  });

  readonly TILE_EMOJIS = TILE_EMOJIS;

  // 飞牌过渡动画队列
  flyingTiles = signal<FlyingTile[]>([]);

  // 槽位三消闪烁星星与合体聚变动画状态
  clearingMatch = signal<ClearingMatchEvent | null>(null);

  isSlotClearing(index: number): boolean {
    const match = this.clearingMatch();
    return !!match && match.indices.includes(index);
  }

  getClearingDirection(index: number): 'left' | 'center' | 'right' | null {
    const match = this.clearingMatch();
    if (!match || !match.indices.includes(index)) return null;
    const sorted = [...match.indices].sort((a, b) => a - b);
    if (index === sorted[0]) return 'left';
    if (index === sorted[1]) return 'center';
    return 'right';
  }

  getDisplayedSlotCard(index: number): TileCard | null {
    const match = this.clearingMatch();
    if (match) {
      return match.simulatedSlot[index] || null;
    }
    return this.store.slotCards()[index] || null;
  }

  // 浮动多巴胺激励反馈
  floatingFeedback = signal<FloatingFeedback | null>(null);
  private feedbackTimer: any = null;

  // 卡牌受阻抖动跟踪
  shakeCardId = signal<number | null>(null);

  // 经典羊了个羊日期标识 (如 - 10月26日 -)
  readonly todayDateString = computed(() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  });

  // 单人通关无缝下一局倒计时气泡提示 (心流无界，杜绝大黑框打断)
  victoryNotice = signal<{ score: number; moves: number } | null>(null);

  // 单人失败 (卡槽满) 原位复活挽救提示
  showRevivePrompt = signal<boolean>(false);
  private autoNextTimer: any = null;

  // 关卡选择迷你下拉
  isLevelPickerOpen = signal<boolean>(false);

  toggleLevelPicker() {
    this.isLevelPickerOpen.update(v => !v);
  }

  selectLevel(diff: string) {
    this.switchDifficulty(diff);
    this.isLevelPickerOpen.set(false);
  }

  jumpToLevel(level: number) {
    this.store.startLocalGame(level);
    this.isLevelPickerOpen.set(false);
  }

  resetProgressToLevelOne() {
    this.store.resetToLevelOne();
    this.isLevelPickerOpen.set(false);
    this.toast.info(this.i18n.t('tilematch.reset_level_1')() || '已从第 1 关重新开爬！');
  }

  prevLevel() {
    const cur = this.store.currentLevel();
    if (cur > 1) {
      this.store.startLocalGame(cur - 1);
    }
  }

  nextLevel() {
    this.store.nextLevel();
  }

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    const raw = this.store.rawState() as any;
    const winsMap = raw?.wins || {};
    return {
      id: this.playerId,
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: true,
      score: this.store.localScore(),
      progress: this.store.progressPercent(),
      wins: winsMap[this.playerId] || 0,
      status: this.store.status()
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return [];
    const myId = this.playerId;
    const room = this.store.room();
    const rawState = this.store.rawState() as any;
    const winsMap = rawState?.wins || {};
    const playersMap = rawState?.players || {};
    const isSpec = this.store.isSpectator();
    const rawPlayers = this.store.roomPlayers() || [];
    return rawPlayers
      .filter((p: any) => p && (isSpec || p.id !== myId))
      .map((p: any) => ({
        id: p.id,
        playerId: p.id,
        nickname: p.nickname || p.id,
        avatar: p.avatar,
        isHost: p.id === this.store.hostId(),
        isMe: false,
        score: p.score ?? playersMap[p.id]?.score ?? 0,
        progress: p.progress ?? playersMap[p.id]?.progress ?? 0,
        wins: winsMap[p.id] || 0,
        status: p.status || this.store.status()
      }));
  });

  constructor() {
    super();

    // 监听消除事件，触发浮动多巴胺激励效果
    effect(() => {
      const matchEv = this.store.lastMatchEvent();
      if (matchEv) {
        const combo = this.store.combo();
        let praise = 'MATCH! ✨';
        if (combo >= 4) {
          praise = 'GODLIKE! 🔥';
        } else if (combo >= 3) {
          praise = 'UNBELIEVABLE! 💥';
        } else if (combo >= 2) {
          praise = 'FANTASTIC! ⚡';
        } else {
          praise = 'GREAT! 🌟';
        }

        const emoji = TILE_EMOJIS[matchEv.type] || '✨';
        this.showFloatingFeedback({
          id: Date.now(),
          text: praise,
          subText: `${emoji} x3 消除了！`,
          combo
        });
      }
    });

    // 单人模式：通关自动平滑下一局（同难度新题库）与失败轻量复活编排
    effect((onCleanup) => {
      const status = this.store.status();
      const isSingle = this.store.currentRoomMode() === GameMode.Single;

      if (status === GameStatus.Finished) {
        if (isSingle) {
          if (this.store.isVictory()) {
            // 胜利：0ms 多巴胺礼花喷射 + 顶部轻量浮动通关胶囊
            this.celebrateVictory();
            this.vibrateSuccess();
            this.victoryNotice.set({
              score: this.store.localScore(),
              moves: this.store.localMoves()
            });
            this.showRevivePrompt.set(false);

            // 1.5 秒黄金心流间歇：让玩家欣赏清盘盘面，随后自动进入下一关 (+3 张牌)
            this.autoNextTimer = setTimeout(() => {
              this.victoryNotice.set(null);
              // 自动下一局频控挂钩：达到后台频次插播广告，否则直接进入下一局
              this.adService.tryShowAutoNextInterstitial('tilematch', () => {
                this.store.nextLevel();
              });
            }, 1500);

            onCleanup(() => {
              if (this.autoNextTimer) clearTimeout(this.autoNextTimer);
            });
          } else {
            // 失败（卡槽满）：不弹阻断大黑屏，展示轻量复活/重开提示
            this.victoryNotice.set(null);
            this.showRevivePrompt.set(true);
          }
        } else {
          // 联机对战 PK 结算：胜利时礼花双炮齐发 + 成功音效，失败时微震
          this.victoryNotice.set(null);
          this.showRevivePrompt.set(false);
          if (this.store.isVictory()) {
            this.celebrateVictory();
            this.vibrateSuccess();
          } else {
            this.vibrateImpact();
          }
        }
      } else {
        this.victoryNotice.set(null);
        this.showRevivePrompt.set(false);
      }
    });
  }

  // 看广告/激励复活移出 3 张牌
  handleRevive() {
    this.adService.showReviveRewardedAd('tilematch', () => {
      const revived = this.store.reviveGame();
      if (revived) {
        this.showRevivePrompt.set(false);
        this.toast.success(this.i18n.t('game.revived')() || '🎉 绝地逢生！已为您移出 3 张卡牌！');
      }
    });
  }

  // 放弃/重开本局（保持当前关卡和张数，换一副新随机盘面）
  override handleRestart() {
    this.showRevivePrompt.set(false);
    this.store.restartCurrentLevel();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.store.currentRoomMode() === GameMode.Single) {
      this.store.startLocalGame(this.store.currentLevel());
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.store.leaveRoom();
  }

  switchDifficulty(difficulty: string) {
    if (this.store.currentDifficulty() === difficulty) return;
    this.store.startLocalGame(difficulty);
    this.vibrateLight();
  }

  private handleCardSelectionWithAnimation(
    card: TileCard,
    sourceEl: HTMLElement | null,
    commitAction: () => void
  ) {
    if (this.clearingMatch()) return;

    if (this.store.slotCards().length >= 7) {
      this.toast.warning(this.i18n.t('tilematch.slot_warning')() || '卡槽已满，请使用道具破局！');
      this.vibrateLight();
      return;
    }

    const currentSlot = this.store.slotCards();
    const sameTypeCards = currentSlot.filter(c => c.type === card.type);
    const willTriggerMatch = (sameTypeCards.length === 2);

    // 智能排序下的目标插入索引
    let insertIndex = -1;
    for (let i = currentSlot.length - 1; i >= 0; i--) {
      if (currentSlot[i].type === card.type) {
        insertIndex = i + 1;
        break;
      }
    }
    const targetSlotIdx = (insertIndex === -1) ? currentSlot.length : insertIndex;

    // 1. 触发飞牌入槽动画
    if (sourceEl) {
      const startRect = sourceEl.getBoundingClientRect();
      const targetSlotEl = document.querySelector(`[data-slot-index="${Math.min(6, targetSlotIdx)}"]`);
      if (targetSlotEl) {
        const targetRect = targetSlotEl.getBoundingClientRect();
        const flyId = Date.now() + Math.random();
        this.flyingTiles.update(list => [
          ...list,
          {
            id: flyId,
            type: card.type,
            startX: startRect.left,
            startY: startRect.top,
            targetX: targetRect.left,
            targetY: targetRect.top,
          }
        ]);
        setTimeout(() => {
          this.flyingTiles.update(list => list.filter(f => f.id !== flyId));
        }, 200);
      }
    }

    this.vibrateLight();

    if (willTriggerMatch) {
      // 构造展示用 simulatedSlot（预先插入牌形成 3 连）
      const simulatedSlot = [...currentSlot];
      if (insertIndex === -1) {
        simulatedSlot.push(card);
      } else {
        simulatedSlot.splice(insertIndex, 0, card);
      }
      const clearingIndices: number[] = [];
      simulatedSlot.forEach((c, idx) => {
        if (c.type === card.type) clearingIndices.push(idx);
      });

      // 飞牌到达槽位瞬间（180ms）开启槽内闪烁星星与合体聚变光效
      setTimeout(() => {
        const nextCombo = (this.store.combo() || 0) + 1;
        this.clearingMatch.set({
          type: card.type,
          indices: clearingIndices,
          simulatedSlot,
          combo: nextCombo,
        });

        // 播放高品质三消大三和弦与爆裂水晶音
        this.audio.playTileMatch('match', nextCombo);
        this.vibrateSuccess();

        // 380ms 闪烁星星与合体聚变演出完毕，提交底层引擎正式消除
        setTimeout(() => {
          commitAction();
          this.clearingMatch.set(null);
          this.triggerComboFloatingFeedback(nextCombo);
        }, 380);
      }, 180);

    } else {
      // 普通入槽：飞牌平滑衔接
      setTimeout(() => {
        commitAction();
      }, 180);
    }
  }

  private triggerComboFloatingFeedback(combo: number) {
    let text = '✨ 完美 3 消! +150';
    let subText = '连续消除触发多巴胺高倍连击!';
    if (combo === 2) {
      text = '⚡ DOUBLE MATCH! x2';
      subText = '🔥 手感火热，得分 +225!';
    } else if (combo === 3) {
      text = '🌟 TRIPLE COMBO! x3';
      subText = '💥 势如破竹，得分 +300!';
    } else if (combo >= 4) {
      text = `👑 SUPER MATCH! x${combo}`;
      subText = `🎉 超神消除，狂暴加成 +${150 + combo * 75}!`;
    }
    this.showFloatingFeedback({ id: Date.now(), text, subText, combo });
  }

  onCardClick(card: TileCard, event?: MouseEvent) {
    if (card.status !== 'board') return;
    if (card.isBlocked) {
      // 受阻抖动特效
      this.shakeCardId.set(card.id);
      setTimeout(() => {
        if (this.shakeCardId() === card.id) {
          this.shakeCardId.set(null);
        }
      }, 400);
      this.vibrateLight();
      this.toast.info(this.i18n.t('tilematch.blocked_tip')() || '上层卡牌遮挡中，请先移开上方卡牌！');
      return;
    }

    const cardEl = (event?.currentTarget as HTMLElement) || document.getElementById('tile-' + card.id);
    this.handleCardSelectionWithAnimation(card, cardEl, () => {
      this.store.selectTile(card.id);
    });
  }

  onStashCardClick(card: TileCard, event?: MouseEvent) {
    const stashEl = (event?.currentTarget as HTMLElement);
    this.handleCardSelectionWithAnimation(card, stashEl, () => {
      this.store.selectStashTile(card.id);
    });
  }

  handleUseStash() {
    if (this.store.stashUsed()) {
      this.toast.info('移出道具每局限用 1 次！');
      return;
    }
    if (this.store.slotCards().length === 0) {
      this.toast.info('当前卡槽为空，无需移出！');
      return;
    }
    this.vibrateLight();
    this.store.useStash();
  }

  handleUseUndo() {
    if (this.store.undoRemaining() <= 0) {
      this.toast.info('撤销次数已用尽！');
      return;
    }
    this.vibrateLight();
    this.store.useUndo();
  }

  handleUseShuffle() {
    if (this.store.shuffleRemaining() <= 0) {
      this.toast.info('洗牌次数已用尽！');
      return;
    }
    this.vibrateLight();
    this.store.useShuffle();
    this.toast.info('🔀 牌局位置与图案已全面重新打乱错位洗牌！');
  }

  protected override onKeyDown(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;

    // 1: 移出 Stash
    if (event.key === '1') {
      this.handleUseStash();
      return true;
    }

    // 2 或 Z 或 U: 撤销 Undo
    if (event.key === '2' || event.key === 'z' || event.key === 'Z' || event.key === 'u' || event.key === 'U') {
      this.handleUseUndo();
      return true;
    }

    // 3: 洗牌 Shuffle
    if (event.key === '3') {
      this.handleUseShuffle();
      return true;
    }

    // H 或 ?: 打开玩法规则弹窗
    if (event.key === 'h' || event.key === 'H' || event.key === '?') {
      this.showRules.set(!this.showRules());
      return true;
    }

    return false;
  }

  private showFloatingFeedback(feedback: FloatingFeedback) {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.floatingFeedback.set(feedback);
    this.feedbackTimer = setTimeout(() => {
      this.floatingFeedback.set(null);
    }, 1200);
  }

  // 计算卡牌在长方形高利用率舞台中的绝对定位与层深
  getBoardCardStyle(card: TileCard) {
    const isTablet = this.deviceService.isTablet();
    const isDesktop = this.deviceService.isDesktop();

    // 科学严谨的设备三阶几何比例：
    // 1. Tablet 平板 (iPad 等宽大触屏)：卡片超大饱满 (86px x 106px)，横向 6 列跨越 550px 舞台，彻底解决平板小气空旷
    // 2. Desktop PC (宽屏网页端)：保持黄金比例街机卡座 (66px x 82px)，舞台 430px
    // 3. Mobile 手机端：全屏紧凑饱满 (54px x 68px)，舞台 360px
    let baseW = 54;
    let baseH = 68;
    let stepX = 54;
    let stepY = 62;
    let originX = 14;
    let originY = 12;

    if (isTablet) {
      baseW = 86;
      baseH = 106;
      stepX = 84;
      stepY = 94;
      originX = 22;
      originY = 20;
    } else if (isDesktop || this.deviceService.width() >= 768) {
      baseW = 62;
      baseH = 76;
      stepX = 60;
      stepY = 66;
      originX = 18;
      originY = 8;
    }

    const left = originX + card.x * stepX;
    const top = originY + card.y * stepY;
    const zIndex = card.layer * 30 + Math.floor(card.y * 2) + 2;

    return {
      'position': 'absolute',
      'left': `${left}px`,
      'top': `${top}px`,
      'width': `${baseW}px`,
      'height': `${baseH}px`,
      'z-index': zIndex,
    };
  }
}
