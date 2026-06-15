import { GameStatus, GameStatusType } from '../../../../core/models/game.model';
import { ILocalEngine } from '../../../../core/interfaces/local-engine.interface';
import { Math24Card, Operator } from './math24.store';

export enum Math24ActionType {
  Combine = 'combine',
  Undo = 'undo',
  Load = 'load'
}

export type Math24Action =
  | { type: Math24ActionType.Combine, c1: Math24Card, c2: Math24Card, op: Operator }
  | { type: Math24ActionType.Undo }
  | { type: Math24ActionType.Load, puzzle: string };

export class LocalMath24Engine implements ILocalEngine<any, Math24Action> {
  status: GameStatusType = GameStatus.Waiting;
  boardCards: Math24Card[] = [];
  boardHistory: Math24Card[][] = [];
  timeSpent: number = 0;
  finished: boolean = false;
  playerId: string = '';
  puzzleId: string = '';

  private onWin?: () => void;
  private onWrong?: () => void;
  private onFlip?: () => void;

  initGame(config: { playerId: string, puzzleId: string, puzzle: string, onWin?: () => void, onWrong?: () => void, onFlip?: () => void }) {
    this.playerId = config.playerId;
    this.puzzleId = config.puzzleId;
    this.onWin = config.onWin;
    this.onWrong = config.onWrong;
    this.onFlip = config.onFlip;

    this.timeSpent = 0;
    this.loadPuzzle(config.puzzle);
    this.status = GameStatus.Playing;
    this.finished = false;
  }

  getState() {
    return this;
  }

  handleAction(action: Math24Action) {
    if (this.status !== GameStatus.Playing || this.finished) return;

    if (action.type === Math24ActionType.Load) {
      this.loadPuzzle(action.puzzle);
      this.timeSpent = 0;
      this.finished = false;
    } else if (action.type === Math24ActionType.Undo) {
      this.undo();
    } else if (action.type === Math24ActionType.Combine) {
      this.combineCards(action.c1, action.c2, action.op);
    }
  }

  private loadPuzzle(cardsStr: string) {
    if (!cardsStr) return;
    const vals = cardsStr.split(',').map(Number);
    const initial = vals.map((v, i) => ({
      id: `c_${i}`,
      value: v,
      expression: v.toString(),
      used: false
    }));
    this.boardCards = initial;
    this.boardHistory = [initial];
  }

  private combineCards(c1: Math24Card, c2: Math24Card, op: Operator) {
    let result = 0;
    let exp = '';
    
    if (op === '+') {
      result = c1.value + c2.value;
      exp = `(${c1.expression}+${c2.expression})`;
    } else if (op === '-') {
      result = c1.value - c2.value;
      exp = `(${c1.expression}-${c2.expression})`;
    } else if (op === '*') {
      result = c1.value * c2.value;
      exp = `(${c1.expression}*${c2.expression})`;
    } else if (op === '/') {
      if (c2.value === 0) return; // invalid
      result = c1.value / c2.value;
      exp = `(${c1.expression}/${c2.expression})`;
    }

    const newCard: Math24Card = {
      id: `c_${Date.now()}`,
      value: result,
      expression: exp,
      used: false
    };

    const next = this.boardCards.filter(c => c.id !== c1.id && c.id !== c2.id);
    next.push(newCard);

    this.boardHistory = [...this.boardHistory, next];
    this.boardCards = next;

    if (this.onFlip) this.onFlip();

    if (next.length === 1) {
      this.checkWin(next[0]);
    }
  }

  private undo() {
    if (this.boardHistory.length > 1) {
      this.boardHistory.pop();
      this.boardCards = this.boardHistory[this.boardHistory.length - 1];
      if (this.onFlip) this.onFlip();
    }
  }

  private checkWin(finalCard: Math24Card) {
    if (Math.abs(finalCard.value - 24) < 0.0001) {
      this.status = GameStatus.Finished;
      this.finished = true;
      if (this.onWin) this.onWin();
    } else {
      if (this.onWrong) this.onWrong();
      
      // Auto-reset board on fail
      setTimeout(() => {
        if (this.boardHistory.length > 0) {
          const initial = this.boardHistory[0];
          this.boardHistory = [initial];
          this.boardCards = initial;
        }
      }, 500);
    }
  }
}
