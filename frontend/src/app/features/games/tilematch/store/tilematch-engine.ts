import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';

export interface TileCard {
  id: number;
  type: string;
  x: number; // 逻辑网格坐标（卡牌尺寸为 2x2 逻辑单位）
  y: number;
  layer: number;
  isBlocked: boolean;
  status: 'board' | 'slot' | 'stash' | 'cleared';
  slotIndex?: number;
  isBlind?: boolean; // 是否是盲盒暗牌（背面朝上）
  revealed?: boolean; // 翻开为正面状态
}

export type TilematchAction =
  | { type: 'select_tile'; cardId: number }
  | { type: 'use_stash' } // 移出卡槽前 3 张牌到暂存区
  | { type: 'use_undo' } // 撤销上一张放进卡槽的牌
  | { type: 'use_shuffle' } // 随机打乱棋盘剩余牌图案
  | { type: 'select_stash_tile'; cardId: number } // 点回暂存区的牌
  | { type: 'reset'; difficulty?: string; level?: number };

export interface TilematchState {
  score: number;
  moves: number;
  combo: number;
  maxCombo: number;
  status: GameStatusType;
  difficulty: string;
  level: number;
  totalCards: number;
  isVictory: boolean;
  cards: TileCard[];
  slot: TileCard[];
  stash: TileCard[];
  stashUsed: boolean;
  undoRemaining: number;
  shuffleRemaining: number;
  lastMatchedType?: string;
  lastMatchedCount: number;
}

export const TILE_TYPES = [
  'carrot',   // 🥕 胡萝卜
  'grass',    // 🌿 草丛
  'glove',    // 🧤 蓝手套
  'bell',     // 🔔 铃铛
  'wool',     // 🧶 毛线球
  'wood',     // 🪵 树桩
  'cabbage',  // 🥬 白菜
  'fire',     // 🔥 火堆
  'bucket',   // 🪣 水桶
  'scissors', // ✂️ 剪刀
  'milk',     // 🍼 奶瓶
  'brush',    // 🧹 刷子
  'sheep',    // 🐑 白羊
  'corn',     // 🌽 玉米
  'apple',    // 🍎 苹果
  'mushroom', // 🍄 蘑菇
] as const;

export const TILE_EMOJIS: Record<string, string> = {
  carrot: '🥕',
  grass: '🌿',
  glove: '🧤',
  bell: '🔔',
  wool: '🧶',
  wood: '🪵',
  cabbage: '🥬',
  fire: '🔥',
  bucket: '🪣',
  scissors: '✂️',
  milk: '🍼',
  brush: '🧹',
  sheep: '🐑',
  corn: '🌽',
  apple: '🍎',
  mushroom: '🍄',
};

export class LocalTilematchEngine implements ILocalEngine<TilematchState, TilematchAction> {
  score: number = 0;
  moves: number = 0;
  combo: number = 0;
  maxCombo: number = 0;
  status: GameStatusType = GameStatus.Waiting;
  difficulty: string = GameDifficulty.Easy;
  level: number = 1;
  totalCards: number = 18;
  isVictory: boolean = false;
  startAt: number = 0;

  cards: TileCard[] = [];
  slot: TileCard[] = [];
  stash: TileCard[] = [];

  stashUsed: boolean = false;
  undoRemaining: number = 2;
  shuffleRemaining: number = 2;

  lastMatchedType?: string;
  lastMatchedCount: number = 0;

  // 历史记录栈，用于 undo
  private history: { cardId: number; previousSlotIndex: number }[] = [];

  readonly SLOT_CAPACITY = 7;

  /**
   * 初始化游戏
   * @param config.difficulty 预设难度模式 (Easy/Medium/Hard)
   * @param config.level 无尽关卡等级 (从 1 起步，每关递增 3 张牌)
   */
  initGame(config?: { difficulty?: string; seed?: number; level?: number }) {
    if (config?.level !== undefined) {
      this.level = Math.max(1, config.level);
      // 根据 level 计算目标总张数 (Level 1 = 18, Level 2 = 21, ..., Level 15 = 60, Level 27 = 96)
      this.totalCards = 18 + (this.level - 1) * 3;
      if (this.totalCards < 60) {
        this.difficulty = GameDifficulty.Easy;
      } else if (this.totalCards < 96) {
        this.difficulty = GameDifficulty.Medium;
      } else {
        this.difficulty = GameDifficulty.Hard;
      }
    } else {
      this.difficulty = config?.difficulty || GameDifficulty.Easy;
      if (this.difficulty === GameDifficulty.Medium) {
        this.level = 15;
        this.totalCards = 60;
      } else if (this.difficulty === GameDifficulty.Hard) {
        this.level = 27;
        this.totalCards = 96;
      } else {
        this.level = 1;
        this.totalCards = 18;
      }
    }

    this.score = 0;
    this.moves = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.status = GameStatus.Playing;
    this.isVictory = false;
    this.startAt = Date.now();
    this.slot = [];
    this.stash = [];
    this.history = [];
    this.stashUsed = false;
    this.undoRemaining = 2;
    this.shuffleRemaining = 2;
    this.lastMatchedType = undefined;
    this.lastMatchedCount = 0;

    this.generateCards(this.totalCards, this.difficulty, config?.seed);
    this.updateBlockedStatus();
  }

