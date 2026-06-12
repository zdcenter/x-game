package main

import (
	"encoding/json"
	"fmt"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/pkg/db"
)

func main() {
	db.InitPostgres()
	var placements []domain.AdPlacement
	db.DB.Preload("Networks").Find(&placements)

	b, _ := json.MarshalIndent(placements, "", "  ")
	fmt.Println(string(b))
}
