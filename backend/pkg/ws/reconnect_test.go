package ws

import (
	"testing"

	_ "github.com/x-game/backend/internal/engine/tilematch"
)

func TestContestantReconnectRestoration(t *testing.T) {
	roomID := "test-reconnect-room-1"
	room, err := CreateRoom(roomID, "tilematch", "pk_speed", "easy", "host-player", "1234", 1, 0)
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

	// 1. Host and opponent join room
	if err := room.AddClient(hostClient, "1234"); err != nil {
		t.Fatalf("failed to add host: %v", err)
	}
	if err := room.AddClient(oppClient, "1234"); err != nil {
		t.Fatalf("failed to add opponent: %v", err)
	}

	// Verify both recorded in Contestants
	if !room.Contestants["host-player"] || !room.Contestants["opp-player"] {
		t.Fatalf("expected both players in Contestants, got: %v", room.Contestants)
	}

	// Verify RoomSnapshot contains both
	snapshots := GetActiveRooms()
	var snap *RoomSnapshot
	for i := range snapshots {
		if snapshots[i].ID == roomID {
			snap = &snapshots[i]
			break
		}
	}
	if snap == nil {
		t.Fatalf("room not found in snapshots")
	}
	if len(snap.Contestants) < 2 {
		t.Fatalf("expected at least 2 contestants in snapshot, got: %v", snap.Contestants)
	}

	// 2. Opponent disconnects (e.g. navigates to lobby or F5 refresh)
	room.RemoveClient(oppClient)

	// Verify Contestants STILL retains opp-player during grace period
	if !room.Contestants["opp-player"] {
		t.Fatalf("opp-player should still be retained in Contestants during grace period")
	}

	// 3. Opponent reconnects — even if password is omitted and isSpectator was set,
	// AddClient should bypass password and restore them to contestant seat!
	reconnectingOpp := &Client{ID: "opp-player", IsSpectator: true}
	if err := room.AddClient(reconnectingOpp, ""); err != nil {
		t.Fatalf("returning contestant should be allowed to reconnect without password: %v", err)
	}
	if reconnectingOpp.IsSpectator {
		t.Fatalf("returning contestant should be automatically promoted from spectator to contestant")
	}

	// 4. Host disconnects and reconnects before transferHost
	room.RemoveClient(hostClient)
	reconnectingHost := &Client{ID: "host-player", IsSpectator: false}
	if err := room.AddClient(reconnectingHost, ""); err != nil {
		t.Fatalf("returning host should be allowed to reconnect: %v", err)
	}

	// Calling transferHost should be a no-op because host-player is back!
	room.transferHost("host-player")
	if room.Host != "host-player" {
		t.Fatalf("expected host to remain 'host-player', got %s", room.Host)
	}
}
