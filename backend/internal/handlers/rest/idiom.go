package rest

import (
	"encoding/json"
	"math/rand"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/service"
	"github.com/x-game/backend/pkg/db"
)

const idiomMaxGuesses = 6
const idiomMasteryThreshold = 3 // consecutive correct answers to mark as mastered
const idiomForgottenDays = 14   // days before mastered idiom re-enters pool

// High-frequency distractor characters (200 common hanzi, none overlap with idiom chars at runtime)
const idiomDistractorPool = "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更刷加粮格并示才几石类精采满号"

type charResult struct {
	Char   string `json:"char"`
	Status string `json:"status"` // correct | present | absent
}

type guessRecord struct {
	GuessSeq int          `json:"guess_seq"`
	Guess    string       `json:"guess"`
	Result   []charResult `json:"result"`
}

// ---------- helpers ----------

func todayKey() string {
	return time.Now().Format("2006-01-02")
}

func runeSlice(s string) []rune {
	return []rune(s)
}

// colorize implements the two-pass Wordle algorithm for Chinese characters.
func colorize(guess, target []rune) []charResult {
	result := make([]charResult, len(target))
	used := make([]bool, len(target))

	// Pass 1: exact matches (green)
	for i := range guess {
		if i < len(target) && guess[i] == target[i] {
			result[i] = charResult{Char: string(guess[i]), Status: "correct"}
			used[i] = true
		}
	}
	// Pass 2: present but wrong position (yellow) or absent (grey)
	for i := range guess {
		if result[i].Status == "correct" {
			continue
		}
		result[i] = charResult{Char: string(guess[i]), Status: "absent"}
		for j := range target {
			if !used[j] && guess[i] == target[j] {
				result[i].Status = "present"
				used[j] = true
				break
			}
		}
	}
	return result
}

// buildKeyboard returns count shuffled chars: idiom chars + distractors (excluding idiom chars).
func buildKeyboard(word string, count int, rng *rand.Rand) []string {
	idiomChars := runeSlice(word)
	exclude := make(map[rune]bool)
	for _, c := range idiomChars {
		exclude[c] = true
	}

	pool := []rune(idiomDistractorPool)
	var available []rune
	for _, c := range pool {
		if !exclude[c] {
			available = append(available, c)
		}
	}

	needed := count - len(idiomChars)
	if needed < 0 {
		needed = 0
	}
	rng.Shuffle(len(available), func(i, j int) { available[i], available[j] = available[j], available[i] })
	distractors := available
	if len(distractors) > needed {
		distractors = distractors[:needed]
	}

	all := append(idiomChars, distractors...)
	rng.Shuffle(len(all), func(i, j int) { all[i], all[j] = all[j], all[i] })

	result := make([]string, len(all))
	for i, r := range all {
		result[i] = string(r)
	}
	return result
}

// getOrCreateDailyChallenge returns (or creates) today's Wordle challenge.
func getOrCreateDailyChallenge() (*domain.IdiomDailyChallenge, *domain.Idiom, error) {
	key := todayKey()
	var challenge domain.IdiomDailyChallenge
	if err := db.DB.Where("date_key = ?", key).First(&challenge).Error; err == nil {
		var idiom domain.Idiom
		db.DB.First(&idiom, challenge.IdiomID)
		return &challenge, &idiom, nil
	}

	// Pick today's idiom deterministically from date
	t, _ := time.Parse("2006-01-02", key)
	seed := t.Unix()
	rng := rand.New(rand.NewSource(seed))

	var idioms []domain.Idiom
	db.DB.Where("is_daily_target = ?", true).Find(&idioms)
	if len(idioms) == 0 {
		return nil, nil, fiber.ErrServiceUnavailable
	}
	idiom := idioms[rng.Intn(len(idioms))]

	keyboard := buildKeyboard(idiom.Word, 20, rng)
	kbJSON, _ := json.Marshal(keyboard)

	challenge = domain.IdiomDailyChallenge{
		DateKey:  key,
		IdiomID:  idiom.ID,
		Keyboard: string(kbJSON),
	}
	db.DB.Create(&challenge)
	return &challenge, &idiom, nil
}

