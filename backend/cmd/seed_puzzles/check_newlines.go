package main

import (
	"log"
	"strings"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	
	var p domain.SokobanPuzzle
	db.DB.Model(&domain.SokobanPuzzle{}).Where("difficulty = ?", "beginner").First(&p)
	
	if strings.Contains(p.Puzzle, "\\n") {
		log.Println("Puzzle contains literal backslash-n! `\\n`")
	}
	if strings.Contains(p.Puzzle, "\n") {
		log.Println("Puzzle contains actual newline byte!")
	}
}
