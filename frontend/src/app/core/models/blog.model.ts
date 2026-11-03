import { BlogPostMeta } from '../services/blog.service';

export interface BlogGameDef {
  id: string;
  nameKey: string;
  icon: string;
}

export interface BlogCategoryDef {
  id: string;
  icon: string;
  titleKey: string;
  defaultTitle: string;
  postIds: string[];
}

export interface BlogCategoryWithPosts extends BlogCategoryDef {
  posts: BlogPostMeta[];
}

export const BLOG_TO_GAME_MAP: Record<string, BlogGameDef> = {
  'tilematch-strategy': { id: 'tilematch', nameKey: 'lobby.tilematch', icon: '🐑' },
  'tents-puzzle-guide': { id: 'tents', nameKey: 'lobby.tents', icon: '⛺' },
  'connect-colors-strategy': { id: 'connect', nameKey: 'lobby.connect', icon: '🟢' },
  'idiom-battle-strategy': { id: 'idiom', nameKey: 'lobby.idiom', icon: '📜' },
  'gomoku-strategy-guide': { id: 'gomoku', nameKey: 'lobby.gomoku', icon: '⚪' },
  'nonogram-strategy': { id: 'nonogram', nameKey: 'lobby.nonogram', icon: '🎨' },
  'water-sort-puzzle-guide': { id: 'watersort', nameKey: 'lobby.watersort', icon: '🧪' },
  'tetris-battle-strategy': { id: 'tetris', nameKey: 'lobby.tetris', icon: '🧱' },
  'sokoban-strategy': { id: 'sokoban', nameKey: 'lobby.sokoban', icon: '📦' },
  'minesweeper-logic': { id: 'minesweeper', nameKey: 'lobby.minesweeper', icon: '💣' },
  '1a2b-bulls-cows': { id: 'codebreaker', nameKey: 'lobby.codebreaker', icon: '🐮' },
  'sudoku-benefits': { id: 'sudoku', nameKey: 'lobby.sudoku', icon: '🔢' },
  'why-math24-is-the-best-brain-training-game-for-kids': { id: 'math24', nameKey: 'lobby.math24', icon: '➗' },
  'sudoku-for-kids-a-beginners-guide': { id: 'sudoku', nameKey: 'lobby.sudoku', icon: '✏️' },
  'benefits-of-multiplayer-educational-games': { id: 'lobby', nameKey: 'nav.lobby', icon: '🏆' },
  'block-puzzle-strategy': { id: 'block', nameKey: 'lobby.block', icon: '🧩' },
  'classic2048-strategy': { id: 'classic2048', nameKey: 'lobby.classic2048', icon: '🔢' },
  'hashi-bridges-strategy': { id: 'hashi', nameKey: 'lobby.hashi', icon: '🌉' },
  'hexa-puzzle-strategy': { id: 'hexa', nameKey: 'lobby.hexa', icon: '⬡' },
  'lights-out-puzzle-guide': { id: 'lightsout', nameKey: 'lobby.lightsout', icon: '💡' },
  'sliding-puzzle-strategy': { id: 'sliding', nameKey: 'lobby.sliding', icon: '🔲' },
};

export const BLOG_ICON_MAP: Record<string, string> = {
  'tilematch-strategy': '🐑',
  'tents-puzzle-guide': '⛺',
  'connect-colors-strategy': '🟢',
  'idiom-battle-strategy': '📜',
  'gomoku-strategy-guide': '⚪',
  'nonogram-strategy': '🎨',
  'water-sort-puzzle-guide': '🧪',
  'tetris-battle-strategy': '🧱',
  'sokoban-strategy': '📦',
  'minesweeper-logic': '💣',
  '1a2b-bulls-cows': '🐮',
  'sudoku-benefits': '🔢',
  'why-math24-is-the-best-brain-training-game-for-kids': '➗',
  'sudoku-for-kids-a-beginners-guide': '✏️',
  'benefits-of-multiplayer-educational-games': '🏆',
  'block-puzzle-strategy': '🧩',
  'classic2048-strategy': '🔢',
  'hashi-bridges-strategy': '🌉',
  'hexa-puzzle-strategy': '⬡',
  'lights-out-puzzle-guide': '💡',
  'sliding-puzzle-strategy': '🔲',
};

export const BLOG_CATEGORIES: BlogCategoryDef[] = [
  {
    id: 'featured',
    icon: '🔥',
    titleKey: 'blog.cat.featured',
    defaultTitle: '热门通关秘籍',
    postIds: [
      'tilematch-strategy',
      'minesweeper-logic',
      'sliding-puzzle-strategy',
      'idiom-battle-strategy',
      'water-sort-puzzle-guide'
    ]
  },
  {
    id: 'logic',
    icon: '🧩',
    titleKey: 'blog.cat.logic',
    defaultTitle: '空间拓扑与连线',
    postIds: [
      'tents-puzzle-guide',
      'connect-colors-strategy',
      'hashi-bridges-strategy',
      'nonogram-strategy',
      'sokoban-strategy',
      'lights-out-puzzle-guide'
    ]
  },
  {
    id: 'math',
    icon: '🔢',
    titleKey: 'blog.cat.math',
    defaultTitle: '数字与逻辑计算',
    postIds: [
      'sudoku-benefits',
      'sudoku-for-kids-a-beginners-guide',
      'why-math24-is-the-best-brain-training-game-for-kids',
      'classic2048-strategy'
    ]
  },
  {
    id: 'board',
    icon: '⚔️',
    titleKey: 'blog.cat.board',
    defaultTitle: '棋盘与消除对战',
    postIds: [
      'gomoku-strategy-guide',
      'tetris-battle-strategy',
      'block-puzzle-strategy',
      'hexa-puzzle-strategy',
      '1a2b-bulls-cows',
      'benefits-of-multiplayer-educational-games'
    ]
  }
];
