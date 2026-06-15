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
	fmt.Printf("Total puzzles in DB: %d\n", count)
}
