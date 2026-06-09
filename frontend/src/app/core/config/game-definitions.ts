import { GameConfig } from '../services/game-registry.service';

export const GAME_DEFINITIONS: GameConfig[] = [
  {
    id: 'minesweeper',
    route: '/games/minesweeper',
    titleKey: 'lobby.minesweeper',
    iconEmoji: '💣',
    modes: [
      { id: 'pk_steal', labelKey: 'game.steal_mode', descKey: 'game.pk_steal_desc', icon: '⚡', desc: 'Shared board. Race to flag mines!' },
      { id: 'pk_speed', labelKey: 'game.speed_mode', descKey: 'game.pk_speed_desc', icon: '🏎️', desc: 'Separate boards. First to clear wins!' }
    ],
    difficulties: [
      { id: 'beginner', labelKey: 'game.diff_beginner', descKey: 'game.diff_mine_9x9', desc: '9x9 (10)' },
      { id: 'intermediate', labelKey: 'game.diff_intermediate', descKey: 'game.diff_mine_16x16', desc: '16x16 (40)' },
      { id: 'advanced', labelKey: 'game.diff_advanced', descKey: 'game.diff_mine_30x16', desc: '30x16 (99)' },
      { id: 'hard_mode', labelKey: 'game.diff_hard_mode', descKey: 'game.diff_mine_30x18', desc: '30x18 (130)' },
      { id: 'professional', labelKey: 'game.diff_professional', descKey: 'game.diff_mine_30x20', desc: '30x20 (160)' },
      { id: 'master', labelKey: 'game.diff_master', descKey: 'game.diff_mine_30x22', desc: '30x22 (190)' },
      { id: 'expert', labelKey: 'game.diff_expert', descKey: 'game.diff_mine_30x24', desc: '30x24 (230)' }
    ],
    recommendations: ['sudoku', 'sliding']
  },
  {
    id: 'sudoku',
    route: '/games/sudoku',
    titleKey: 'lobby.sudoku',
    iconEmoji: '🔢',
    modes: [
      { id: 'pk_speed', labelKey: 'game.speed_mode', descKey: 'game.pk_speed_desc', icon: '🏎️', desc: 'Separate boards. First to solve wins!' },
      { id: 'pk_steal', labelKey: 'game.steal_mode', descKey: 'game.pk_steal_desc', icon: '⚡', desc: 'Shared board. Correct=Score, Wrong=Freeze!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_sudoku_easy', descKey: 'game.diff_sudoku_easy', desc: 'Beginner' },
      { id: 'medium', labelKey: 'game.diff_sudoku_medium', descKey: 'game.diff_sudoku_medium', desc: 'Intermediate' },
      { id: 'hard', labelKey: 'game.diff_sudoku_hard', descKey: 'game.diff_sudoku_hard', desc: 'Advanced' },
      { id: 'expert', labelKey: 'game.diff_sudoku_expert', descKey: 'game.diff_sudoku_expert', desc: 'Professional' }
    ],
    recommendations: ['minesweeper', 'math24']
  },
  {
    id: 'sliding',
    route: '/games/sliding',
    titleKey: 'lobby.sliding',
    iconEmoji: '🔲',
    modes: [
      { id: 'pk_speed', labelKey: 'game.speed_mode', descKey: 'game.pk_speed_desc', icon: '🏎️', desc: 'Separate boards. First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_slide_4x4', desc: '4x4 Grid' },
      { id: 'medium', labelKey: 'game.diff_medium', descKey: 'game.diff_slide_5x5', desc: '5x5 Grid' },
      { id: 'hard', labelKey: 'game.diff_hard', descKey: 'game.diff_slide_6x6', desc: '6x6 Grid' }
    ],
    recommendations: ['sudoku', 'hexa']
  },
  {
    id: 'hexa',
    route: '/games/hexa',
    titleKey: 'lobby.hexa',
    iconEmoji: '🔶',
    modes: [
      { id: 'pk_steal', labelKey: 'game.score_mode', descKey: 'game.pk_steal_desc', icon: '⚡', desc: 'Shared board. Highest score wins!' }
    ],
    difficulties: [
      { id: 'standard', labelKey: 'game.standard', descKey: 'game.diff_hexa_standard', desc: 'Normal Board' }
    ],
    recommendations: ['tetris', 'drop2048']
  },
  {
    id: 'tetris',
    route: '/games/tetris',
    titleKey: 'lobby.tetris',
    iconEmoji: '🧱',
    modes: [
      { id: 'pk_attack', labelKey: 'game.battle_mode', descKey: 'game.pk_attack_desc', icon: '⚔️', desc: 'Send garbage lines to opponents!' }
    ],
    difficulties: [
      { id: 'standard', labelKey: 'game.standard', descKey: 'game.diff_tetris_standard', desc: 'Normal Drop Speed' }
    ],
    recommendations: ['drop2048', 'hexa']
  },
  {
    id: 'gomoku',
    route: '/games/gomoku',
    titleKey: 'lobby.gomoku',
    iconEmoji: '⚫⚪',
    modes: [
      { id: 'pk_classic', labelKey: 'game.pk_classic', descKey: 'game.pk_classic_desc', icon: '⚔️', desc: 'Classic 1v1 PvP' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_gomoku_easy', desc: 'Easy AI (15x15)' },
      { id: 'medium', labelKey: 'game.diff_medium', descKey: 'game.diff_gomoku_medium', desc: 'Medium AI (15x15)' },
      { id: 'hard', labelKey: 'game.diff_hard', descKey: 'game.diff_gomoku_hard', desc: 'Hard AI (15x15)' }
    ],
    recommendations: ['codebreaker', 'minesweeper']
  },
  {
    id: 'codebreaker',
    route: '/games/codebreaker',
    titleKey: 'lobby.codebreaker',
    iconEmoji: '🔐',
    modes: [
      { id: 'pk_speed', labelKey: 'game.speed_mode', descKey: 'game.pk_speed_desc', icon: '🏎️', desc: 'Separate boards. First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_codebreaker_easy', desc: '3-digit code' },
      { id: 'medium', labelKey: 'game.diff_medium', descKey: 'game.diff_codebreaker_medium', desc: '4-digit code' },
      { id: 'hard', labelKey: 'game.diff_hard', descKey: 'game.diff_codebreaker_hard', desc: '5-digit code' }
    ],
    recommendations: ['math24', 'sudoku']
  },
  {
    id: 'math24',
    route: '/games/math24',
    titleKey: 'lobby.math24',
    iconEmoji: '🃏',
    modes: [
      { id: 'pk_speed', labelKey: 'game.speed_mode', descKey: 'game.pk_speed_desc', icon: '🏎️', desc: 'Solve 5 puzzles first!' },
      { id: 'pk_steal', labelKey: 'game.steal_mode', descKey: 'game.pk_steal_desc', icon: '⚡', desc: 'First to solve gets the point!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_math24_easy', descKey: 'game.diff_math24_easy', desc: 'Beginner' },
      { id: 'medium', labelKey: 'game.diff_math24_medium', descKey: 'game.diff_math24_medium', desc: 'Intermediate' },
      { id: 'hard', labelKey: 'game.diff_math24_hard', descKey: 'game.diff_math24_hard', desc: 'Advanced' },
      { id: 'expert', labelKey: 'game.diff_math24_expert', descKey: 'game.diff_math24_expert', desc: 'Professional' }
    ],
    recommendations: ['sudoku', 'codebreaker']
  },
  {
    id: 'drop2048',
    route: '/games/drop2048',
    titleKey: 'lobby.drop2048',
    iconEmoji: '🟦',
    modes: [
      { id: 'pk_score', labelKey: 'game.score_mode', descKey: 'game.pk_score_desc', icon: '🏆', desc: 'Survive and get the highest score!' }
    ],
    difficulties: [
      { id: 'standard', labelKey: 'game.standard', descKey: 'game.diff_drop2048_standard', desc: 'Standard 5x7 Board' }
    ],
    recommendations: ['tetris', 'hexa']
  },
  {
    id: 'block',
    route: '/games/block',
    titleKey: 'app.title.block',
    iconEmoji: '🟩',
    modes: [
      { id: 'single', labelKey: 'game.single_player_endless', descKey: 'game.single_player_endless', desc: 'Survival', icon: '👤' },
      { id: 'pk_score', labelKey: 'game.pk_score_label', descKey: 'game.pk_score_desc', desc: 'Survival & Score', icon: '⚔️' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_easy', desc: '8x8 Board' },
      { id: 'medium', labelKey: 'game.diff_medium', descKey: 'game.diff_medium', desc: '10x10 Board' },
      { id: 'hard', labelKey: 'game.diff_hard', descKey: 'game.diff_hard', desc: '12x12 Board' }
    ],
    recommendations: ['tetris', 'hexa']
  },
  {
    id: 'lightsout',
    route: '/games/lightsout',
    titleKey: 'app.title.lightsout',
    iconEmoji: '💡',
    modes: [
      { id: 'single', labelKey: 'game.single_player_endless', descKey: 'game.single_player_endless', desc: 'Survival', icon: '👤' },
      { id: 'pk_speed', labelKey: 'game.speed_mode', descKey: 'game.pk_speed_desc', icon: '🏎️', desc: 'First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_easy', desc: '4x4 Board' },
      { id: 'medium', labelKey: 'game.diff_medium', descKey: 'game.diff_medium', desc: '5x5 Board' },
      { id: 'hard', labelKey: 'game.diff_hard', descKey: 'game.diff_hard', desc: '6x6 Board' }
    ],
    recommendations: ['minesweeper', 'sudoku']
  },
  {
    id: 'watersort',
    route: '/games/watersort',
    titleKey: 'app.title.watersort',
    iconEmoji: '🧪',
    modes: [
      { id: 'single', labelKey: 'game.single_player_endless', descKey: 'game.single_player_endless', desc: 'Survival', icon: '👤' },
      { id: 'pk_speed', labelKey: 'game.speed_mode', descKey: 'game.pk_speed_desc', icon: '🏎️', desc: 'First to solve wins!' }
    ],
    difficulties: [
      { id: 'easy', labelKey: 'game.diff_easy', descKey: 'game.diff_easy', desc: '5 Tubes (3 Colors)' },
      { id: 'medium', labelKey: 'game.diff_medium', descKey: 'game.diff_medium', desc: '9 Tubes (7 Colors)' },
      { id: 'hard', labelKey: 'game.diff_hard', descKey: 'game.diff_hard', desc: '14 Tubes (12 Colors)' }
    ],
    recommendations: ['lightsout', 'sliding']
  }
];

