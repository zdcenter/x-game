package main

import (
	"fmt"
	"github.com/x-game/backend/internal/engine"
	_ "github.com/x-game/backend/internal/engine/block"
	_ "github.com/x-game/backend/internal/engine/classic2048"
	_ "github.com/x-game/backend/internal/engine/codebreaker"
	_ "github.com/x-game/backend/internal/engine/drop2048"
	_ "github.com/x-game/backend/internal/engine/gomoku"
	_ "github.com/x-game/backend/internal/engine/hexa"
	_ "github.com/x-game/backend/internal/engine/idiom"
	_ "github.com/x-game/backend/internal/engine/lightsout"
	_ "github.com/x-game/backend/internal/engine/math24"
	_ "github.com/x-game/backend/internal/engine/minesweeper"
	_ "github.com/x-game/backend/internal/engine/nonogram"
	_ "github.com/x-game/backend/internal/engine/sliding"
	_ "github.com/x-game/backend/internal/engine/sokoban"
	_ "github.com/x-game/backend/internal/engine/sudoku"
	_ "github.com/x-game/backend/internal/engine/tetris"
	_ "github.com/x-game/backend/internal/engine/watersort"
)

func main() {
	games := engine.GetAllRegisteredGames()
	fmt.Printf("Total games: %d\n", len(games))
	for _, g := range games {
		fmt.Println(g)
	}
}
