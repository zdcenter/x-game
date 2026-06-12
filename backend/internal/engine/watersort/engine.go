package watersort

import (
	"encoding/json"
	"math/rand"
	"sync"
	"time"

	"github.com/x-game/backend/internal/engine"
)

const Capacity = 4

var Colors = []string{
	"#FF5733", "#33FF57", "#3357FF", "#F1C40F", "#9B59B6", "#1ABC9C",
	"#E67E22", "#E74C3C", "#34495E", "#2ECC71", "#3498DB", "#FD79A8",
	"#8E44AD", "#D35400", "#C0392B", "#16A085", "#7F8C8D", "#F39C12",
}

type Tube struct {
	Colors []string `json:"colors"`
}

type PlayerState struct {
	ID       string `json:"id"`
	Tubes    []Tube `json:"tubes"`
	Moves    int    `json:"moves"`
	Finished bool   `json:"finished"`
}

type WatersortState struct {
	Players      map[string]*PlayerState `json:"players"`
	Status       string                  `json:"status"` // waiting, playing, finished
	Winners      []string                `json:"winners"`
	InitialTubes []Tube                  `json:"-"`
}

type WatersortEngine struct {
	mu          sync.Mutex
	state       *WatersortState
	difficulty  string
	mode        string
	status      engine.GameState
	startTime   time.Time
	broadcastFn func()
}

func init() {
	engine.Register("watersort_single", func() engine.GameEngine { return NewEngine("single") })
	engine.Register("watersort_same_pk_speed", func() engine.GameEngine { return NewEngine("same_pk_speed") })
}

func NewEngine(mode string) *WatersortEngine {
	return &WatersortEngine{
		state: &WatersortState{
			Players: make(map[string]*PlayerState),
			Status:  "waiting",
			Winners: []string{},
		},
		mode:   mode,
		status: engine.StateWaiting,
	}
}

func (e *WatersortEngine) GetState() interface{} {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.state
}

func (e *WatersortEngine) GetStatus() engine.GameState {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.status
}

func (e *WatersortEngine) SetBroadcaster(b func()) {
	e.broadcastFn = b
}

func (e *WatersortEngine) AddPlayer(playerID string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if _, exists := e.state.Players[playerID]; !exists {
		p := &PlayerState{
			ID:    playerID,
			Tubes: []Tube{},
		}
		if len(e.state.InitialTubes) > 0 {
			p.Tubes = make([]Tube, len(e.state.InitialTubes))
			for i, t := range e.state.InitialTubes {
				p.Tubes[i] = Tube{Colors: make([]string, len(t.Colors))}
				copy(p.Tubes[i].Colors, t.Colors)
			}
		}
		e.state.Players[playerID] = p
	}
}

func (e *WatersortEngine) RemovePlayer(playerID string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	delete(e.state.Players, playerID)
}

func (e *WatersortEngine) HasPlayer(playerID string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	_, exists := e.state.Players[playerID]
	return exists
}

func (e *WatersortEngine) InitGame(options interface{}) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	diff := "easy"
	if opts, ok := options.(map[string]interface{}); ok {
		if d, ok := opts["difficulty"].(string); ok {
			diff = d
		}
	}
	e.difficulty = diff

	numColors := 5
	switch diff {
	case "easy":
		numColors = 5
	case "medium":
		numColors = 9
	case "hard":
		numColors = 14
	}

	if numColors > len(Colors) {
		numColors = len(Colors)
	}

	initialTubes := generatePuzzle(numColors)
	e.state.InitialTubes = initialTubes

	for _, p := range e.state.Players {
		p.Tubes = make([]Tube, len(initialTubes))
		for i, t := range initialTubes {
			p.Tubes[i] = Tube{Colors: make([]string, len(t.Colors))}
			copy(p.Tubes[i].Colors, t.Colors)
		}
		p.Moves = 0
		p.Finished = false
	}

	if e.mode == "single" {
		e.state.Status = "playing"
		e.status = engine.StatePlaying
		e.state.Winners = []string{}
		e.startTime = time.Now()
	} else {
		engine.StartWithCountdown(&e.mu, &e.status, e.broadcastFn, func() {
			e.state.Status = "playing"
			e.state.Winners = []string{}
			e.startTime = time.Now()
		})
	}

	return nil
}

func (e *WatersortEngine) CheckGameOver() (bool, []string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.status == engine.StateFinished, e.state.Winners
}

