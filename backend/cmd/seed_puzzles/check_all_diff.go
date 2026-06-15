package main

import (
	"log"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	var intermediate, advanced int64
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "intermediate").Count(&intermediate)
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "advanced").Count(&advanced)
	log.Printf("Intermediate: %d, Advanced: %d", intermediate, advanced)
}
