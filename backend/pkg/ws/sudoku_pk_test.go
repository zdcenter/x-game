package ws

import (
	"encoding/json"
	"testing"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
	_ "github.com/x-game/backend/internal/engine/sudoku"
)

func TestSudokuDifficultyChangeInPk(t *testing.T) {
	roomID := "test-sudoku-diff-change-1"
	r, err := CreateRoom(roomID, "sudoku", "speed", "easy", "admin", "", 1, 0)
	if err != nil {
		t.Fatalf("Failed to create room: %v", err)
	}
	defer delete(Rooms, roomID)

	adminClient := &Client{ID: "admin"}
	if err := r.AddClient(adminClient, ""); err != nil {
		t.Fatalf("Failed to add client: %v", err)
	}

	stateEasy := r.Engine.GetState().(map[string]interface{})
	puzzleEasy := stateEasy["puzzle"].(string)
	diffEasy := stateEasy["difficulty"].(string)

	if diffEasy != "easy" {
		t.Fatalf("Expected difficulty easy, got %s", diffEasy)
	}
	if len(puzzleEasy) != 81 {
		t.Fatalf("Expected 81 char puzzle, got length %d", len(puzzleEasy))
	}

	// Host sends ActionChangeGame to "hard"
	changeMsg := []byte(`{"action":"change_game","game":"sudoku","mode":"speed","difficulty":"hard"}`)
	r.HandleMessage("admin", changeMsg)

	if r.Difficulty != domain.GameDifficulty("hard") {
		t.Fatalf("Expected room difficulty hard, got %s", r.Difficulty)
	}

	stateHard := r.Engine.GetState().(map[string]interface{})
	puzzleHard := stateHard["puzzle"].(string)
	diffHard := stateHard["difficulty"].(string)

	if diffHard != "hard" {
		t.Fatalf("Expected engine difficulty hard, got %s", diffHard)
	}
	if len(puzzleHard) != 81 {
		t.Fatalf("Expected 81 char puzzle for hard, got length %d", len(puzzleHard))
	}

	// Host sends ActionChangeGame to "expert"
	changeMsgExpert := []byte(`{"action":"change_game","game":"sudoku","mode":"speed","difficulty":"expert"}`)
	r.HandleMessage("admin", changeMsgExpert)

	if r.Difficulty != domain.GameDifficulty("expert") {
		t.Fatalf("Expected room difficulty expert, got %s", r.Difficulty)
	}

	stateExpert := r.Engine.GetState().(map[string]interface{})
	puzzleExpert := stateExpert["puzzle"].(string)
	diffExpert := stateExpert["difficulty"].(string)

	if diffExpert != "expert" {
		t.Fatalf("Expected engine difficulty expert, got %s", diffExpert)
	}
	if len(puzzleExpert) != 81 {
		t.Fatalf("Expected 81 char puzzle for expert, got length %d", len(puzzleExpert))
	}

	// Verify ResetToWaiting resets state and players
	if resetEng, ok := r.Engine.(interface{ ResetToWaiting() }); ok {
		resetEng.ResetToWaiting()
		if r.Engine.GetStatus() != engine.StateWaiting {
			t.Fatalf("Expected engine state waiting after ResetToWaiting, got %v", r.Engine.GetStatus())
		}
	} else {
		t.Fatalf("Expected Sudoku engine to implement ResetToWaiting")
	}

	_ = json.Marshal
}
