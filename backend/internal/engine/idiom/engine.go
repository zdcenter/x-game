package idiom

import (
	"encoding/json"
	"math/rand"
	"strings"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
	"github.com/x-game/backend/pkg/db"
)

const distractorPool = "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更刷加粮格并示才几石类精采满号"

type PKPlayerState struct {
	ID         string `json:"id"`
	LastWrong  bool   `json:"last_wrong"`
	Attempts   int    `json:"attempts"`
	Correct    bool   `json:"correct"`
	WrongCount int    `json:"wrong_count"`
	Locked     bool   `json:"locked"`
}

type IdiomPKEngine struct {
	engine.BaseEngine
	Players     map[string]*PKPlayerState `json:"players"`
	CurrentWord string                    `json:"current_word"`
	Chain       []string                  `json:"chain"`
	TargetChar  string                    `json:"target_char"`
	Display     []string                  `json:"display"`
	Keyboard    []string                  `json:"keyboard"`
	RoundWinner string                    `json:"round_winner"`
	Winners     []string                  `json:"winners"`
	Wins        map[string]int            `json:"wins"`
	Target      int                       `json:"target"`
	RoundNum    int                       `json:"round_num"`
	Difficulty  string                    `json:"difficulty"`
}

func init() {
	engine.RegisterGame("idiom")
	engine.Register("idiom_speed", func() engine.GameEngine {
		return &IdiomPKEngine{}
	})
}

func (e *IdiomPKEngine) InitGame(options interface{}) error {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	e.State = engine.StateWaiting
	e.Players = make(map[string]*PKPlayerState)
	e.Winners = make([]string, 0)
	e.Wins = make(map[string]int)
	e.Target = 3
	e.RoundNum = 0
	e.RoundWinner = ""
	e.Difficulty = ""
	e.Chain = make([]string, 0)
	e.CurrentWord = ""
	e.TargetChar = ""
	e.Display = make([]string, 0)
	e.Keyboard = make([]string, 0)

	if opts, ok := options.(map[string]interface{}); ok {
		if t, ok := opts["target"].(int); ok && t > 0 {
			e.Target = t
		}
		if d, ok := opts["difficulty"].(string); ok {
			e.Difficulty = d
		}
	}

	return nil
}

func (e *IdiomPKEngine) AddPlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	if _, exists := e.Players[playerID]; !exists {
		e.Players[playerID] = &PKPlayerState{ID: playerID}
	}
	if _, hasWins := e.Wins[playerID]; !hasWins {
		e.Wins[playerID] = 0
	}
}

func (e *IdiomPKEngine) RemovePlayer(playerID string) {
	e.Mu.Lock()
	defer e.Mu.Unlock()
	delete(e.Players, playerID)
}

func (e *IdiomPKEngine) HasPlayer(playerID string) bool {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	_, exists := e.Players[playerID]
	return exists
}

func (e *IdiomPKEngine) GetState() interface{} {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return map[string]interface{}{
		"status":       e.State,
		"current_word": e.CurrentWord,
		"chain":        e.Chain,
		"target_char":  e.TargetChar,
		"display":      e.Display,
		"keyboard":     e.Keyboard,
		"players":      e.Players,
		"round_winner": e.RoundWinner,
		"winners":      e.Winners,
		"wins":         e.Wins,
		"target":       e.Target,
		"round_num":    e.RoundNum,
		"difficulty":   e.Difficulty,
	}
}

func (e *IdiomPKEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	e.Mu.Lock()
	defer e.Mu.Unlock()

	var baseReq struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(payload, &baseReq); err == nil && baseReq.Action != "" {
		action = baseReq.Action
	}

	if action == string(domain.ActionStartGame) && e.State == engine.StateWaiting {
		engine.StartWithCountdown(&e.Mu, &e.State, e.Broadcast, func() {
			e.startNewChain()
			e.RoundNum = 1
		})
		return e.State, nil
	}

	if action == string(domain.ActionRestartGame) && e.State == engine.StateFinished {
		for p := range e.Wins {
			e.Wins[p] = 0
		}
		for _, p := range e.Players {
			p.LastWrong = false
			p.Attempts = 0
			p.Correct = false
			p.WrongCount = 0
			p.Locked = false
		}
		e.Winners = []string{}
		e.RoundWinner = ""
		e.RoundNum = 0
		e.Chain = []string{}
		e.CurrentWord = ""
		e.TargetChar = ""
		e.State = engine.StateWaiting
		return e.State, nil
	}

	if e.State != engine.StatePlaying {
		return e.State, nil
	}

	player, exists := e.Players[playerID]
	if !exists {
		return e.State, nil
	}

	switch action {
	case string(domain.ActionInput):
		// Another player already won this round; ignore late submissions
		if e.RoundWinner != "" {
			return e.State, nil
		}
		// Locked players cannot submit
		if player.Locked {
			return e.State, nil
		}

		var req struct {
			Answer []string `json:"answer"`
		}
		if err := json.Unmarshal(payload, &req); err != nil {
			return e.State, nil
		}

		answer := strings.Join(req.Answer, "")
		player.Attempts++

		runes := []rune(answer)
		isCorrect := false

		// Validate answer: 4 chars, starts with TargetChar, exists in DB, not used in chain
		if len(runes) == 4 && len([]rune(e.TargetChar)) > 0 && runes[0] == []rune(e.TargetChar)[0] {
			alreadyUsed := false
			for _, w := range e.Chain {
				if w == answer {
					alreadyUsed = true
					break
				}
			}
			if !alreadyUsed {
				var count int64
				db.DB.Model(&domain.Idiom{}).Where("word = ?", answer).Count(&count)
				if count > 0 {
					isCorrect = true
				}
			}
		}

		if isCorrect {
			player.Correct = true
			e.RoundWinner = playerID
			e.Wins[playerID]++
			e.Chain = append(e.Chain, answer)
			e.CurrentWord = answer

			if e.Wins[playerID] >= e.Target {
				e.Winners = []string{playerID}
				e.State = engine.StateFinished
				e.Broadcast()
			} else {
				e.Broadcast()
				go e.scheduleNextRound()
			}
		} else {
			player.LastWrong = true
			player.WrongCount++
			if player.WrongCount >= 3 {
				player.Locked = true
			}
			e.Broadcast()
			// Clear LastWrong shake flag after brief delay
			go func() {
				time.Sleep(600 * time.Millisecond)
				e.Mu.Lock()
				defer e.Mu.Unlock()
				if p, ok := e.Players[playerID]; ok {
					p.LastWrong = false
					e.Broadcast()
				}
				// If all players are locked, auto-advance to next round
				allLocked := true
				for _, p := range e.Players {
					if !p.Locked {
						allLocked = false
						break
					}
				}
				if allLocked {
					go e.scheduleNextRound()
				}
			}()
		}

	case string(domain.ActionForfeit):
		e.Winners = []string{}
		for id := range e.Players {
			if id != playerID {
				e.Winners = append(e.Winners, id)
				break
			}
		}
		e.State = engine.StateFinished
	}

	return e.State, nil
}

