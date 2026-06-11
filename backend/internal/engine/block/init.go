package block

import "github.com/x-game/backend/internal/engine"

func init() {
	engine.Register("block_diff_pk_score", func() engine.GameEngine { return &PKScoreEngine{} })
}
