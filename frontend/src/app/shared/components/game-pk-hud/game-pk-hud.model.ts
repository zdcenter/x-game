import { GameModeType, GameStatusType } from '../../../core/models/game.model';

export interface PkMetric {
  icon?: string;
  label?: string;
  value: string | number;
  highlight?: boolean;
  colorClass?: string;
}

export interface PkPlayerStats {
  id?: string;
  playerId?: string;
  nickname?: string;
  avatar?: string;
  isMe?: boolean;
  isHost?: boolean;
  isReady?: boolean;
  isFinished?: boolean;
  isGiveUp?: boolean;
  isFrozen?: boolean;
  freezeCountdown?: number;
  rank?: number;
  progress?: number; // 0 - 100 percentage
  score?: number; // Integer score (e.g. in Steal mode)
  wins?: number; // Series round wins
  metrics?: PkMetric[]; // Additional metric pills: e.g. [{ icon: '⏱️', value: '00:45' }, { icon: '💣', value: 10 }]
  status?: 'playing' | 'frozen' | 'finished' | 'waiting' | 'spectating' | GameStatusType | string;
}