func (e *IdiomPKEngine) scheduleNextRound() {
	time.Sleep(1500 * time.Millisecond)
	e.Mu.Lock()
	defer e.Mu.Unlock()
	if e.State != engine.StatePlaying {
		return
	}
	for _, p := range e.Players {
		p.LastWrong = false
		p.Attempts = 0
		p.Correct = false
		p.WrongCount = 0
		p.Locked = false
	}
	e.RoundWinner = ""
	e.RoundNum++
	e.pickNextInChain()
	e.Broadcast()
}

func (e *IdiomPKEngine) CheckGameOver() (bool, []string) {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.State == engine.StateFinished, e.Winners
}

// startNewChain picks an initial seed idiom to start the Solitaire dragon. Must be called with lock held.
func (e *IdiomPKEngine) startNewChain() {
	var idiom domain.Idiom
	q := db.DB.Order("RANDOM()")
	if e.Difficulty != "" {
		q = q.Where("difficulty = ?", e.Difficulty)
	}
	q.First(&idiom)
	if idiom.Word == "" {
		db.DB.Order("RANDOM()").First(&idiom)
	}

	e.Chain = []string{idiom.Word}
	e.CurrentWord = idiom.Word
	e.pickNextInChain()
}

// pickNextInChain builds the next step for chaining from the last word in e.Chain.
func (e *IdiomPKEngine) pickNextInChain() {
	if len(e.Chain) == 0 {
		e.startNewChain()
		return
	}

	lastWord := e.Chain[len(e.Chain)-1]
	runes := []rune(lastWord)
	if len(runes) < 4 {
		e.startNewChain()
		return
	}
	tailChar := string(runes[3])
	e.TargetChar = tailChar

	// Find an idiom in DB that starts with tailChar and is not in e.Chain
	var nextIdiom domain.Idiom
	q := db.DB.Where("word LIKE ? AND word NOT IN ?", tailChar+"%", e.Chain)
	if e.Difficulty != "" {
		q = q.Where("difficulty = ?", e.Difficulty)
	}
	q.Order("RANDOM()").First(&nextIdiom)

	// If no successor found, pick a fresh seed to restart chain gracefully
	if nextIdiom.Word == "" {
		var fresh domain.Idiom
		db.DB.Order("RANDOM()").First(&fresh)
		if fresh.Word != "" {
			e.Chain = append(e.Chain, fresh.Word)
			e.CurrentWord = fresh.Word
			lastRunes := []rune(fresh.Word)
			tailChar = string(lastRunes[3])
			e.TargetChar = tailChar
			db.DB.Where("word LIKE ? AND word NOT IN ?", tailChar+"%", e.Chain).Order("RANDOM()").First(&nextIdiom)
		}
	}

	targetWord := nextIdiom.Word
	if targetWord == "" {
		targetWord = "心旷神怡" // Safe fallback
	}

	targetChars := []rune(targetWord)
	display := []string{tailChar, "_", "_", "_"}

	// Build 12-char keyboard: all chars of targetWord + distractors
	exclude := make(map[rune]bool)
	for _, c := range targetChars {
		exclude[c] = true
	}
	pool := []rune(distractorPool)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	var available []rune
	for _, c := range pool {
		if !exclude[c] {
			available = append(available, c)
		}
	}
	rng.Shuffle(len(available), func(i, j int) { available[i], available[j] = available[j], available[i] })
	needed := 12 - len(targetChars)
	if needed < 0 {
		needed = 0
	}
	if len(available) > needed {
		available = available[:needed]
	}
	all := append(targetChars, available...)
	rng.Shuffle(len(all), func(i, j int) { all[i], all[j] = all[j], all[i] })

	keyboard := make([]string, len(all))
	for i, r := range all {
		keyboard[i] = string(r)
	}

	e.Display = display
	e.Keyboard = keyboard
}
