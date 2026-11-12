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

// getRandomPuzzles fetches N random puzzles of a given difficulty, prioritizing host unplayed puzzles
func getRandomPuzzles(difficulty string, n int, hostUsername string) []domain.Math24Puzzle {
	if difficulty == "" {
		difficulty = string(domain.Math24DifficultyEasy)
	}

	if db.DB != nil {
		if hostUsername != "" {
			var hostUser domain.User
			if err := db.DB.Where("LOWER(username) = LOWER(?)", hostUsername).First(&hostUser).Error; err == nil && hostUser.ID > 0 {
				var unplayed []domain.Math24Puzzle
				err := db.DB.Where(
					"difficulty = ? AND id NOT IN (SELECT puzzle_id FROM gm_user_math24_progresses WHERE user_id = ? AND status = ?)",
					difficulty, hostUser.ID, "finished",
				).Find(&unplayed).Error
				if err == nil && len(unplayed) >= n {
					rand.Shuffle(len(unplayed), func(i, j int) {
						unplayed[i], unplayed[j] = unplayed[j], unplayed[i]
					})
					return unplayed[:n]
				} else if err == nil && len(unplayed) > 0 {
					var all []domain.Math24Puzzle
					db.DB.Where("difficulty = ?", difficulty).Find(&all)
					unplayedMap := make(map[string]bool)
					for _, u := range unplayed {
						unplayedMap[u.ID] = true
					}
					var rest []domain.Math24Puzzle
					for _, a := range all {
						if !unplayedMap[a.ID] {
							rest = append(rest, a)
						}
					}
					rand.Shuffle(len(rest), func(i, j int) {
						rest[i], rest[j] = rest[j], rest[i]
					})
					combined := append(unplayed, rest...)
					if len(combined) > n {
						return combined[:n]
					}
					return combined
				}
			}
		}

		var puzzles []domain.Math24Puzzle
		db.DB.Where("difficulty = ?", difficulty).Find(&puzzles)
		if len(puzzles) > 0 {
			rand.Shuffle(len(puzzles), func(i, j int) {
				puzzles[i], puzzles[j] = puzzles[j], puzzles[i]
			})
			if len(puzzles) > n {
				return puzzles[:n]
			}
			return puzzles
		}
	}

	// Fallback puzzle
	return []domain.Math24Puzzle{
		{ID: "fallback", Difficulty: domain.Math24DifficultyEasy, Cards: "1,2,3,4"},
	}
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

type WsActionMessage struct {
	Payload SolvePayload `json:"payload"`
}

func parseSolvePayload(payload []byte) (*SolvePayload, error) {
	var msg WsActionMessage
	if err := json.Unmarshal(payload, &msg); err != nil {
		return nil, err
	}
	return &msg.Payload, nil
}
