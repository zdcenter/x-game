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
    multiRound: true
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
    recommendations: ['tetris', 'drop2048']
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
    recommendations: ['drop2048', 'hexa']
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
    recommendations: ['codebreaker', 'minesweeper']
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
    recommendations: ['tetris', 'hexa']
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
    recommendations: ['tetris', 'hexa']
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
    multiRound: true
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
  }
];
