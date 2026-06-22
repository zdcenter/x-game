export interface PromptSource {
  titleEN: string;
  titleZH?: string;
  descEN?: string;
  slug?: string;
  tags?: string | string[];
}

interface GameStyle {
  type: string;
  label: string;
  visual: string;
  colors: string;
  mood: string;
}

const GAME_STYLES: GameStyle[] = [
  {
    type: 'sudoku',
    label: 'SUDOKU',
    visual: 'a large glowing Sudoku grid with neon blue illuminated numbers and cells, mathematical elegance, floating in dark space with soft electric glow emanating from each filled cell',
    colors: 'deep navy #0f172a to #1e3a8a, electric blue #3b82f6 neon accents, subtle grid lines in cobalt',
    mood: 'precise, intellectual, calm intensity',
  },
  {
    type: 'minesweeper',
    label: 'MINESWEEPER',
    visual: 'a dramatic Minesweeper grid with revealed cells showing glowing green numbers, red danger flags planted on mines, partially uncovered tiles casting dramatic shadows, tension and strategy',
    colors: 'dark forest green #14532d to #052e16, neon green #22c55e accents, danger red highlights',
    mood: 'suspenseful, strategic, danger lurking',
  },
  {
    type: 'tetris',
    label: 'TETRIS',
    visual: 'cascading colorful Tetris blocks falling in beautiful formation — vibrant purples, blues, reds and yellows — geometric shapes interlocking perfectly against a dark background with neon glow trails',
    colors: 'deep purple #3b0764, vibrant multicolor blocks glowing purple #a855f7, blue #3b82f6, red #ef4444, yellow #eab308',
    mood: 'energetic, playful yet elegant, retro-futuristic',
  },
  {
    type: 'chess',
    label: 'CHESS',
    visual: 'a dramatic chess board viewed at a cinematic low angle, golden and amber pieces casting long dramatic shadows, the board extending into infinity, a lone king piece dramatically lit by a single spotlight',
    colors: 'rich amber gold #f59e0b, deep mahogany #451a03, warm cream and espresso board squares',
    mood: 'regal, strategic, timeless, dramatic',
  },
  {
    type: 'sokoban',
    label: 'SOKOBAN',
    visual: 'an isometric puzzle warehouse room with glowing orange crates being pushed into golden target positions, dramatic perspective, the solved puzzle emitting a satisfying warm glow',
    colors: 'warm orange #f97316 on dark slate, golden target glow #fbbf24, deep charcoal #1c1917 background',
    mood: 'satisfying, clever, warm victory feeling',
  },
  {
    type: 'math24',
    label: 'MATH24',
    visual: 'four large glowing playing-card-style number tiles floating in space, mathematical symbols sparkling between them, the equation coming together in a burst of red light, numbers 3, 8, 6, 4 dramatically lit',
    colors: 'deep crimson #450a0a to #7f1d1d, bright red #ef4444 neon, golden equation sparks',
    mood: 'eureka moment, clever, mathematical beauty',
  },
  {
    type: 'wordle',
    label: 'WORDLE',
    visual: 'a grid of letter tiles — green correct tiles glowing triumphantly, yellow tiles flickering with near-misses, the winning word revealed in a burst of emerald light, minimalist and satisfying',
    colors: 'dark slate #042f2e to #134e4a, emerald green #22c55e, gold #eab308 accent tiles',
    mood: 'satisfying, clever, daily ritual, language joy',
  },
  {
    type: '2048',
    label: '2048',
    visual: 'a glowing 2048 game board with the legendary 2048 tile blazing with golden light at center, surrounding tiles in warm amber gradient, the merge animation frozen in a spectacular light burst',
    colors: 'warm golden #edc22e center tile, amber gradient #f2b179 to #edc22e, dark background #1a1407',
    mood: 'achievement, exponential growth, golden triumph',
  },
];

function detectGame(src: PromptSource): GameStyle | null {
  const hay = [src.titleEN, src.titleZH, src.slug, ...(Array.isArray(src.tags) ? src.tags : [src.tags ?? ''])]
    .join(' ').toLowerCase();
  const map: Record<string, string> = {
    sudoku: 'sudoku', '数独': 'sudoku',
    minesweeper: 'minesweeper', '扫雷': 'minesweeper',
    tetris: 'tetris', '俄罗斯方块': 'tetris',
    chess: 'chess', '象棋': 'chess', '国际象棋': 'chess',
    sokoban: 'sokoban', '推箱子': 'sokoban',
    math24: 'math24', '24点': 'math24',
    wordle: 'wordle', '填词': 'wordle',
    '2048': '2048',
  };
  for (const [kw, type] of Object.entries(map)) {
    if (hay.includes(kw)) return GAME_STYLES.find(g => g.type === type) ?? null;
  }
  return null;
}

export function generateCoverPrompt(src: PromptSource): string {
  const game = detectGame(src);
  const title = src.titleEN || src.titleZH || 'Puzzle Strategy Guide';
  const desc  = src.descEN ? ` about "${src.descEN.slice(0, 80)}"` : '';

  const visual = game
    ? game.visual
    : 'abstract interlocking puzzle pieces glowing with soft violet light, geometric shapes fitting perfectly together in elegant formation, floating in dark space';
  const colors = game
    ? game.colors
    : 'deep indigo #1e1b4b to #0f172a, violet #6366f1 and purple #8b5cf6 neon accents';
  const mood = game
    ? game.mood
    : 'elegant, intellectual, satisfying';
  const label = game ? game.label : 'PUZZLE';

  return `A stunning professional editorial cover image for a puzzle gaming blog post titled "${title}"${desc}.

Main visual: ${visual}.

Composition: wide cinematic format (1200×630), left one-third kept darker and relatively empty for title text overlay, main visual element dramatically placed on the right side with atmospheric depth.

Color palette: ${colors}. Dark moody background with subtle vignette.

Lighting: dramatic cinematic lighting, volumetric light rays, soft bloom glow on key elements, deep shadows creating depth.

Style: ultra-detailed digital artwork, 4K resolution, professional editorial photography aesthetic, ${mood}, no text, no watermarks, no UI elements, no people.

Branding zone: Keep the bottom-right corner area (approximately 240×50px) naturally dark, uncluttered, and free of bright objects — this area will have a site logo overlay added in post-production.

--ar 19:10 --v 6.1 --style raw --q 2`;
}
