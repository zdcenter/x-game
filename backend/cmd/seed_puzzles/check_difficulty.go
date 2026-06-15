package main

import (
	"log"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	
	var count int64
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "beginner").Count(&count)
	log.Printf("Beginner puzzles: %d", count)
}
