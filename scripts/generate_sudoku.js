const fs = require('fs');
const path = require('path');
const { getSudoku } = require('sudoku-gen');

const counts = {
    easy: 500,
    medium: 500,
    hard: 500,
    expert: 500
};

const difficulties = ['easy', 'medium', 'hard', 'expert'];
const puzzles = [];
let idCounter = 1;

console.log('Generating Sudoku puzzles...');

for (const diff of difficulties) {
    console.log(`Generating ${counts[diff]} ${diff} puzzles...`);
    for (let i = 0; i < counts[diff]; i++) {
        const generated = getSudoku(diff);
        puzzles.push({
            id: `sudoku-${diff}-${i + 1}`,
            difficulty: diff,
            puzzle: generated.puzzle,
            solution: generated.solution
        });
    }
}

console.log(`Successfully generated ${puzzles.length} puzzles.`);

// Format as Go code
const goFileContent = `package db

import (
	"log"

	"github.com/x-game/backend/internal/domain"
)

func SeedSudoku() {
	var count int64
	DB.Model(&domain.SudokuPuzzle{}).Count(&count)
	
	// If the count is exactly what we expect, don't re-seed
	// Otherwise, clear and re-seed
	expectedCount := int64(${puzzles.length})
	
	if count != expectedCount {
		log.Printf("Sudoku DB has %d puzzles, expected %d. Re-seeding...", count, expectedCount)
		
		// Delete existing
		DB.Exec("DELETE FROM sudoku_puzzles")
		
		puzzles := []domain.SudokuPuzzle{
${puzzles.map(p => `\t\t\t{ID: "${p.id}", Difficulty: domain.SudokuDifficulty${p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}, Puzzle: "${p.puzzle}", Solution: "${p.solution}"},`).join('\n')}
		}
		
		// Insert in batches of 100 for performance
		result := DB.CreateInBatches(puzzles, 100)
		if result.Error != nil {
			log.Fatalf("Failed to seed Sudoku puzzles: %v", result.Error)
		} else {
			log.Printf("Successfully seeded %d Sudoku puzzles", len(puzzles))
		}
	} else {
		log.Printf("Sudoku DB already has %d puzzles. Skipping seed.", count)
	}
}
`;

const destPath = path.join(__dirname, '..', 'backend', 'pkg', 'db', 'postgres_sudoku.go');
fs.writeFileSync(destPath, goFileContent);

console.log('Successfully wrote to postgres_sudoku.go');
