import { GameIdType, GameModeType, GameDifficultyType, GameStatusType } from './game.model';

/**
 * WebSocket URL query param keys — no magic strings
 */
export enum WsQueryParam {
  Game       = 'game',
  PlayerId   = 'playerId',
  Mode       = 'mode',
  Difficulty = 'difficulty',
  HostId     = 'hostId',
  Action     = 'action',
  Password   = 'password',
  Target     = 'target',
}

/**
 * WebSocket 消息大类枚举
 */
export enum MessageType {
  /** 房间生命周期与状态相关消息 */
  Room = 'room',
  /** 游戏对局内具体操作相关消息 */
  Game = 'game',
  /** 系统级控制与心跳消息 */
  System = 'system',
}

/**
 * 客户端发往服务端 (Client-To-Server) 的动作类型
 */
export enum C2SAction {
  // ===== 房间级别操作 =====
  /** 请求加入房间 */
  JoinRoom = 'join',
  /** 请求离开房间 */
  LeaveRoom = 'leave_game',
  /** 准备就绪 */
  Ready = 'ready',
  /** 取消准备 */
  CancelReady = 'cancel_ready',
  /** 房主踢出指定玩家 */
  KickPlayer = 'kick_player',
  /** 房主切换游戏/模式/难度 (综合包厢模式) */
  ChangeGame = 'change_game',
  /** 房主强制解散当前房间 */
  DismissRoom = 'dismiss_room',
  /** 对局结束后请求再来一局 */
  RestartGame = 'restart_game',

  // ===== 游戏对战操作 =====
  /** 房主请求正式开始游戏 */
  StartGame = 'start',
  /** 玩家在游戏中执行操作 (例如落子、移动) */
  Move = 'move',
  Forfeit = 'forfeit',
  /** 游戏自然结束 (死亡/过关) */
  GameOver = 'game_over',
  /** 对战中释放干扰/攻击 */
  Attack = 'attack',
  /** 游戏状态更新 (例如进度、分数等，特定游戏需要) */
  Update = 'update',
  /** 特定游戏：撤销 */
  Undo = 'undo',
  /** 特定游戏：猜数字/密码 */
  Guess = 'guess',
  /** 特定游戏：输入/填入 */
  Input = 'input',
  /** 特定游戏：进度同步 */
  Progress = 'progress',
  /** 特定游戏：完成/交卷 */
  Finish = 'finish',
  /** 特定游戏：切换/点击 */
  Toggle = 'toggle',

  /** 特定游戏：倒水 */
  Pour = 'pour',
  /** 特定游戏：解答 */
  Solve = 'solve',
  /** 发送表情/嘲讽快捷语 */
  Emoji = 'emoji',
  /** 发送文字聊天 */
  Chat = 'chat',

  // ===== 系统级操作 =====
  /** 客户端应用层心跳保活包 */
  Ping = 'ping',
}

/**
 * 服务端发往客户端 (Server-To-Client) 的事件类型
 */
export enum S2CEvent {
  // ===== 房间状态事件 =====
  /** 房间全量/增量状态同步 (包含玩家列表、比分等) */
  RoomStateUpdate = 'game_state',
  /** 房间已被强制解散 */
  RoomDismissed = 'room_dismissed',
  /** 房主权限发生转移 (例如原房主掉线) */
  HostChanged = 'host_changed',
  /** 房间当前游玩的游戏规则发生变更 */
  GameChanged = 'room_game_changed',
  /** 玩家被踢出房间通知 */
  PlayerKicked = 'kicked',
  /** 表情/快捷语广播 */
  EmojiBroadcast = 'emoji',
  /** 聊天消息广播 */
  ChatBroadcast = 'chat',

  // ===== 系统级事件 =====
  /** 服务器返回报错信息 (例如非法移动、权限不足) */
  Error = 'error',
  /** 服务器响应客户端心跳 */
  Pong = 'pong',
}

/**
 * 客户端上行消息标准封装结构
 */
export interface WSMessageC2S {
  /** 消息大分类 */
  type: MessageType;
  /** 具体请求操作指令 */
  action: C2SAction;
  /** 操作携带的具体数据载荷 (Payload) */
  payload?: any;
}

/**
 * 服务端下发消息标准封装结构
 */
export interface WSMessageS2C {
  /** 消息大分类 */
  type: MessageType;
  /** 具体发生的服务器事件 */
  event: S2CEvent;
  /** 事件携带的具体数据载荷 (Payload) */
  payload?: any;
}

/**
 * WebSocket 同步的公共房间基础元数据
 */
export interface C2SPayload {
  [key: string]: any;
}

/**
 * 全局标准 WebSocket 错误码
 * (与后端 domain.ErrorCode 保持绝对对齐)
 */
export enum WSErrorCode {
  RoomNotFound = 'err_room_not_found',
  RoomDismissed = 'err_room_dismissed',
  RoomAlreadyExists = 'err_room_exists',
  GameAlreadyStarted = 'err_game_started',
  WrongPassword = 'err_wrong_password',
  KickCooldown = 'err_kick_cooldown',
  MultiplayerDisabled = 'err_multiplayer_disabled'
}

/**
 * WebSocket 同步的公共房间基础元数据
 */
export interface RoomInfo {
  /** 全局唯一的房间 ID (如 'R-12345') */
  id: string;
  /** 当前正在游玩的游戏 ID */
  gameId: GameIdType;
  /** 游戏模式 (单机、竞速、抢分等) */
  mode: GameModeType;
  /** 游戏难度 */
  difficulty: GameDifficultyType;
  /** 房间当前所处阶段 (等待中、进行中等) */
  status: GameStatusType;
  /** 当前房主的标识符 */
  hostId: string;
  /** 房间创建的时间戳 */
  createdAt: number;
}

/**
 * WebSocket 同步的公共玩家元数据
 */
export interface PlayerInfo {
  /** 玩家唯一标识符 */
  id: string;
  /** 玩家显示昵称 */
  name?: string;
  /** 玩家头像 URL 或生成种子 */
  avatar?: string;
  /** 是否为本房间房主 */
  isHost: boolean;
  /** 当前是否已准备 */
  isReady: boolean;
  /** 当前是否在线连接 (用于断线重连判定) */
  isConnected: boolean;
}

/**
 * 服务端下发 `RoomStateUpdate` 事件时的统一全量 Payload 结构
 * @template T 特定游戏的内置专属状态类型 (如扫雷的雷区、数独的棋盘)
 */
export interface UnifiedStatePayload<T = any> {
  // ===== 通用房间状态数据 =====
  /** 当前房间 ID */
  roomId: string;
  /** 当前游玩的游戏 ID */
  gameId: GameIdType;
  /** 游戏模式 */
  mode: GameModeType;
  /** 房间整体进程状态 */
  status: GameStatusType;
  /** 房主 ID */
  host: string;
  /** 房间设定难度 */
  difficulty: GameDifficultyType;
  /** 房间内全量玩家字典 (以 PlayerId 为 Key) */
  players: Record<string, PlayerInfo>;

  // ===== 游戏特有状态数据 =====
  /** 各游戏专属的引擎状态切片 (由 Go 后端 Engine.GetState() 返回) */
  gameState: T;
}
