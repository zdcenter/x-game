package db

import (
	_ "embed"
	"encoding/json"
	"log"

	"github.com/x-game/backend/internal/domain"
)

//go:embed connect_seeds.json
var connectSeedsJSON []byte

func SeedConnect() {
	var count int64
	DB.Model(&domain.ConnectPuzzle{}).Count(&count)

	var seeds []domain.ConnectPuzzle
	if err := json.Unmarshal(connectSeedsJSON, &seeds); err != nil {
		log.Fatalf("SeedConnect: failed to parse connect_seeds.json: %v", err)
	}

	if count != int64(len(seeds)) || true {
		log.Println("Re-seeding Connect puzzles...")
		DB.Exec("DELETE FROM gm_connect_puzzles")
		
		// Insert in batches
		batchSize := 100
		for i := 0; i < len(seeds); i += batchSize {
			end := i + batchSize
			if end > len(seeds) {
				end = len(seeds)
			}
			batch := seeds[i:end]
			if err := DB.Create(&batch).Error; err != nil {
				log.Fatalf("SeedConnect: failed to insert batch: %v", err)
			}
		}
	}
}
