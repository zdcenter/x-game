package service

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

type QuestDef struct {
	ID        string `json:"id"`
	TitleKey  string `json:"title_key"`
	DescKey   string `json:"desc_key"`
	Icon      string `json:"icon"`
	Target    int    `json:"target"`
	XPAmount  int    `json:"xp_amount"`
	Coins     int    `json:"coins"`
	ActionURL string `json:"action_url"`
}

var StandardQuests = []QuestDef{
	{
		ID:        "solo_play",
		TitleKey:  "quests.solo_title",
		DescKey:   "quests.solo_desc",
		Icon:      "🎮",
		Target:    1,
		XPAmount:  20,
		Coins:     20,
		ActionURL: "/lobby",
	},
	{
		ID:        "pk_play",
		TitleKey:  "quests.pk_title",
		DescKey:   "quests.pk_desc",
		Icon:      "⚔️",
		Target:    1,
		XPAmount:  30,
		Coins:     30,
		ActionURL: "/pk-arena",
	},
	{
		ID:        "win_game",
		TitleKey:  "quests.win_title",
		DescKey:   "quests.win_desc",
		Icon:      "👑",
		Target:    1,
		XPAmount:  50,
		Coins:     50,
		ActionURL: "/lobby",
	},
}

type DailyQuestItem struct {
	ID        string `json:"id"`
	TitleKey  string `json:"title_key"`
	DescKey   string `json:"desc_key"`
	Icon      string `json:"icon"`
	Current   int    `json:"current"`
	Target    int    `json:"target"`
	XPAmount  int    `json:"xp_amount"`
	Coins     int    `json:"coins"`
	Completed bool   `json:"completed"`
	Claimed   bool   `json:"claimed"`
	ActionURL string `json:"action_url"`
}

type DailyChestItem struct {
	ID        string `json:"id"`
	TitleKey  string `json:"title_key"`
	DescKey   string `json:"desc_key"`
	Icon      string `json:"icon"`
	Completed bool   `json:"completed"`
	Claimed   bool   `json:"claimed"`
	XPAmount  int    `json:"xp_amount"`
	Coins     int    `json:"coins"`
}

type StreakMilestone struct {
	Days       int    `json:"days"`
	XPAmount   int    `json:"xp_amount"`
	Coins      int    `json:"coins"`
	TitleKey   string `json:"title_key"`
	RewardDesc string `json:"reward_desc"`
	RewardIcon string `json:"reward_icon"`
	Reached    bool   `json:"reached"`
}

var DefinedMilestones = []StreakMilestone{
	{Days: 3, XPAmount: 50, Coins: 100, TitleKey: "milestones.day3_title", RewardDesc: "milestones.day3_desc", RewardIcon: "🧊"},
	{Days: 7, XPAmount: 150, Coins: 300, TitleKey: "milestones.day7_title", RewardDesc: "milestones.day7_desc", RewardIcon: "📜"},
	{Days: 14, XPAmount: 300, Coins: 600, TitleKey: "milestones.day14_title", RewardDesc: "milestones.day14_desc", RewardIcon: "🔥"},
	{Days: 30, XPAmount: 1000, Coins: 2000, TitleKey: "milestones.day30_title", RewardDesc: "milestones.day30_desc", RewardIcon: "👑"},
}

type DailyQuestsResponse struct {
	Date           string            `json:"date"`
	Streak         int               `json:"streak"`
	StreakFreezes  int               `json:"streak_freezes"`
	BrainCoins     int               `json:"brain_coins"`
	Quests         []DailyQuestItem  `json:"quests"`
	Chest          DailyChestItem    `json:"chest"`
	CompletedCount int               `json:"completed_count"`
	TotalCount     int               `json:"total_count"`
	AllCompleted   bool              `json:"all_completed"`
	Milestones     []StreakMilestone `json:"milestones"`
}

