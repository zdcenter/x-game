package main

import (
	"fmt"
	"log"
	"os"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func main() {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=5432 sslmode=disable TimeZone=Asia/Shanghai",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "root"),
		getEnv("DB_PASSWORD", "password"),
		getEnv("DB_NAME", "x_game_db"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	var config string
	db.Raw("SELECT config FROM gm_game_configs WHERE id = 'nonogram'").Scan(&config)
	fmt.Printf("Current config: %s\n", config)

	// Reset to {}
	db.Exec("UPDATE gm_game_configs SET config = '{}' WHERE id = 'nonogram'")
	fmt.Println("Config reset to {}")
}
