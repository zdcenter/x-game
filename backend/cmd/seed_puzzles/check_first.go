package main

import (
	"log"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	
	var p domain.SokobanPuzzle
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "beginner").First(&p)
	log.Printf("First puzzle ID: %s", p.ID)
	log.Printf("First puzzle content: %q", p.Puzzle)
}
