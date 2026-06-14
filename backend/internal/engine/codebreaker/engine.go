package codebreaker

import (
	"github.com/x-game/backend/internal/domain"
	"encoding/json"
	"math/rand"
	"strings"
	"time"

	"github.com/x-game/backend/internal/engine"
)

type GuessRecord struct {
	Guess     string    `json:"guess"`
	A         int       `json:"a"`
	B         int       `json:"b"`
	Timestamp time.Time `json:"timestamp"`
}

type PlayerState struct {
	ID       string         `json:"id"`
	Guesses  []*GuessRecord `json:"guesses"`
	Finished bool           `json:"finished"`
}

type CodebreakerEngine struct {
	engine.BaseEngine
	Players     map[string]*PlayerState `json:"players"`
	Difficulty  string                  `json:"difficulty"`
	SecretCode  string                  `json:"secretCode"`
	DigitLength int                     `json:"digitLength"`
	Winners     []string                `json:"winners"`
}

func init() {
	engine.Register("codebreaker_single", func() engine.GameEngine { return &CodebreakerEngine{} })
	engine.Register("codebreaker_speed", func() engine.GameEngine { return &CodebreakerEngine{} })
}

func (e *CodebreakerEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.State = engine.StateWaiting
	e.Players = make(map[string]*PlayerState)
	e.Winners = make([]string, 0)
	e.Difficulty = "medium"
	e.DigitLength = 4

	if opts, ok := options.(map[string]interface{}); ok {
		if diff, ok := opts["difficulty"].(string); ok {
			e.Difficulty = diff
		}
	}

	// Calculate digit length based on difficulty
	switch e.Difficulty {
	case "easy":
		e.DigitLength = 3
	case "hard":
		e.DigitLength = 5
	default:
		e.DigitLength = 4
	}

	// Generate non-repeating secret code
	e.SecretCode = generateSecretCode(e.DigitLength)

	return nil
}

func (e *CodebreakerEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	if _, exists := e.Players[playerID]; !exists {
		e.Players[playerID] = &PlayerState{
			ID:       playerID,
			Guesses:  make([]*GuessRecord, 0),
			Finished: false,
		}
	}
}

func (e *CodebreakerEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

func (e *CodebreakerEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

func (e *CodebreakerEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()

	return map[string]interface{}{
		"status":      e.State,
		"difficulty":  e.Difficulty,
		"digitLength": e.DigitLength,
		"players":     e.Players,
		"winners":     e.Winners,
	}
}

func (e *CodebreakerEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var baseReq struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(payload, &baseReq); err == nil && baseReq.Action != "" {
		action = baseReq.Action
	}

	if action == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, nil)
		return e.State, nil
	}

	if action == string(domain.ActionRestartGame) && e.State == engine.StateFinished {
		e.State = engine.StateWaiting
		e.Winners = []string{}
		for _, p := range e.Players {
			p.Finished = false
			p.Guesses = make([]*GuessRecord, 0)
		}
		e.SecretCode = generateSecretCode(e.DigitLength)
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, nil
	}

	player, exists := e.Players[playerID]
	if !exists {
		return e.State, nil
	}

	if action == "guess" {
		var req struct {
			Guess string `json:"guess"`
		}
		if err := json.Unmarshal(payload, &req); err == nil {
			guess := strings.TrimSpace(req.Guess)
			if len(guess) == e.DigitLength && isUniqueDigits(guess) {
				a, b := compareCodes(e.SecretCode, guess)
				record := &GuessRecord{
					Guess:     guess,
					A:         a,
					B:         b,
					Timestamp: time.Now(),
				}
				player.Guesses = append(player.Guesses, record)

				// Check if this player successfully guessed it
				if a == e.DigitLength {
					player.Finished = true
					e.Winners = append(e.Winners, playerID)
					e.State = engine.StateFinished
				}
			}
		}
	} else if action == string(domain.ActionForfeit) {
		player.Finished = true
		e.checkGameEnd()
	}

	return e.State, nil
}

func (e *CodebreakerEngine) checkGameEnd() {
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

func (e *CodebreakerEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}

// Helper: generate random non-repeating digits
func generateSecretCode(digits int) string {
	source := rand.NewSource(time.Now().UnixNano())
	r := rand.New(source)
	nums := []rune{'0', '1', '2', '3', '4', '5', '6', '7', '8', '9'}
	r.Shuffle(len(nums), func(i, j int) {
		nums[i], nums[j] = nums[j], nums[i]
	})
	return string(nums[:digits])
}

// Helper: check if digits are unique
func isUniqueDigits(guess string) bool {
	seen := make(map[rune]bool)
	for _, r := range guess {
		if r < '0' || r > '9' {
			return false
		}
		if seen[r] {
			return false
		}
		seen[r] = true
	}
	return true
}

// Helper: compare codes and return A, B values
func compareCodes(secret, guess string) (int, int) {
	a, b := 0, 0
	secretRunes := []rune(secret)
	guessRunes := []rune(guess)
	for i, r := range guessRunes {
		if r == secretRunes[i] {
			a++
		} else if contains(secretRunes, r) {
			b++
		}
	}
	return a, b
}

func contains(runes []rune, r rune) bool {
	for _, v := range runes {
		if v == r {
			return true
		}
	}
	return false
}
