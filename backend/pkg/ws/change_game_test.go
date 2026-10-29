package ws

import (
	"testing"

	"github.com/x-game/backend/internal/domain"
	_ "github.com/x-game/backend/internal/engine/tilematch"
)

func TestChangeGameInRoom(t *testing.T) {
	roomID := "test-change-game-room-1"
	room, err := CreateRoom(roomID, "tilematch", "pk_speed", "easy", "host-player", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	hostClient := &Client{ID: "host-player"}
	oppClient := &Client{ID: "opp-player"}
	if err := room.AddClient(hostClient, ""); err != nil {
		t.Fatalf("failed to add host: %v", err)
	}
	if err := room.AddClient(oppClient, ""); err != nil {
		t.Fatalf("failed to add opp: %v", err)
	}

	// 1. Change game by host succeeds and host remains unchanged
	changeMsg := []byte(`{"action":"change_game","game":"tilematch","mode":"pk_speed","difficulty":"hard"}`)
	room.HandleMessage("host-player", changeMsg)

	if room.Difficulty != domain.GameDifficulty("hard") {
		t.Fatalf("expected room difficulty to be 'hard', got %v", room.Difficulty)
	}
	if room.Host != "host-player" {
		t.Fatalf("expected host to remain 'host-player', got %v", room.Host)
	}

	// 2. Change game by opponent (non-host) must be rejected, difficulty and host must not change
	changeMsgOpp := []byte(`{"action":"change_game","game":"tilematch","mode":"pk_speed","difficulty":"medium"}`)
	room.HandleMessage("opp-player", changeMsgOpp)

	if room.Difficulty != domain.GameDifficulty("hard") {
		t.Fatalf("expected room difficulty to stay 'hard', got %v", room.Difficulty)
	}
	if room.Host != "host-player" {
		t.Fatalf("expected host to remain 'host-player', got %v", room.Host)
	}
}

func TestChangeGameCrossGameReconnect(t *testing.T) {
	roomID := "test-cross-game-reconnect"
	room, err := CreateRoom(roomID, "tilematch", "pk_speed", "easy", "host-user", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	hostClient := &Client{ID: "host-user"}
	guestClient := &Client{ID: "guest-user"}
	if err := room.AddClient(hostClient, ""); err != nil {
		t.Fatalf("failed to add host: %v", err)
	}
	if err := room.AddClient(guestClient, ""); err != nil {
		t.Fatalf("failed to add guest: %v", err)
	}

	// Host changes game to hard difficulty
	changeMsg := []byte(`{"action":"change_game","game":"tilematch","mode":"pk_speed","difficulty":"hard"}`)
	room.HandleMessage("host-user", changeMsg)

	// Both clients unmount from old page and trigger RemoveClient or ActionLeaveRoom
	room.HandleMessage("guest-user", []byte(`{"type":"leave_game"}`))
	room.RemoveClient(guestClient)
	room.RemoveClient(hostClient)

	// Room MUST NOT be deleted even when 0 clients are connected during transition
	rejoinedRoom, err := JoinRoom(roomID)
	if err != nil {
		t.Fatalf("expected room %s to exist during game switch grace period, got: %v", roomID, err)
	}
	if rejoinedRoom.Host != "host-user" {
		t.Fatalf("expected host to remain 'host-user', got %v", rejoinedRoom.Host)
	}

	// Guest reconnects to the new game
	newGuestClient := &Client{ID: "guest-user"}
	if err := rejoinedRoom.AddClient(newGuestClient, ""); err != nil {
		t.Fatalf("failed to re-add guest: %v", err)
	}

	// Host reconnects to the new game
	newHostClient := &Client{ID: "host-user"}
	if err := rejoinedRoom.AddClient(newHostClient, ""); err != nil {
		t.Fatalf("failed to re-add host: %v", err)
	}

	if len(rejoinedRoom.Clients) != 2 {
		t.Fatalf("expected 2 clients in room, got %d", len(rejoinedRoom.Clients))
	}
}
