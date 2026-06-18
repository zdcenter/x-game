import { Signal } from '@angular/core';
import { GameModeType, GameDifficultyType, GameStatusType } from '../models/game.model';

/**
 * 统一的游戏 Store 接口。
 * 所有游戏的 Store 必须 implements 此接口。
 * BaseGameComponent 通过此接口与 Store 交互，确保编译时类型安全。
 *
 * 🚨 绝对红线：此接口的方法名和签名不可随意修改！
 * 所有 BaseGameComponent 的子类都依赖这些方法名。
 */
export interface GameStoreInterface {
  // ===== 必须提供的 Signal 状态 =====

  /** 游戏唯一 ID，与后端引擎注册 key 一致 */
  readonly gameId: string;

  /** 当前房间 ID（空字符串表示未加入房间） */
  readonly roomId: Signal<string>;

  /** 当前房间模式 */
  readonly currentRoomMode: Signal<GameModeType | string>;

  /** 多轮目标局数 */
  readonly currentRoomTarget: Signal<number>;

  /** 各玩家已赢局数 */
  readonly pkWins: Signal<Record<string, number>>;

  /** 当前系列是否已决出胜负 */
  readonly isSeriesOver: Signal<boolean>;

  /** PK 多局比分标签，如 "1 : 0"；系列结束或单机时为空字符串 */
  readonly pkScoreLabel: Signal<string>;

  /** 当前房主 ID（单机模式下返回当前玩家 ID） */
  readonly hostId: Signal<string>;

  /** 游戏状态 */
  readonly status: Signal<GameStatusType | string>;

  // ===== 大厅/等待房间需要的数据 =====

  /**
   * 当前房间内所有玩家列表。
   * 🚨 必须是数组 (any[])！
   * 后端下发的 players 是以 playerId 为 Key 的对象，
   * Store 中必须使用 Object.values() 转换为数组。
   */
  readonly playersList: Signal<any[]>;

  /**
   * 准备状态映射。
   * 🚨 必须是对象 Record<string, boolean>！
   * 后端字段名是 readyPlayers（小驼峰），不是 ready_players！
   * 兜底值必须是 {}，不是 []！
   */
  readonly readyPlayers: Signal<Record<string, boolean>>;

  // ===== 统一的房间生命周期方法 =====

  /**
   * 加入或创建房间。
   * 🚨 签名必须完全匹配此定义！参数顺序不可变！
   * 不要传 playerId！Store 内部自己从 AuthStore 获取。
   *
   * @param roomId 房间 ID
   * @param mode 模式
   * @param difficulty 难度
   * @param hostId 房主 ID（可选，创建房间时传当前玩家 ID）
   */
  joinRoom(roomId: string, mode: GameModeType | string, difficulty: GameDifficultyType | string, hostId?: string, target?: number): void;

  /**
   * 离开房间。
   * 清理 WebSocket 连接和本地状态。
   */
  leaveRoom(): void;

  // ===== 对战操作方法 =====

  /** 开始游戏（仅房主可调用）。发送 { action: 'start' } */
  startGame(): void;

  /** 再来一局。发送 { type: 'restart_game' } */
  restartGame(): void;

  /** 解散房间（仅房主可调用）。发送 { type: 'dismiss_room' } */
  dismissRoom(): void;

  /** 标记准备。发送 { type: 'ready' } */
  ready(): void;

  /** 取消准备。发送 { type: 'cancel_ready' } */
  cancelReady(): void;

  /** 踢出玩家（仅房主可调用）。发送 { type: 'kick_player', target: playerId } */
  kickPlayer(playerId: string): void;
}
