package rest

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/service"
	"github.com/x-game/backend/pkg/db"
)

// GetTodayChallenge returns today's daily challenge and the current user's completion status.
func GetTodayChallenge(c fiber.Ctx) error {
	today := time.Now().Format("2006-01-02")

	var challenge domain.DailyChallenge
	if err := db.DB.Where("date = ? AND is_active = true", today).First(&challenge).Error; err != nil {
		return c.JSON(fiber.Map{"challenge": nil, "message": "No challenge today"})
	}

	response := fiber.Map{"challenge": challenge}

	// Check user completion
	if v := c.Locals("user_id"); v != nil {
		userID := uint(v.(float64))
		var completion domain.UserDailyChallenge
		if err := db.DB.Where("user_id = ? AND daily_challenge_id = ?", userID, challenge.ID).First(&completion).Error; err == nil {
			response["completion"] = completion
			response["is_completed"] = true
		} else {
			response["is_completed"] = false
		}
	}

	return c.JSON(response)
}

type FinishDailyChallengeRequest struct {
	Score     int `json:"score"`
	TimeTaken int `json:"time_taken"`
}

// FinishDailyChallenge records a user completing today's challenge.
func FinishDailyChallenge(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	today := time.Now().Format("2006-01-02")
	var challenge domain.DailyChallenge
	if err := db.DB.Where("date = ? AND is_active = true", today).First(&challenge).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "No active challenge today"})
	}

	// Prevent duplicate completion
	var existing domain.UserDailyChallenge
	if err := db.DB.Where("user_id = ? AND daily_challenge_id = ?", userID, challenge.ID).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Already completed today's challenge"})
	}

	var req FinishDailyChallengeRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Award XP
	xpResult := service.AddXP(userID, service.XPDailyChallenge)

	// Record completion
	completion := domain.UserDailyChallenge{
		UserID:           userID,
		DailyChallengeID: challenge.ID,
		CompletedAt:      time.Now(),
		Score:            req.Score,
		TimeTaken:        req.TimeTaken,
		XPEarned:         service.XPDailyChallenge,
	}
	db.DB.Create(&completion)

	// Check achievements
	newAchievements := service.CheckAchievements(service.AchievementContext{
		UserID:  userID,
		GameID:  challenge.GameID,
		IsDaily: true,
	})

	return c.JSON(fiber.Map{
		"status":           "ok",
		"xp_result":        xpResult,
		"new_achievements": newAchievements,
		"completion":       completion,
	})
}

// GetDailyChallengeHistory returns the user's daily challenge completion history.
func GetDailyChallengeHistory(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID := uint(userIDVal.(float64))

	var records []domain.UserDailyChallenge
	db.DB.Where("user_id = ?", userID).Order("completed_at desc").Limit(60).Find(&records)

	// Enrich with challenge info
	type HistoryItem struct {
		domain.UserDailyChallenge
		Challenge domain.DailyChallenge `json:"challenge"`
	}

	items := make([]HistoryItem, 0, len(records))
	for _, r := range records {
		var ch domain.DailyChallenge
		db.DB.First(&ch, r.DailyChallengeID)
		items = append(items, HistoryItem{UserDailyChallenge: r, Challenge: ch})
	}

	return c.JSON(fiber.Map{"history": items})
}

// --- Admin handlers ---

// AdminListDailyChallenges lists all scheduled daily challenges.
func AdminListDailyChallenges(c fiber.Ctx) error {
	month := c.Query("month") // e.g. "2024-01"
	q := db.DB.Order("date desc")
	if month != "" {
		q = q.Where("date LIKE ?", month+"%")
	}
	var challenges []domain.DailyChallenge
	q.Limit(62).Find(&challenges)
	return c.JSON(fiber.Map{"challenges": challenges})
}

type AdminDailyChallengeRequest struct {
	Date       string `json:"date"`
	GameID     string `json:"game_id"`
	Mode       string `json:"mode"`
	Difficulty string `json:"difficulty"`
	PuzzleID   *uint  `json:"puzzle_id"`
	Config     string `json:"config"`
	IsActive   *bool  `json:"is_active"`
}

// AdminCreateDailyChallenge creates a single daily challenge entry.
func AdminCreateDailyChallenge(c fiber.Ctx) error {
	var req AdminDailyChallengeRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}
	if req.Date == "" || req.GameID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "date and game_id are required"})
	}

	mode := req.Mode
	if mode == "" {
		mode = "single"
	}
	config := req.Config
	if config == "" {
		config = "{}"
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	ch := domain.DailyChallenge{
		Date:       req.Date,
		GameID:     req.GameID,
		Mode:       mode,
		Difficulty: req.Difficulty,
		PuzzleID:   req.PuzzleID,
		Config:     config,
		IsActive:   isActive,
	}
	if err := db.DB.Create(&ch).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create: " + err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(ch)
}

// AdminBulkCreateDailyChallenges creates challenges for a date range.
func AdminBulkCreateDailyChallenges(c fiber.Ctx) error {
	var req struct {
		Challenges []AdminDailyChallengeRequest `json:"challenges"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	created := 0
	for _, r := range req.Challenges {
		if r.Date == "" || r.GameID == "" {
			continue
		}
		mode := r.Mode
		if mode == "" {
			mode = "single"
		}
		config := r.Config
		if config == "" {
			config = "{}"
		}
		ch := domain.DailyChallenge{
			Date: r.Date, GameID: r.GameID, Mode: mode,
			Difficulty: r.Difficulty, PuzzleID: r.PuzzleID,
			Config: config, IsActive: true,
		}
		// Skip if date already exists
		if err := db.DB.Where("date = ?", r.Date).FirstOrCreate(&ch).Error; err == nil {
			created++
		}
	}

	return c.JSON(fiber.Map{"created": created})
}

// AdminUpdateDailyChallenge updates a daily challenge entry.
func AdminUpdateDailyChallenge(c fiber.Ctx) error {
	id := c.Params("id")
	var ch domain.DailyChallenge
	if err := db.DB.First(&ch, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Not found"})
	}
	if err := c.Bind().Body(&ch); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}
	db.DB.Save(&ch)
	return c.JSON(ch)
}

// AdminDeleteDailyChallenge deletes a daily challenge entry.
func AdminDeleteDailyChallenge(c fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&domain.DailyChallenge{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete"})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}