// GetDailyQuests retrieves or initializes today's quests for a user
func GetDailyQuests(userID uint) (*DailyQuestsResponse, error) {
	today := time.Now().Format("2006-01-02")
	totalCount := len(StandardQuests)

	resp := &DailyQuestsResponse{
		Date:       today,
		TotalCount: totalCount,
		Quests:     make([]DailyQuestItem, 0, totalCount),
		Chest: DailyChestItem{
			ID:       "daily_chest",
			TitleKey: "quests.chest_title",
			DescKey:  "quests.chest_desc",
			Icon:     "🎁",
			XPAmount: 50,
			Coins:    100,
		},
	}

	// Calculate milestone reached statuses
	milestones := make([]StreakMilestone, len(DefinedMilestones))
	copy(milestones, DefinedMilestones)

	if userID == 0 {
		// Guest / Unauthenticated: return template quests with 0 progress
		for _, q := range StandardQuests {
			resp.Quests = append(resp.Quests, DailyQuestItem{
				ID:        q.ID,
				TitleKey:  q.TitleKey,
				DescKey:   q.DescKey,
				Icon:      q.Icon,
				Current:   0,
				Target:    q.Target,
				XPAmount:  q.XPAmount,
				Coins:     q.Coins,
				Completed: false,
				Claimed:   false,
				ActionURL: q.ActionURL,
			})
		}
		resp.Milestones = milestones
		return resp, nil
	}

	// Fetch user streak, freezes, and brain coins
	var user domain.User
	if err := db.DB.Select("login_streak, last_login_date, streak_freezes, brain_coins").First(&user, userID).Error; err == nil {
		resp.Streak = user.LoginStreak
		resp.StreakFreezes = user.StreakFreezes
		resp.BrainCoins = user.BrainCoins
	}

	for i := range milestones {
		milestones[i].Reached = resp.Streak >= milestones[i].Days
	}
	resp.Milestones = milestones

	// Fetch user's quests for today
	var dbQuests []domain.UserDailyQuest
	db.DB.Where("user_id = ? AND date = ?", userID, today).Find(&dbQuests)

	questMap := make(map[string]domain.UserDailyQuest)
	for _, q := range dbQuests {
		questMap[q.QuestID] = q
	}

	completedCount := 0

	for _, def := range StandardQuests {
		existing, found := questMap[def.ID]
		if !found {
			existing = domain.UserDailyQuest{
				UserID:    userID,
				Date:      today,
				QuestID:   def.ID,
				Current:   0,
				Target:    def.Target,
				XPAmount:  def.XPAmount,
				Completed: false,
				Claimed:   false,
			}
			db.DB.Create(&existing)
			questMap[def.ID] = existing
		}

		if existing.Completed {
			completedCount++
		}

		resp.Quests = append(resp.Quests, DailyQuestItem{
			ID:        def.ID,
			TitleKey:  def.TitleKey,
			DescKey:   def.DescKey,
			Icon:      def.Icon,
			Current:   existing.Current,
			Target:    existing.Target,
			XPAmount:  existing.XPAmount,
			Coins:     def.Coins,
			Completed: existing.Completed,
			Claimed:   existing.Claimed,
			ActionURL: def.ActionURL,
		})
	}

	// Check chest status
	chestRecord, hasChest := questMap["daily_chest"]
	if !hasChest {
		chestRecord = domain.UserDailyQuest{
			UserID:    userID,
			Date:      today,
			QuestID:   "daily_chest",
			Current:   completedCount,
			Target:    totalCount,
			XPAmount:  50,
			Completed: completedCount >= totalCount,
			Claimed:   false,
		}
		db.DB.Create(&chestRecord)
	} else if !chestRecord.Completed && completedCount >= totalCount {
		chestRecord.Completed = true
		chestRecord.Current = totalCount
		db.DB.Save(&chestRecord)
	}

	resp.CompletedCount = completedCount
	resp.AllCompleted = completedCount >= totalCount
	resp.Chest.Completed = chestRecord.Completed
	resp.Chest.Claimed = chestRecord.Claimed

	return resp, nil
}

// ProgressDailyQuest increments quest progress upon game actions
func ProgressDailyQuest(userID uint, questID string, amount int) {
	if userID == 0 || amount <= 0 {
		return
	}
	today := time.Now().Format("2006-01-02")

	var quest domain.UserDailyQuest
	err := db.DB.Where("user_id = ? AND date = ? AND quest_id = ?", userID, today, questID).First(&quest).Error
	if err != nil {
		target := 1
		xp := 20
		for _, q := range StandardQuests {
			if q.ID == questID {
				target = q.Target
				xp = q.XPAmount
				break
			}
		}
		quest = domain.UserDailyQuest{
			UserID:    userID,
			Date:      today,
			QuestID:   questID,
			Current:   amount,
			Target:    target,
			XPAmount:  xp,
			Completed: amount >= target,
		}
		db.DB.Create(&quest)
	} else {
		quest.Current += amount
		if quest.Current >= quest.Target {
			quest.Completed = true
		}
		db.DB.Save(&quest)
	}

	// Check if all standard quests are completed
	var count int64
	db.DB.Model(&domain.UserDailyQuest{}).
		Where("user_id = ? AND date = ? AND quest_id != 'daily_chest' AND completed = true", userID, today).
		Count(&count)

	if int(count) >= len(StandardQuests) {
		var chest domain.UserDailyQuest
		if err := db.DB.Where("user_id = ? AND date = ? AND quest_id = 'daily_chest'", userID, today).First(&chest).Error; err == nil {
			if !chest.Completed {
				chest.Completed = true
				chest.Current = len(StandardQuests)
				db.DB.Save(&chest)
			}
		} else {
			chest = domain.UserDailyQuest{
				UserID:    userID,
				Date:      today,
				QuestID:   "daily_chest",
				Current:   len(StandardQuests),
				Target:    len(StandardQuests),
				XPAmount:  50,
				Completed: true,
			}
			db.DB.Create(&chest)
		}
	}
}

