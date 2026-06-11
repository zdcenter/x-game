package drop2048

import "github.com/x-game/backend/internal/engine"

func init() {
	engine.Register("drop2048_diff_pk_score", func() engine.GameEngine { return &PKScoreEngine{} })
}
