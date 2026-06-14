import { GameStatusType } from '../models/game.model';

export interface ILocalEngine<TState, TAction> {
  initGame(config: any): void;
  handleAction(action: TAction): void;
  getState(): TState;
  readonly status: GameStatusType;
}
