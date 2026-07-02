package main

import (
	"fmt"
	"log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type ConnectPuzzle struct {
	ID        string `gorm:"primaryKey"`
	Endpoints string
}

func main() {
	dsn := "host=localhost user=postgres password=password dbname=xgame port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var p ConnectPuzzle
	db.Table("gm_connect_puzzles").Where("id = ?", "connect-easy-1").First(&p)
	fmt.Println("Endpoints for connect-easy-1:")
	fmt.Println(p.Endpoints)
}
