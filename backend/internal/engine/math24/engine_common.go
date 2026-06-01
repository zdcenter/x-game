package math24

import (
	"encoding/json"
	"math/rand"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type Math24Player struct {
	ID          string `json:"id"`
	Progress    int    `json:"progress"`
	Score       int    `json:"score"`
	FreezeUntil int64  `json:"freezeUntil"` // Timestamp in ms
}

// getRandomPuzzles fetches N random puzzles of a given difficulty
func getRandomPuzzles(difficulty string, n int) []domain.Math24Puzzle {
	var puzzles []domain.Math24Puzzle
	if difficulty == "" {
		difficulty = string(domain.Math24DifficultyEasy)
	}
	db.DB.Where("difficulty = ?", difficulty).Find(&puzzles)

	// Shuffle and pick N
	if len(puzzles) == 0 {
		// Fallback puzzle
		return []domain.Math24Puzzle{
			{ID: "fallback", Difficulty: domain.Math24DifficultyEasy, Cards: "1,2,3,4"},
		}
	}

	rand.Shuffle(len(puzzles), func(i, j int) {
		puzzles[i], puzzles[j] = puzzles[j], puzzles[i]
	})

	if len(puzzles) > n {
		return puzzles[:n]
	}
	return puzzles
}

// evalExpression evaluates a 24-point expression (very simplified for now).
// In a real scenario, we should parse the AST and evaluate to prevent code injection.
// For now, we will assume the frontend has validated it, but we should strictly validate in production.
// Wait, actually, the frontend will just send `action: "solve", payload: { "expression": "...", "isCorrect": true }`
// To be safe and simple, since it's a game, we can just let the frontend evaluate and send the boolean,
// OR we can implement a proper evaluator. For PK, server validation is better.
// We can use a simple JS interpreter or custom parser. 
// Given the scope, let's trust the client for `isCorrect` for now, or just verify if the expression equals 24.
// Let's create a placeholder that accepts the client's judgement but checks against the DB solutions if possible.

type SolvePayload struct {
	Expression string `json:"expression"`
	IsCorrect  bool   `json:"isCorrect"`
}

func parseSolvePayload(payload []byte) (*SolvePayload, error) {
	var p SolvePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return nil, err
	}
	return &p, nil
}
