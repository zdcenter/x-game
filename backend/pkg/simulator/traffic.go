package simulator

import (
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/x-game/backend/pkg/db"
)

var (
	Enabled bool = true
	
	mu          sync.RWMutex
	fakePlayers []map[string]interface{}
	fakeRooms   []map[string]interface{}

	games = []string{"minesweeper", "sudoku", "sliding", "hexa", "tetris", "gomoku", "codebreaker", "drop2048", "math24"}
	modes = []string{"pk_speed", "pk_steal"}
	diffs = []string{"easy", "medium", "hard"}
)

func init() {
	// Initialize random seed
	rand.Seed(time.Now().UnixNano())
	
	// Pre-generate initial fake data
	refreshFakeData()
}

// Start runs the background tasks for traffic simulation
func Start() {
	go func() {
		// Update rooms and players every 3 minutes to simulate churn
		ticker := time.NewTicker(3 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if Enabled {
				refreshFakeData()
			}
		}
	}()

	go func() {
		// Randomly bump visit_count for a random game every 1-3 minutes
		for {
			sleepTime := time.Duration(rand.Intn(120)+60) * time.Second
			time.Sleep(sleepTime)
			
			if Enabled {
				gameID := games[rand.Intn(len(games))]
				// Best effort update
				db.DB.Exec(`UPDATE "gm_game_configs" SET "visit_count" = "visit_count" + 1 WHERE id = ?`, gameID)
			}
		}
	}()
}

// GetFakePlayers returns a slice of fake lobby players
func GetFakePlayers() []map[string]interface{} {
	mu.RLock()
	defer mu.RUnlock()
	if !Enabled {
		return nil
	}
	return fakePlayers
}

// GetFakeRooms returns a slice of fake active rooms
func GetFakeRooms() []map[string]interface{} {
	mu.RLock()
	defer mu.RUnlock()
	if !Enabled {
		return nil
	}
	return fakeRooms
}

func ForceRefresh() {
	refreshFakeData()
}

func refreshFakeData() {
	mu.Lock()
	defer mu.Unlock()

	// 1. Generate fake players (between 80 and 150)
	numPlayers := rand.Intn(70) + 80
	newPlayers := make([]map[string]interface{}, 0, numPlayers)
	for i := 0; i < numPlayers; i++ {
		idStr := fmt.Sprintf("Guest_%04x", rand.Intn(0xFFFF))
		newPlayers = append(newPlayers, map[string]interface{}{
			"id":       idStr,
			"username": idStr,
			"status":   "idle", // fake players are mostly idle or playing
		})
	}
	// Mark some as playing
	for i := 0; i < numPlayers/3; i++ {
		newPlayers[i]["status"] = "playing"
	}
	fakePlayers = newPlayers

	// 2. Generate fake active rooms (between 8 and 20)
	numRooms := rand.Intn(12) + 8
	newRooms := make([]map[string]interface{}, 0, numRooms)
	
	for i := 0; i < numRooms; i++ {
		hostID := fmt.Sprintf("Guest_%04x", rand.Intn(0xFFFF))
		game := games[rand.Intn(len(games))]
		mode := modes[rand.Intn(len(modes))]
		diff := diffs[rand.Intn(len(diffs))]
		
		roomID := fmt.Sprintf("room-%08x", rand.Intn(0xFFFFFFFF))
		
		newRooms = append(newRooms, map[string]interface{}{
			"id":         roomID,
			"game":       game,
			"host":       hostID,
			"players":    2,          // Always show them as full
			"mode":       mode,
			"difficulty": diff,
			"status":     "playing",  // Prevent real players from joining
			"createdAt":  time.Now().Unix(),
		})
	}
	fakeRooms = newRooms
}
