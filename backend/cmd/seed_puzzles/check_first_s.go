package main

import (
	"fmt"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	var p domain.SokobanPuzzle
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "beginner").First(&p)
	fmt.Printf("Raw bytes: %v\n", []byte(p.Puzzle))
}
