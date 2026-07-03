// game-definitions.ts — 路由骨架 + SSR/预渲染 fallback
//
// 分工说明：
//   loadComponent / tutorial / recommendations → 编译期固化，永远保留在此文件
//   icon / modes / difficulties / multiRound   → 此处为 SSR 静态 fallback
//                                                浏览器启动时由 GameRegistryService.loadFromDB()
//                                                从 gm_game_configs.config 覆盖（Admin 可管理）
//
// 新增游戏时：在此添加路由骨架 + 在 backend/pkg/db/postgres.go Seed() 中填写完整 Config JSON
import { GameConfig } from '../services/game-registry.service';
import { GameId, GameMode, GameDifficulty } from '../models/game.model';

export interface TutorialStep {
  icon?: string;
  title: string;      // i18n key or raw string
  description: string; // i18n key or raw string
}

/** GameConfig + lazy component loader + optional tutorial steps. */
export interface GameRouteDef extends GameConfig {
  loadComponent: () => Promise<any>;
  tutorial?: TutorialStep[];
}

export const GAME_DEFINITIONS: GameRouteDef[] = [
  {
    id: GameId.Minesweeper,
    route: '/games/minesweeper',
    titleKey: 'lobby.minesweeper',
    iconEmoji: '💣',
    loadComponent: () => import('../../features/games/minesweeper/minesweeper.component').then(m => m.MinesweeperComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Steal, labelKey: 'game.same_pk_steal_mine', descKey: 'game.same_pk_steal_desc', icon: '⚡', desc: 'Shared board. Race to flag mines!' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'Separate boards. First to clear wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_mine_9x9', desc: '9x9 (10)' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_mine_16x16', desc: '16x16 (40)' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_mine_30x16', desc: '30x16 (99)' },
      { id: GameDifficulty.Expert, labelKey: 'game.diff_expert', descKey: 'game.diff_mine_30x20', desc: '30x20 (160)' },
      { id: GameDifficulty.Master, labelKey: 'game.diff_master', descKey: 'game.diff_mine_30x24', desc: '30x24 (230)' }
    ],
    recommendations: ['sudoku', 'sliding'],
    multiRound: true,
    tutorial: [
      { icon: '💣', title: 'tutorial.mine.goal',   description: 'tutorial.mine.goal_desc' },
      { icon: '👆', title: 'tutorial.mine.reveal',  description: 'tutorial.mine.reveal_desc' },
      { icon: '🚩', title: 'tutorial.mine.flag',    description: 'tutorial.mine.flag_desc' },
      { icon: '🔢', title: 'tutorial.mine.numbers', description: 'tutorial.mine.numbers_desc' },
      { icon: '💡', title: 'tutorial.mine.hint',    description: 'tutorial.mine.hint_desc' },
    ]
  },
  {
    id: GameId.Sudoku,
    route: '/games/sudoku',
    titleKey: 'lobby.sudoku',
    iconEmoji: '🔢',
    loadComponent: () => import('../../features/games/sudoku/sudoku.component').then(m => m.SudokuComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'Separate boards. First to solve wins!' },
      { id: GameMode.Steal, labelKey: 'game.same_pk_steal_number', descKey: 'game.same_pk_steal_desc', icon: '⚡', desc: 'Shared board. Correct=Score, Wrong=Freeze!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_sudoku_easy', desc: 'Beginner' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_sudoku_medium', desc: 'Intermediate' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_sudoku_hard', desc: 'Advanced' },
      { id: GameDifficulty.Expert, labelKey: 'game.diff_expert', descKey: 'game.diff_sudoku_expert', desc: 'Professional' }
    ],
    recommendations: ['minesweeper', 'math24'],
    tutorial: [
      { icon: '🔢', title: 'tutorial.sudoku.goal',    description: 'tutorial.sudoku.goal_desc' },
      { icon: '↔️', title: 'tutorial.sudoku.rules',   description: 'tutorial.sudoku.rules_desc' },
      { icon: '✏️', title: 'tutorial.sudoku.notes',   description: 'tutorial.sudoku.notes_desc' },
      { icon: '💡', title: 'tutorial.sudoku.hint',    description: 'tutorial.sudoku.hint_desc' },
    ]
  },
  {
    id: GameId.Sliding,
    route: '/games/sliding',
    titleKey: 'lobby.sliding',
    iconEmoji: '🔲',
    loadComponent: () => import('../../features/games/sliding/sliding.component').then(m => m.SlidingComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'Separate boards. First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_slide_4x4', desc: '4x4 Grid' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_slide_5x5', desc: '5x5 Grid' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_slide_6x6', desc: '6x6 Grid' }
    ],
    recommendations: ['sudoku', 'hexa'],
    multiRound: true,
    tutorial: [
      { icon: '🔲', title: 'tutorial.sliding.goal',     description: 'tutorial.sliding.goal_desc' },
      { icon: '👆', title: 'tutorial.sliding.move',     description: 'tutorial.sliding.move_desc' },
      { icon: '🧩', title: 'tutorial.sliding.strategy', description: 'tutorial.sliding.strategy_desc' },
      { icon: '💡', title: 'tutorial.sliding.hint',     description: 'tutorial.sliding.hint_desc' },
    ]
  },
  {
    id: GameId.Hexa,
    route: '/games/hexa',
    titleKey: 'lobby.hexa',
    iconEmoji: '🔶',
    loadComponent: () => import('../../features/games/hexa/hexa.component').then(m => m.HexaComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.SameScore, labelKey: 'game.same_pk_score_label', descKey: 'game.same_pk_score_desc', icon: '🏎️', desc: 'Same pieces for everyone!' },
      { id: GameMode.Score, labelKey: 'game.diff_pk_score_label', descKey: 'game.diff_pk_score_desc', icon: '⚡', desc: 'Shared board. Highest score wins!' }
    ],
    difficulties: [
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_hexa_standard', desc: 'Normal Board' }
    ],
    recommendations: ['tetris', 'drop2048'],
    tutorial: [
      { icon: '🔶', title: 'tutorial.hexa.goal',  description: 'tutorial.hexa.goal_desc' },
      { icon: '👆', title: 'tutorial.hexa.place', description: 'tutorial.hexa.place_desc' },
      { icon: '💥', title: 'tutorial.hexa.clear', description: 'tutorial.hexa.clear_desc' },
      { icon: '🚫', title: 'tutorial.hexa.end',   description: 'tutorial.hexa.end_desc' },
    ]
  },
  {
    id: GameId.Tetris,
    route: '/games/tetris',
    titleKey: 'lobby.tetris',
    iconEmoji: '🧱',
    loadComponent: () => import('../../features/games/tetris/tetris.component').then(m => m.TetrisComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Battle, labelKey: 'game.diff_pk_attack_label', descKey: 'game.diff_pk_attack_desc', icon: '⚔️', desc: 'Send garbage lines to opponents!' },
      { id: GameMode.Score, labelKey: 'game.diff_pk_score_label', descKey: 'game.diff_pk_score_desc', icon: '🏆', desc: 'Survive and get the highest score!' }
    ],
    difficulties: [
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_tetris_standard', desc: 'Normal Drop Speed' }
    ],
    recommendations: ['drop2048', 'hexa'],
    tutorial: [
      { icon: '🧱', title: 'tutorial.tetris.goal',     description: 'tutorial.tetris.goal_desc' },
      { icon: '🕹️', title: 'tutorial.tetris.controls', description: 'tutorial.tetris.controls_desc' },
      { icon: '💥', title: 'tutorial.tetris.scoring',  description: 'tutorial.tetris.scoring_desc' },
      { icon: '📐', title: 'tutorial.tetris.strategy', description: 'tutorial.tetris.strategy_desc' },
    ]
  },
  {
    id: GameId.Gomoku,
    route: '/games/gomoku',
    titleKey: 'lobby.gomoku',
    iconEmoji: '⚫⚪',
    loadComponent: () => import('../../features/games/gomoku/gomoku.component').then(m => m.GomokuComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Battle, labelKey: 'game.same_pk_classic', descKey: 'game.same_pk_classic_desc', icon: '⚔️', desc: 'Classic 1v1 PvP' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_gomoku_easy', desc: 'Easy AI (15x15)' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_gomoku_medium', desc: 'Medium AI (15x15)' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_gomoku_hard', desc: 'Hard AI (15x15)' }
    ],
    recommendations: ['codebreaker', 'minesweeper'],
    tutorial: [
      { icon: '⚫', title: 'tutorial.gomoku.goal',    description: 'tutorial.gomoku.goal_desc' },
      { icon: '🎯', title: 'tutorial.gomoku.turn',    description: 'tutorial.gomoku.turn_desc' },
      { icon: '🛡️', title: 'tutorial.gomoku.defense', description: 'tutorial.gomoku.defense_desc' },
      { icon: '🤖', title: 'tutorial.gomoku.ai',      description: 'tutorial.gomoku.ai_desc' },
    ]
  },
  {
    id: GameId.Codebreaker,
    route: '/games/codebreaker',
    titleKey: 'lobby.codebreaker',
    iconEmoji: '🔐',
    loadComponent: () => import('../../features/games/codebreaker/codebreaker.component').then(m => m.CodebreakerComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'Separate boards. First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_codebreaker_easy', desc: '3-digit code' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_codebreaker_medium', desc: '4-digit code' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_codebreaker_hard', desc: '5-digit code' }
    ],
    recommendations: ['math24', 'sudoku'],
    multiRound: true,
    tutorial: [
      { icon: '🔐', title: 'tutorial.codebreaker.goal',     description: 'tutorial.codebreaker.goal_desc' },
      { icon: '🟢', title: 'tutorial.codebreaker.feedback', description: 'tutorial.codebreaker.feedback_desc' },
      { icon: '🧠', title: 'tutorial.codebreaker.strategy', description: 'tutorial.codebreaker.strategy_desc' },
      { icon: '💡', title: 'tutorial.codebreaker.hint',     description: 'tutorial.codebreaker.hint_desc' },
    ]
  },
  {
    id: GameId.Math24,
    route: '/games/math24',
    titleKey: 'lobby.math24',
    iconEmoji: '🃏',
    loadComponent: () => import('../../features/games/math24/math24.component').then(m => m.Math24Component),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'Solve 5 puzzles first!' },
      { id: GameMode.Steal, labelKey: 'game.same_pk_steal_score', descKey: 'game.same_pk_steal_desc', icon: '⚡', desc: 'First to solve gets the point!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_math24_easy', desc: 'Beginner' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_math24_medium', desc: 'Intermediate' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_math24_hard', desc: 'Advanced' },
      { id: GameDifficulty.Expert, labelKey: 'game.diff_expert', descKey: 'game.diff_math24_expert', desc: 'Professional' }
    ],
    recommendations: ['sudoku', 'codebreaker'],
    tutorial: [
      { icon: '🔢', title: 'tutorial.math24.goal',    description: 'tutorial.math24.goal_desc' },
      { icon: '➕', title: 'tutorial.math24.ops',     description: 'tutorial.math24.ops_desc' },
      { icon: '👆', title: 'tutorial.math24.select',  description: 'tutorial.math24.select_desc' },
      { icon: '⏱️', title: 'tutorial.math24.timer',   description: 'tutorial.math24.timer_desc' },
    ]
  },
  {
    id: GameId.Drop2048,
    route: '/games/drop2048',
    titleKey: 'lobby.drop2048',
    iconEmoji: '🟦',
    loadComponent: () => import('../../features/games/drop2048/drop2048.component').then(m => m.Drop2048Component),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Score, labelKey: 'game.diff_pk_score_label', descKey: 'game.diff_pk_score_desc', icon: '🏆', desc: 'Survive and get the highest score!' }
    ],
    difficulties: [
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_drop2048_standard', desc: 'Standard 5x7 Board' }
    ],
    recommendations: ['tetris', 'hexa'],
    tutorial: [
      { icon: '🟦', title: 'tutorial.drop2048.goal',  description: 'tutorial.drop2048.goal_desc' },
      { icon: '👆', title: 'tutorial.drop2048.drop',  description: 'tutorial.drop2048.drop_desc' },
      { icon: '🔀', title: 'tutorial.drop2048.merge', description: 'tutorial.drop2048.merge_desc' },
      { icon: '🚫', title: 'tutorial.drop2048.end',   description: 'tutorial.drop2048.end_desc' },
    ]
  },
  {
    id: GameId.Block,
    route: '/games/block',
    titleKey: 'app.title.block',
    iconEmoji: '🟩',
    loadComponent: () => import('../../features/games/block/block.component').then(m => m.BlockComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_player_endless', descKey: 'game.single_player_endless', desc: 'Survival', icon: '👤' },
      { id: GameMode.Score, labelKey: 'game.diff_pk_score_label', descKey: 'game.diff_pk_score_desc', desc: 'Survival & Score', icon: '⚔️' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_easy', desc: '8x8 Board' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_medium', desc: '10x10 Board' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_hard', desc: '12x12 Board' }
    ],
    recommendations: ['tetris', 'hexa'],
    tutorial: [
      { icon: '🟩', title: 'tutorial.block.goal',  description: 'tutorial.block.goal_desc' },
      { icon: '👆', title: 'tutorial.block.place', description: 'tutorial.block.place_desc' },
      { icon: '💥', title: 'tutorial.block.clear', description: 'tutorial.block.clear_desc' },
      { icon: '🚫', title: 'tutorial.block.end',   description: 'tutorial.block.end_desc' },
    ]
  },
  {
    id: GameId.LightsOut,
    route: '/games/lightsout',
    titleKey: 'app.title.lightsout',
    iconEmoji: '💡',
    loadComponent: () => import('../../features/games/lightsout/lightsout.component').then(m => m.LightsoutComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_player_endless', descKey: 'game.single_player_endless', desc: 'Survival', icon: '👤' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_easy', desc: '4x4 Board' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_medium', desc: '5x5 Board' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_hard', desc: '6x6 Board' },
      { id: GameDifficulty.Expert, labelKey: 'game.diff_expert', descKey: 'game.diff_expert', desc: '7x7 Board' },
      { id: GameDifficulty.Master, labelKey: 'game.diff_master', descKey: 'game.diff_master', desc: '8x8 Board' }
    ],
    recommendations: ['minesweeper', 'sudoku'],
    multiRound: true,
    tutorial: [
      { icon: '💡', title: 'tutorial.lightsout.goal',   description: 'tutorial.lightsout.goal_desc' },
      { icon: '👆', title: 'tutorial.lightsout.toggle', description: 'tutorial.lightsout.toggle_desc' },
      { icon: '🧠', title: 'tutorial.lightsout.logic',  description: 'tutorial.lightsout.logic_desc' },
      { icon: '💡', title: 'tutorial.lightsout.hint',   description: 'tutorial.lightsout.hint_desc' },
    ]
  },
  {
    id: GameId.WaterSort,
    route: '/games/watersort',
    titleKey: 'app.title.watersort',
    iconEmoji: '🧪',
    loadComponent: () => import('../../features/games/watersort/watersort.component').then(m => m.WatersortComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.mode_single_player', descKey: 'game.mode_single_player_desc', desc: 'Single Player', icon: '👤' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_watersort_easy', desc: '7 Tubes (5 Colors)' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_watersort_medium', desc: '11 Tubes (9 Colors)' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_watersort_hard', desc: '16 Tubes (14 Colors)' }
    ],
    tutorial: [
      { icon: '🧪', title: 'tutorial.watersort.goal',    description: 'tutorial.watersort.goal_desc' },
      { icon: '👆', title: 'tutorial.watersort.select',  description: 'tutorial.watersort.select_desc' },
      { icon: '📏', title: 'tutorial.watersort.rules',   description: 'tutorial.watersort.rules_desc' },
      { icon: '💡', title: 'tutorial.watersort.hint',    description: 'tutorial.watersort.hint_desc' },
    ]
  },
  {
    id: GameId.Sokoban,
    route: '/games/sokoban',
    titleKey: 'app.title.sokoban',
    multiRound: true,
    iconEmoji: '📦',
    loadComponent: () => import('../../features/games/sokoban/sokoban.component').then(m => m.SokobanComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.mode_single_player', descKey: 'game.single_player_desc', desc: 'Single Player', icon: '👤' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_sokoban_beginner', desc: 'Beginner' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_sokoban_intermediate', desc: 'Intermediate' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_sokoban_advanced', desc: 'Advanced' },
      { id: GameDifficulty.Expert, labelKey: 'game.diff_expert', descKey: 'game.diff_sokoban_professional', desc: 'Professional' }
    ],
    recommendations: ['sliding', 'lightsout'],
    tutorial: [
      { icon: '📦', title: 'tutorial.sokoban.goal',     description: 'tutorial.sokoban.goal_desc' },
      { icon: '🕹️', title: 'tutorial.sokoban.controls', description: 'tutorial.sokoban.controls_desc' },
      { icon: '📏', title: 'tutorial.sokoban.rules',    description: 'tutorial.sokoban.rules_desc' },
      { icon: '↩️', title: 'tutorial.sokoban.undo',     description: 'tutorial.sokoban.undo_desc' },
    ]
  },
  {
    id: GameId.Idiom,
    route: '/games/idiom',
    titleKey: 'lobby.idiom',
    iconEmoji: '📖',
    loadComponent: () => import('../../features/games/idiom/idiom.component').then(m => m.IdiomComponent),
    modes: [
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'idiom.pk_speed_desc', icon: '⚡', desc: 'Same idiom. First to answer correctly wins!' },
    ],
    difficulties: [],
    recommendations: ['sudoku', 'math24', 'codebreaker'],
    multiRound: true,
    tutorial: [
      { icon: '📖', title: 'tutorial.idiom.goal',     description: 'tutorial.idiom.goal_desc' },
      { icon: '✏️', title: 'tutorial.idiom.fill',     description: 'tutorial.idiom.fill_desc' },
      { icon: '🟩', title: 'tutorial.idiom.wordle',   description: 'tutorial.idiom.wordle_desc' },
      { icon: '📚', title: 'tutorial.idiom.story',    description: 'tutorial.idiom.story_desc' },
    ]
  },
  {
    id: GameId.Nonogram,
    route: '/games/nonogram',
    titleKey: 'lobby.nonogram',
    iconEmoji: '🎨',
    loadComponent: () => import('../../features/games/nonogram/nonogram.component').then(m => m.NonogramComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'First to solve wins!' },
      { id: GameMode.Steal, labelKey: 'game.same_pk_steal_score', descKey: 'game.same_pk_steal_desc', icon: '⚡', desc: 'Shared board. Correct=Score, Wrong=Freeze!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_nonogram_5x5', desc: '5x5' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_nonogram_10x10', desc: '10x10' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_nonogram_15x15', desc: '15x15' }
    ],
    recommendations: ['minesweeper', 'sudoku'],
    multiRound: true,
    tutorial: [
      { icon: '🎨', title: 'tutorial.nonogram.goal',     description: 'tutorial.nonogram.goal_desc' },
      { icon: '🔢', title: 'tutorial.nonogram.hints',    description: 'tutorial.nonogram.hints_desc' },
      { icon: '👆', title: 'tutorial.nonogram.fill',     description: 'tutorial.nonogram.fill_desc' },
      { icon: '❌', title: 'tutorial.nonogram.cross',    description: 'tutorial.nonogram.cross_desc' },
    ]
  },
  {
    id: GameId.Classic2048,
    route: '/games/classic2048',
    titleKey: 'lobby.classic2048',
    iconEmoji: '🔢',
    loadComponent: () => import('../../features/games/classic2048/classic2048.component').then(m => m.Classic2048Component),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'First to reach 2048 wins!' }
    ],
    difficulties: [
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_classic2048_4x4', desc: '4x4 Grid' }
    ],
    recommendations: ['drop2048', 'hexa'],
    tutorial: [
      { icon: '🔢', title: 'tutorial.classic2048.goal',     description: 'tutorial.classic2048.goal_desc' },
      { icon: '👆', title: 'tutorial.classic2048.slide',    description: 'tutorial.classic2048.slide_desc' },
      { icon: '🔀', title: 'tutorial.classic2048.merge',    description: 'tutorial.classic2048.merge_desc' },
      { icon: '🚫', title: 'tutorial.classic2048.end',      description: 'tutorial.classic2048.end_desc' }
    ]
  },
  {
    id: GameId.Connect,
    route: '/games/connect',
    titleKey: 'lobby.connect',
    iconEmoji: '🔗',
    loadComponent: () => import('../../features/games/connect/connect.component').then(m => m.ConnectComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' },
      { id: GameMode.Speed, labelKey: 'game.same_pk_speed_label', descKey: 'game.same_pk_speed_desc', icon: '🏎️', desc: 'First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_connect_easy', desc: '5x5 to 6x6' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_connect_medium', desc: '7x7 to 8x8' },
      { id: GameDifficulty.Hard, labelKey: 'game.diff_hard', descKey: 'game.diff_connect_hard', desc: '9x9 to 10x10' },
      { id: GameDifficulty.Expert, labelKey: 'game.diff_expert', descKey: 'game.diff_connect_expert', desc: '11x11 to 12x12' }
    ],
    recommendations: ['sliding', 'sokoban'],
    multiRound: true,
    tutorial: [
      { icon: '🔗', title: 'tutorial.connect.goal',     description: 'tutorial.connect.goal_desc' },
      { icon: '👆', title: 'tutorial.connect.draw',     description: 'tutorial.connect.draw_desc' },
      { icon: '🚫', title: 'tutorial.connect.cross',    description: 'tutorial.connect.cross_desc' },
      { icon: '🌟', title: 'tutorial.connect.fill',     description: 'tutorial.connect.fill_desc' },
    ]
  },
  {
    id: GameId.Hashi,
    route: '/games/hashi',
    titleKey: 'lobby.hashi',
    iconEmoji: '🌉',
    loadComponent: () => import('../../features/games/hashi/hashi.component').then(m => m.HashiComponent),
    modes: [
      { id: GameMode.Single, labelKey: 'game.single_label', descKey: 'game.single_desc', icon: '👤', desc: 'Single Player' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_hashi_easy', desc: '7x7' },
      { id: GameDifficulty.Medium, labelKey: 'game.diff_medium', descKey: 'game.diff_hashi_medium', desc: '10x10' }
    ],
    recommendations: ['sudoku', 'nonogram'],
    tutorial: [
      { icon: '🌉', title: 'tutorial.hashi.goal',     description: 'tutorial.hashi.goal_desc' },
      { icon: '👆', title: 'tutorial.hashi.bridge',   description: 'tutorial.hashi.bridge_desc' },
      { icon: '🚫', title: 'tutorial.hashi.cross',    description: 'tutorial.hashi.cross_desc' }
    ]
  }
];
