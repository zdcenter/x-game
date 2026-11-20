export interface InteractiveTutorialStep {
  step: number;
  titleKey: string;
  defaultTitle: string;
  formula?: string;
  formulaBadge?: string;
  descKey: string;
  defaultDesc: string;
  actionKey: string;
  defaultAction: string;
  microActionKey?: string;
  defaultMicroAction?: string;
  targets: { x: number; y: number }[];
  requiredState?: any;
  highlightRows?: number[];
  highlightCols?: number[];
}

export interface InteractiveTutorialConfig {
  gameId: string;
  gameTitle: string;
  steps: InteractiveTutorialStep[];
  successTitleKey?: string;
  defaultSuccessTitle?: string;
  successDescKey?: string;
  defaultSuccessDesc?: string;
  playButtonKey?: string;
  defaultPlayButton?: string;
}
