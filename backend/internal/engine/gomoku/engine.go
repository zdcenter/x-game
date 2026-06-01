package gomoku

import (
	"encoding/json"
	"fmt"

	"github.com/x-game/backend/internal/engine"
)

func init() {
	engine.Register("gomoku_pk_classic", NewClassicEngine)
}

const (
	Empty = 0
	Black = 1
	White = 2
	Size  = 15
)

type ClassicEngine struct {
	engine.BaseEngine
	Board        [Size][Size]int `json:"board"`
	CurrentTurn  string          `json:"currentTurn"`
	PlayerColors map[string]int  `json:"playerColors"` // map playerID -> Black or White
	Winner       string          `json:"winner"`
	Players      []string        `json:"players"`
	LastMove     []int           `json:"lastMove"` // [y, x]
}

func NewClassicEngine() engine.GameEngine {
	return &ClassicEngine{
		BaseEngine: engine.BaseEngine{
			State: engine.StateWaiting,
		},
		PlayerColors: make(map[string]int),
		Players:      make([]string, 0),
	}
}

func (e *ClassicEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	for i := 0; i < Size; i++ {
		for j := 0; j < Size; j++ {
			e.Board[i][j] = Empty
		}
	}
	e.Winner = ""
	e.LastMove = nil
	return nil
}

func (e *ClassicEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	for _, p := range e.Players {
		if p == playerID {
			return
		}
	}

	if len(e.Players) < 2 {
		e.Players = append(e.Players, playerID)
	}
}

func (e *ClassicEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	for i, p := range e.Players {
		if p == playerID {
			e.Players = append(e.Players[:i], e.Players[i+1:]...)
			break
		}
	}
}

func (e *ClassicEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	for _, p := range e.Players {
		if p == playerID {
			return true
		}
	}
	return false
}

func (e *ClassicEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var act struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(payload, &act); err == nil && act.Action != "" {
		action = act.Action
	}

	if action == "start" {
		if len(e.Players) != 2 {
			return e.State, fmt.Errorf("gomoku requires exactly 2 players")
		}

		// Clear the board and reset winner for the new game
		for i := 0; i < Size; i++ {
			for j := 0; j < Size; j++ {
				e.Board[i][j] = Empty
			}
		}
		e.Winner = ""
		e.LastMove = nil

		// First player is Black, second is White
		e.PlayerColors[e.Players[0]] = Black
		e.PlayerColors[e.Players[1]] = White
		e.CurrentTurn = e.Players[0]

		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, fmt.Errorf("game is not playing")
	}

	if action == "move" {
		if e.CurrentTurn != playerID {
			return e.State, fmt.Errorf("not your turn")
		}

		var data struct {
			X int `json:"x"`
			Y int `json:"y"`
		}
		if err := json.Unmarshal(payload, &data); err != nil {
			return e.State, err
		}

		if data.X < 0 || data.X >= Size || data.Y < 0 || data.Y >= Size {
			return e.State, fmt.Errorf("coordinates out of bounds")
		}

		if e.Board[data.Y][data.X] != Empty {
			return e.State, fmt.Errorf("cell already occupied")
		}

		color := e.PlayerColors[playerID]
		e.Board[data.Y][data.X] = color
		e.LastMove = []int{data.Y, data.X}

		if e.checkWin(data.X, data.Y, color) {
			e.State = engine.StateFinished
			e.Winner = playerID
		} else {
			// Switch turn
			for _, p := range e.Players {
				if p != playerID {
					e.CurrentTurn = p
					break
				}
			}
		}

		return e.State, nil
	}

	if action == "forfeit" {
		e.State = engine.StateFinished
		for _, p := range e.Players {
			if p != playerID {
				e.Winner = p
				break
			}
		}
		return e.State, nil
	}

	return e.State, fmt.Errorf("unknown action: %s", action)
}

func (e *ClassicEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return map[string]interface{}{
		"board":        e.Board,
		"currentTurn":  e.CurrentTurn,
		"playerColors": e.PlayerColors,
		"winner":       e.Winner,
		"status":       e.State,
		"players":      e.Players,
		"lastMove":     e.LastMove,
	}
}

func (e *ClassicEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()

	if e.State == engine.StateFinished {
		if e.Winner != "" {
			return true, []string{e.Winner}
		}
		return true, []string{} // Tie
	}
	return false, nil
}

func (e *ClassicEngine) checkWin(x, y, color int) bool {
	dirs := [][2]int{
		{1, 0},  // Horizontal
		{0, 1},  // Vertical
		{1, 1},  // Diagonal \
		{1, -1}, // Diagonal /
	}

	for _, d := range dirs {
		count := 1
		for i := 1; i < 5; i++ {
			nx, ny := x+d[0]*i, y+d[1]*i
			if nx >= 0 && nx < Size && ny >= 0 && ny < Size && e.Board[ny][nx] == color {
				count++
			} else {
				break
			}
		}
		for i := 1; i < 5; i++ {
			nx, ny := x-d[0]*i, y-d[1]*i
			if nx >= 0 && nx < Size && ny >= 0 && ny < Size && e.Board[ny][nx] == color {
				count++
			} else {
				break
			}
		}

		if count >= 5 {
			return true
		}
	}
	return false
}
