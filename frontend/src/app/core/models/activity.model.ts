export interface LobbyActivity {
  id: string;
  type: 'playing' | 'record' | 'room_created' | 'milestone' | 'game_win' | 'game_lose';
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
