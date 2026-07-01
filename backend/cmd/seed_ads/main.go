package main

import (
	"log"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	db.SeedAds()
	log.Println("Seeded ads successfully")
}
