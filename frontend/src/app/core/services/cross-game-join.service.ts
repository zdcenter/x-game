import { Injectable, signal } from '@angular/core';

/**
 * Pending room join info for cross-game navigation.
 * Set by GameLobbyPanel before navigating to another game's route,
 * consumed by the target game component in its ngOnInit.
 */
export interface PendingJoin {
  game: string;       // Target game ID, e.g. 'minesweeper', 'sudoku'
  roomId: string;
  mode: string;
  difficulty: string;
  host: string;
}

/**
 * CrossGameJoinService — centralized mechanism for cross-game room joining.
 *
 * Instead of passing room info via queryParams (which causes timing issues,
 * double-trigger bugs, and Angular Router conflicts), this service stores
 * pending join info in a synchronous signal that the target game component
 * can consume immediately in ngOnInit.
 *
 * Usage:
 *   // In GameLobbyPanel (before navigation):
 *   this.crossGameJoin.setPendingJoin({ game: 'sudoku', roomId, mode, difficulty, host });
 *   this.router.navigate(['/games/sudoku']);
 *
 *   // In target game component ngOnInit:
 *   const pending = this.crossGameJoin.consumePendingJoin('sudoku');
 *   if (pending) { this.joinRoom(pending.roomId, ...); }
 */
@Injectable({
  providedIn: 'root'
})
export class CrossGameJoinService {
  private pendingJoin = signal<PendingJoin | null>(null);

  /**
   * Set pending join info before navigating to a different game route.
   * Called by GameLobbyPanel when the target room belongs to a different game.
   */
  setPendingJoin(join: PendingJoin): void {
    this.pendingJoin.set(join);
  }

  /**
   * Consume pending join info if it matches the given gameId.
   * Returns the pending join info and clears it, or returns null if
   * there's no pending join or it's for a different game.
   *
   * This is synchronous — call it in ngOnInit for reliable, race-free consumption.
   */
  consumePendingJoin(gameId: string): PendingJoin | null {
    const pending = this.pendingJoin();
    if (pending && pending.game === gameId) {
      this.pendingJoin.set(null);
      return pending;
    }
    return null;
  }
}
