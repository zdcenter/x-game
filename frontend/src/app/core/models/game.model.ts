/**
 * 游戏 ID 枚举常量
 * 用于全局统一标识各款游戏，取代离散的魔法字符串
 */
export const GameId = {
  Minesweeper: 'minesweeper',
  Sudoku: 'sudoku',
  Sliding: 'sliding',
  Hexa: 'hexa',
  Tetris: 'tetris',
  Gomoku: 'gomoku',
  Codebreaker: 'codebreaker',
  Math24: 'math24',
  Drop2048: 'drop2048',
  Block: 'block',
  LightsOut: 'lightsout',
  WaterSort: 'watersort',
  Sokoban: 'sokoban',
  Idiom: 'idiom',
  Nonogram: 'nonogram',
  Classic2048: 'classic2048'
} as const;

export type GameIdType = typeof GameId[keyof typeof GameId];

/**
 * 游戏核心模式枚举常量
 * 统一所有游戏的游玩模式（单机、竞速、抢分等）
 */
export const GameMode = {
  /** 纯单机/练习模式 */
  Single: 'single',
  /** 异盘竞速模式：多名玩家独立游玩相同的棋盘，比拼速度 (替代旧版的 same_pk_speed) */
  Speed: 'speed',
  /** 同盘抢分模式：多名玩家在一个公共棋盘上抢答/抢地盘 (替代旧版的 same_pk_steal) */
  Steal: 'steal',
  /** 分数生存模式：比拼最终得分 (替代旧版的 same_pk_score / diff_pk_score) */
  Score: 'score',
  /** 同盘分数生存模式：使用相同的随机种子 (用于六边形消除等) */
  SameScore: 'same_score',
  /** 互相攻击模式：大乱斗或经典对战机制 (替代旧版的 diff_pk_attack / same_pk_classic) */
  Battle: 'battle'
} as const;

export type GameModeType = typeof GameMode[keyof typeof GameMode];

/**
 * 游戏难度等级枚举常量
 * 标准化的 7 阶段难度体系
 */
export const GameDifficulty = {
  /** 简单/初级 */
  Easy: 'easy',       
  /** 中等/标准 */
  Medium: 'medium',   
  /** 困难/高级 */
  Hard: 'hard',       
  /** 专家级 */
  Expert: 'expert',   
  /** 大师级 */
  Master: 'master'    
} as const;

export type GameDifficultyType = typeof GameDifficulty[keyof typeof GameDifficulty];

/**
 * 游戏房间状态枚举常量
 */
export const GameStatus = {
  /** 等待玩家加入/准备中 */
  Waiting: 'waiting',
  /** 倒计时启动中 */
  Starting: 'starting',
  /** 游戏中 */
  Playing: 'playing',
  /** 游戏已结束/结算中 */
  Finished: 'finished',
} as const;

export type GameStatusType = typeof GameStatus[keyof typeof GameStatus];
  
/**
 * 游戏结果状态枚举常量
 */
export const GameResult = {
  Win: 'win',
  Lose: 'lose',
  Draw: 'draw'
} as const;

export type GameResultType = typeof GameResult[keyof typeof GameResult];
