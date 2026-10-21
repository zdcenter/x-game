export interface LobbyActivity {
  id: string;
  type: 'playing' | 'record' | 'room_created' | 'milestone';
  playerId: string;
  username: string;
  avatar?: string;
  gameId: string;
  mode?: string;
  diff?: string;
  score?: number;
  timeTaken?: number;
  text?: string;
  timestamp: number;
}
