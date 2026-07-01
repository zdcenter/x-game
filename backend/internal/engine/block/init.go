package block

import "github.com/x-game/backend/internal/engine"

func init() {
	engine.RegisterGame("block")
	engine.Register("block_score", func() engine.GameEngine { return &PKScoreEngine{} })
}
