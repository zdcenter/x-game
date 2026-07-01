package sokoban

import (
	"encoding/json"
	"fmt"
	"time"
	"math/rand"
	"strings"

        "github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
)

type Position struct {
	R int `json:"r"`
	C int `json:"c"`
}

type PlayerState struct {
	ID      string     `json:"id"`
	Board   [][]string `json:"board"`
	History [][][]string
	Moves   int    `json:"moves"`
	Status  string `json:"status"` // "playing", "finished"
}

type SokobanEngine struct {
	engine.BaseEngine
	Mode          string                  `json:"mode"`
	Difficulty    string                  `json:"difficulty"`
	GlobalStartAt int64                   `json:"globalStartAt"`
	Players       map[string]*PlayerState `json:"players"`
	Winners       []string                `json:"winners"`
	LevelMap      [][]string              `json:"-"`
}



func init() {
	engine.RegisterGame("sokoban")
	engine.Register("sokoban_speed", func() engine.GameEngine {
		return &SokobanEngine{
			Players: make(map[string]*PlayerState),
		}
	})
	engine.Register("sokoban_single", func() engine.GameEngine {
		return &SokobanEngine{
			Players: make(map[string]*PlayerState),
		}
	})
}

func parseLevel(level string) [][]string {
	level = strings.ReplaceAll(level, "\r", "")
	lines := strings.Split(strings.Trim(level, "\n"), "\n")
	maxLen := 0
	for _, line := range lines {
		if len(line) > maxLen {
			maxLen = len(line)
		}
	}
	board := make([][]string, len(lines))
	for i, line := range lines {
		padded := line
		for len(padded) < maxLen {
			padded += " "
		}
		board[i] = strings.Split(padded, "")
	}
	return board
}

func copyBoard(board [][]string) [][]string {
	newBoard := make([][]string, len(board))
	for i, row := range board {
		newBoard[i] = make([]string, len(row))
		copy(newBoard[i], row)
	}
	return newBoard
}

func (e *SokobanEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.State = engine.StateWaiting

	opts, ok := options.(map[string]interface{})
	if ok {
		if m, ok := opts["mode"].(string); ok {
			e.Mode = m
		}
		if d, ok := opts["difficulty"].(string); ok {
			e.Difficulty = d
		}
	}

	if e.Difficulty == "" {
		e.Difficulty = string(domain.DiffEasy)
	}

	levelStr := ""

	// 只从数据库获取题库
	var dbPuzzles []domain.SokobanPuzzle
	if db.DB != nil {
		db.DB.Where("difficulty = ?", e.Difficulty).Find(&dbPuzzles)
	}

	var validPuzzles []string
	for _, p := range dbPuzzles {
		if p.Puzzle != "" {
			validPuzzles = append(validPuzzles, p.Puzzle)
		}
	}

	if len(validPuzzles) > 0 {
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		levelStr = validPuzzles[r.Intn(len(validPuzzles))]
	}

	e.LevelMap = parseLevel(levelStr)

	// Single player jumps straight to playing
	if e.Mode == string(domain.ModeSingle) {
		e.State = engine.StatePlaying
	}

	return nil
}

func (e *SokobanEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.Players[playerID] = &PlayerState{
		ID:      playerID,
		Board:   copyBoard(e.LevelMap),
		History: make([][][]string, 0),
		Moves:   0,
		Status:  "playing",
	}
}

func (e *SokobanEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if e.State == engine.StateWaiting {
		delete(e.Players, playerID)
	}
}

func (e *SokobanEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

func (e *SokobanEngine) HandleAction(playerID string, actionType string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	p, exists := e.Players[playerID]
	if !exists {
		return e.State, fmt.Errorf("player not found")
	}

	if actionType == "start" && e.State == engine.StateWaiting {
		e.GlobalStartAt = time.Now().Add(3 * time.Second).UnixMilli()
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, func() {
			e.GlobalStartAt = time.Now().UnixMilli()
			for _, player := range e.Players {
				player.Board = copyBoard(e.LevelMap)
				player.History = make([][][]string, 0)
				player.Moves = 0
				player.Status = "playing"
			}
		})
		return e.State, nil
	}

	if actionType == "restart_game" && e.State == engine.StateFinished {
		e.State = engine.StateWaiting
		e.GlobalStartAt = 0
		e.Winners = []string{}
		return e.State, nil
	}

	if actionType == "restart" && (e.State == engine.StatePlaying || e.State == engine.StateFinished) {
		p.Board = copyBoard(e.LevelMap)
		p.History = make([][][]string, 0)
		p.Moves = 0
		p.Status = "playing"
		if e.Mode == string(domain.ModeSingle) && e.State == engine.StateFinished {
			e.State = engine.StatePlaying
		}
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, fmt.Errorf("game not playing")
	}

	if p.Status == "finished" {
		return e.State, fmt.Errorf("player already finished")
	}

	switch actionType {
	case string(domain.ActionMove):
		var moveReq struct {
			Dir string `json:"dir"` // up, down, left, right
		}
		if err := json.Unmarshal(payload, &moveReq); err != nil {
			return e.State, err
		}
		e.handleMoveLocked(p, moveReq.Dir)
	case "undo":
		if len(p.History) > 0 {
			lastBoard := p.History[len(p.History)-1]
			p.History = p.History[:len(p.History)-1]
			p.Board = copyBoard(lastBoard)
			p.Moves--
		}
	}

	e.checkGameOverLocked()

	return e.State, nil
}

