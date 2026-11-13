package tilematch

import (
	"encoding/json"
	"testing"

	"github.com/x-game/backend/internal/engine"
)

func TestTilematchEngine_DeterministicCards(t *testing.T) {
	seed := int64(98765)
	cards1 := GenerateCards(60, "medium", seed)
	cards2 := GenerateCards(60, "medium", seed)

	if len(cards1) != 60 || len(cards2) != 60 {
		t.Fatalf("expected 60 cards, got %d and %d", len(cards1), len(cards2))
	}

	for i := 0; i < 60; i++ {
		if cards1[i].Type != cards2[i].Type ||
			cards1[i].X != cards2[i].X ||
			cards1[i].Y != cards2[i].Y ||
			cards1[i].Layer != cards2[i].Layer ||
			cards1[i].IsBlocked != cards2[i].IsBlocked {
			t.Fatalf("cards mismatch at index %d: %+v vs %+v", i, cards1[i], cards2[i])
		}
	}

	// Verify all type counts are exact multiples of 3
	typeCounts := make(map[string]int)
	for _, c := range cards1 {
		typeCounts[c.Type]++
	}
	for typ, count := range typeCounts {
		if count%3 != 0 {
			t.Fatalf("type %s count is %d, not a multiple of 3", typ, count)
		}
	}
}

func TestTilematchEngine_StartAndMove(t *testing.T) {
	eng := &Engine{}
	_ = eng.InitGame(map[string]interface{}{
		"difficulty": "medium",
		"target":     1,
	})
	eng.AddPlayer("p1")
	eng.AddPlayer("p2")

	// Trigger start action
	state, err := eng.HandleAction("p1", "start", []byte(`{"action":"start"}`))
	if err != nil {
		t.Fatalf("unexpected start error: %v", err)
	}
	if state != engine.StateStarting {
		t.Fatalf("expected state starting, got %v", state)
	}
	if len(eng.Cards) != 60 {
		t.Fatalf("expected 60 cards generated, got %d", len(eng.Cards))
	}

	// Wait or manually transition to playing
	eng.Mu.Lock()
	eng.State = engine.StatePlaying
	eng.Mu.Unlock()

	// Player 1 sends move progress update
	movePayload, _ := json.Marshal(map[string]interface{}{
		"action":   "move",
		"delta":    150,
		"progress": 30,
		"finished": false,
	})
	_, err = eng.HandleAction("p1", "move", movePayload)
	if err != nil {
		t.Fatalf("unexpected move error: %v", err)
	}

	p1 := eng.Players["p1"]
	if p1.Progress != 30 || p1.Score != 150 {
		t.Fatalf("expected progress 30 and score 150, got %d and %d", p1.Progress, p1.Score)
	}

	// Player 1 finishes with 100%
	finishPayload, _ := json.Marshal(map[string]interface{}{
		"action":   "move",
		"delta":    1000,
		"progress": 100,
		"finished": true,
	})
	finalState, err := eng.HandleAction("p1", "move", finishPayload)
	if err != nil {
		t.Fatalf("unexpected finish error: %v", err)
	}
	if finalState != engine.StateFinished {
		t.Fatalf("expected state finished, got %v", finalState)
	}
	if len(eng.Winners) != 1 || eng.Winners[0] != "p1" {
		t.Fatalf("expected winner p1, got %v", eng.Winners)
	}
	if eng.Wins["p1"] != 1 {
		t.Fatalf("expected 1 win for p1, got %d", eng.Wins["p1"])
	}
}

func TestTilematchEngine_DifficultyTiers(t *testing.T) {
	difficulties := []struct {
		diff      string
		total     int
		minTypes  int
	}{
		{"easy", 18, 4},
		{"medium", 60, 8},
		{"hard", 96, 12},
	}

	for _, d := range difficulties {
		cards := GenerateCards(d.total, d.diff, 55555)
		if len(cards) != d.total {
			t.Fatalf("[%s] expected %d cards, got %d", d.diff, d.total, len(cards))
		}
		typeCounts := make(map[string]int)
		for _, c := range cards {
			typeCounts[c.Type]++
		}
		if len(typeCounts) < d.minTypes {
			t.Fatalf("[%s] expected at least %d types, got %d", d.diff, d.minTypes, len(typeCounts))
		}
		for typ, count := range typeCounts {
			if count%3 != 0 {
				t.Fatalf("[%s] type %s count %d is not a multiple of 3", d.diff, typ, count)
			}
		}

		// In hard mode, verify that triples are distributed across layers (cross-layer interleaving)
		if d.diff == "hard" {
			typeLayers := make(map[string]map[int]bool)
			for _, c := range cards {
				if typeLayers[c.Type] == nil {
					typeLayers[c.Type] = make(map[int]bool)
				}
				typeLayers[c.Type][c.Layer] = true
			}
			multiLayerTypes := 0
			for _, layers := range typeLayers {
				if len(layers) > 1 {
					multiLayerTypes++
				}
			}
			if multiLayerTypes == 0 {
				t.Fatalf("[hard] expected types to be distributed across multiple layers")
			}
		}
	}
}
