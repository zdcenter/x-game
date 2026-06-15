package main

import (
	"fmt"
	"log"

	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/internal/domain"
)

func main() {
	db.InitDB()
	var count int64
	err := db.DB.Model(&domain.SokobanPuzzle{}).Count(&count).Error
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Total puzzles: %d\n", count)
	
	var puzzles []domain.SokobanPuzzle
	db.DB.Find(&puzzles)
	for _, p := range puzzles {
		fmt.Printf("Puzzle ID: %s, Diff: %s\n", p.ID, p.Difficulty)
	}
}
