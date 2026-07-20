import re

filepath = "/home/zd/x-game/backend/internal/handlers/rest/leaderboard.go"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

new_func = """
// GetGlobalLeaderboard returns a ranked list of all users based on XP.
// Query params: limit (max 100)
func GetGlobalLeaderboard(c fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var currentUserID uint
	if v := c.Locals("user_id"); v != nil {
		currentUserID = uint(v.(float64))
	}

	type rawRow struct {
		UserID   uint   `gorm:"column:id"`
		Username string `gorm:"column:username"`
		XP       int    `gorm:"column:xp"`
		Level    int    `gorm:"column:level"`
	}

	var rows []rawRow
	db.DB.Table("gm_users").
		Select("id, username, xp, level").
		Where("deleted_at IS NULL AND role != 'guest' AND xp > 0").
		Order("xp DESC").
		Limit(limit).
		Scan(&rows)

	entries := make([]fiber.Map, 0, len(rows))
	myRank := 0
	for i, r := range rows {
		isCurrentUser := r.UserID == currentUserID
		if isCurrentUser {
			myRank = i + 1
		}
		entries = append(entries, fiber.Map{
			"rank":            i + 1,
			"user_id":         r.UserID,
			"username":        r.Username,
			"xp":              r.XP,
			"level":           r.Level,
			"is_current_user": isCurrentUser,
		})
	}

	if currentUserID > 0 && myRank == 0 {
		var user domain.User
		if err := db.DB.Where("id = ?", currentUserID).First(&user).Error; err == nil && user.XP > 0 {
			var rank int64
			db.DB.Table("gm_users").
				Where("deleted_at IS NULL AND role != 'guest' AND xp > ?", user.XP).
				Count(&rank)
			myRank = int(rank) + 1
		}
	}

	return c.JSON(fiber.Map{
		"entries": entries,
		"my_rank": myRank,
		"game_id": "global",
	})
}
"""

if "GetGlobalLeaderboard" not in content:
    content = content + "\n" + new_func
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added GetGlobalLeaderboard")
else:
    print("GetGlobalLeaderboard already exists")