func (e *WatersortEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if action == "start" && e.status == engine.StateWaiting {
		engine.StartWithCountdown(&e.mu, &e.status, e.broadcastFn, func() {
			e.state.Status = "playing"
			e.state.Winners = []string{}
			e.startTime = time.Now()
		})
		return e.status, nil
	}

	if action == "restart_game" && e.status == engine.StateFinished {
		e.state.Winners = []string{}
		
		// Generate new puzzle
		numColors := 3
		switch e.difficulty {
		case "easy":
			numColors = 5
		case "medium":
			numColors = 9
		case "hard":
			numColors = 14
		}
		if numColors > len(Colors) {
			numColors = len(Colors)
		}

		initialTubes := generatePuzzle(numColors)
		e.state.InitialTubes = initialTubes

		for _, p := range e.state.Players {
			p.Tubes = make([]Tube, len(initialTubes))
			for i, t := range initialTubes {
				p.Tubes[i] = Tube{Colors: make([]string, len(t.Colors))}
				copy(p.Tubes[i].Colors, t.Colors)
			}
			p.Moves = 0
			p.Finished = false
		}

		if e.mode == "single" {
			e.status = engine.StatePlaying
			e.state.Status = "playing"
			e.startTime = time.Now()
		} else {
			e.status = engine.StateWaiting
			e.state.Status = "waiting"
		}
		
		if e.broadcastFn != nil {
			e.broadcastFn()
		}
		return e.status, nil
	}

	if e.status != engine.StatePlaying {
		return e.status, nil
	}

	if action == "pour" {
		var req struct {
			From int `json:"from"`
			To   int `json:"to"`
		}
		if err := json.Unmarshal(payload, &req); err == nil {
			e.handlePour(playerID, req.From, req.To)
		}
	} else if action == "restart" {
		e.handleRestart(playerID)
	} else if action == "forfeit" {
		e.state.Status = "finished"
		e.status = engine.StateFinished
		for id := range e.state.Players {
			if id != playerID {
				e.state.Winners = append(e.state.Winners, id)
			}
		}
	}

	return e.status, nil
}

func (e *WatersortEngine) handlePour(clientID string, from, to int) {
	player := e.state.Players[clientID]
	if player.Finished {
		return
	}
	tubes := player.Tubes
	if from < 0 || from >= len(tubes) || to < 0 || to >= len(tubes) || from == to {
		return
	}

	src := &tubes[from]
	dst := &tubes[to]

	if len(src.Colors) == 0 || len(dst.Colors) >= Capacity {
		return
	}

	srcTop := src.Colors[len(src.Colors)-1]
	if len(dst.Colors) > 0 {
		dstTop := dst.Colors[len(dst.Colors)-1]
		if srcTop != dstTop {
			return
		}
	}

	poured := false
	for len(src.Colors) > 0 && len(dst.Colors) < Capacity {
		top := src.Colors[len(src.Colors)-1]
		if len(dst.Colors) > 0 && top != dst.Colors[len(dst.Colors)-1] {
			break
		}
		src.Colors = src.Colors[:len(src.Colors)-1]
		dst.Colors = append(dst.Colors, top)
		poured = true
	}

	if poured {
		player.Moves++
		if e.checkWin(player.Tubes) {
			player.Finished = true
			if e.mode == "single" {
				e.state.Status = "finished"
				e.status = engine.StateFinished
				e.state.Winners = append(e.state.Winners, clientID)
			} else {
				if len(e.state.Winners) == 0 {
					e.state.Winners = append(e.state.Winners, clientID)
					e.state.Status = "finished"
					e.status = engine.StateFinished
				}
			}
		}
	}
}

func (e *WatersortEngine) handleRestart(clientID string) {
	player := e.state.Players[clientID]
	if player.Finished {
		return
	}

	player.Tubes = make([]Tube, len(e.state.InitialTubes))
	for i, t := range e.state.InitialTubes {
		player.Tubes[i] = Tube{Colors: make([]string, len(t.Colors))}
		copy(player.Tubes[i].Colors, t.Colors)
	}
	player.Moves = 0
}

func (e *WatersortEngine) checkWin(tubes []Tube) bool {
	for _, t := range tubes {
		if len(t.Colors) > 0 {
			if len(t.Colors) != Capacity {
				return false
			}
			c := t.Colors[0]
			for _, color := range t.Colors {
				if color != c {
					return false
				}
			}
		}
	}
	return true
}

func generatePuzzle(numColors int) []Tube {
	numTubes := numColors + 2
	tubes := make([][]string, numTubes)
	for i := 0; i < numColors; i++ {
		tubes[i] = make([]string, Capacity)
		for j := 0; j < Capacity; j++ {
			tubes[i][j] = Colors[i]
		}
	}
	for i := numColors; i < numTubes; i++ {
		tubes[i] = []string{}
	}

	iterations := numColors * 300
	type Move struct{ src, dst int }

	for i := 0; i < iterations; i++ {
		var validMoves []Move
		for src := 0; src < numTubes; src++ {
			if len(tubes[src]) == 0 {
				continue
			}
			top := tubes[src][len(tubes[src])-1]
			// Reverse pop condition: top must rest on same color or be size 1
			canPop := len(tubes[src]) == 1 || tubes[src][len(tubes[src])-2] == top
			if !canPop {
				continue
			}

			for dst := 0; dst < numTubes; dst++ {
				if src == dst {
					continue
				}
				if len(tubes[dst]) < Capacity {
					// To encourage mixing, we prefer putting into empty tubes or tubes with different top
					// But if we strictly forbid matching tops, we might get stuck easily.
					validMoves = append(validMoves, Move{src, dst})
				}
			}
		}

		if len(validMoves) == 0 {
			break // fallback if somehow stuck
		}

		m := validMoves[rand.Intn(len(validMoves))]
		top := tubes[m.src][len(tubes[m.src])-1]
		tubes[m.src] = tubes[m.src][:len(tubes[m.src])-1]
		tubes[m.dst] = append(tubes[m.dst], top)
	}

	result := make([]Tube, numTubes)
	for i, t := range tubes {
		result[i] = Tube{Colors: t}
	}
	return result
}
