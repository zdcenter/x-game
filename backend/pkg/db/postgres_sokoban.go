package db

import (
	"fmt"
	"log"
	"strings"

	"github.com/x-game/backend/internal/domain"
)

func mirrorHorizontal(level string) string {
	lines := strings.Split(level, "\n")
	maxWidth := 0
	for _, l := range lines {
		if len(l) > maxWidth {
			maxWidth = len(l)
		}
	}
	for i, l := range lines {
		for len(l) < maxWidth {
			l += " "
		}
		runes := []rune(l)
		for j, k := 0, len(runes)-1; j < k; j, k = j+1, k-1 {
			runes[j], runes[k] = runes[k], runes[j]
		}
		lines[i] = strings.TrimRight(string(runes), " ")
	}
	return strings.Join(lines, "\n")
}

func mirrorVertical(level string) string {
	lines := strings.Split(level, "\n")
	for i, j := 0, len(lines)-1; i < j; i, j = i+1, j-1 {
		lines[i], lines[j] = lines[j], lines[i]
	}
	return strings.Join(lines, "\n")
}

func parseMicroban() []string {
	start := strings.Index(microbanRaw, "; 1")
	if start == -1 {
		start = 0
	}
	raw := microbanRaw[start:]
	lines := strings.Split(raw, "\n")
	var levels []string
	var currentLevel []string

	for _, line := range lines {
		if strings.HasPrefix(strings.TrimSpace(line), ";") {
			if len(currentLevel) > 0 {
				levels = append(levels, strings.TrimRight(strings.Join(currentLevel, "\n"), "\n"))
				currentLevel = nil
			}
			continue
		}
		if len(strings.TrimSpace(line)) == 0 && len(currentLevel) == 0 {
			continue
		}
		if len(currentLevel) > 0 || strings.Contains(line, "#") {
			currentLevel = append(currentLevel, line)
		}
	}
	if len(currentLevel) > 0 {
		levels = append(levels, strings.TrimRight(strings.Join(currentLevel, "\n"), "\n"))
	}

	for i, l := range levels {
		parts := strings.Split(l, "\n")
		for len(parts) > 0 && strings.TrimSpace(parts[len(parts)-1]) == "" {
			parts = parts[:len(parts)-1]
		}
		levels[i] = strings.Join(parts, "\n")
	}

	return levels
}

func SeedSokoban() {
	var count int64
	DB.Model(&domain.SokobanPuzzle{}).Count(&count)
	expectedCount := int64(400)

	if count == expectedCount {
		return
	}

	DB.Where("1=1").Delete(&domain.SokobanPuzzle{})
	log.Printf("Sokoban DB has %d puzzles, expected %d. Re-seeding...", count, expectedCount)

	baseLevels := parseMicroban()
	if len(baseLevels) < 155 {
		log.Printf("Warning: Expected 155 Microban levels, parsed %d", len(baseLevels))
	}

	var puzzles []domain.SokobanPuzzle

	// 1. Easy (Levels 1-100) -> Base 1-100
	for i := 0; i < 100 && i < len(baseLevels); i++ {
		puzzles = append(puzzles, domain.SokobanPuzzle{
			ID:         fmt.Sprintf("SOKO-EAS-%03d", i+1),
			Difficulty: domain.SokobanDifficultyBeginner,
			LevelNum:   i + 1,
			Puzzle:     baseLevels[i],
		})
	}

	// 2. Medium (Levels 1-100) -> Base 56-155 (100 levels)
	for i := 0; i < 100 && (55+i) < len(baseLevels); i++ {
		puzzles = append(puzzles, domain.SokobanPuzzle{
			ID:         fmt.Sprintf("SOKO-MED-%03d", i+1),
			Difficulty: domain.SokobanDifficultyIntermediate,
			LevelNum:   i + 1,
			Puzzle:     baseLevels[55+i],
		})
	}

	// 3. Hard (Levels 1-100) -> Base 1-100 (Vertical Mirror)
	for i := 0; i < 100 && i < len(baseLevels); i++ {
		puzzles = append(puzzles, domain.SokobanPuzzle{
			ID:         fmt.Sprintf("SOKO-HAR-%03d", i+1),
			Difficulty: domain.SokobanDifficultyAdvanced,
			LevelNum:   i + 1,
			Puzzle:     mirrorVertical(baseLevels[i]),
		})
	}

	// 4. Expert (Levels 1-100) -> Base 56-155 (Horizontal + Vertical Mirror)
	for i := 0; i < 100 && (55+i) < len(baseLevels); i++ {
		puzzles = append(puzzles, domain.SokobanPuzzle{
			ID:         fmt.Sprintf("SOKO-EXP-%03d", i+1),
			Difficulty: domain.SokobanDifficultyProfessional,
			LevelNum:   i + 1,
			Puzzle:     mirrorHorizontal(mirrorVertical(baseLevels[55+i])),
		})
	}

	for _, p := range puzzles {
		if err := DB.Create(&p).Error; err != nil {
			log.Printf("Failed to seed Sokoban puzzle %s: %v", p.ID, err)
		}
	}

	log.Println("Successfully seeded", len(puzzles), "Sokoban puzzles")
}
