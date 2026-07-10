package domain

// C2SAction 定义客户端发往服务端的动作类型 (与前端 C2SAction 保持绝对对齐)
type C2SAction string

const (
	// ===== 房间级别操作 =====
	// 请求加入房间
	ActionJoinRoom    C2SAction = "join"
	// 请求离开房间
	ActionLeaveRoom   C2SAction = "leave_game"
	// 准备就绪
	ActionReady       C2SAction = "ready"
	// 取消准备
	ActionCancelReady C2SAction = "cancel_ready"
	// 房主踢出指定玩家
	ActionKickPlayer  C2SAction = "kick_player"
	// 房主切换游戏/模式/难度
	ActionChangeGame  C2SAction = "change_game"
	// 房主强制解散当前房间
	ActionDismissRoom C2SAction = "dismiss_room"
	// 对局结束后请求再来一局
	ActionRestartGame C2SAction = "restart_game"

	// ===== 游戏对战操作 =====
	// 房主请求正式开始游戏
	ActionStartGame C2SAction = "start"
	// 玩家在游戏中执行操作 (例如落子、移动)
	ActionMove      C2SAction = "move"
	ActionForfeit   C2SAction = "forfeit"
	// 游戏自然结束 (死亡/过关)
	ActionGameOver  C2SAction = "game_over"
	// 对战中释放干扰/攻击
	ActionAttack    C2SAction = "attack"
	ActionUpdate    C2SAction = "update"
	ActionUndo      C2SAction = "undo"
	ActionGuess     C2SAction = "guess"
	ActionInput     C2SAction = "input"
	ActionProgress  C2SAction = "progress"
	ActionFinish    C2SAction = "finish"
	ActionToggle    C2SAction = "toggle"
	ActionPour      C2SAction = "pour"
	ActionSolve     C2SAction = "solve"
	ActionEmoji     C2SAction = "emoji"

	// ===== 系统级操作 =====
	// 客户端应用层心跳保活包
	ActionPing C2SAction = "ping"
)

// S2CEvent 定义服务端发往客户端的广播事件类型 (与前端 S2CEvent 保持绝对对齐)
type S2CEvent string

const (
	// ===== 房间状态事件 =====
	// 房间全量/增量状态同步 (包含玩家列表、比分等)
	EventGameState       S2CEvent = "game_state"
	// 房间已被强制解散
	EventRoomDismissed   S2CEvent = "room_dismissed"
	// 房主权限发生转移 (例如原房主掉线)
	EventHostChanged     S2CEvent = "host_changed"
	// 房间当前游玩的游戏规则发生变更
	EventRoomGameChanged S2CEvent = "room_game_changed"
	// 玩家被踢出房间通知
	EventKicked          S2CEvent = "kicked"
	// 表情/快捷语广播
	EventEmoji           S2CEvent = "emoji"

	// ===== 系统级事件 =====
	// 服务器返回报错信息
	EventError           S2CEvent = "error"
	// 服务器响应客户端心跳
	EventPong            S2CEvent = "pong"
)

// ErrorCode 定义全局标准的 WebSocket 错误码
type ErrorCode string

const (
	ErrRoomNotFound       ErrorCode = "err_room_not_found"
	ErrRoomDismissed      ErrorCode = "err_room_dismissed"
	ErrRoomAlreadyExists  ErrorCode = "err_room_exists"
	ErrGameAlreadyStarted ErrorCode = "err_game_started"
	ErrWrongPassword      ErrorCode = "err_wrong_password"
	ErrKickCooldown       ErrorCode = "err_kick_cooldown"
	ErrMultiplayerDisabled ErrorCode = "err_multiplayer_disabled"
	ErrHostRoomLimit       ErrorCode = "err_host_room_limit"
)
