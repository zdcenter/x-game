package engine_test

import (
	"testing"
	"time"

	"github.com/x-game/backend/internal/engine"
	_ "github.com/x-game/backend/internal/engine/block"
	_ "github.com/x-game/backend/internal/engine/classic2048"
	_ "github.com/x-game/backend/internal/engine/codebreaker"
	_ "github.com/x-game/backend/internal/engine/drop2048"
	_ "github.com/x-game/backend/internal/engine/gomoku"
	_ "github.com/x-game/backend/internal/engine/hashi"
	_ "github.com/x-game/backend/internal/engine/hexa"
	_ "github.com/x-game/backend/internal/engine/idiom"
	_ "github.com/x-game/backend/internal/engine/lightsout"
	_ "github.com/x-game/backend/internal/engine/math24"
	_ "github.com/x-game/backend/internal/engine/minesweeper"
	"github.com/x-game/backend/internal/engine/nonogram"
	_ "github.com/x-game/backend/internal/engine/sliding"
	_ "github.com/x-game/backend/internal/engine/sokoban"
	_ "github.com/x-game/backend/internal/engine/sudoku"
	_ "github.com/x-game/backend/internal/engine/tetris"
	_ "github.com/x-game/backend/internal/engine/watersort"
)

func TestResolveEngineAllGames(t *testing.T) {
	games := engine.GetAllRegisteredGames()
	if len(games) == 0 {
		t.Fatal("No games registered")
	}

	modesToTest := []string{"speed", "single", "battle", "score", "unknown_mode"}

	for _, g := range games {
		for _, m := range modesToTest {
			eng, resolvedMode, err := engine.ResolveEngine(g, m)
			if err != nil {
				t.Errorf("Failed to resolve engine for %s with mode %s: %v", g, m, err)
			}
			if eng == nil {
				t.Errorf("Engine is nil for %s with mode %s", g, m)
			}
			if resolvedMode == "" {
				t.Errorf("ResolvedMode is empty for %s with mode %s", g, m)
			}
		}
	}
}

func TestNonogramSpeedEngine(t *testing.T) {
	eng, mode, err := engine.ResolveEngine("nonogram", "speed")
	if err != nil {
		t.Fatalf("ResolveEngine failed: %v", err)
	}
	if mode != "speed" {
		t.Fatalf("Expected mode 'speed', got '%s'", mode)
	}

	if err := eng.InitGame(map[string]interface{}{"target": float64(1), "difficulty": "easy"}); err != nil {
		t.Fatalf("InitGame failed: %v", err)
	}

	eng.AddPlayer("player1")
	eng.AddPlayer("player2")

	// Start game
	st, err := eng.HandleAction("player1", "start", []byte(`{"action":"start"}`))
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	t.Logf("State after start: %s", st)

	// Wait for countdown
	time.Sleep(3100 * time.Millisecond)

	st, err = eng.HandleAction("player1", "progress", []byte(`{"action":"progress", "progress": 35.5, "finished": false}`))
	if err != nil {
		t.Fatalf("Progress action failed: %v", err)
	}
	t.Logf("State after progress: %s", st)

	rawState := eng.GetState().(map[string]interface{})
	t.Logf("RawState: %+v", rawState)

	players := rawState["players"].(map[string]*nonogram.Player)
	t.Logf("Player1 progress: %v", players["player1"].Progress)
	if players["player1"].Progress != 35.5 {
		t.Fatalf("Expected progress 35.5, got %v", players["player1"].Progress)
	}
}
