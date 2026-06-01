package db

import (
	"log"

	"github.com/x-game/backend/internal/domain"
)

func SeedMath24() {
	var count int64
	DB.Model(&domain.Math24Puzzle{}).Count(&count)
	if count == 0 {
		puzzles := []domain.Math24Puzzle{
			// Easy: No fractions required
			{ID: "m24-easy-1", Difficulty: domain.DifficultyMath24Easy, Cards: "1,2,3,4", Solutions: `["1*2*3*4", "(1+2+3)*4"]`},
			{ID: "m24-easy-2", Difficulty: domain.DifficultyMath24Easy, Cards: "2,3,4,5", Solutions: `["(3+4+5)*2", "(5-2)*(3+4)"]`},
			{ID: "m24-easy-3", Difficulty: domain.DifficultyMath24Easy, Cards: "4,4,4,4", Solutions: `["4*4+4+4"]`},
			{ID: "m24-easy-4", Difficulty: domain.DifficultyMath24Easy, Cards: "2,4,6,8", Solutions: `["(8-6)*2*4", "(6-2)*4+8", "(8+4)*6/2"]`},
			{ID: "m24-easy-5", Difficulty: domain.DifficultyMath24Easy, Cards: "3,5,7,9", Solutions: `["(9-7)*(3+5)"]`},

			// Hard: Requires fractions or complex parenthesis
			{ID: "m24-hard-1", Difficulty: domain.DifficultyMath24Hard, Cards: "3,3,8,8", Solutions: `["8/(3-8/3)"]`},
			{ID: "m24-hard-2", Difficulty: domain.DifficultyMath24Hard, Cards: "1,4,5,6", Solutions: `["4/(1-5/6)"]`},
			{ID: "m24-hard-3", Difficulty: domain.DifficultyMath24Hard, Cards: "3,3,7,7", Solutions: `["(3+3/7)*7"]`},
			{ID: "m24-hard-4", Difficulty: domain.DifficultyMath24Hard, Cards: "4,4,7,7", Solutions: `["7*(4-4/7)"]`},
			{ID: "m24-hard-5", Difficulty: domain.DifficultyMath24Hard, Cards: "2,5,5,10", Solutions: `["(5-2/5)*10"]`},
		}
		for _, p := range puzzles {
			DB.Create(&p)
		}
		log.Println("Seeded default Math24 puzzles")
	}
}
