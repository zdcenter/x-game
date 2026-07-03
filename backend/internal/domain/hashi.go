package domain

type HashiPuzzle struct {
	ID         string `gorm:"primarykey" json:"id"`
	Difficulty string `gorm:"index" json:"difficulty"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	Content    string `json:"content"` // JSON string representing the grid or islands
}

type UserHashiProgress struct {
	UserID    uint   `gorm:"index;not null" json:"user_id"`
	PuzzleID  string `gorm:"index;not null" json:"puzzle_id"`
	Status    string `json:"status"` // "playing" | "finished"
	TimeSpent int    `json:"time_spent"`
	Stars     int    `json:"stars"`
}