  /**
   * 载入服务端权威下发的卡牌列表 (联机 PK 专用，确保多端同构绝对一致)
   */
  loadCards(cards: TileCard[]): void {
    this.totalCards = cards.length;
    this.cards = cards.map(c => ({
      ...c,
      status: 'board' as const,
      isBlocked: false,
    }));
    this.score = 0;
    this.moves = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.status = GameStatus.Playing;
    this.isVictory = false;
    this.startAt = Date.now();
    this.slot = [];
    this.stash = [];
    this.history = [];
    this.stashUsed = false;
    this.undoRemaining = 2;
    this.shuffleRemaining = 2;
    this.lastMatchedType = undefined;
    this.lastMatchedCount = 0;

    if (this.totalCards >= 96) {
      this.difficulty = GameDifficulty.Hard;
      this.level = 27;
    } else if (this.totalCards >= 60) {
      this.difficulty = GameDifficulty.Medium;
      this.level = 15;
    } else {
      this.difficulty = GameDifficulty.Easy;
      this.level = 1;
    }

    this.updateBlockedStatus();
  }

  handleAction(action: TilematchAction): void {
    if (action.type === 'reset') {
      this.initGame({
        difficulty: action.difficulty || this.difficulty,
        level: action.level !== undefined ? action.level : this.level
      });
      return;
    }

    if (this.status !== GameStatus.Playing) return;

    switch (action.type) {
      case 'select_tile':
        this.selectBoardTile(action.cardId);
        break;
      case 'select_stash_tile':
        this.selectStashTile(action.cardId);
        break;
      case 'use_stash':
        this.useStash();
        break;
      case 'use_undo':
        this.useUndo();
        break;
      case 'use_shuffle':
        this.useShuffle();
        break;
    }
  }

  private selectBoardTile(cardId: number): void {
    const card = this.cards.find(c => c.id === cardId);
    if (!card || card.status !== 'board' || card.isBlocked) {
      return;
    }

    if (this.slot.length >= this.SLOT_CAPACITY) {
      return;
    }

    this.moves++;
    card.status = 'slot';
    this.insertIntoSlot(card);
    this.history.push({ cardId: card.id, previousSlotIndex: card.slotIndex ?? 0 });

    this.updateBlockedStatus();
    this.checkSlotMatches();
    this.checkGameCompletion();
  }

  private selectStashTile(cardId: number): void {
    const card = this.stash.find(c => c.id === cardId);
    if (!card) return;

    if (this.slot.length >= this.SLOT_CAPACITY) return;

    this.moves++;
    this.stash = this.stash.filter(c => c.id !== cardId);
    card.status = 'slot';
    this.insertIntoSlot(card);

    this.checkSlotMatches();
    this.checkGameCompletion();
  }

  private insertIntoSlot(card: TileCard): void {
    // 智能排序：寻找相同类型的最右位置紧随其后插入
    let insertIndex = -1;
    for (let i = this.slot.length - 1; i >= 0; i--) {
      if (this.slot[i].type === card.type) {
        insertIndex = i + 1;
        break;
      }
    }

    if (insertIndex === -1) {
      this.slot.push(card);
    } else {
      this.slot.splice(insertIndex, 0, card);
    }

    this.reindexSlot();
  }

  private reindexSlot(): void {
    this.slot.forEach((c, idx) => {
      c.slotIndex = idx;
    });
  }

  private checkSlotMatches(): void {
    // 统计各类型数量
    const counts: Record<string, number> = {};
    for (const c of this.slot) {
      counts[c.type] = (counts[c.type] || 0) + 1;
    }

    let hasMatch = false;
    for (const type of Object.keys(counts)) {
      if (counts[type] >= 3) {
        hasMatch = true;
        this.combo++;
        if (this.combo > this.maxCombo) {
          this.maxCombo = this.combo;
        }

        // 连击加成得分
        const baseScore = 150;
        const comboBonus = Math.floor(baseScore * (this.combo * 0.5));
        this.score += baseScore + comboBonus;

        this.lastMatchedType = type;
        this.lastMatchedCount = 3;

        // 移除 3 张牌
        let removed = 0;
        this.slot = this.slot.filter(c => {
          if (c.type === type && removed < 3) {
            c.status = 'cleared';
            removed++;
            return false;
          }
          return true;
        });

        this.reindexSlot();
        break; // 单步最多消一组
      }
    }

    if (!hasMatch) {
      this.combo = 0;
      this.lastMatchedType = undefined;
      this.lastMatchedCount = 0;
    }
  }

