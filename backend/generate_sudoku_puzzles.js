const sudoku = require('sudoku-gen');
const fs = require('fs');
const path = require('path');

const difficulties = ['easy', 'medium', 'hard', 'expert'];
const PUZZLES_PER_DIFF = 50;

let dbSeedGoCode = `package db

import (
	"log"

	"github.com/x-game/backend/internal/domain"
)

func SeedSudoku() {
	var count int64
	DB.Model(&domain.SudokuPuzzle{}).Count(&count)
	if count == 0 {
		puzzles := []domain.SudokuPuzzle{
`;

let puzzleCounter = 1;

for (const diff of difficulties) {
    console.log(`Generating ${diff} puzzles...`);
    for (let i = 0; i < PUZZLES_PER_DIFF; i++) {
        const puzzle = sudoku.getSudoku(diff);
        const pid = `sudoku-${diff}-${i+1}`;
        // Diff mapping
        let diffValue = "domain.SudokuDifficultyEasy";
        if (diff === 'medium') diffValue = "domain.SudokuDifficultyMedium";
        if (diff === 'hard') diffValue = "domain.SudokuDifficultyHard";
        if (diff === 'expert') diffValue = "domain.SudokuDifficultyExpert";
        
        dbSeedGoCode += `			{ID: "${pid}", Difficulty: ${diffValue}, Puzzle: "${puzzle.puzzle}", Solution: "${puzzle.solution}"},\n`;
        puzzleCounter++;
    }
}

dbSeedGoCode += `		}
		
		DB.CreateInBatches(puzzles, 100)
		log.Println("Seeded Sudoku puzzles")
	}
}
`;

fs.writeFileSync('/home/zd/x-game/backend/pkg/db/postgres_sudoku.go', dbSeedGoCode);
console.log("Done generating postgres_sudoku.go!");
