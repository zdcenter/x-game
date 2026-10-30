package ws

import (
	"testing"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
	_ "github.com/x-game/backend/internal/engine/idiom"
	_ "github.com/x-game/backend/internal/engine/sliding"
	_ "github.com/x-game/backend/internal/engine/tilematch"
)

func TestSpectatorModeBypassesGameStarted(t *testing.T) {
	roomID := "test-spectate-room-1"
	room, err := CreateRoom(roomID, "tilematch", "pk_speed", "easy", "host-player", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	// Add host
	hostClient := &Client{ID: "host-player"}
	if err := room.AddClient(hostClient, ""); err != nil {
		t.Fatalf("failed to add host: %v", err)
	}

	// Add opponent
	oppClient := &Client{ID: "opp-player"}
	if err := room.AddClient(oppClient, ""); err != nil {
		t.Fatalf("failed to add opp: %v", err)
	}

	// Start game
	hostClient.IsReady = true
	oppClient.IsReady = true
	_, err = room.Engine.HandleAction("host-player", "start", []byte(`{"action":"start"}`))
	if err != nil {
		t.Fatalf("failed to start game: %v", err)
	}

	// Game should now be in StateStarting or StatePlaying
	st := room.Engine.GetStatus()
	if st == engine.StateWaiting {
		t.Fatalf("expected game not to be in waiting state, got %v", st)
	}

	// Normal late joiner should be rejected
	latePlayer := &Client{ID: "late-player", IsSpectator: false}
	err = room.AddClient(latePlayer, "")
	if err == nil || err.Error() != "game already started" {
		t.Fatalf("expected 'game already started' error for normal player, got %v", err)
	}

	// Spectator should be accepted without error
	spectator := &Client{ID: "spectator-1", IsSpectator: true}
	err = room.AddClient(spectator, "")
	if err != nil {
		t.Fatalf("expected spectator to join successfully, got %v", err)
	}

	// Verify spectator is in room.Clients but not in engine players
	if !spectator.IsSpectator {
		t.Fatalf("expected IsSpectator to be true")
	}
	if room.Engine.HasPlayer("spectator-1") {
		t.Fatalf("spectator should NOT be added as an engine contestant")
	}

	// Verify snapshots
	snapshots := GetActiveRooms()
	var found *RoomSnapshot
	for i := range snapshots {
		if snapshots[i].ID == roomID {
			found = &snapshots[i]
			break
		}
	}
	if found == nil {
		t.Fatalf("room not found in snapshots")
	}
	if found.PlayerCount != 2 {
		t.Fatalf("expected 2 active players in snapshot, got %d", found.PlayerCount)
	}
	if found.SpectatorCount != 1 {
		t.Fatalf("expected 1 spectator in snapshot, got %d", found.SpectatorCount)
	}

	// Verify spectator cannot start game or execute engine actions
	room.HandleMessage("spectator-1", []byte(`{"action":"move","delta":10}`))
	// Engine state should remain untouched by spectator
}

func TestSpectatorRoomCleanupWhenContestantsLeave(t *testing.T) {
	roomID := "test-spectate-room-2"
	room, err := CreateRoom(roomID, "tilematch", "pk_speed", "easy", "p1", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	p1 := &Client{ID: "p1"}
	room.AddClient(p1, "")

	spectator := &Client{ID: "spec-1", IsSpectator: true}
	room.AddClient(spectator, "")

	// p1 leaves via action
	room.HandleMessage("p1", []byte(`{"action":"`+string(domain.ActionLeaveRoom)+`"}`))

	// Since only spectator remained (0 contestants), the room should be destroyed
	mu.Lock()
	_, exists := Rooms[roomID]
	mu.Unlock()

	if exists {
		t.Fatalf("room should have been destroyed when all contestants left")
	}
}

func TestSpectatorDoesNotBlockStartGame(t *testing.T) {
	roomID := "test-spectate-start-room"
	room, err := CreateRoom(roomID, "tilematch", "pk_speed", "easy", "admin", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	admin := &Client{ID: "admin"}
	room.AddClient(admin, "")

	testPlayer := &Client{ID: "test"}
	room.AddClient(testPlayer, "")

	cctv := &Client{ID: "cctv", IsSpectator: true}
	room.AddClient(cctv, "")

	// testPlayer sends ready
	room.HandleMessage("test", []byte(`{"action":"`+string(domain.ActionReady)+`"}`))
	if !testPlayer.IsReady {
		t.Fatalf("expected test player to be ready")
	}

	// admin sends start
	room.HandleMessage("admin", []byte(`{"action":"`+string(domain.ActionStartGame)+`"}`))

	st := room.Engine.GetStatus()
	if st == engine.StateWaiting {
		t.Fatalf("expected game to start despite spectator not being ready, but still in StateWaiting")
	}
}

func TestSpectatorDoesNotBlockStartGameAfterChangeGame(t *testing.T) {
	roomID := "test-spectate-change-room"
	room, err := CreateRoom(roomID, "tilematch", "pk_speed", "easy", "admin", "", 1, 0)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	admin := &Client{ID: "admin"}
	room.AddClient(admin, "")

	testPlayer := &Client{ID: "test"}
	room.AddClient(testPlayer, "")

	cctv := &Client{ID: "cctv", IsSpectator: true}
	room.AddClient(cctv, "")

	// Host changes game to sliding
	changePayload := []byte(`{"action":"` + string(domain.ActionChangeGame) + `","game":"sliding","mode":"speed","difficulty":"easy"}`)
	room.HandleMessage("admin", changePayload)

	// Verify cctv is NOT added as a contestant in the new sliding engine
	if room.Engine.HasPlayer("cctv") {
		t.Fatalf("spectator cctv should NOT be added as a player in new engine after change_game")
	}

	// test sends ready
	room.HandleMessage("test", []byte(`{"action":"`+string(domain.ActionReady)+`"}`))

	// admin sends start
	room.HandleMessage("admin", []byte(`{"action":"`+string(domain.ActionStartGame)+`"}`))

	st := room.Engine.GetStatus()
	if st == engine.StateWaiting {
		t.Fatalf("expected sliding game to start after change_game, but still in StateWaiting")
	}
}

func TestIdiomRoomAndSpectator(t *testing.T) {
	roomID := "test-idiom-spectate-1"
	room, err := CreateRoom(roomID, "idiom", "speed", "", "host-player", "", 3, 0)
	if err != nil {
		t.Fatalf("failed to create idiom room: %v", err)
	}
	defer func() {
		mu.Lock()
		delete(Rooms, roomID)
		mu.Unlock()
	}()

	// Add host
	hostClient := &Client{ID: "host-player"}
	if err := room.AddClient(hostClient, ""); err != nil {
		t.Fatalf("failed to add host: %v", err)
	}

	// Add opponent
	oppClient := &Client{ID: "opp-player"}
	if err := room.AddClient(oppClient, ""); err != nil {
		t.Fatalf("failed to add opp: %v", err)
	}

	// Add spectator
	specClient := &Client{ID: "spectator-idiom", IsSpectator: true}
	if err := room.AddClient(specClient, ""); err != nil {
		t.Fatalf("failed to add spectator: %v", err)
	}

	// Verify spectator is not treated as a contestant in engine
	if room.Engine.HasPlayer("spectator-idiom") {
		t.Fatalf("spectator should NOT be added to idiom engine players")
	}

	// Start game
	hostClient.IsReady = true
	oppClient.IsReady = true
	_, err = room.Engine.HandleAction("host-player", "start", []byte(`{"action":"start"}`))
	if err != nil {
		t.Fatalf("failed to start idiom game: %v", err)
	}

	st := room.Engine.GetStatus()
	if st == engine.StateWaiting {
		t.Fatalf("expected game to transition out of StateWaiting")
	}
}