// ---------- handlers ----------

// GET /idiom/daily/state — existing guesses + hints for today
func IdiomDailyState(c fiber.Ctx) error {
	challenge, idiom, err := getOrCreateDailyChallenge()
	if err != nil {
		return fiber.ErrServiceUnavailable
	}

	type resp struct {
		Keyboard    []string      `json:"keyboard"`               // 20 chars: 4 answer + 16 distractors
		Guesses     []guessRecord `json:"guesses"`
		IsComplete  bool          `json:"is_complete"`
		GuessCount  int           `json:"guess_count"`
		HintSource  string        `json:"hint_source"`            // derivation, always shown
		HintMeaning string        `json:"hint_meaning,omitempty"` // explanation, after 2+ guesses
		Explanation string        `json:"explanation,omitempty"`
		Story       string        `json:"story,omitempty"`
		Word        string        `json:"word,omitempty"`
	}

	userID := getUserID(c)
	var guesses []guessRecord
	isComplete := false

	if userID != nil {
		var rows []domain.UserIdiomDailyGuess
		db.DB.Where("user_id = ? AND date_key = ?", *userID, challenge.DateKey).
			Order("guess_seq asc").Find(&rows)

		for _, row := range rows {
			var res []charResult
			json.Unmarshal([]byte(row.Result), &res)
			guesses = append(guesses, guessRecord{
				GuessSeq: row.GuessSeq,
				Guess:    row.Guess,
				Result:   res,
			})
			win := true
			for _, r := range res {
				if r.Status != "correct" {
					win = false
					break
				}
			}
			if win || len(rows) >= idiomMaxGuesses {
				isComplete = true
			}
		}
	}

	var keyboard []string
	json.Unmarshal([]byte(challenge.Keyboard), &keyboard)

	r := resp{
		Keyboard:   keyboard,
		Guesses:    guesses,
		IsComplete: isComplete,
		GuessCount: len(guesses),
		HintSource: idiom.Derivation, // always reveal source/derivation
	}
	if len(guesses) >= 2 {
		r.HintMeaning = idiom.Explanation // unlock meaning after 2 failed attempts
	}
	if isComplete {
		r.Explanation = idiom.Explanation
		r.Story = idiom.Story
		r.Word = idiom.Word
		r.HintMeaning = idiom.Explanation
	}
	return c.JSON(r)
}

