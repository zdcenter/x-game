package main

import (
	"log"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	
	// Create table if not exists
	err := db.DB.AutoMigrate(&domain.SokobanPuzzle{})
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	var count int64
	db.DB.Model(&domain.SokobanPuzzle{}).Count(&count)
	if count == 0 {
		puzzles := []domain.SokobanPuzzle{
			{
				ID: "soko-beginner-1",
				Difficulty: "easy",
				LevelNum: 1,
				Puzzle: `
  ###
  #.#
  # #
###$###
#.$@$.#
###$###
  # #
  #.#
  ###`,
			},
			{
				ID: "soko-beginner-2",
				Difficulty: "easy",
				LevelNum: 2,
				Puzzle: `
######
#    #
#@ $ #
#   .#
######`,
			},
			{
				ID: "soko-beginner-3",
				Difficulty: "easy",
				LevelNum: 3,
				Puzzle: `
######
#  . #
#  $ #
#@ $ #
#  . #
######`,
			},
		}
		for _, p := range puzzles {
			db.DB.Create(&p)
		}
		log.Println("Successfully seeded 3 default Sokoban puzzles into the database!")
	} else {
		log.Printf("Database already has %d puzzles, skipping seed.", count)
	}
}