  private checkGameCompletion(): void {
    // 胜负判定
    const remainingBoardOrStash = this.cards.filter(c => c.status === 'board' || c.status === 'stash');
    if (remainingBoardOrStash.length === 0 && this.slot.length === 0) {
      // 全清！
      this.status = GameStatus.Finished;
      this.isVictory = true;
      // 胜利加成
      this.score += 1000 + Math.max(0, 300 - this.moves * 10);
      return;
    }

    // 输掉判定：卡槽塞满 7 张且无法继续消除
    if (this.slot.length >= this.SLOT_CAPACITY) {
      this.status = GameStatus.Finished;
      this.isVictory = false;
    }
  }

  // 移出道具：将前 3 张卡槽牌移到暂存区
  useStash(): boolean {
    if (this.status !== GameStatus.Playing) return false;
    if (this.stashUsed || this.slot.length === 0) return false;

    const shiftCount = Math.min(3, this.slot.length);
    const shifted = this.slot.splice(0, shiftCount);
    for (const card of shifted) {
      card.status = 'stash';
      this.stash.push(card);
    }
    this.stashUsed = true;
    this.reindexSlot();
    return true;
  }

  // 绝境复活 (Revive)：当卡槽满了输掉时，恢复 Playing 状态并将前 3 张卡槽牌移入暂存区，挽救对局！
  revive(): boolean {
    if (this.status !== GameStatus.Finished || this.isVictory || this.slot.length < this.SLOT_CAPACITY) {
      return false;
    }
    this.status = GameStatus.Playing;
    const shiftCount = Math.min(3, this.slot.length);
    const shifted = this.slot.splice(0, shiftCount);
    for (const card of shifted) {
      card.status = 'stash';
      this.stash.push(card);
    }
    this.reindexSlot();
    return true;
  }

  // 撤销道具：退回上一张放进卡槽的牌
  useUndo(): boolean {
    if (this.status !== GameStatus.Playing) return false;
    if (this.undoRemaining <= 0 || this.history.length === 0) return false;

    const last = this.history.pop();
    if (!last) return false;

    const card = this.cards.find(c => c.id === last.cardId);
    if (!card || card.status !== 'slot') {
      return false;
    }

    // 从 slot 移除并回归棋盘
    this.slot = this.slot.filter(c => c.id !== card.id);
    this.reindexSlot();
    card.status = 'board';
    this.undoRemaining--;

    this.updateBlockedStatus();
    return true;
  }

  // 洗牌道具：彻底打乱棋盘所有剩余牌的几何位置坐标与图案！
  useShuffle(): boolean {
    if (this.status !== GameStatus.Playing) return false;
    if (this.shuffleRemaining <= 0) return false;

    const boardCards = this.cards.filter(c => c.status === 'board');
    if (boardCards.length <= 1) return false;

    // 1. 打乱图案类型
    const types = boardCards.map(c => c.type);
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    // 2. 打乱几何坐标与层级映射，真正让位置错开！
    const coords = boardCards.map(c => ({ x: c.x, y: c.y, layer: c.layer, isBlind: c.isBlind }));
    for (let i = coords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [coords[i], coords[j]] = [coords[j], coords[i]];
    }

    // 3. 给位置施加微随机错乱偏移（偏左一点、偏右一点、偏上一点、偏下一点）
    boardCards.forEach((c, idx) => {
      c.type = types[idx];
      const offsetX = Math.round((Math.random() - 0.5) * 0.25 * 100) / 100;
      const offsetY = Math.round((Math.random() - 0.5) * 0.25 * 100) / 100;
      c.x = Math.round((coords[idx].x + offsetX) * 100) / 100;
      c.y = Math.round((coords[idx].y + offsetY) * 100) / 100;
      c.layer = coords[idx].layer;
      c.isBlind = coords[idx].isBlind;
      c.revealed = false; // 洗牌后重新判定是否封印翻牌
    });

    this.shuffleRemaining--;
    this.updateBlockedStatus();
    return true;
  }

  // AABB 遮挡更新
  updateBlockedStatus(): void {
    const boardCards = this.cards.filter(c => c.status === 'board');
    // 卡牌在归一化网格中相邻列间距为 1.0，半步重叠为 0.5
    // 当 |dx| < 0.88 && |dy| < 0.88 时判定重叠遮挡
    for (const a of boardCards) {
      let blocked = false;
      for (const b of boardCards) {
        if (b.layer > a.layer) {
          if (Math.abs(a.x - b.x) < 0.88 && Math.abs(a.y - b.y) < 0.88) {
            blocked = true;
            break;
          }
        }
      }
      a.isBlocked = blocked;
      // 核心盲盒翻牌机制：一旦拿开压在上方的牌使当前暗牌变为未遮挡，立刻自动揭晓正面！
      if (!blocked && a.isBlind && !a.revealed) {
        a.revealed = true;
      }
    }
  }

