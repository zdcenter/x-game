package hashi

import (
	"encoding/json"
	"testing"

	"github.com/x-game/backend/internal/engine"
)

func TestHashiSpeedBridgesSync(t *testing.T) {
	eng, _, err := engine.ResolveEngine("hashi", "speed")
	if err != nil {
		t.Fatalf("failed to resolve hashi_speed engine: %v", err)
	}

	if err := eng.InitGame(map[string]interface{}{"difficulty": "easy", "target": 1}); err != nil {
		t.Fatalf("InitGame failed: %v", err)
	}

	speedEng := eng.(*SpeedEngine)
	speedEng.AddPlayer("player1")
	speedEng.AddPlayer("player2")

	// Set state to Playing to allow progress action
	speedEng.State = engine.StatePlaying

	bridgesPayload := `[{"r1":0,"c1":0,"r2":0,"c2":2,"count":1,"isHorizontal":true}]`
	var bridgesData interface{}
	_ = json.Unmarshal([]byte(bridgesPayload), &bridgesData)

	reqPayload, _ := json.Marshal(map[string]interface{}{
		"action":   "progress",
		"progress": 1,
		"bridges":  bridgesData,
	})

	_, err = speedEng.HandleAction("player1", "progress", reqPayload)
	if err != nil {
		t.Fatalf("HandleAction failed: %v", err)
	}

	p1 := speedEng.Players["player1"]
	if p1.Bridges == nil {
		t.Fatalf("expected player1.Bridges to be saved, got nil")
	}

	st := speedEng.GetState().(map[string]interface{})
	playersMap := st["players"].(map[string]*SpeedPlayer)
	if playersMap["player1"].Bridges == nil {
		t.Fatalf("expected GetState to include player1 bridges")
	}
}
