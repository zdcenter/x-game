package db

import (
	"log"

	"github.com/x-game/backend/internal/domain"
)

func SeedHashi() {
	var count int64
	DB.Model(&domain.HashiPuzzle{}).Count(&count)
	if count > 0 {
		return
	}

	puzzles := []domain.HashiPuzzle{
		{
			ID:         "hashi_easy_1",
			Difficulty: "easy",
			Width:      7,
			Height:     7,
			// JSON string containing the grid where 0 is empty, and >0 is island with that number
			Content: `{"grid":[[2,0,3,0,3,0,2],[0,0,0,0,0,0,0],[3,0,4,0,4,0,3],[0,0,0,0,0,0,0],[3,0,4,0,4,0,3],[0,0,0,0,0,0,0],[2,0,3,0,3,0,2]]}`,
		},
		{
			ID:         "hashi_medium_1",
			Difficulty: "medium",
			Width:      7,
			Height:     7,
			Content:    `{"grid":[[3,0,4,0,3,0,2],[0,0,0,0,0,0,0],[3,0,5,0,3,0,2],[0,0,0,0,0,0,0],[3,0,5,0,3,0,2],[0,0,0,0,0,0,0],[2,0,3,0,2,0,1]]}`,
		},
	}

	for _, p := range puzzles {
		if err := DB.Create(&p).Error; err != nil {
			log.Printf("Failed to create Hashi puzzle %s: %v", p.ID, err)
		}
	}
	log.Println("Seeded Hashi puzzles")
}