  // 卡牌关卡生成：多形态几何阵型 + 100% 必定可解逆向/正向模拟染色算法
  private generateCards(totalCards: number, difficulty: string, seed?: number): void {
    this.cards = [];
    let randomFn = Math.random;
    if (seed !== undefined) {
      let s = Math.floor(Math.abs(seed)) % 233280;
      randomFn = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    }

    // 1. 确定图案种类数 (简单: 4~6 种, 中等: 7~9 种, 困难: 10~14 种)
    let typesCount = 4;
    if (totalCards >= 96) {
      typesCount = 12;
    } else if (totalCards >= 60) {
      typesCount = 8;
    } else if (totalCards >= 36) {
      typesCount = 6;
    } else if (totalCards >= 24) {
      typesCount = 5;
    }
    const availableTypes = TILE_TYPES.slice(0, typesCount);

    // 2. 生成多形态阵型拓扑 (确保总数恰好等于 totalCards，坐标唯一且各层错落有致)
    const rawSlots = this.generateProceduralSlots(totalCards, randomFn);

    // 3. 构建遮挡关系拓扑图
    const slotCount = rawSlots.length;
    const blockedBy = Array.from({ length: slotCount }, () => new Set<number>());
    const blocks = Array.from({ length: slotCount }, () => new Set<number>());

    for (let i = 0; i < slotCount; i++) {
      for (let j = 0; j < slotCount; j++) {
        if (i === j) continue;
        const a = rawSlots[i];
        const b = rawSlots[j];
        // 如果 b 的层级更高，并且在水平/垂直上有重叠，则 b 遮挡 a
        if (b.layer > a.layer && Math.abs(a.x - b.x) < 0.88 && Math.abs(a.y - b.y) < 0.88) {
          blockedBy[i].add(j);
          blocks[j].add(i);
        }
      }
    }

    // 4. 100% 保证有解算法 (Solvable Simulation Assignment)
    // 模拟正向游戏流程：每次从当前完全暴露未遮挡的卡牌中拿牌消掉，确保有一条通关路径
    const assignedTypes = this.solveAndAssignPatterns(rawSlots, blockedBy, blocks, availableTypes, randomFn);

    // 5. 实例化正式卡牌列表
    for (let i = 0; i < slotCount; i++) {
      this.cards.push({
        id: i + 1,
        type: assignedTypes[i],
        x: rawSlots[i].x,
        y: rawSlots[i].y,
        layer: rawSlots[i].layer,
        isBlocked: false,
        status: 'board',
      });
    }
  }

  /**
   * 生成程序化多形态拓扑网格 (支持 4 大经典阵型模板轮转 + 水平镜像 + 自然随机扰动)
   * 采用 6 列标准原版《羊了个羊》排布规范 (x: 0.0 ~ 5.0，y: 0.15 ~ 5.4)，
   * 左右顶部百叶窗副牌堆横向延展，中央 6 列大殿堂纵深层叠，每套模板候选槽位 >= 105 个，
   * 彻底告别 60+ 张牌时挤在一团的局促感！
   */
  private generateProceduralSlots(
    totalCards: number,
    randomFn: () => number
  ): Array<{ x: number; y: number; layer: number }> {
    const templateType = Math.floor(randomFn() * 4); // 0: 羊头神殿, 1: 双峰金字塔, 2: 四叶环岛, 3: 风车十字
    const flipX = randomFn() > 0.5;

    let candidateSlots: Array<{ x: number; y: number; layer: number }> = [];

    // 辅助函数：左右密集阶梯副牌堆 (单层递增叠放，原版百叶窗滑轨)
    const makeSlideDeck = (count: number, startX: number, stepX: number, y: number) => {
      const deck: Array<{ x: number; y: number; layer: number }> = [];
      for (let i = 0; i < count; i++) {
        deck.push({
          x: Math.round((startX + i * stepX) * 100) / 100,
          y,
          layer: i,
        });
      }
      return deck;
    };

    // 顶部左右百叶窗副牌堆 (各 8 张，向中间延伸，留出中间关卡胶囊空位)
    const topSlideDeckL = makeSlideDeck(8, 0.0, 0.18, 0.18);
    const topSlideDeckR = makeSlideDeck(8, 5.0, -0.18, 0.18);

    // 底部左右辅助堆 (各 5 张)
    const botSlideDeckL = makeSlideDeck(5, 0.0, 0.16, 5.2);
    const botSlideDeckR = makeSlideDeck(5, 5.0, -0.16, 5.2);

    // 四角极境独立迎客牌 (绝对不被上层遮挡，开局必定高亮可点)
    const openAnchors: Array<{ x: number; y: number; layer: number }> = [
      { x: 0.0, y: 1.0, layer: 0 },
      { x: 5.0, y: 1.0, layer: 0 },
      { x: 0.0, y: 4.6, layer: 0 },
      { x: 5.0, y: 4.6, layer: 0 },
      { x: 1.0, y: 5.4, layer: 0 },
      { x: 4.0, y: 5.4, layer: 0 },
    ];

    if (templateType === 0) {
      // 阵型 1：【经典羊头神殿】(1:1 还原截图 2 原版拓扑：6 列宽排布 + 羊角立柱 + 殿堂核心 + 羊蹄基石)
      const templeSlots: Array<{ x: number; y: number; layer: number }> = [];

      // Layer 0：殿堂大底盘 (6 列 x 5 排，横向从 x:0 到 x:5 完整铺展)
      const l0Rows = [
        { y: 1.0, cols: [1.0, 2.0, 3.0, 4.0] },
        { y: 1.9, cols: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0] },
        { y: 2.8, cols: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0] },
        { y: 3.7, cols: [0.0, 1.0, 2.0, 3.0, 4.0, 5.0] },
        { y: 4.6, cols: [1.0, 2.0, 3.0, 4.0] },
        { y: 5.4, cols: [2.0, 3.0] },
      ];
      for (const row of l0Rows) {
        for (const col of row.cols) {
          templeSlots.push({ x: col, y: row.y, layer: 0 });
        }
      }

