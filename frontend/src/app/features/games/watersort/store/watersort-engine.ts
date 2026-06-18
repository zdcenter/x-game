import { GameDifficulty, GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { Tube } from './watersort.store';

export enum WatersortActionType {
  Pour = 'pour',
  Restart = 'restart'
}

export type WatersortAction =
  | { type: WatersortActionType.Pour, from: number, to: number }
  | { type: WatersortActionType.Restart };

export class LocalWatersortEngine implements ILocalEngine<any, WatersortAction> {
  status: GameStatusType = GameStatus.Waiting;
  tubes: Tube[] = [];
  moves: number = 0;
  finished: boolean = false;
  playerId: string = '';
  difficulty: string = GameDifficulty.Easy;

  private initialTubes: Tube[] = [];
  private onWin?: () => void;
  private onPour?: () => void;
  private onInvalid?: () => void;

  initGame(config: { playerId: string, difficulty: string, onWin?: () => void, onPour?: () => void, onInvalid?: () => void }) {
    this.playerId = config.playerId;
    this.difficulty = config.difficulty;
    this.onWin = config.onWin;
    this.onPour = config.onPour;
    this.onInvalid = config.onInvalid;

    this.moves = 0;
    this.finished = false;
    this.status = GameStatus.Playing;
    this.generateBoard();
  }

  getState() {
    return this;
  }

  handleAction(action: WatersortAction) {
    if (this.status !== GameStatus.Playing || this.finished) return;

    if (action.type === WatersortActionType.Restart) {
      this.restart();
    } else if (action.type === WatersortActionType.Pour) {
      this.pour(action.from, action.to);
    }
  }

  private pour(from: number, to: number) {
    if (from === to) {
      if (this.onInvalid) this.onInvalid();
      return;
    }
    const tFrom = this.tubes[from];
    const tTo = this.tubes[to];

    if (!tFrom || !tTo || tFrom.colors.length === 0 || tTo.colors.length >= 4) {
      if (this.onInvalid) this.onInvalid();
      return;
    }

    const colorToPour = tFrom.colors[tFrom.colors.length - 1];
    if (tTo.colors.length > 0 && tTo.colors[tTo.colors.length - 1] !== colorToPour) {
      if (this.onInvalid) this.onInvalid();
      return;
    }

    // Determine how many blocks of the same color can be poured
    let count = 0;
    for (let i = tFrom.colors.length - 1; i >= 0; i--) {
      if (tFrom.colors[i] === colorToPour) count++;
      else break;
    }
    const space = 4 - tTo.colors.length;
    const toPour = Math.min(count, space);

    // Create new array references so Angular's ngOnChanges detects the change
    this.tubes[from] = { colors: tFrom.colors.slice(0, tFrom.colors.length - toPour) };
    this.tubes[to] = { colors: [...tTo.colors, ...Array(toPour).fill(colorToPour)] };
    this.tubes = [...this.tubes];

    this.moves++;
    if (this.onPour) this.onPour();

    if (this.checkWin()) {
      this.status = GameStatus.Finished;
      this.finished = true;
      if (this.onWin) this.onWin();
    }
  }

  private restart() {
    this.tubes = this.initialTubes.map(t => ({ colors: [...t.colors] }));
    this.moves = 0;
    this.status = GameStatus.Playing;
    this.finished = false;
  }

  private checkWin(): boolean {
    for (const tube of this.tubes) {
      if (tube.colors.length > 0 && tube.colors.length < 4) return false;
      if (tube.colors.length === 4) {
        const c = tube.colors[0];
        for (let i = 1; i < 4; i++) {
          if (tube.colors[i] !== c) return false;
        }
      }
    }
    return true;
  }

  private generateBoard() {
    let numTubes = 7;
    let numColors = 5;
    if (this.difficulty === GameDifficulty.Medium) { numTubes = 11; numColors = 9; }
    else if (this.difficulty === GameDifficulty.Hard) { numTubes = 16; numColors = 14; }

    const colors = [
      'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink',
      'brown', 'gray', 'lime', 'teal', 'navy', 'magenta'
    ].slice(0, numColors);

    // Initialize filled tubes
    const board: string[][] = Array(numTubes).fill(null).map(() => []);
    for (let i = 0; i < numColors; i++) {
      board[i] = [colors[i], colors[i], colors[i], colors[i]];
    }

    // Reverse pouring to shuffle
    const shuffles = numColors * 30;
    for (let i = 0; i < shuffles; i++) {
      const nonEmpty = [];
      const notFull = [];
      for (let j = 0; j < numTubes; j++) {
        if (board[j].length > 0) nonEmpty.push(j);
        if (board[j].length < 4) notFull.push(j);
      }
      
      if (nonEmpty.length === 0 || notFull.length === 0) continue;

      const from = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
      const to = notFull[Math.floor(Math.random() * notFull.length)];

      if (from !== to) {
        const color = board[from].pop();
        if (color) board[to].push(color);
      }
    }

    this.tubes = board.map(c => ({ colors: c }));
    this.initialTubes = board.map(c => ({ colors: [...c] }));
  }
}
