package main

import (
	"log"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "beginner").Update("difficulty", "easy")
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "intermediate").Update("difficulty", "medium")
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "advanced").Update("difficulty", "hard")
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "professional").Update("difficulty", "expert")
	
	log.Println("Database updated successfully")
}