// POST /idiom/daily/guess — submit a Wordle guess
func IdiomDailyGuess(c fiber.Ctx) error {
	userID := getUserID(c)
	if userID == nil {
		return fiber.ErrUnauthorized
	}

	var req struct {
		Guess string `json:"guess"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return fiber.ErrBadRequest
	}
	req.Guess = strings.TrimSpace(req.Guess)
	if len([]rune(req.Guess)) != 4 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "guess must be 4 characters"})
	}

	challenge, idiom, err := getOrCreateDailyChallenge()
	if err != nil {
		return fiber.ErrServiceUnavailable
	}

	// Check existing guess count
	var count int64
	db.DB.Model(&domain.UserIdiomDailyGuess{}).
		Where("user_id = ? AND date_key = ?", *userID, challenge.DateKey).Count(&count)

	if count >= int64(idiomMaxGuesses) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "no guesses remaining"})
	}

	// Check already won
	var existing []domain.UserIdiomDailyGuess
	db.DB.Where("user_id = ? AND date_key = ?", *userID, challenge.DateKey).
		Order("guess_seq asc").Find(&existing)
	for _, g := range existing {
		var res []charResult
		json.Unmarshal([]byte(g.Result), &res)
		allCorrect := true
		for _, r := range res {
			if r.Status != "correct" {
				allCorrect = false
				break
			}
		}
		if allCorrect {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "already won"})
		}
	}

	// Validate that the guess is a known idiom
	var guessIdiom domain.Idiom
	if err := db.DB.Where("word = ?", req.Guess).First(&guessIdiom).Error; err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "not_valid_idiom",
			"message": "不是有效成语，请重新输入",
		})
	}

	result := colorize(runeSlice(req.Guess), runeSlice(idiom.Word))
	resultJSON, _ := json.Marshal(result)

	seq := int(count) + 1
	db.DB.Create(&domain.UserIdiomDailyGuess{
		UserID:   *userID,
		DateKey:  challenge.DateKey,
		GuessSeq: seq,
		Guess:    req.Guess,
		Result:   string(resultJSON),
	})

	isWin := true
	for _, r := range result {
		if r.Status != "correct" {
			isWin = false
			break
		}
	}
	isLastGuess := seq >= idiomMaxGuesses
	newGuessCount := seq

	type resp struct {
		Result      []charResult `json:"result"`
		IsWin       bool         `json:"is_win"`
		GuessSeq    int          `json:"guess_seq"`
		Remaining   int          `json:"remaining"`
		HintMeaning string       `json:"hint_meaning,omitempty"` // unlocked after 2 guesses
		Explanation string       `json:"explanation,omitempty"`
		Story       string       `json:"story,omitempty"`
		Word        string       `json:"word,omitempty"`
	}

	r := resp{
		Result:    result,
		IsWin:     isWin,
		GuessSeq:  seq,
		Remaining: idiomMaxGuesses - seq,
	}
	if newGuessCount >= 2 && !isWin {
		r.HintMeaning = idiom.Explanation
	}
	if isWin || isLastGuess {
		r.Explanation = idiom.Explanation
		r.Story = idiom.Story
		r.Word = idiom.Word
		// Update UserGameStat
		go func() {
			score := 0
			if isWin {
				score = (idiomMaxGuesses-seq+1)*100 + 100
			}
			upsertIdiomStat(*userID, "daily", score)
		}()
	}
	return c.JSON(r)
}

// GET /idiom/fill — get a weighted fill-in-blank question
func IdiomGetFill(c fiber.Ctx) error {
	userID := getUserID(c)
	difficulty := c.Query("difficulty") // optional: easy | medium | hard

	var idiom domain.Idiom
	if userID != nil {
		idiom = weightedPickIdiom(*userID, difficulty)
	} else {
		q := db.DB.Order("RANDOM()")
		if difficulty != "" {
			q = q.Where("difficulty = ?", difficulty)
		}
		q.First(&idiom)
	}
	// Fallback: stale progress reference returned empty word
	if idiom.Word == "" {
		db.DB.Order("RANDOM()").First(&idiom)
	}

	// Decide which positions to blank (1 or 2)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	chars := runeSlice(idiom.Word)
	numBlanks := 1
	if rng.Float32() < 0.4 {
		numBlanks = 2
	}

	positions := rng.Perm(4)[:numBlanks]
	posSet := make(map[int]bool)
	for _, p := range positions {
		posSet[p] = true
	}

	display := make([]string, 4)
	for i, c := range chars {
		if posSet[i] {
			display[i] = "_"
		} else {
			display[i] = string(c)
		}
	}

	keyboard := buildKeyboard(idiom.Word, 12, rng)

	// Update last_played_at for authenticated users
	if userID != nil {
		now := time.Now()
		db.DB.Model(&domain.UserIdiomProgress{}).
			Where("user_id = ? AND idiom_id = ?", *userID, idiom.ID).
			Update("last_played_at", now)
		// Create progress row if not exists
		var prog domain.UserIdiomProgress
		if err := db.DB.Where("user_id = ? AND idiom_id = ?", *userID, idiom.ID).First(&prog).Error; err != nil {
			db.DB.Create(&domain.UserIdiomProgress{UserID: *userID, IdiomID: idiom.ID, LastPlayedAt: &now})
		}
	}

	return c.JSON(fiber.Map{
		"idiom_id": idiom.ID,
		"display":  display,
		"keyboard": keyboard,
	})
}

// POST /idiom/fill/submit — submit fill-in-blank answer
func IdiomSubmitFill(c fiber.Ctx) error {
	var req struct {
		IdiomID uint     `json:"idiom_id"`
		Answer  []string `json:"answer"` // full 4-char answer
	}
	if err := c.Bind().JSON(&req); err != nil {
		return fiber.ErrBadRequest
	}

	var idiom domain.Idiom
	if err := db.DB.First(&idiom, req.IdiomID).Error; err != nil {
		return fiber.ErrNotFound
	}

	answer := strings.Join(req.Answer, "")
	isCorrect := answer == idiom.Word

	userID := getUserID(c)
	consecutiveCorrect := 0
	isMastered := false
	var xpResult *service.XPResult
	if userID != nil {
		updateFillProgress(*userID, idiom.ID, isCorrect)
		// Read back the updated progress to return per-idiom stats
		var prog domain.UserIdiomProgress
		if err := db.DB.Where("user_id = ? AND idiom_id = ?", *userID, idiom.ID).First(&prog).Error; err == nil {
			consecutiveCorrect = prog.ConsecutiveCorrect
			isMastered = prog.IsMastered
		}
		if isCorrect {
			xpAmount := service.XPSinglePlay // 2 XP for regular correct
			if isMastered && consecutiveCorrect == idiomMasteryThreshold {
				xpAmount = 8 // bonus XP on the exact answer that achieves mastery
			}
			res := service.AddXP(*userID, xpAmount)
			xpResult = &res
		}
	}

	return c.JSON(fiber.Map{
		"is_correct":          isCorrect,
		"word":                idiom.Word,
		"pinyin":              idiom.Pinyin,
		"explanation":         idiom.Explanation,
		"story":               idiom.Story,
		"derivation":          idiom.Derivation,
		"consecutive_correct": consecutiveCorrect,
		"is_mastered":         isMastered,
		"xp_result":           xpResult,
	})
}

// GET /idiom/stats — user mastery stats with per-difficulty breakdown and today's activity
func IdiomStats(c fiber.Ctx) error {
	userID := getUserID(c)
	if userID == nil {
		return fiber.ErrUnauthorized
	}

	type diffStat struct {
		Difficulty string
		Total      int64
		Mastered   int64
		Played     int64
	}

	// Use raw SQL to avoid GORM JOIN alias issues with PostgreSQL
	type diffRow struct {
		Difficulty string
		Total      int64
		Mastered   int64
		Played     int64
	}
	var diffRows []diffRow
	db.DB.Raw(`
		SELECT i.difficulty,
		       COUNT(DISTINCT i.id)                                          AS total,
		       COUNT(DISTINCT CASE WHEN p.is_mastered THEN p.idiom_id END)  AS mastered,
		       COUNT(DISTINCT p.idiom_id)                                    AS played
		FROM gm_idioms i
		LEFT JOIN gm_user_idiom_progresses p
		       ON p.idiom_id = i.id AND p.user_id = ?
		WHERE i.difficulty IN ('easy','medium','hard')
		GROUP BY i.difficulty`, *userID).Scan(&diffRows)

	byDiff := make([]fiber.Map, 0, 3)
	var totalAll, masteredAll, playedAll int64
	diffOrder := []string{"easy", "medium", "hard"}
	rowMap := map[string]diffRow{}
	for _, r := range diffRows {
		rowMap[r.Difficulty] = r
	}
	for _, diff := range diffOrder {
		r := rowMap[diff]
		// total from idioms table (independent of user)
		var total int64
		db.DB.Raw("SELECT COUNT(*) FROM gm_idioms WHERE difficulty = ?", diff).Scan(&total)
		r.Total = total
		byDiff = append(byDiff, fiber.Map{
			"difficulty": diff,
			"total":      r.Total,
			"mastered":   r.Mastered,
			"played":     r.Played,
		})
		totalAll += r.Total
		masteredAll += r.Mastered
		playedAll += r.Played
	}

	// Today's activity (UTC day boundary)
	todayStart := time.Now().Truncate(24 * time.Hour)
	var todayPlayed int64
	db.DB.Raw("SELECT COUNT(*) FROM gm_user_idiom_progresses WHERE user_id = ? AND last_played_at >= ?",
		*userID, todayStart).Scan(&todayPlayed)

	var todayCorrect int64
	db.DB.Raw("SELECT COUNT(*) FROM gm_user_idiom_progresses WHERE user_id = ? AND last_correct_at >= ?",
		*userID, todayStart).Scan(&todayCorrect)

	return c.JSON(fiber.Map{
		"total":         totalAll,
		"mastered":      masteredAll,
		"played":        playedAll,
		"by_difficulty": byDiff,
		"today_played":  todayPlayed,
		"today_correct": todayCorrect,
	})
}

// GET /idiom/history?limit=20 — recent practice records
func IdiomHistory(c fiber.Ctx) error {
	userID := getUserID(c)
	if userID == nil {
		return fiber.ErrUnauthorized
	}

	limit := 20

	type historyRow struct {
		IdiomID            uint       `gorm:"column:idiom_id"`
		Word               string     `gorm:"column:word"`
		Pinyin             string     `gorm:"column:pinyin"`
		Explanation        string     `gorm:"column:explanation"`
		Difficulty         string     `gorm:"column:difficulty"`
		ConsecutiveCorrect int        `gorm:"column:consecutive_correct"`
		IsMastered         bool       `gorm:"column:is_mastered"`
		LastPlayedAt       *time.Time `gorm:"column:last_played_at"`
		LastCorrectAt      *time.Time `gorm:"column:last_correct_at"`
	}

	var rows []historyRow
	db.DB.Raw(`
		SELECT p.idiom_id, i.word, i.pinyin, i.explanation, i.difficulty,
		       p.consecutive_correct, p.is_mastered, p.last_played_at, p.last_correct_at
		FROM gm_user_idiom_progresses p
		JOIN gm_idioms i ON i.id = p.idiom_id
		WHERE p.user_id = ? AND p.last_played_at IS NOT NULL
		ORDER BY p.last_played_at DESC
		LIMIT ?`, *userID, limit).Scan(&rows)

	result := make([]fiber.Map, 0, len(rows))
	for _, r := range rows {
		var lastResult string
		if r.LastCorrectAt != nil && r.LastPlayedAt != nil &&
			r.LastCorrectAt.After(r.LastPlayedAt.Add(-2*time.Second)) {
			lastResult = "correct"
		} else if r.LastPlayedAt != nil {
			lastResult = "wrong"
		}
		result = append(result, fiber.Map{
			"idiom_id":            r.IdiomID,
			"word":                r.Word,
			"pinyin":              r.Pinyin,
			"explanation":         r.Explanation,
			"difficulty":          r.Difficulty,
			"consecutive_correct": r.ConsecutiveCorrect,
			"is_mastered":         r.IsMastered,
			"last_result":         lastResult,
			"last_played_at":      r.LastPlayedAt,
		})
	}

	return c.JSON(result)
}

// GET /idiom/daily/social — today's challenge participation stats
func IdiomDailySocial(c fiber.Ctx) error {
	key := todayKey()
	challenge, _, err := getOrCreateDailyChallenge()
	if err != nil {
		return fiber.ErrServiceUnavailable
	}

	var totalPlayers int64
	db.DB.Model(&domain.UserIdiomDailyGuess{}).
		Where("date_key = ?", key).
		Distinct("user_id").Count(&totalPlayers)

	// Count players who have all-correct in their last guess
	var guesses []domain.UserIdiomDailyGuess
	db.DB.Where("date_key = ?", key).Find(&guesses)

	winnerSet := make(map[uint]bool)
	for _, g := range guesses {
		var res []charResult
		json.Unmarshal([]byte(g.Result), &res)
		allCorrect := true
		for _, r := range res {
			if r.Status != "correct" {
				allCorrect = false
				break
			}
		}
		if allCorrect {
			winnerSet[g.UserID] = true
		}
	}

	_ = challenge
	return c.JSON(fiber.Map{
		"total_players": totalPlayers,
		"winners":       len(winnerSet),
	})
}

// ---------- internal helpers ----------

func weightedPickIdiom(userID uint, difficulty string) domain.Idiom {
	// Re-enter mastered idioms forgotten after idiomForgottenDays
	cutoff := time.Now().AddDate(0, 0, -idiomForgottenDays)
	db.DB.Model(&domain.UserIdiomProgress{}).
		Where("user_id = ? AND is_mastered = ? AND last_correct_at < ?", userID, true, cutoff).
		Updates(map[string]any{"is_mastered": false, "weight": 10, "consecutive_correct": 0})

	type cand struct {
		id     uint
		weight int
	}
	var pool []cand

	// Seen but not mastered — use their stored weights, filtered by difficulty if given
	var progRows []domain.UserIdiomProgress
	progQ := db.DB.Where("user_id = ? AND is_mastered = ?", userID, false)
	if difficulty != "" {
		progQ = progQ.Joins("JOIN gm_idioms ON gm_idioms.id = gm_user_idiom_progresses.idiom_id").
			Where("gm_idioms.difficulty = ?", difficulty)
	}
	progQ.Find(&progRows)
	for _, p := range progRows {
		pool = append(pool, cand{id: p.IdiomID, weight: p.Weight})
	}

	// Mix in unseen idioms so the pool naturally introduces new content alongside review
	unseenLimit := 5
	if len(pool) == 0 {
		unseenLimit = 20
	}
	var unseenIDs []uint
	unseenQ := db.DB.Model(&domain.Idiom{}).
		Where("id NOT IN (SELECT idiom_id FROM gm_user_idiom_progresses WHERE user_id = ?)", userID)
	if difficulty != "" {
		unseenQ = unseenQ.Where("difficulty = ?", difficulty)
	}
	unseenQ.Order("RANDOM()").Limit(unseenLimit).Pluck("id", &unseenIDs)
	for _, id := range unseenIDs {
		pool = append(pool, cand{id: id, weight: 10})
	}

	if len(pool) == 0 {
		var idiom domain.Idiom
		db.DB.Order("RANDOM()").First(&idiom)
		return idiom
	}

	// Weighted random selection
	total := 0
	for _, c := range pool {
		total += c.weight
	}
	if total <= 0 {
		var idiom domain.Idiom
		db.DB.Order("RANDOM()").First(&idiom)
		return idiom
	}
	r := rand.Intn(total)
	acc := 0
	for _, c := range pool {
		acc += c.weight
		if r < acc {
			var idiom domain.Idiom
			db.DB.First(&idiom, c.id)
			return idiom
		}
	}

	var idiom domain.Idiom
	db.DB.First(&idiom, pool[0].id)
	return idiom
}

func updateFillProgress(userID, idiomID uint, correct bool) {
	now := time.Now()
	var prog domain.UserIdiomProgress
	if err := db.DB.Where("user_id = ? AND idiom_id = ?", userID, idiomID).First(&prog).Error; err != nil {
		prog = domain.UserIdiomProgress{UserID: userID, IdiomID: idiomID}
	}
	prog.LastPlayedAt = &now
	if correct {
		prog.ConsecutiveCorrect++
		prog.LastCorrectAt = &now
		prog.Weight -= 5
		if prog.Weight < 1 {
			prog.Weight = 1 // keep minimum 1 so non-mastered rows stay in weighted pool
		}
		if prog.ConsecutiveCorrect >= idiomMasteryThreshold {
			prog.IsMastered = true
			prog.Weight = 0 // mastered rows are excluded from the pool by query filter
		}
	} else {
		prog.ConsecutiveCorrect = 0
		prog.Weight += 15
		if prog.Weight > 100 {
			prog.Weight = 100
		}
	}
	db.DB.Save(&prog)
}

func upsertIdiomStat(userID uint, mode string, score int) {
	var stat domain.UserGameStat
	db.DB.Where(domain.UserGameStat{UserID: userID, GameID: "idiom", Mode: mode, Difficulty: ""}).
		FirstOrCreate(&stat)
	stat.PlayCount++
	if score > 0 {
		stat.WinCount++
	}
	if score > stat.BestScore {
		stat.BestScore = score
	}
	db.DB.Save(&stat)
}