      // Layer 1：半步错位层 (覆盖下层 4 张牌的经典压牌结构)
      const l1Rows = [
        { y: 1.45, cols: [0.5, 1.5, 2.5, 3.5, 4.5] },
        { y: 2.35, cols: [0.5, 1.5, 2.5, 3.5, 4.5] },
        { y: 3.25, cols: [0.5, 1.5, 2.5, 3.5, 4.5] },
        { y: 4.15, cols: [0.5, 1.5, 2.5, 3.5, 4.5] },
        { y: 5.0,  cols: [1.5, 2.5, 3.5] },
      ];
      for (const row of l1Rows) {
        for (const col of row.cols) {
          templeSlots.push({ x: col, y: row.y, layer: 1 });
        }
      }

      // Layer 2：核心神殿山脊峰 (左右双子峰 + 中央大厅)
      const l2 = [
        { x: 1.0, y: 1.9 }, { x: 2.0, y: 1.9 }, { x: 3.0, y: 1.9 }, { x: 4.0, y: 1.9 },
        { x: 0.5, y: 2.8 }, { x: 1.5, y: 2.8 }, { x: 2.5, y: 2.8 }, { x: 3.5, y: 2.8 }, { x: 4.5, y: 2.8 },
        { x: 1.0, y: 3.7 }, { x: 2.0, y: 3.7 }, { x: 3.0, y: 3.7 }, { x: 4.0, y: 3.7 },
        { x: 2.0, y: 4.6 }, { x: 3.0, y: 4.6 },
      ];
      l2.forEach(p => templeSlots.push({ x: p.x, y: p.y, layer: 2 }));

      // Layer 3：高耸峰塔
      const l3 = [
        { x: 1.5, y: 2.35 }, { x: 2.5, y: 2.35 }, { x: 3.5, y: 2.35 },
        { x: 2.0, y: 2.8 },  { x: 3.0, y: 2.8 },
        { x: 1.5, y: 3.25 }, { x: 2.5, y: 3.25 }, { x: 3.5, y: 3.25 },
      ];
      l3.forEach(p => templeSlots.push({ x: p.x, y: p.y, layer: 3 }));

      // Layer 4：王冠双顶点
      const l4 = [
        { x: 2.5, y: 2.35 }, { x: 2.5, y: 2.8 }, { x: 2.5, y: 3.25 },
      ];
      l4.forEach(p => templeSlots.push({ x: p.x, y: p.y, layer: 4 }));

