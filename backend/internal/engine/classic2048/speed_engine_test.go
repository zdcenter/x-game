package classic2048

import (
	"reflect"
	"testing"

	"github.com/x-game/backend/internal/engine"
)

func TestClassic2048PKSharedInitialBoard(t *testing.T) {
	eng, _, err := engine.ResolveEngine("classic2048", "speed")
	if err != nil {
		t.Fatalf("failed to resolve engine: %v", err)
	}

	if err := eng.InitGame(map[string]interface{}{"difficulty": "medium", "target": 1}); err != nil {
		t.Fatalf("InitGame failed: %v", err)
	}

	speedEng := eng.(*SpeedEngine)

	// Add player 1 and player 2
	speedEng.AddPlayer("player1")
	speedEng.AddPlayer("player2")

	b1 := speedEng.Boards["player1"]
	b2 := speedEng.Boards["player2"]

	if b1 == nil || b2 == nil {
		t.Fatalf("boards not initialized")
	}

	// In waiting state, both players must have identical boards
	if !reflect.DeepEqual(b1.Cells, b2.Cells) {
		t.Fatalf("initial boards for waiting players are different: %v vs %v", b1.Cells, b2.Cells)
	}

	// Trigger ActionStartGame
	_, err = speedEng.HandleAction("player1", "start", []byte(`{"action":"start"}`))
	if err != nil {
		t.Fatalf("start failed: %v", err)
	}

	// After start, both players must still have the exact same new starting board
	b1 = speedEng.Boards["player1"]
	b2 = speedEng.Boards["player2"]
	if !reflect.DeepEqual(b1.Cells, b2.Cells) {
		t.Fatalf("starting boards for players are different: %v vs %v", b1.Cells, b2.Cells)
	}
}
