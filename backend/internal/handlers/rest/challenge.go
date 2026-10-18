package rest

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type CreateChallengeReq struct {
	GameID      string `json:"game_id"`
	Mode        string `json:"mode"`
	Difficulty  string `json:"difficulty"`
	Seed        string `json:"seed"`
	TargetScore int    `json:"target_score"`
	TargetTime  int    `json:"target_time"`
}

func generateChallengeID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return fmt.Sprintf("ch_%x", hex.EncodeToString(b))
}

// CreateChallenge creates a new ghost challenge
func CreateChallenge(c fiber.Ctx) error {
	var userID uint
	challengerName := "神秘挑战者"

	if userIDVal := c.Locals("user_id"); userIDVal != nil {
		userID = uint(userIDVal.(float64))
		var user domain.User
		if err := db.DB.Select("username").First(&user, userID).Error; err == nil && user.Username != "" {
			challengerName = user.Username
		}
	}

	var req CreateChallengeReq
	if err := c.Bind().Body(&req); err != nil || req.GameID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid challenge payload"})
	}

	challenge := domain.GhostChallenge{
		ID:             generateChallengeID(),
		ChallengerID:   userID,
		ChallengerName: challengerName,
		GameID:         req.GameID,
		Mode:           req.Mode,
		Difficulty:     req.Difficulty,
		Seed:           req.Seed,
		TargetScore:    req.TargetScore,
		TargetTime:     req.TargetTime,
		CreatedAt:      time.Now(),
	}

	if err := db.DB.Create(&challenge).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create challenge"})
	}

	return c.JSON(fiber.Map{
		"success":        true,
		"challenge_id":   challenge.ID,
		"challenger_name": challenge.ChallengerName,
		"game_id":        challenge.GameID,
		"target_score":   challenge.TargetScore,
		"target_time":    challenge.TargetTime,
	})
}

// GetChallenge retrieves challenge details
func GetChallenge(c fiber.Ctx) error {
	id := c.Params("id")
	var challenge domain.GhostChallenge
	if err := db.DB.Where("id = ?", id).First(&challenge).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Challenge not found"})
	}
	return c.JSON(challenge)
}

type CompleteChallengeReq struct {
	Score int  `json:"score"`
	Time  int  `json:"time"`
	Won   bool `json:"won"`
}

// CompleteChallenge checks results of an accepted challenge
func CompleteChallenge(c fiber.Ctx) error {
	id := c.Params("id")
	var challenge domain.GhostChallenge
	if err := db.DB.Where("id = ?", id).First(&challenge).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Challenge not found"})
	}

	var req CompleteChallengeReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	beaten := false
	diff := 0

	if challenge.TargetTime > 0 {
		// Time-based game (faster is better)
		if req.Won && req.Time > 0 && req.Time < challenge.TargetTime {
			beaten = true
			diff = challenge.TargetTime - req.Time
		} else {
			diff = req.Time - challenge.TargetTime
		}
	} else if challenge.TargetScore > 0 {
		// Score-based game (higher is better)
		if req.Score > challenge.TargetScore {
			beaten = true
			diff = req.Score - challenge.TargetScore
		} else {
			diff = challenge.TargetScore - req.Score
		}
	}

	// Update challenge stats
	challenge.AcceptCount++
	if beaten {
		challenge.BeatenCount++
	}
	db.DB.Model(&challenge).Updates(map[string]any{
		"accept_count": challenge.AcceptCount,
		"beaten_count": challenge.BeatenCount,
	})

	return c.JSON(fiber.Map{
		"success":         true,
		"beaten":          beaten,
		"diff":            diff,
		"challenger_name": challenge.ChallengerName,
		"target_time":     challenge.TargetTime,
		"target_score":    challenge.TargetScore,
		"user_time":       req.Time,
		"user_score":      req.Score,
	})
}
