export interface LiquidColorTheme {
  primary: string;
  gradient: string;
  glow: string;
  surface: string;
}

export const LIQUID_THEMES: Record<string, LiquidColorTheme> = {
  red: {
    primary: '#ef4444',
    gradient: 'linear-gradient(180deg, #ff6b81 0%, #ee5253 45%, #c0392b 100%)',
    glow: 'rgba(238, 82, 83, 0.6)',
    surface: 'rgba(255, 185, 195, 0.85)'
  },
  blue: {
    primary: '#3b82f6',
    gradient: 'linear-gradient(180deg, #48dbfb 0%, #0abde3 45%, #0984e3 100%)',
    glow: 'rgba(10, 189, 227, 0.6)',
    surface: 'rgba(190, 240, 255, 0.85)'
  },
  green: {
    primary: '#10b981',
    gradient: 'linear-gradient(180deg, #2ecc71 0%, #10ac84 45%, #006266 100%)',
    glow: 'rgba(29, 209, 161, 0.6)',
    surface: 'rgba(180, 255, 220, 0.85)'
  },
  yellow: {
    primary: '#f59e0b',
    gradient: 'linear-gradient(180deg, #fed330 0%, #ff9f43 45%, #f39c12 100%)',
    glow: 'rgba(254, 211, 48, 0.6)',
    surface: 'rgba(255, 248, 200, 0.85)'
  },
  purple: {
    primary: '#8b5cf6',
    gradient: 'linear-gradient(180deg, #be2edd 0%, #8854d0 45%, #5758bb 100%)',
    glow: 'rgba(190, 46, 221, 0.6)',
    surface: 'rgba(240, 210, 255, 0.85)'
  },
  orange: {
    primary: '#f97316',
    gradient: 'linear-gradient(180deg, #ff9f43 0%, #fa8231 45%, #d35400 100%)',
    glow: 'rgba(250, 130, 49, 0.6)',
    surface: 'rgba(255, 225, 200, 0.85)'
  },
  cyan: {
    primary: '#06b6d4',
    gradient: 'linear-gradient(180deg, #22e2e4 0%, #00bbf9 45%, #0077b6 100%)',
    glow: 'rgba(34, 226, 228, 0.6)',
    surface: 'rgba(205, 255, 255, 0.85)'
  },
  pink: {
    primary: '#ec4899',
    gradient: 'linear-gradient(180deg, #ff9ff3 0%, #f368e0 45%, #b53471 100%)',
    glow: 'rgba(243, 104, 224, 0.6)',
    surface: 'rgba(255, 220, 250, 0.85)'
  },
  brown: {
    primary: '#92400e',
    gradient: 'linear-gradient(180deg, #b08968 0%, #8a5a36 45%, #4a2810 100%)',
    glow: 'rgba(138, 90, 54, 0.6)',
    surface: 'rgba(230, 205, 185, 0.85)'
  },
  gray: {
    primary: '#64748b',
    gradient: 'linear-gradient(180deg, #94a3b8 0%, #64748b 45%, #334155 100%)',
    glow: 'rgba(148, 163, 184, 0.6)',
    surface: 'rgba(226, 232, 240, 0.85)'
  },
  lime: {
    primary: '#84cc16',
    gradient: 'linear-gradient(180deg, #a3e635 0%, #65a30d 45%, #3f6212 100%)',
    glow: 'rgba(163, 230, 53, 0.6)',
    surface: 'rgba(235, 255, 195, 0.85)'
  },
  teal: {
    primary: '#14b8a6',
    gradient: 'linear-gradient(180deg, #2dd4bf 0%, #0d9488 45%, #115e59 100%)',
    glow: 'rgba(45, 212, 191, 0.6)',
    surface: 'rgba(204, 251, 241, 0.85)'
  },
  navy: {
    primary: '#1e3a8a',
    gradient: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 45%, #1e1b4b 100%)',
    glow: 'rgba(59, 130, 246, 0.6)',
    surface: 'rgba(191, 219, 254, 0.85)'
  },
  magenta: {
    primary: '#d946ef',
    gradient: 'linear-gradient(180deg, #f0abfc 0%, #c026d3 45%, #701a75 100%)',
    glow: 'rgba(217, 70, 239, 0.6)',
    surface: 'rgba(250, 232, 255, 0.85)'
  }
};

export function getLiquidTheme(colorName: string): LiquidColorTheme {
  const key = (colorName || '').toLowerCase().trim();
  if (LIQUID_THEMES[key]) {
    return LIQUID_THEMES[key];
  }
  return {
    primary: colorName || '#64748b',
    gradient: `linear-gradient(180deg, ${colorName} 0%, ${colorName} 100%)`,
    glow: colorName || 'rgba(100, 116, 139, 0.5)',
    surface: 'rgba(255, 255, 255, 0.8)'
  };
}
