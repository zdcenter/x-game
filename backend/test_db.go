package main

import (
	"fmt"
	
	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres() // Will connect to localhost DB, run migrations and seed!

	var games []domain.GameConfig
	db.DB.Find(&games)
	fmt.Printf("Total games in DB: %d\n", len(games))
	for _, g := range games {
		fmt.Printf("ID: %s, Active: %t\n", g.ID, g.IsActive)
	}
}
