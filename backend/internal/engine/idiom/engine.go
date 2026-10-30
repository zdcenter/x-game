package idiom

import (
	_ "embed"
	"encoding/json"
	"math/rand"
	"strings"
	"time"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
)

//go:embed idiom_words.json
var idiomWordsJSON []byte

const distractorPool = "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更刷加粮格并示才几石类精采满号"

var (
	allWords  []string
	wordMap   map[string]bool
	charIndex map[rune][]string // Grouped by first character for O(1) lookup
)

func init() {
	engine.RegisterGame("idiom")
	engine.Register("idiom_speed", func() engine.GameEngine {
		return &IdiomPKEngine{}
	})

	// Initialize in-memory vocabulary dictionary (Zero database dependency!)
	if err := json.Unmarshal(idiomWordsJSON, &allWords); err != nil {
		allWords = []string{"心旷神怡", "怡然自得", "得心应手", "手疾眼快"}
	}
	wordMap = make(map[string]bool, len(allWords))
	charIndex = make(map[rune][]string)
	for _, w := range allWords {
		wordMap[w] = true
		runes := []rune(w)
		if len(runes) == 4 {
			charIndex[runes[0]] = append(charIndex[runes[0]], w)
		}
	}
}

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

	opts := engine.ParseGameOptions(options)
	e.Target = opts.Target
	e.Difficulty = opts.DiffStr()

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
		e.TriggerCountdown(func() {
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

		// In-Memory Validation: 4 chars, starts with TargetChar, exists in wordMap, not already in chain
		if len(runes) == 4 && len([]rune(e.TargetChar)) > 0 && runes[0] == []rune(e.TargetChar)[0] {
			alreadyUsed := false
			for _, w := range e.Chain {
				if w == answer {
					alreadyUsed = true
					break
				}
			}
			if !alreadyUsed && wordMap[answer] {
				isCorrect = true
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

// startNewChain picks an initial seed idiom in memory to start the Solitaire dragon.
func (e *IdiomPKEngine) startNewChain() {
	if len(allWords) == 0 {
		e.Chain = []string{"心旷神怡"}
		e.CurrentWord = "心旷神怡"
		e.pickNextInChain()
		return
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	// Try up to 20 times to pick an idiom whose tail has at least 2 successors
	var chosen string
	for i := 0; i < 20; i++ {
		candidate := allWords[rng.Intn(len(allWords))]
		runes := []rune(candidate)
		if len(runes) == 4 {
			tail := runes[3]
			if len(charIndex[tail]) >= 2 {
				chosen = candidate
				break
			}
		}
	}
	if chosen == "" {
		chosen = allWords[rng.Intn(len(allWords))]
	}

	e.Chain = []string{chosen}
	e.CurrentWord = chosen
	e.pickNextInChain()
}

// pickNextInChain builds the next step for chaining from the last word in e.Chain using pure memory.
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
	tailRune := runes[3]
	e.TargetChar = tailChar

	// Lookup candidate successors in-memory
	candidates := charIndex[tailRune]
	usedSet := make(map[string]bool, len(e.Chain))
	for _, w := range e.Chain {
		usedSet[w] = true
	}

	var validSuccessors []string
	for _, w := range candidates {
		if !usedSet[w] {
			validSuccessors = append(validSuccessors, w)
		}
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	var targetWord string
	if len(validSuccessors) > 0 {
		targetWord = validSuccessors[rng.Intn(len(validSuccessors))]
	} else {
		// Dead end reached: restart with a fresh seed gracefully
		if len(allWords) > 0 {
			targetWord = allWords[rng.Intn(len(allWords))]
			e.Chain = append(e.Chain, targetWord)
			e.CurrentWord = targetWord
			freshRunes := []rune(targetWord)
			tailChar = string(freshRunes[3])
			tailRune = freshRunes[3]
			e.TargetChar = tailChar
		} else {
			targetWord = "心旷神怡"
		}
	}

	targetChars := []rune(targetWord)
	display := []string{tailChar, "_", "_", "_"}

	// Build 12-char keyboard: all chars of targetWord + distractors
	exclude := make(map[rune]bool)
	for _, c := range targetChars {
		exclude[c] = true
	}
	pool := []rune(distractorPool)
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