      candidateSlots = [
        ...topSlideDeckL,
        ...topSlideDeckR,
        ...openAnchors,
        ...templeSlots,
        ...botSlideDeckL,
        ...botSlideDeckR,
      ];

    } else if (templateType === 1) {
      // 阵型 2：【双峰金字塔】—— 左右并立的大金字塔，纵横舒展
      const pyramidSlots: Array<{ x: number; y: number; layer: number }> = [];

      // Layer 0：底座连绵 6 列
      const rows = [1.0, 1.9, 2.8, 3.7, 4.6];
      for (const y of rows) {
        for (let col = 0; col <= 5; col++) {
          pyramidSlots.push({ x: col, y, layer: 0 });
        }
      }

      // Layer 1：左塔基 + 右塔基
      const l1Cols = [0.5, 1.5, 2.5, 3.5, 4.5];
      for (const y of [1.45, 2.35, 3.25, 4.15]) {
        for (const col of l1Cols) {
          pyramidSlots.push({ x: col, y, layer: 1 });
        }
      }

      // Layer 2：左峰中阶 (x: 1.0, 2.0) + 右峰中阶 (x: 3.0, 4.0)
      for (const y of [1.9, 2.8, 3.7]) {
        pyramidSlots.push({ x: 1.0, y, layer: 2 });
        pyramidSlots.push({ x: 2.0, y, layer: 2 });
        pyramidSlots.push({ x: 3.0, y, layer: 2 });
        pyramidSlots.push({ x: 4.0, y, layer: 2 });
      }

      // Layer 3：左峰尖 (x: 1.5) + 右峰尖 (x: 3.5)
      for (const y of [2.35, 3.25]) {
        pyramidSlots.push({ x: 1.5, y, layer: 3 });
        pyramidSlots.push({ x: 3.5, y, layer: 3 });
        pyramidSlots.push({ x: 2.5, y, layer: 3 });
      }

      // Layer 4：峰顶宝珠
      pyramidSlots.push({ x: 1.5, y: 2.8, layer: 4 });
      pyramidSlots.push({ x: 3.5, y: 2.8, layer: 4 });

      candidateSlots = [
        ...topSlideDeckL,
        ...topSlideDeckR,
        ...openAnchors,
        ...pyramidSlots,
        ...botSlideDeckL,
        ...botSlideDeckR,
      ];

    } else if (templateType === 2) {
      // 阵型 3：【四叶环岛群】—— 四极群岛环绕广阔中心大环礁
      const islandSlots: Array<{ x: number; y: number; layer: number }> = [];

      // 四极卫星小岛 (每角各 3 张微叠)
      const satelliteCorners = [
        { x: 0.0, y: 1.0 }, { x: 5.0, y: 1.0 },
        { x: 0.0, y: 4.6 }, { x: 5.0, y: 4.6 },
      ];
      satelliteCorners.forEach(sc => {
        islandSlots.push({ x: sc.x, y: sc.y, layer: 0 });
        islandSlots.push({ x: sc.x, y: sc.y, layer: 1 });
        islandSlots.push({ x: sc.x, y: sc.y, layer: 2 });
      });

      // 中央大环礁 Layer 0：4x4 广袤主体与连岛引桥
      for (let r = 0; r < 4; r++) {
        for (let c = 1; c <= 4; c++) {
          islandSlots.push({ x: c, y: 1.5 + r * 0.9, layer: 0 });
        }
      }
      // 连接左右边界的引桥
      islandSlots.push({ x: 0.0, y: 2.8, layer: 0 });
      islandSlots.push({ x: 5.0, y: 2.8, layer: 0 });

      // Layer 1：环岛中阶
      for (let r = 0; r < 3; r++) {
        for (const col of [1.5, 2.5, 3.5]) {
          islandSlots.push({ x: col, y: 1.95 + r * 0.9, layer: 1 });
        }
      }

      // Layer 2：环礁高台
      for (let r = 0; r < 2; r++) {
        for (const col of [2.0, 3.0]) {
          islandSlots.push({ x: col, y: 2.4 + r * 0.9, layer: 2 });
        }
      }

      // Layer 3 & 4：岛心灯塔
      islandSlots.push({ x: 2.5, y: 2.85, layer: 3 });
      islandSlots.push({ x: 2.5, y: 2.85, layer: 4 });

      candidateSlots = [
        ...topSlideDeckL,
        ...topSlideDeckR,
        ...openAnchors,
        ...islandSlots,
        ...botSlideDeckL,
        ...botSlideDeckR,
      ];

    } else {
      // 阵型 4：【风车大十字】—— 贯通 6 列的宏伟十字与四象限轮盘
      const crossSlots: Array<{ x: number; y: number; layer: number }> = [];

      // 横贯大梁：贯穿整整 6 列 (x: 0..5)
      for (let c = 0; c <= 5; c++) {
        crossSlots.push({ x: c, y: 2.4, layer: 0 });
        crossSlots.push({ x: c, y: 3.3, layer: 0 });
      }

      // 纵贯大梁：从上到下 (y: 1.0 ~ 5.2)
      for (let r = 0; r <= 4; r++) {
        crossSlots.push({ x: 2.0, y: 1.0 + r * 0.9, layer: 0 });
        crossSlots.push({ x: 3.0, y: 1.0 + r * 0.9, layer: 0 });
      }

      // 四象限风车翼端
      crossSlots.push({ x: 0.5, y: 1.5, layer: 0 });
      crossSlots.push({ x: 4.5, y: 1.5, layer: 0 });
      crossSlots.push({ x: 0.5, y: 4.2, layer: 0 });
      crossSlots.push({ x: 4.5, y: 4.2, layer: 0 });

      // Layer 1：交叉旋转错位层
      for (const col of [1.5, 2.5, 3.5]) {
        for (const y of [1.9, 2.8, 3.7]) {
          crossSlots.push({ x: col, y, layer: 1 });
        }
      }

      // Layer 2：中心枢纽轮盘
      crossSlots.push({ x: 2.0, y: 2.4, layer: 2 });
      crossSlots.push({ x: 3.0, y: 2.4, layer: 2 });
      crossSlots.push({ x: 2.0, y: 3.3, layer: 2 });
      crossSlots.push({ x: 3.0, y: 3.3, layer: 2 });

      // Layer 3 & 4：枢纽中心轴
      crossSlots.push({ x: 2.5, y: 2.85, layer: 3 });
      crossSlots.push({ x: 2.5, y: 2.85, layer: 4 });

      candidateSlots = [
        ...topSlideDeckL,
        ...topSlideDeckR,
        ...openAnchors,
        ...crossSlots,
        ...botSlideDeckL,
        ...botSlideDeckR,
      ];
    }

    // 去除重复坐标 (确保同一层坐标严格不重合)
    const uniqueSlots: Array<{ x: number; y: number; layer: number }> = [];
    const seen = new Set<string>();

    for (const s of candidateSlots) {
      const key = `${Math.round(s.x * 100)},${Math.round(s.y * 100)},${s.layer}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSlots.push(s);
      }
    }

    // 按层级结构科学选取 totalCards 张槽位：
    // 底层 (45%~55%)，错位中层 (25%~30%)，核心峰层 (15%~20%)，顶冠 (5%~10%)
    let finalSlots: Array<{ x: number; y: number; layer: number }> = [];
    if (uniqueSlots.length >= totalCards) {
      const byLayer: Record<number, Array<{ x: number; y: number; layer: number }>> = {};
      uniqueSlots.forEach(s => {
        if (!byLayer[s.layer]) byLayer[s.layer] = [];
        byLayer[s.layer].push(s);
      });

      // 打乱各层内部顺序
      Object.keys(byLayer).forEach(l => {
        this.shuffleArray(byLayer[Number(l)], randomFn);
      });

      const maxLayer = Math.max(...Object.keys(byLayer).map(Number));
      const targetBase = Math.max(8, Math.floor(totalCards * 0.48));
      const picked: Array<{ x: number; y: number; layer: number }> = [];

      // 1. 优先确保宽阔底层，产生充足的边缘无遮挡牌和舒展横向跨度
      if (byLayer[0]) {
        picked.push(...byLayer[0].slice(0, targetBase));
      }

      // 2. 依次加入中高层
      for (let l = 1; l <= maxLayer && picked.length < totalCards; l++) {
        if (byLayer[l]) {
          const quota = Math.ceil((totalCards - picked.length) / (maxLayer - l + 1));
          picked.push(...byLayer[l].slice(0, quota));
        }
      }

      // 3. 若仍有空缺，从剩余候选槽位中填充
      if (picked.length < totalCards) {
        const remaining = uniqueSlots.filter(s => !picked.includes(s));
        picked.push(...remaining.slice(0, totalCards - picked.length));
      }

      finalSlots = picked.slice(0, totalCards);
    } else {
      // 候选槽位充足（>=105个），极小概率补充
      finalSlots = [...uniqueSlots];
      let addIdx = 0;
      while (finalSlots.length < totalCards) {
        const base = uniqueSlots[addIdx % uniqueSlots.length];
        addIdx++;
        finalSlots.push({
          x: Math.round((base.x + 0.15) * 100) / 100,
          y: Math.round((base.y + 0.15) * 100) / 100,
          layer: base.layer + 1,
        });
      }
      finalSlots = finalSlots.slice(0, totalCards);
    }

    // 随机水平镜像反转与微米级物理手感抖动 (±0.04 逻辑网格，自然生动)
    const finalSeen = new Set<string>();
    finalSlots.forEach(s => {
      if (flipX) {
        s.x = Math.round((5.0 - s.x) * 100) / 100;
      }
      const jitterX = Math.round((randomFn() - 0.5) * 0.08 * 100) / 100;
      const jitterY = Math.round((randomFn() - 0.5) * 0.08 * 100) / 100;
      s.x = Math.max(0.0, Math.min(5.0, Math.round((s.x + jitterX) * 100) / 100));
      s.y = Math.max(0.1, Math.min(5.6, Math.round((s.y + jitterY) * 100) / 100));

      let key = `${s.x},${s.y},${s.layer}`;
      let tries = 0;
      while (finalSeen.has(key) && tries < 50) {
        s.x = Math.round((s.x + 0.04) * 100) / 100;
        if (s.x > 5.0) s.x = 0.0;
        key = `${s.x},${s.y},${s.layer}`;
        tries++;
      }
      finalSeen.add(key);
    });

    return finalSlots;
  }

  /**
   * 100% 必定可解图案分配算法 (Solvable Color Assignment)
   * 正向模拟一个玩家在最大卡槽裕度 <= 5 格的情况下完整通关，将消除序列赋予卡槽
   */
  private solveAndAssignPatterns(
    slots: Array<{ x: number; y: number; layer: number }>,
    blockedBy: Set<number>[],
    blocks: Set<number>[],
    availableTypes: readonly string[],
    randomFn: () => number
  ): string[] {
    const n = slots.length;
    const assigned = new Array<string>(n).fill('');
    const inDegrees = blockedBy.map(b => b.size); // 当前有多少牌压在上面
    const cleared = new Array<boolean>(n).fill(false);

    // 统计每种图案的使用次数，力求均衡
    const typeUsage: Record<string, number> = {};
    availableTypes.forEach(t => (typeUsage[t] = 0));

    // 获取当前暴露（未遮挡）且未分配图案的槽位
    const getAvailableSlots = () => {
      const list: number[] = [];
      for (let i = 0; i < n; i++) {
        if (!cleared[i] && inDegrees[i] === 0) {
          list.push(i);
        }
      }
      return list;
    };

    let totalPairsNeeded = n / 3;
    let virtualSlot: { id: number; type: string }[] = [];

    // 正向模拟分配循环
    for (let round = 0; round < totalPairsNeeded; round++) {
      let free = getAvailableSlots();
      if (free.length === 0) break;

      // 挑选一个最合适的水果图案 (使用最少者优先，相同频次按名称字典序稳定排序)
      const sortedTypes = [...availableTypes].sort((a, b) => {
        const diff = (typeUsage[a] || 0) - (typeUsage[b] || 0);
        if (diff !== 0) return diff;
        return a.localeCompare(b);
      });
      const chosenType = sortedTypes[0];
      typeUsage[chosenType] = (typeUsage[chosenType] || 0) + 3;

      // 选 3 个槽位赋予该图案
      const picked: number[] = [];

      // 1. 如果当前暴露的牌 >= 3，直接拿 3 张进行 3 消，零占用卡槽！
      if (free.length >= 3) {
        // 轻度打乱 free
        this.shuffleArray(free, randomFn);
        picked.push(free[0], free[1], free[2]);
      } else {
        // 暴露牌不足 3 张，依次取走暴露牌并释放下层，凑齐 3 张
        while (picked.length < 3 && free.length > 0) {
          const next = free.pop()!;
          picked.push(next);
          // 暂时释放它的遮挡，让下层露出来
          cleared[next] = true;
          for (const lower of blocks[next]) {
            inDegrees[lower]--;
          }
          free = getAvailableSlots().filter(id => !picked.includes(id));
        }

        // 如果依然凑不足（极端情况），从任何未消除的槽位补足
        if (picked.length < 3) {
          for (let i = 0; i < n && picked.length < 3; i++) {
            if (!cleared[i] && !picked.includes(i)) {
              picked.push(i);
            }
          }
        }
      }

      // 将这 3 张牌正式标记为消除并赋予图案
      for (const idx of picked) {
        assigned[idx] = chosenType;
        if (!cleared[idx]) {
          cleared[idx] = true;
          for (const lower of blocks[idx]) {
            inDegrees[lower]--;
          }
        }
      }
    }

    // 保底：若有任何槽位未染上色，按 3 的倍数补充
    const unassigned: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!assigned[i]) unassigned.push(i);
    }
    for (let i = 0; i < unassigned.length; i += 3) {
      const fallbackType = availableTypes[i % availableTypes.length];
      for (let j = 0; j < 3 && (i + j) < unassigned.length; j++) {
        assigned[unassigned[i + j]] = fallbackType;
      }
    }

    return assigned;
  }

  private shuffleArray(array: any[], rng: () => number = Math.random): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  getState(): TilematchState {
    return {
      score: this.score,
      moves: this.moves,
      combo: this.combo,
      maxCombo: this.maxCombo,
      status: this.status,
      difficulty: this.difficulty,
      level: this.level,
      totalCards: this.totalCards,
      isVictory: this.isVictory,
      cards: this.cards,
      slot: this.slot,
      stash: this.stash,
      stashUsed: this.stashUsed,
      undoRemaining: this.undoRemaining,
      shuffleRemaining: this.shuffleRemaining,
      lastMatchedType: this.lastMatchedType,
      lastMatchedCount: this.lastMatchedCount,
    };
  }
}