func (e *SokobanEngine) handleMoveLocked(p *PlayerState, dir string) {
	// Find player
	pr, pc := -1, -1
	for r, row := range p.Board {
		for c, val := range row {
			if val == "@" || val == "+" {
				pr, pc = r, c
				break
			}
		}
		if pr != -1 {
			break
		}
	}

	if pr == -1 {
		return // Player not found, invalid state
	}

	dr, dc := 0, 0
	switch dir {
	case "up":
		dr = -1
	case "down":
		dr = 1
	case "left":
		dc = -1
	case "right":
		dc = 1
	default:
		return
	}

	nr, nc := pr+dr, pc+dc
	if nr < 0 || nr >= len(p.Board) || nc < 0 || nc >= len(p.Board[nr]) {
		return
	}

	targetCell := p.Board[nr][nc]

	// Wall
	if targetCell == "#" {
		return
	}

	// Floor or Goal
	if targetCell == " " || targetCell == "." {
		p.History = append(p.History, copyBoard(p.Board))
		p.Moves++
		p.Board[nr][nc] = movePlayer(targetCell)
		p.Board[pr][pc] = leaveCell(p.Board[pr][pc])
		return
	}

	// Box or Box on Goal
	if targetCell == "$" || targetCell == "*" {
		nnr, nnc := nr+dr, nc+dc
		if nnr < 0 || nnr >= len(p.Board) || nnc < 0 || nnc >= len(p.Board[nnr]) {
			return
		}

		pushCell := p.Board[nnr][nnc]
		if pushCell == " " || pushCell == "." {
			p.History = append(p.History, copyBoard(p.Board))
			p.Moves++
			p.Board[nnr][nnc] = pushBox(pushCell)
			p.Board[nr][nc] = movePlayer(leaveCell(targetCell))
			p.Board[pr][pc] = leaveCell(p.Board[pr][pc])
			return
		}
	}
}

func movePlayer(to string) string {
	if to == "." {
		return "+"
	}
	return "@"
}

func leaveCell(from string) string {
	if from == "+" || from == "*" {
		return "."
	}
	return " "
}

func pushBox(to string) string {
	if to == "." {
		return "*"
	}
	return "$"
}

func (e *SokobanEngine) checkGameOverLocked() (bool, []string) {
	allFinished := true
	winners := []string{}

	for _, p := range e.Players {
		if p.Status != "finished" {
			// Check if finished
			finished := true
			for _, row := range p.Board {
				for _, val := range row {
					if val == "$" {
						finished = false
						break
					}
				}
				if !finished {
					break
				}
			}

			if finished {
				p.Status = "finished"
				if e.Mode == string(domain.ModeSpeed) {
					// In speed, first one to finish ends the game and wins
					e.State = engine.StateFinished
					e.Winners = []string{p.ID}
					return true, e.Winners
				}
			} else {
				allFinished = false
			}
		}
	}

	if e.Mode == string(domain.ModeSingle) {
		if allFinished {
			// Find player
			for id := range e.Players {
				winners = append(winners, id)
			}
			e.State = engine.StateFinished
			e.Winners = winners
			return true, e.Winners
		}
	} else if e.Mode == string(domain.ModeSpeed) && allFinished {
		// Just in case everyone finished somehow at same time
		for id := range e.Players {
			winners = append(winners, id)
		}
		e.State = engine.StateFinished
		e.Winners = winners
		return true, e.Winners
	}

	return false, nil
}

func (e *SokobanEngine) CheckGameOver() (bool, []string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	return e.checkGameOverLocked()
}

func (e *SokobanEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()

	// Strip history to avoid huge payload
	sanitizedPlayers := make(map[string]*PlayerState)
	for id, p := range e.Players {
		sanitizedPlayers[id] = &PlayerState{
			ID:     p.ID,
			Board:  p.Board,
			Moves:  p.Moves,
			Status: p.Status,
		}
	}

	return struct {
		Mode          string                  `json:"mode"`
		Difficulty    string                  `json:"difficulty"`
		Status        string                  `json:"status"`
		GlobalStartAt int64                   `json:"globalStartAt"`
		Players       map[string]*PlayerState `json:"players"`
		Winners       []string                `json:"winners"`
	}{
		Mode:          e.Mode,
		Difficulty:    e.Difficulty,
		Status:        string(e.State),
		GlobalStartAt: e.GlobalStartAt,
		Players:       sanitizedPlayers,
		Winners:       e.Winners,
	}
}
