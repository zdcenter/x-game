package tents

import (
	"encoding/json"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
)

// Player 玩家实时竞技状态与观战镜像数据
type Player struct {
	ID       string      `json:"id"`
	Score    int         `json:"score"`
	Progress int         `json:"progress"`
	Finished bool        `json:"finished"`
	State    interface{} `json:"state,omitempty"` // 供观战者实时镜像同步的棋盘/走法数据
}

// Engine 组合嵌入 BaseEngine
type Engine struct {
	engine.BaseEngine
	Players      map[string]*Player `json:"players"`
	InitialBoard interface{}        `json:"initial_board,omitempty"` // 权威公平初始发牌基准
	Difficulty   string             `json:"difficulty"`
	Winners      []string           `json:"winners"`
	Wins         map[string]int     `json:"wins"`
	Target       int                `json:"target"`
}

func init() {
	// 1. 注册基础 ID
	engine.RegisterGame("tents")
	// 2. 注册极速竞速模式
	engine.Register("tents_speed", func() engine.GameEngine {
		return &Engine{}
	})
}

// InitGame 初始化房间对局状态
func (e *Engine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	opts := engine.ParseGameOptions(options)
	e.State = engine.StateWaiting
	e.Players = make(map[string]*Player)
	e.Winners = make([]string, 0)
	e.Wins = make(map[string]int)
	e.Target = opts.Target
	e.Difficulty = string(opts.Difficulty)

	return nil
}

// AddPlayer 玩家连接加入房间
func (e *Engine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	if _, exists := e.Players[playerID]; !exists {
		e.Players[playerID] = &Player{
			ID:       playerID,
			Score:    0,
			Progress: 0,
			Finished: false,
			State:    e.InitialBoard,
		}
	}
	if _, exists := e.Wins[playerID]; !exists {
		e.Wins[playerID] = 0
	}
}

// RemovePlayer 玩家离开房间
func (e *Engine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

// HasPlayer 判定玩家是否存在
func (e *Engine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

// HandleAction 处理对局动作与 3 秒倒计时
func (e *Engine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	// 1. 房主点击开始对战：触发统一 3 秒倒计时，并权威统一分发相同初始盘面
	if action == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		e.TriggerCountdown(func() {
			seed := time.Now().UnixNano() % 1000000
			fairBoard := map[string]interface{}{"seed": seed}
			e.InitialBoard = fairBoard
			for _, p := range e.Players {
				p.Score = 0
				p.Progress = 0
				p.Finished = false
				p.State = fairBoard
			}
			e.Winners = make([]string, 0)
		})
		return e.State, nil
	}

	// 2. 再来一局 (Rematch) 动作
	if action == string(domain.ActionRestartGame) && e.State == engine.StateFinished {
		if over, _ := engine.CheckSeriesWinner(e.Wins, e.Target); over {
			engine.ResetSeriesWins(e.Wins)
		}

		seed := time.Now().UnixNano() % 1000000
		fairBoard := map[string]interface{}{"seed": seed}
		e.InitialBoard = fairBoard
		for _, p := range e.Players {
			p.Score = 0
			p.Progress = 0
			p.Finished = false
			p.State = fairBoard
		}
		e.Winners = make([]string, 0)
		e.State = engine.StateWaiting
		return e.State, nil
	}

	// 3. 对战进行中动作
	if e.State == engine.StatePlaying {
		switch action {
		case "move", "progress":
			var req struct {
				Score    int         `json:"score"`
				Progress int         `json:"progress"`
				Finished bool        `json:"finished"`
				Delta    int         `json:"delta"`
				Board    interface{} `json:"board"`
				State    interface{} `json:"state"`
			}
			if err := json.Unmarshal(payload, &req); err == nil {
				if p, exists := e.Players[playerID]; exists {
					if req.Score > 0 {
						p.Score = req.Score
					} else {
						p.Score += req.Delta
					}
					if req.Progress > 0 {
						p.Progress = req.Progress
					}
					if req.Board != nil {
						p.State = req.Board
					} else if req.State != nil {
						p.State = req.State
					}
					if req.Finished {
						p.Finished = true
						e.Winners = []string{playerID}
						e.Wins[playerID]++
						e.State = engine.StateFinished
					}
				}
			}
		case "forfeit":
			for id := range e.Players {
				if id != playerID {
					e.Winners = []string{id}
					e.Wins[id]++
					break
				}
			}
			e.State = engine.StateFinished
		}
	}

	return e.State, nil
}

// CheckGameOver 检查胜负
func (e *Engine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}

// GetState 状态序列化广播 (基于 BaseEngine.StandardStateMap 标准信封组装)
func (e *Engine) GetState() interface{} {
	return e.StandardStateMap(e.Players, e.Winners, e.Wins, e.Target, map[string]interface{}{
		"initial_board": e.InitialBoard,
		"difficulty":    e.Difficulty,
	})
}
