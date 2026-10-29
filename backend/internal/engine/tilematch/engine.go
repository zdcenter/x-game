package tilematch

import (
	"encoding/json"
	"time"

	"github.com/x-game/backend/internal/engine"
)

// Card 单张消除卡牌
type Card struct {
	ID        int     `json:"id"`
	Type      string  `json:"type"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Layer     int     `json:"layer"`
	IsBlocked bool    `json:"isBlocked"`
	Status    string  `json:"status"`
}

// Player 玩家实时竞技状态
type Player struct {
	ID           string `json:"id"`
	Score        int    `json:"score"`
	Progress     int    `json:"progress"`
	Finished     bool   `json:"finished"`
	RemovedCards []int  `json:"removedCards,omitempty"`
	SlotCards    []int  `json:"slotCards,omitempty"`
}

// Engine 组合嵌入 BaseEngine
type Engine struct {
	engine.BaseEngine
	Players       map[string]*Player `json:"players"`
	Difficulty    string             `json:"difficulty"`
	Seed          int64              `json:"seed"`
	GlobalStartAt int64              `json:"globalStartAt"`
	Winners       []string           `json:"winners"`
	Wins          map[string]int     `json:"wins"`
	Target        int                `json:"target"`
	Cards         []Card             `json:"cards"`
}

func init() {
	// 1. 注册基础 ID
	engine.RegisterGame("tilematch")
	factory := func() engine.GameEngine {
		return &Engine{}
	}
	engine.Register("tilematch", factory)
	engine.Register("tilematch_speed", factory)
	engine.Register("tilematch_battle", factory)
}

// InitGame 初始化房间对局状态
func (e *Engine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.State = engine.StateWaiting
	e.Players = make(map[string]*Player)
	e.Winners = make([]string, 0)
	e.Wins = make(map[string]int)
	e.Target = 1
	e.Difficulty = "medium"
	e.Seed = 123456
	e.GlobalStartAt = 0
	e.Cards = make([]Card, 0)

	if opts, ok := options.(map[string]interface{}); ok {
		if diff, ok := opts["difficulty"].(string); ok && diff != "" {
			e.Difficulty = diff
		}
		if t, ok := opts["target"].(float64); ok && int(t) > 0 {
			e.Target = int(t)
		} else if t, ok := opts["target"].(int); ok && t > 0 {
			e.Target = t
		}
	}

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

	// 1. 房主点击开始对战：触发统一 3 秒倒计时并生成确定性权威牌局
	if action == "start" && e.State == engine.StateWaiting {
		// 生成安全 32 位正整数种子 (范围 1000 ~ 99999)
		e.Seed = int64((time.Now().UnixMilli() % 90000) + 10000)
		totalCards := 60
		if e.Difficulty == "hard" {
			totalCards = 96
		} else if e.Difficulty == "easy" {
			totalCards = 18
		}
		// 后端单点权威生成牌局，彻底杜绝多端异步或 PRNG 不一致
		e.Cards = GenerateCards(totalCards, e.Difficulty, e.Seed)
		e.GlobalStartAt = time.Now().Add(3 * time.Second).UnixMilli()
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, func() {
			for _, p := range e.Players {
				p.Score = 0
				p.Progress = 0
				p.Finished = false
				p.RemovedCards = nil
				p.SlotCards = nil
			}
			e.Winners = make([]string, 0)
			e.GlobalStartAt = time.Now().UnixMilli()
		})
		return e.State, nil
	}

	// 2. 再来一局 (Rematch) 动作
	if action == "restart_game" && e.State == engine.StateFinished {
		seriesOver := false
		for _, w := range e.Wins {
			if w >= e.Target {
				seriesOver = true
				break
			}
		}
		if seriesOver {
			for p := range e.Wins {
				e.Wins[p] = 0
			}
		}

		for _, p := range e.Players {
			p.Score = 0
			p.Progress = 0
			p.Finished = false
			p.RemovedCards = nil
			p.SlotCards = nil
		}
		e.Winners = make([]string, 0)
		e.Seed = int64((time.Now().UnixMilli() % 90000) + 10000)
		totalCards := 60
		if e.Difficulty == "hard" {
			totalCards = 96
		} else if e.Difficulty == "easy" {
			totalCards = 18
		}
		e.Cards = GenerateCards(totalCards, e.Difficulty, e.Seed)
		e.GlobalStartAt = 0
		e.State = engine.StateWaiting
		return e.State, nil
	}

	// 3. 对战进行中动作
	if e.State == engine.StatePlaying {
		switch action {
		case "move":
			var req struct {
				Delta        int   `json:"delta"`
				Progress     int   `json:"progress"`
				Finished     bool  `json:"finished"`
				RemovedCards []int `json:"removedCards"`
				SlotCards    []int `json:"slotCards"`
			}
			if err := json.Unmarshal(payload, &req); err == nil {
				if p, exists := e.Players[playerID]; exists {
					p.Score += req.Delta
					if req.Progress > p.Progress {
						p.Progress = req.Progress
					}
					if len(req.RemovedCards) > 0 {
						p.RemovedCards = req.RemovedCards
					}
					if req.SlotCards != nil {
						p.SlotCards = req.SlotCards
					}
					if req.Finished || p.Progress >= 100 {
						p.Finished = true
						p.Progress = 100
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

// GetState 状态序列化广播
func (e *Engine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()

	return map[string]interface{}{
		"status":        e.State,
		"players":       e.Players,
		"winners":       e.Winners,
		"wins":          e.Wins,
		"target":        e.Target,
		"difficulty":    e.Difficulty,
		"seed":          e.Seed,
		"globalStartAt": e.GlobalStartAt,
		"cards":         e.Cards,
	}
}
