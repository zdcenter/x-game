package domain

import "time"

// Idiom is the Chinese idiom vocabulary table — gm_idioms.
type Idiom struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Word          string    `gorm:"type:varchar(20);uniqueIndex;not null" json:"word"`
	Pinyin        string    `gorm:"type:varchar(100)" json:"pinyin"`
	Explanation   string    `gorm:"type:text;not null" json:"explanation"`
	Story         string    `gorm:"type:text" json:"story"`
	Derivation    string    `gorm:"type:varchar(200)" json:"derivation"`
	Difficulty    string    `gorm:"type:varchar(10);default:'medium'" json:"difficulty"`
	IsDailyTarget bool      `gorm:"default:false" json:"is_daily_target"`
	CreatedAt     time.Time `json:"created_at"`
}

// IdiomDailyChallenge caches today's Wordle target — gm_idiom_daily_challenges.
type IdiomDailyChallenge struct {
	DateKey   string    `gorm:"type:varchar(10);primaryKey" json:"date_key"` // "2026-06-19"
	IdiomID   uint      `gorm:"not null" json:"idiom_id"`
	Keyboard  string    `gorm:"type:text;not null" json:"keyboard"` // JSON []string, 24 chars shuffled
	CreatedAt time.Time `json:"created_at"`
}

// UserIdiomDailyGuess tracks each Wordle attempt per user per day — gm_user_idiom_daily_guesses.
type UserIdiomDailyGuess struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	UserID   uint   `gorm:"index;not null" json:"user_id"`
	DateKey  string `gorm:"type:varchar(10);not null" json:"date_key"`
	GuessSeq int    `gorm:"not null" json:"guess_seq"` // 1~6
	Guess    string `gorm:"type:varchar(20);not null" json:"guess"`
	Result   string `gorm:"type:text;not null" json:"result"` // JSON []CharResult
}

// UserIdiomProgress tracks fill-in-blank weighted spaced repetition — gm_user_idiom_progress.
type UserIdiomProgress struct {
	UserID             uint       `gorm:"primaryKey;not null" json:"user_id"`
	IdiomID            uint       `gorm:"primaryKey;not null" json:"idiom_id"`
	Weight             int        `gorm:"default:10" json:"weight"`
	ConsecutiveCorrect int        `gorm:"default:0" json:"consecutive_correct"`
	IsMastered         bool       `gorm:"default:false" json:"is_mastered"`
	LastCorrectAt      *time.Time `json:"last_correct_at"`
	LastPlayedAt       *time.Time `json:"last_played_at"`
}
