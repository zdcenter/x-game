package nonogram

import (
	"testing"
	"time"

	"github.com/x-game/backend/internal/engine"
)

func TestNonogramForfeitNoDeadlock(t *testing.T) {
	eng := newEngine("speed")
	_ = eng.InitGame(nil)
	eng.AddPlayer("admin")
	eng.AddPlayer("test")
	eng.State = engine.StatePlaying

	done := make(chan bool, 1)
	go func() {
		_, err := eng.HandleAction("test", "forfeit", []byte(`{"action":"forfeit"}`))
		if err != nil {
			t.Errorf("HandleAction forfeit returned error: %v", err)
		}
		done <- true
	}()

	select {
	case <-done:
		// success, no deadlock
	case <-time.After(2 * time.Second):
		t.Fatalf("DEADLOCK detected when handling forfeit action in nonogram engine!")
	}

	if eng.State != engine.StateFinished {
		t.Fatalf("expected state finished, got %v", eng.State)
	}
	if eng.Winner != "admin" {
		t.Fatalf("expected winner admin, got %v", eng.Winner)
	}
}
