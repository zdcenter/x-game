package main

import (
	"fmt"
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
	"log"
)

func main() {
	db.InitPostgres()
	var games []domain.GameConfig
	if err := db.DB.Find(&games).Error; err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Total games in DB: %d\n", len(games))
}
