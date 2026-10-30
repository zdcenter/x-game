import { GameStatusType } from '../models/game.model';
import { C2SAction } from '../models/websocket.model';

/**
 * 标准本地单机动作模型契约
 * 与联机 WebSocket C2SAction 保持动作语义对称统一，杜绝单机用 type、联机用 action 的心智分裂。
 */
export interface ILocalAction {
  action?: C2SAction | string;
  type?: string;
  [key: string]: any;
}

export interface ILocalEngine<TState = any, TAction = ILocalAction> {
  initGame(config: any): void;
  handleAction(action: TAction): void;
  getState(): TState;
  readonly status: GameStatusType;

  /**
   * Optional standard export of current board/move/pieces state for real-time spectator broadcast.
   */
  exportBoardState?(): any;

  /**
   * Optional standard load of board state to mirror a contestant's board in real time.
   */
  loadBoardState?(data: any): void;
}

