import { Lang } from '../../../../core/i18n/translations';

export const slidingTranslations: Record<Lang, Record<string, string>> = {
  en: {
    'sliding.title': 'Sliding Puzzle',
    'sliding.desc': 'Classic 15-Puzzle. Slide the tiles to order them sequentially.',
    
    'sliding.mode.single': 'Single Player',
    'sliding.mode.pk_speed': 'PK Speed Mode',
    
    'sliding.difficulty.easy': 'Beginner (4x4)',
    'sliding.difficulty.medium': 'Intermediate (5x5)',
    'sliding.difficulty.hard': 'Advanced (6x6)',
    'sliding.moves': 'Moves',
    
    'sliding.rules.title': 'How to Play Sliding Puzzle',
    'sliding.rules.1': 'The board consists of numbered tiles and one empty space.',
    'sliding.rules.2': 'Click a tile adjacent to the empty space to slide it into the space.',
    'sliding.rules.3': 'Arrange all numbers in sequential order (1, 2, 3...) from top-left to bottom-right.',
    'sliding.rules.4': 'The bottom-right corner must be the empty space at the end.',
    'sliding.rules.5': 'In PK mode, everyone gets the exact same shuffled board. The first to solve it wins!',
  },
  zh: {
    'sliding.title': '数字华容道',
    'sliding.desc': '经典的数字滑块拼图游戏。滑动方块将其按顺序排列。',
    
    'sliding.mode.single': '单机模式',
    'sliding.mode.pk_speed': 'PK 竞速',
    
    'sliding.difficulty.easy': '初级 (4x4)',
    'sliding.difficulty.medium': '中级 (5x5)',
    'sliding.difficulty.hard': '高级 (6x6)',
    'sliding.moves': '移动步数',
    
    'sliding.rules.title': '数字华容道玩法规则',
    'sliding.rules.1': '棋盘上会有打乱的数字滑块和一个空格。',
    'sliding.rules.2': '点击与空格相邻的数字，可以将其移动到空格处。',
    'sliding.rules.3': '将所有数字按照从小到大（1, 2, 3...）的顺序，从左上角到右下角依次排列。',
    'sliding.rules.4': '完成时，最后一个位置（右下角）必须是空格。',
    'sliding.rules.5': '在异盘竞速模式下，所有人的初始打乱状态完全一致，最先还原的人获胜！',
  }
};
