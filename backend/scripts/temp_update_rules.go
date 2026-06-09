package main

import (
	"log"

	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	log.Println("Rules updated successfully!")
}