type DailyQuestClaimResult struct {
	QuestID         string   `json:"quest_id"`
	XPAmount        int      `json:"xp_amount"`
	CoinsAmount     int      `json:"coins_amount"`
	XPResult        XPResult `json:"xp_result"`
	Streak          int      `json:"streak"`
	StreakFreezes   int      `json:"streak_freezes"`
	BrainCoins      int      `json:"brain_coins"`
	MilestoneNotice string   `json:"milestone_notice,omitempty"`
}

// AddUnlockedItem safely appends an item ID into the JSON string array field
func AddUnlockedItem(currentJSON, newItemID string) string {
	var list []string
	_ = json.Unmarshal([]byte(currentJSON), &list)
	for _, id := range list {
		if id == newItemID {
			return currentJSON
		}
	}
	list = append(list, newItemID)
	data, _ := json.Marshal(list)
	return string(data)
}

// ClaimDailyQuest awards XP, coins, and updates streak
func ClaimDailyQuest(userID uint, questID string) (*DailyQuestClaimResult, error) {
	today := time.Now().Format("2006-01-02")

	var quest domain.UserDailyQuest
	if err := db.DB.Where("user_id = ? AND date = ? AND quest_id = ?", userID, today, questID).First(&quest).Error; err != nil {
		return nil, errors.New("quest not found")
	}

	if !quest.Completed {
		return nil, errors.New("quest not yet completed")
	}

	if quest.Claimed {
		return nil, errors.New("quest already claimed")
	}

	quest.Claimed = true
	db.DB.Save(&quest)

	// Coins lookup
	coinsEarned := 20
	if questID == "pk_play" {
		coinsEarned = 30
	} else if questID == "win_game" {
		coinsEarned = 50
	} else if questID == "daily_chest" {
		coinsEarned = 100
	}

	xpRes := AddXP(userID, quest.XPAmount)

	var user domain.User
	db.DB.First(&user, userID)
	user.BrainCoins += coinsEarned

	milestoneNotice := ""

	if questID == "daily_chest" {
		user.LoginStreak++

		// Check milestones
		switch user.LoginStreak {
		case 3:
			user.XP += 50
			user.BrainCoins += 100
			if user.StreakFreezes < 2 {
				user.StreakFreezes++
			}
			milestoneNotice = "🎉 达成 3 天连胜！获得 1 张连胜保护卡 🧊 与 +100 脑力金币！"
		case 7:
			user.XP += 150
			user.BrainCoins += 300
			user.UnlockedTitles = AddUnlockedItem(user.UnlockedTitles, "persistent")
			milestoneNotice = "🎉 达成 7 天连胜！解锁专属称号「坚持不懈」与 +300 脑力金币！"
		case 14:
			user.XP += 300
			user.BrainCoins += 600
			user.UnlockedFrames = AddUnlockedItem(user.UnlockedFrames, "frame-flame")
			milestoneNotice = "🎉 达成 14 天连胜！解锁「烈焰之环」🔥 动态头像框与 +600 脑力金币！"
		case 30:
			user.XP += 1000
			user.BrainCoins += 2000
			user.UnlockedTitles = AddUnlockedItem(user.UnlockedTitles, "puzzle_legend")
			user.UnlockedFrames = AddUnlockedItem(user.UnlockedFrames, "frame-gold")
			milestoneNotice = "👑 达成 30 天传奇连胜！解锁「皇家流金」头像框与「益智王者」至尊称号！"
		}
	}

	db.DB.Model(&user).Updates(map[string]any{
		"xp":              user.XP,
		"level":           CalcLevel(user.XP),
		"login_streak":    user.LoginStreak,
		"streak_freezes":  user.StreakFreezes,
		"brain_coins":     user.BrainCoins,
		"unlocked_titles": user.UnlockedTitles,
		"unlocked_frames": user.UnlockedFrames,
	})

	return &DailyQuestClaimResult{
		QuestID:         questID,
		XPAmount:        quest.XPAmount,
		CoinsAmount:     coinsEarned,
		XPResult:        xpRes,
		Streak:          user.LoginStreak,
		StreakFreezes:   user.StreakFreezes,
		BrainCoins:      user.BrainCoins,
		MilestoneNotice: milestoneNotice,
	}, nil
}
