package db

import (
	"fmt"
	"log"
	"os"

	"github.com/x-game/backend/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitPostgres() {
	// For local dev, hardcode is fine temporarily or use env vars
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=5432 sslmode=disable TimeZone=Asia/Shanghai",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "root"),
		getEnv("DB_PASSWORD", "password"),
		getEnv("DB_NAME", "x_game_db"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate
	err = DB.AutoMigrate(
		&domain.User{},
		&domain.GameConfig{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	// Seed default data
	Seed()

	log.Println("Database connected and migrated successfully")
}

func Seed() {
	var count int64
	DB.Model(&domain.GameConfig{}).Count(&count)
	if count == 0 {
		defaultMinesweeper := domain.GameConfig{
			ID:       "minesweeper",
			Name:     `{"en": "Minesweeper", "zh": "扫雷"}`,
			Rules:    `{"en": "# How to play Minesweeper\n\nTap to dig, Long press to flag.", "zh": "# 玩法说明\n\n点击以挖开，长按以插旗。"}`,
			IsActive: true,
		}
		DB.Create(&defaultMinesweeper)
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
