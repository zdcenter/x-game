package idiom

import (
	"testing"

	"github.com/x-game/backend/internal/engine"
)

func TestIdiomPKEngine(t *testing.T) {
	eng, mode, err := engine.ResolveEngine("idiom", "speed")
	if err != nil {
		t.Fatalf("ResolveEngine failed: %v", err)
	}
	if mode != "speed" {
		t.Fatalf("expected mode speed, got %s", mode)
	}

	if err := eng.InitGame(map[string]interface{}{"target": 3}); err != nil {
		t.Fatalf("InitGame failed: %v", err)
	}

	eng.AddPlayer("player1")
	eng.AddPlayer("player2")

	if !eng.HasPlayer("player1") || !eng.HasPlayer("player2") {
		t.Fatalf("players not registered")
	}

	st := eng.GetState().(map[string]interface{})
	if st["target"] != 3 {
		t.Fatalf("expected target 3, got %v", st["target"])
	}
}
