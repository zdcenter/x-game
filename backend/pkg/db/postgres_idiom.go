package db

import (
	_ "embed"
	"encoding/json"
	"log"

	"github.com/x-game/backend/internal/domain"
)

//go:embed idiom_seeds.json
var idiomSeedsJSON []byte

type idiomSeed struct {
	Word          string `json:"word"`
	Pinyin        string `json:"pinyin"`
	Explanation   string `json:"explanation"`
	Story         string `json:"story"`
	Derivation    string `json:"derivation"`
	Difficulty    string `json:"difficulty"`
	IsDailyTarget bool   `json:"is_daily_target"`
}

func SeedIdioms() {
	var seeds []idiomSeed
	if err := json.Unmarshal(idiomSeedsJSON, &seeds); err != nil {
		log.Fatalf("SeedIdioms: failed to parse idiom_seeds.json: %v", err)
	}

	// Build a set of words from seed file
	seedWords := make(map[string]idiomSeed, len(seeds))
	for _, s := range seeds {
		seedWords[s.Word] = s
	}

	// Fetch existing words from DB
	var existing []string
	DB.Model(&domain.Idiom{}).Pluck("word", &existing)
	existingSet := make(map[string]struct{}, len(existing))
	for _, w := range existing {
		existingSet[w] = struct{}{}
	}

	// Only insert seeds that are not yet in the DB (preserves admin-created/edited rows)
	var toInsert []domain.Idiom
	for word, s := range seedWords {
		if _, ok := existingSet[word]; ok {
			continue
		}
		toInsert = append(toInsert, domain.Idiom{
			Word:          s.Word,
			Pinyin:        s.Pinyin,
			Explanation:   s.Explanation,
			Story:         s.Story,
			Derivation:    s.Derivation,
			Difficulty:    s.Difficulty,
			IsDailyTarget: s.IsDailyTarget,
		})
	}

	if len(toInsert) == 0 {
		return
	}

	log.Printf("SeedIdioms: inserting %d new idioms...", len(toInsert))
	if err := DB.CreateInBatches(toInsert, 200).Error; err != nil {
		log.Fatalf("SeedIdioms: insert failed: %v", err)
	}
	log.Printf("SeedIdioms: done.")
}
