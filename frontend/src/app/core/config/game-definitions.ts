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
      { id: 'beginner', labelKey: 'game.diff_beginner', desc: '9x9 (10)' },
      { id: 'intermediate', labelKey: 'game.diff_intermediate', desc: '16x16 (40)' },
      { id: 'advanced', labelKey: 'game.diff_advanced', desc: '30x16 (99)' },
      { id: 'hard_mode', labelKey: 'game.diff_hard_mode', desc: '30x18 (130)' },
      { id: 'professional', labelKey: 'game.diff_professional', desc: '30x20 (160)' },
      { id: 'master', labelKey: 'game.diff_master', desc: '30x22 (190)' },
      { id: 'expert', labelKey: 'game.diff_expert', desc: '30x24 (230)' }
    ]
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
      { id: 'easy', labelKey: 'game.diff_easy', desc: 'Beginner friendly' },
      { id: 'medium', labelKey: 'game.diff_medium', desc: 'Standard challenge' },
      { id: 'hard', labelKey: 'game.diff_hard', desc: 'For experts' }
    ]
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
      { id: 'easy', labelKey: 'game.diff_easy', desc: '4x4 Grid' },
      { id: 'medium', labelKey: 'game.diff_medium', desc: '5x5 Grid' },
      { id: 'hard', labelKey: 'game.diff_hard', desc: '6x6 Grid' }
    ]
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
      { id: 'standard', labelKey: 'game.standard', desc: 'Normal Board' }
    ]
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
      { id: 'standard', labelKey: 'game.standard', desc: 'Normal Drop Speed' }
    ]
  }
];
