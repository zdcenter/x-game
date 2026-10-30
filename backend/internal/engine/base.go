package engine

import (
	"sync"
	"time"

	"github.com/x-game/backend/internal/domain"
)

// GameOptions represents standardized room and game initialization parameters.
type GameOptions struct {
	Mode       domain.GameMode        `json:"mode"`
	Difficulty domain.GameDifficulty  `json:"difficulty"`
	Target     int                    `json:"target"`
	Bounty     int                    `json:"bounty"`
	Seed       int64                  `json:"seed"`
	Raw        map[string]interface{} `json:"-"`
}

// DiffStr returns the difficulty as a standard string.
func (o *GameOptions) DiffStr() string {
	return string(o.Difficulty)
}

// ModeStr returns the mode as a standard string.
func (o *GameOptions) ModeStr() string {
	return string(o.Mode)
}

// ParseGameOptions safely extracts standard game options with zero-panic defaults.
// Any game engine can simply call opts := engine.ParseGameOptions(raw) to obtain
// verified, non-empty mode, difficulty, target, and randomized seed without boilerplate.
func ParseGameOptions(raw interface{}) *GameOptions {
	opts := &GameOptions{
		Mode:       domain.ModeSpeed,
		Difficulty: domain.DiffMedium,
		Target:     1,
		Bounty:     0,
		Seed:       time.Now().UnixNano(),
		Raw:        make(map[string]interface{}),
	}

	if raw == nil {
		return opts
	}

	m, ok := raw.(map[string]interface{})
	if !ok {
		return opts
	}
	opts.Raw = m

	if modeStr, ok := m["mode"].(string); ok && modeStr != "" {
		opts.Mode = domain.GameMode(modeStr)
	}

	if diffStr, ok := m["difficulty"].(string); ok && diffStr != "" {
		opts.Difficulty = domain.GameDifficulty(diffStr)
	}

	if targetVal, ok := m["target"]; ok {
		switch v := targetVal.(type) {
		case int:
			if v > 0 {
				opts.Target = v
			}
		case float64:
			if v > 0 {
				opts.Target = int(v)
			}
		}
	}

	if bountyVal, ok := m["bounty"]; ok {
		switch v := bountyVal.(type) {
		case int:
			opts.Bounty = v
		case float64:
			opts.Bounty = int(v)
		}
	}

	if seedVal, ok := m["seed"]; ok {
		switch v := seedVal.(type) {
		case int64:
			opts.Seed = v
		case int:
			opts.Seed = int64(v)
		case float64:
			opts.Seed = int64(v)
		}
	}

	return opts
}

// BaseEngine provides a boilerplate implementation for generic GameEngine methods
// to reduce duplication across different game modes.
type BaseEngine struct {
	Mu        sync.RWMutex
	State     GameState
	broadcast func()
}

// GetStatus returns the true current status of the game
func (b *BaseEngine) GetStatus() GameState {
	b.Mu.RLock()
	defer b.Mu.RUnlock()
	return b.State
}

// SetBroadcaster allows the engine to trigger a websocket broadcast asynchronously
func (b *BaseEngine) SetBroadcaster(broadcaster func()) {
	b.broadcast = broadcaster
}

// Broadcast safely invokes the broadcast callback if it is set
func (b *BaseEngine) Broadcast() {
	if b.broadcast != nil {
		b.broadcast()
	}
}

// TriggerCountdown handles the standard 3-second countdown before transitioning to StatePlaying.
// It sets State to StateStarting, broadcasts, waits 3 seconds, transitions to StatePlaying,
// executes any optional onStartPlaying callback, and broadcasts the playing state.
func (b *BaseEngine) TriggerCountdown(onStartPlaying func()) {
	StartWithCountdown(&b.Mu, &b.State, b.Broadcast, onStartPlaying)
}

// StandardStateMap returns a standardized dictionary for GetState() containing status, players,
// winners, wins, target, and merges any extra game-specific payload data cleanly.
func (b *BaseEngine) StandardStateMap(players interface{}, winners []string, wins map[string]int, target int, extra map[string]interface{}) map[string]interface{} {
	b.Mu.RLock()
	defer b.Mu.RUnlock()

	res := map[string]interface{}{
		"status":  b.State,
		"players": players,
		"winners": winners,
		"wins":    wins,
		"target":  target,
	}

	for k, v := range extra {
		if _, exists := res[k]; !exists {
			res[k] = v
		}
	}

	return res
}

// HandleLifecycle processes standard start and restart actions.
// It returns true if the action was handled (so the caller can return early).
func HandleLifecycle(state *GameState, action string, onStart func(), onRestart func()) bool {
	if action == string(domain.ActionStartGame) && *state == StateWaiting {
		if onStart != nil {
			onStart()
		} else {
			*state = StatePlaying
		}
		return true
	}
	if action == string(domain.ActionRestartGame) && *state == StateFinished {
		*state = StateWaiting
		if onRestart != nil {
			onRestart()
		}
		return true
	}
	return false
}

// HandleLifecycle (method) is kept for backwards compatibility with BaseEngine.
func (b *BaseEngine) HandleLifecycle(action string, onStart func(), onRestart func()) bool {
	return HandleLifecycle(&b.State, action, onStart, onRestart)
}

// BasePlayer represents the standardized player state in a multiplayer room.
// State contains game-specific real-time board/move data used for spectator mirroring.
type BasePlayer struct {
	ID       string      `json:"id"`
	Score    int         `json:"score"`
	Progress int         `json:"progress"`
	Finished bool        `json:"finished"`
	State    interface{} `json:"state,omitempty"` // Real-time board, pieces or move data for spectators
}

// CheckSeriesWinner checks if any player in the series has reached the target number of wins.
func CheckSeriesWinner(wins map[string]int, target int) (bool, string) {
	if target <= 0 {
		target = 1
	}
	for pid, w := range wins {
		if w >= target {
			return true, pid
		}
	}
	return false, ""
}

// ResetSeriesWins resets win counts for all players in a match series.
func ResetSeriesWins(wins map[string]int) {
	for pid := range wins {
		wins[pid] = 0
	}
}

