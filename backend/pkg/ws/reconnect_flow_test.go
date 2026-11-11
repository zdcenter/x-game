package ws

import (
	"testing"

	"github.com/x-game/backend/internal/engine"
	_ "github.com/x-game/backend/internal/engine/nonogram"
)

func TestTemporaryLeaveAndReconnect(t *testing.T) {
	roomID := "test-temp-leave-rec-1"
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

	// Verify game is playing or starting
	st := room.Engine.GetStatus()
	if st != engine.StateStarting && st != engine.StatePlaying {
		t.Fatalf("expected starting or playing, got %v", st)
	}

	// testUser temporarily leaves (forfeit: false)
	room.HandleMessage("test", []byte(`{"action":"leave_game","forfeit":false}`))

	// Check room state:
	// 1. testUser must be removed from Clients map
	if _, exists := room.Clients["test"]; exists {
		t.Fatalf("test should be removed from Clients after temporary leave")
	}

	// 2. testUser must STILL be in Contestants map!
	if !room.Contestants["test"] {
		t.Fatalf("test MUST still be in Contestants map for 30s reconnect window!")
	}

	// 3. Engine must NOT be finished yet!
	if room.Engine.GetStatus() == engine.StateFinished {
		t.Fatalf("game should NOT be finished immediately on temporary leave!")
	}

	// 4. Room must STILL be in GetActiveRooms()!
	foundInLobby := false
	for _, snap := range GetActiveRooms() {
		if snap.ID == roomID {
			foundInLobby = true
			t.Logf("Lobby snapshot: host=%s, opponent=%s, contestants=%v, status=%s", snap.Host, snap.Opponent, snap.Contestants, snap.Status)
			if snap.Opponent != "test" && len(snap.Contestants) < 2 {
				t.Fatalf("expected test to be recorded as opponent/contestant in lobby snapshot during 30s grace period!")
			}
			break
		}
	}
	if !foundInLobby {
		t.Fatalf("room should still be visible in lobby during 30s temporary leave grace period")
	}

	// 5. testUser re-enters room!
	testUser2 := &Client{ID: "test"}
	err = room.AddClient(testUser2, "")
	if err != nil {
		t.Fatalf("testUser should be able to re-enter room during grace period, got error: %v", err)
	}

	// Verify testUser2 is now in Clients and is NOT a spectator
	if testUser2.IsSpectator {
		t.Fatalf("reconnecting contestant must be restored to contestant seat, not spectator!")
	}

	t.Logf("Reconnected successfully! Game status: %v", room.Engine.GetStatus())
}

func TestHostTemporaryLeaveAndReconnect(t *testing.T) {
	roomID := "test-host-temp-leave-1"
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

	// Host "admin" temporarily leaves during match!
	room.HandleMessage("admin", []byte(`{"action":"leave_game","forfeit":false}`))

	// Check if room was accidentally destroyed or host lost!
	mu.Lock()
	_, exists := Rooms[roomID]
	mu.Unlock()
	if !exists {
		t.Fatalf("room should NOT be destroyed when host temporarily leaves active match (opponent is still in room!)")
	}

	// Host reconnects
	admin2 := &Client{ID: "admin"}
	err = room.AddClient(admin2, "")
	if err != nil {
		t.Fatalf("host should be able to reconnect to room, got error: %v", err)
	}
	if room.Host != "admin" {
		t.Fatalf("expected host to remain admin, got %s", room.Host)
	}
}
