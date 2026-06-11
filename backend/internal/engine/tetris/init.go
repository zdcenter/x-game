package tetris

import (
	"github.com/x-game/backend/internal/engine"
)

func init() {
	engine.Register("tetris_diff_pk_attack", func() engine.GameEngine { return &PKAttackEngine{} })
	engine.Register("tetris_diff_pk_score", func() engine.GameEngine { return &PKAttackEngine{} })
}
