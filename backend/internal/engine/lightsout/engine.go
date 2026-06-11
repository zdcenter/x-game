package lightsout

import (
	"encoding/json"
	"math/rand"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type PlayerState struct {
	ID       string   `json:"id"`
	Board    [][]bool `json:"board"`
	Moves    int      `json:"moves"`
	Finished bool     `json:"finished"`
}

type LightsoutEngine struct {
	engine.BaseEngine
	Players      map[string]*PlayerState `json:"players"`
	Difficulty   string                  `json:"difficulty"`
	Size         int                     `json:"size"`
	InitialBoard [][]bool                `json:"initialBoard"`
	Winners      []string                `json:"winners"`
}

func init() {
	engine.Register("lightsout_single", func() engine.GameEngine { return &LightsoutEngine{} })
	engine.Register("lightsout_same_pk_speed", func() engine.GameEngine { return &LightsoutEngine{} })
}

func (e *LightsoutEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.State = engine.StateWaiting
	e.Players = make(map[string]*PlayerState)
	e.Winners = make([]string, 0)
	e.Difficulty = "medium"
	e.Size = 5

	if opts, ok := options.(map[string]interface{}); ok {
		if diff, ok := opts["difficulty"].(string); ok {
			e.Difficulty = diff
		}
	}

	switch e.Difficulty {
	case "easy":
		e.Size = 4
	case "hard":
		e.Size = 6
	default:
		e.Size = 5
	}

	e.generateInitialBoard()

	return nil
}

func (e *LightsoutEngine) generateInitialBoard() {
	e.InitialBoard = make([][]bool, e.Size)
	for i := range e.InitialBoard {
		e.InitialBoard[i] = make([]bool, e.Size)
	}

	// Reverse random clicks to ensure solvability
	source := rand.NewSource(time.Now().UnixNano())
	r := rand.New(source)

	clicks := e.Size * e.Size * 2
	for i := 0; i < clicks; i++ {
		rRow := r.Intn(e.Size)
		rCol := r.Intn(e.Size)
		toggleBoard(e.InitialBoard, e.Size, rRow, rCol)
	}

	// In extremely rare cases where the board is fully solved after random clicks, do it again
	if isBoardSolved(e.InitialBoard, e.Size) {
		toggleBoard(e.InitialBoard, e.Size, 0, 0)
		toggleBoard(e.InitialBoard, e.Size, e.Size-1, e.Size-1)
	}
}

func (e *LightsoutEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if _, exists := e.Players[playerID]; !exists {
		// Deep copy initial board for this player
		playerBoard := make([][]bool, e.Size)
		for i := range playerBoard {
			playerBoard[i] = make([]bool, e.Size)
			copy(playerBoard[i], e.InitialBoard[i])
		}

		e.Players[playerID] = &PlayerState{
			ID:       playerID,
			Board:    playerBoard,
			Moves:    0,
			Finished: false,
		}
	}
}

func (e *LightsoutEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

func (e *LightsoutEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

func (e *LightsoutEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()

	return map[string]interface{}{
		"status":     e.State,
		"difficulty": e.Difficulty,
		"size":       e.Size,
		"players":    e.Players,
		"winners":    e.Winners,
	}
}

func (e *LightsoutEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var baseReq struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(payload, &baseReq); err == nil && baseReq.Action != "" {
		action = baseReq.Action
	}

	if action == "start" && e.State == engine.StateWaiting {
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
		return e.State, nil
	}

	if action == "restart_game" && e.State == engine.StateFinished {
		e.State = engine.StateWaiting
		e.Winners = []string{}
		e.generateInitialBoard()

		for _, p := range e.Players {
			p.Finished = false
			p.Moves = 0
			// Reset player board to new initial board
			for i := range p.Board {
				copy(p.Board[i], e.InitialBoard[i])
			}
		}
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, nil
	}

	player, exists := e.Players[playerID]
	if !exists || player.Finished {
		return e.State, nil
	}

	if action == "toggle" {
		var req struct {
			Row int `json:"row"`
			Col int `json:"col"`
		}
		if err := json.Unmarshal(payload, &req); err == nil {
			if req.Row >= 0 && req.Row < e.Size && req.Col >= 0 && req.Col < e.Size {
				toggleBoard(player.Board, e.Size, req.Row, req.Col)
				player.Moves++

				if isBoardSolved(player.Board, e.Size) {
					player.Finished = true
					e.Winners = append(e.Winners, playerID)
					e.State = engine.StateFinished
				}
			}
		}
	} else if action == "forfeit" {
		player.Finished = true
		e.checkGameEnd()
	}

	return e.State, nil
}

func (e *LightsoutEngine) checkGameEnd() {
	allFinished := true
	for _, p := range e.Players {
		if !p.Finished {
			allFinished = false
			break
		}
	}
	if allFinished && len(e.Players) > 0 {
		e.State = engine.StateFinished
	}
}

func (e *LightsoutEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}

// Helpers
func toggleBoard(board [][]bool, size, row, col int) {
	// Toggle target
	board[row][col] = !board[row][col]
	// Up
	if row > 0 {
		board[row-1][col] = !board[row-1][col]
	}
	// Down
	if row < size-1 {
		board[row+1][col] = !board[row+1][col]
	}
	// Left
	if col > 0 {
		board[row][col-1] = !board[row][col-1]
	}
	// Right
	if col < size-1 {
		board[row][col+1] = !board[row][col+1]
	}
}

func isBoardSolved(board [][]bool, size int) bool {
	for i := 0; i < size; i++ {
		for j := 0; j < size; j++ {
			if board[i][j] {
				return false
			}
		}
	}
	return true
}
