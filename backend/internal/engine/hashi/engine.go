package hashi

import (
	"github.com/x-game/backend/internal/engine"
)

type HashiEngine struct {
	engine.BaseEngine
}

func init() {
	engine.RegisterGame("hashi")
	// If multiplayer is ever needed, register the specific mode engine here
	// engine.Register("hashi_pk", func() engine.GameEngine { return &HashiEngine{} })
}

func (e *HashiEngine) InitGame(options interface{}) error { return nil }
func (e *HashiEngine) AddPlayer(playerID string)          {}
func (e *HashiEngine) RemovePlayer(playerID string)       {}
func (e *HashiEngine) HasPlayer(playerID string) bool     { return false }
func (e *HashiEngine) HandleAction(playerID string, action string, payload []byte) (engine.GameState, error) {
	return engine.StateFinished, nil
}
func (e *HashiEngine) CheckGameOver() (bool, []string) { return true, nil }
func (e *HashiEngine) GetState() interface{}           { return nil }
