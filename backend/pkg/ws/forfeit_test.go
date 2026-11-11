package ws

import (
	"testing"

	"github.com/x-game/backend/internal/engine"
	_ "github.com/x-game/backend/internal/engine/nonogram"
	_ "github.com/x-game/backend/internal/engine/tilematch"
)

func TestNonogramForfeitFollowedByLeaveRoom(t *testing.T) {
	roomID := "test-nonogram-forfeit-leave-1"
	room, err := CreateRoom(roomID, "nonogram", "pk_speed", "easy", "admin", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	admin := &Client{ID: "admin"}
	testUser := &Client{ID: "test"}
	_ = room.AddClient(admin, "")
	_ = room.AddClient(testUser, "")

	testUser.IsReady = true
	room.HandleMessage("admin", []byte(`{"action":"start"}`))

	// test sends forfeit
	room.HandleMessage("test", []byte(`{"action":"forfeit"}`))

	if room.Engine.GetStatus() != engine.StateFinished {
		t.Fatalf("expected StateFinished after forfeit, got %v", room.Engine.GetStatus())
	}
	if room.Winner != "admin" {
		t.Fatalf("expected Winner to be admin, got %s", room.Winner)
	}

	// test then sends leave_room with forfeit: true
	room.HandleMessage("test", []byte(`{"action":"leave_room","forfeit":true}`))

	if room.Engine.GetStatus() != engine.StateFinished {
		t.Fatalf("expected StateFinished to remain finished, got %v", room.Engine.GetStatus())
	}
	if room.Winner != "admin" {
		t.Fatalf("expected Winner to remain admin, got %s", room.Winner)
	}

	// Verify room is NOT destroyed yet while admin is still in the room viewing settlement
	mu.Lock()
	_, exists := Rooms[roomID]
	mu.Unlock()
	if !exists {
		t.Fatalf("room should still exist for admin to view result modal!")
	}
}

func TestLeaveRoomDirectForfeit(t *testing.T) {
	roomID := "test-leave-direct-forfeit-1"
	room, err := CreateRoom(roomID, "nonogram", "pk_speed", "easy", "admin", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	admin := &Client{ID: "admin"}
	testUser := &Client{ID: "test"}
	_ = room.AddClient(admin, "")
	_ = room.AddClient(testUser, "")

	testUser.IsReady = true
	room.HandleMessage("admin", []byte(`{"action":"start"}`))

	// test sends ONLY leave_room with forfeit: true directly
	room.HandleMessage("test", []byte(`{"action":"leave_room","forfeit":true}`))

	if room.Engine.GetStatus() != engine.StateFinished {
		t.Fatalf("expected StateFinished after leave_room forfeit, got %v", room.Engine.GetStatus())
	}
	if room.Winner != "admin" {
		t.Fatalf("expected Winner to be admin, got %s", room.Winner)
	}
}

func TestThreePlayerPkOneForfeitsOthersContinue(t *testing.T) {
	roomID := "test-3p-forfeit-continue-1"
	room, err := CreateRoom(roomID, "nonogram", "pk_speed", "easy", "playerA", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	pA := &Client{ID: "playerA"}
	pB := &Client{ID: "playerB"}
	pC := &Client{ID: "playerC"}
	_ = room.AddClient(pA, "")
	_ = room.AddClient(pB, "")
	_ = room.AddClient(pC, "")

	pB.IsReady = true
	pC.IsReady = true
	room.HandleMessage("playerA", []byte(`{"action":"start"}`))

	// pB forfeits
	room.HandleMessage("playerB", []byte(`{"action":"forfeit"}`))

	// 2 players remain (pA and pC), match must continue!
	if room.Engine.GetStatus() == engine.StateFinished {
		t.Fatalf("game should NOT be finished when 2 players remain after 1 forfeits in 3-player match!")
	}
	if room.Winner != "" {
		t.Fatalf("there should be no premature winner in 3-player match when 2 remain, got %s", room.Winner)
	}

	// Now pC also forfeits
	room.HandleMessage("playerC", []byte(`{"action":"forfeit"}`))

	// Now only pA remains, walkover victory must be awarded to pA!
	if room.Engine.GetStatus() != engine.StateFinished {
		t.Fatalf("game should be finished when only 1 player remains, got %v", room.Engine.GetStatus())
	}
	if room.Winner != "playerA" {
		t.Fatalf("expected playerA to be crowned walkover winner, got %s", room.Winner)
	}
}
