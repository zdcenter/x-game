package ws

import (
	"testing"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
)

func TestRematchAfterForfeitAndWaitingForNewOpponent(t *testing.T) {
	roomID := "test-rematch-flow-1"
	room, err := CreateRoom(roomID, "sliding", "speed", "easy", "admin", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	adminClient := &Client{ID: "admin"}
	testClient := &Client{ID: "test"}

	if err := room.AddClient(adminClient, ""); err != nil {
		t.Fatalf("failed to add admin: %v", err)
	}
	if err := room.AddClient(testClient, ""); err != nil {
		t.Fatalf("failed to add test: %v", err)
	}

	// Verify testClient is auto-ready upon joining
	if !testClient.IsReady {
		t.Fatalf("testClient should be auto-ready upon joining")
	}

	// Host starts game
	room.HandleMessage("admin", []byte(`{"action":"`+string(domain.ActionStartGame)+`"}`))
	if room.Engine.GetStatus() != engine.StateStarting && room.Engine.GetStatus() != engine.StatePlaying {
		t.Fatalf("expected game starting/playing, got %v", room.Engine.GetStatus())
	}

	// Round 1: test client explicitly forfeits
	room.HandleMessage("test", []byte(`{"action":"`+string(domain.ActionForfeit)+`"}`))
	if room.Winner != "admin" {
		t.Fatalf("expected admin to win by forfeit, got winner=%s", room.Winner)
	}

	// test client leaves to lobby
	room.HandleMessage("test", []byte(`{"action":"`+string(domain.ActionLeaveRoom)+`", "forfeit": true}`))

	// Round 2: admin clicks "等候新对手" (RestartGame)
	room.HandleMessage("admin", []byte(`{"action":"`+string(domain.ActionRestartGame)+`"}`))

	// Verify room state is cleanly reset to waiting
	if room.Engine.GetStatus() != engine.StateWaiting {
		t.Fatalf("expected room engine state to be StateWaiting, got %v", room.Engine.GetStatus())
	}
	if room.Winner != "" {
		t.Fatalf("expected winner to be cleared, got %s", room.Winner)
	}
	if len(room.Contestants) != 1 || !room.Contestants["admin"] {
		t.Fatalf("expected Contestants to only contain admin, got %v", room.Contestants)
	}

	// Verify active rooms snapshot for lobby shows room is waiting with 1 player
	snapshots := GetActiveRooms()
	var roomSnap *RoomSnapshot
	for i := range snapshots {
		if snapshots[i].ID == roomID {
			roomSnap = &snapshots[i]
			break
		}
	}
	if roomSnap == nil {
		t.Fatalf("expected room to be present in active rooms snapshot")
	}
	if roomSnap.Status != domain.StatusWaiting {
		t.Fatalf("expected room snapshot status to be waiting, got %v", roomSnap.Status)
	}
	if roomSnap.PlayerCount != 1 {
		t.Fatalf("expected room snapshot player count to be 1, got %d", roomSnap.PlayerCount)
	}

	// B re-enters room from lobby to PK in round 2!
	newTestClient := &Client{ID: "test"}
	if err := room.AddClient(newTestClient, ""); err != nil {
		t.Fatalf("test should be able to join room as contestant for round 2: %v", err)
	}
	if newTestClient.IsSpectator {
		t.Fatalf("test should join as contestant, not spectator")
	}
	if !newTestClient.IsReady {
		t.Fatalf("test should be auto-ready upon joining")
	}

	// Admin starts game for round 2
	room.HandleMessage("admin", []byte(`{"action":"`+string(domain.ActionStartGame)+`"}`))
	if room.Engine.GetStatus() != engine.StateStarting && room.Engine.GetStatus() != engine.StatePlaying {
		t.Fatalf("round 2 should start successfully, got %v", room.Engine.GetStatus())
	}
	if room.Winner != "" {
		t.Fatalf("round 2 winner should be empty, got %s", room.Winner)
	}
	if len(room.Winners) != 0 {
		t.Fatalf("round 2 winners should be empty, got %v", room.Winners)
	}
	if room.ForfeitedPlayer != "" {
		t.Fatalf("round 2 forfeited player should be empty, got %s", room.ForfeitedPlayer)
	}
	if room.ForfeitedContestants != nil && room.ForfeitedContestants["test"] {
		t.Fatalf("round 2 test client should not be in ForfeitedContestants")
	}

	// Player moves in round 2 (e.g. playing chess/sliding)
	room.HandleMessage("test", []byte(`{"action":"move", "tile": 1}`))
	if room.Winner != "" {
		t.Fatalf("move should not trigger false walkover/winner, got %s", room.Winner)
	}
}
