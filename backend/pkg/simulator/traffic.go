package simulator

import (
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

var (
	Enabled bool = true

	mu          sync.RWMutex
	fakePlayers    []map[string]interface{}
	fakeRooms      []map[string]interface{}
	fakeActivities []map[string]interface{}

	games = []string{"minesweeper", "sudoku", "sliding", "hexa", "tetris", "gomoku", "codebreaker", "watersort", "drop2048", "math24", "sokoban"}
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
	// Sync Enabled state from DB
	var setting domain.SystemSetting
	if err := db.DB.Where(domain.SystemSetting{Key: "simulator_enabled"}).First(&setting).Error; err == nil {
		Enabled = setting.Value == "true"
	}

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

// GetFakeActivities returns a slice of fake real-time activity events
func GetFakeActivities() []map[string]interface{} {
	mu.RLock()
	defer mu.RUnlock()
	if !Enabled {
		return nil
	}
	return fakeActivities
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
		p := map[string]interface{}{
			"id":       idStr,
			"username": idStr,
			"status":   "idle",
		}

		// 45% playing single-player, 25% in PK match, 30% idle
		r := rand.Intn(100)
		if r < 45 {
			p["status"] = "playing"
			p["game"] = games[rand.Intn(len(games))]
			p["diff"] = diffs[rand.Intn(len(diffs))]
			p["mode"] = "single"
		} else if r < 70 {
			p["status"] = "pk"
			p["game"] = games[rand.Intn(len(games))]
			p["diff"] = diffs[rand.Intn(len(diffs))]
			p["mode"] = "pk"
			p["opponent"] = fmt.Sprintf("Guest_%04x", rand.Intn(0xFFFF))
		}

		newPlayers = append(newPlayers, p)
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

		hasPassword := rand.Intn(100) < 20

		// Randomize players (1 or 2)
		playersCount := rand.Intn(2) + 1

		// Randomize creation time (between 1 minute and 60 minutes ago)
		// to make the list look naturally formed over time.
		pastSeconds := rand.Intn(3600) + 60
		createdAt := time.Now().Unix() - int64(pastSeconds)

		newRooms = append(newRooms, map[string]interface{}{
			"id":          roomID,
			"game":        game,
			"host":        hostID,
			"players":     playersCount,
			"mode":        mode,
			"difficulty":  diff,
			"status":      "playing", // Prevent real players from joining
			"hasPassword": hasPassword,
			"createdAt":   createdAt,
		})
	}
	fakeRooms = newRooms

	// 3. Generate fake real-time activity events (10-15 activities)
	numActivities := rand.Intn(6) + 10
	newActivities := make([]map[string]interface{}, 0, numActivities)
	actTypes := []string{"playing", "game_win", "game_win", "game_lose", "record", "room_created"}
	nowMs := time.Now().UnixMilli()

	for i := 0; i < numActivities; i++ {
		player := newPlayers[rand.Intn(len(newPlayers))]
		game := games[rand.Intn(len(games))]
		actType := actTypes[rand.Intn(len(actTypes))]
		diff := diffs[rand.Intn(len(diffs))]
		pastSeconds := rand.Intn(600) + 10 // within last 10 minutes
		score := 0
		timeTaken := 0

		if actType == "record" || actType == "game_win" {
			if game == "minesweeper" || game == "sliding" {
				timeTaken = rand.Intn(45) + 15
			} else {
				score = (rand.Intn(50) + 10) * 500
			}
		}

		newActivities = append(newActivities, map[string]interface{}{
			"id":        fmt.Sprintf("act_sim_%d_%d", nowMs, i),
			"type":      actType,
			"playerId":  player["id"],
			"username":  player["username"],
			"gameId":    game,
			"diff":      diff,
			"mode":      "single",
			"score":     score,
			"timeTaken": timeTaken,
			"timestamp": nowMs - int64(pastSeconds*1000),
		})
	}
	fakeActivities = newActivities
}
