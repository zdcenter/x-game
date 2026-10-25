package watersort

import (
	"github.com/x-game/backend/internal/domain"
	"encoding/json"
	"math/rand"
	"sync"
	"time"

	"github.com/x-game/backend/internal/engine"
)

const Capacity = 4

var Colors = []string{
	"red", "blue", "green", "yellow", "purple", "orange", "cyan", "pink",
	"brown", "gray", "lime", "teal", "navy", "magenta",
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
	engine.RegisterGame("watersort")
	engine.Register("watersort_single", func() engine.GameEngine { return NewEngine(string(domain.ModeSingle)) })
	engine.Register("watersort_speed", func() engine.GameEngine { return NewEngine(string(domain.ModeSpeed)) })
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

	diff := string(domain.DiffEasy)
	if opts, ok := options.(map[string]interface{}); ok {
		if d, ok := opts["difficulty"].(string); ok {
			diff = d
		}
	}
	e.difficulty = diff

	numColors := 5
	switch diff {
	case string(domain.DiffEasy):
		numColors = 5
	case string(domain.DiffMedium):
		numColors = 9
	case string(domain.DiffHard):
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

	if e.mode == string(domain.ModeSingle) {
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

		if engine.HandleLifecycle(&e.status, action, func() {
		engine.StartWithCountdown(&e.mu, &e.status, e.broadcastFn, func() {
			e.state.Status = "playing"
			e.state.Winners = []string{}
			e.startTime = time.Now()
		})
	}, func() {
		e.state.Winners = []string{}

		numColors := 3
		switch e.difficulty {
		case string(domain.DiffEasy):
			numColors = 5
		case string(domain.DiffMedium):
			numColors = 9
		case string(domain.DiffHard):
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

		if e.mode == string(domain.ModeSingle) {
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
	}) {
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
	} else if action == string(domain.ActionForfeit) {
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
			if e.mode == string(domain.ModeSingle) {
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

var hardMasterSeeds = [][][]int{
	{{11,5,3,8},{8,10,9,5},{6,12,2,8},{10,1,1,0},{10,0,6,6},{12,2,2,1},{0,4,13,6},{8,4,11,3},{13,13,5,1},{10,4,11,12},{7,11,7,7},{9,3,3,9},{13,2,0,5},{9,7,4,12}},
	{{3,7,13,4},{5,12,3,1},{11,2,13,0},{7,3,13,5},{11,11,8,5},{2,4,4,13},{2,0,2,10},{6,9,9,1},{7,11,12,8},{5,8,10,6},{6,7,8,9},{3,0,0,10},{6,4,12,12},{1,9,10,1}},
	{{11,9,9,6},{6,6,2,1},{4,10,7,13},{2,13,8,10},{2,0,13,5},{4,3,6,0},{1,1,0,1},{8,7,10,4},{13,8,10,12},{12,5,3,8},{12,5,4,0},{7,5,9,11},{7,3,9,12},{2,3,11,11}},
}

func generatePuzzle(numColors int) []Tube {
	numTubes := numColors + 2
	tubes := make([]Tube, numTubes)

	if numColors == 14 {
		// Hard: Isomorphic master seed mapping
		seedIdx := rand.Intn(len(hardMasterSeeds))
		seed := hardMasterSeeds[seedIdx]

		shuffledColors := make([]string, numColors)
		copy(shuffledColors, Colors[:numColors])
		rand.Shuffle(numColors, func(i, j int) {
			shuffledColors[i], shuffledColors[j] = shuffledColors[j], shuffledColors[i]
		})

		perm := rand.Perm(numColors)
		for i, originalIdx := range perm {
			tubePattern := seed[originalIdx]
			t := make([]string, Capacity)
			for j := 0; j < Capacity; j++ {
				t[j] = shuffledColors[tubePattern[j]]
			}
			tubes[i] = Tube{Colors: t}
		}
		tubes[numColors] = Tube{Colors: []string{}}
		tubes[numColors+1] = Tube{Colors: []string{}}
		return tubes
	}

	// For Easy (5) & Medium (9): distribute randomly into numColors full tubes + 2 empty tubes
	for attempt := 0; attempt < 20; attempt++ {
		deck := make([]string, 0, numColors*Capacity)
		for i := 0; i < numColors; i++ {
			for k := 0; k < Capacity; k++ {
				deck = append(deck, Colors[i])
			}
		}
		rand.Shuffle(len(deck), func(i, j int) {
			deck[i], deck[j] = deck[j], deck[i]
		})

		hasMonocolor := false
		for i := 0; i < numColors; i++ {
			t := make([]string, Capacity)
			copy(t, deck[i*Capacity:(i+1)*Capacity])
			if t[0] == t[1] && t[1] == t[2] && t[2] == t[3] {
				hasMonocolor = true
				break
			}
			tubes[i] = Tube{Colors: t}
		}
		if hasMonocolor {
			continue
		}

		tubes[numColors] = Tube{Colors: []string{}}
		tubes[numColors+1] = Tube{Colors: []string{}}
		return tubes
	}

	// Fallback
	for i := 0; i < numColors; i++ {
		tubes[i] = Tube{Colors: []string{Colors[i], Colors[(i+1)%numColors], Colors[(i+2)%numColors], Colors[(i+3)%numColors]}}
	}
	tubes[numColors] = Tube{Colors: []string{}}
	tubes[numColors+1] = Tube{Colors: []string{}}
	return tubes
}
