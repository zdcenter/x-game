package db

import (
	"fmt"
	"log"
	"os"

	"github.com/x-game/backend/internal/domain"
	"github.com/x-game/backend/internal/engine"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
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
		Logger: logger.Default.LogMode(logger.Silent),
		NamingStrategy: schema.NamingStrategy{
			TablePrefix:   "gm_",
			SingularTable: false,
		},
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate
	err = DB.AutoMigrate(
		&domain.User{},
		&domain.GameConfig{},
		&domain.SudokuPuzzle{},
		&domain.UserSudokuProgress{},
		&domain.UserGameStat{},
		&domain.Math24Puzzle{},
		&domain.UserMath24Progress{},
		&domain.SystemSetting{},
		&domain.Announcement{},
		&domain.SokobanPuzzle{},
		&domain.UserSokobanProgress{},
		&domain.AdPlacement{},
		&domain.AdNetwork{},
		// Retention features
		&domain.Achievement{},
		&domain.UserAchievement{},
		&domain.DailyChallenge{},
		&domain.UserDailyChallenge{},
		&domain.MatchHistory{},
		&domain.BlogPost{},
		&domain.BlogDistribution{},
		// Content promotion system
		&domain.ContentCategory{},
		&domain.ContentArticle{},
		&domain.ContentDistribution{},
		// Idiom game
		&domain.Idiom{},
		&domain.IdiomDailyChallenge{},
		&domain.UserIdiomDailyGuess{},
		&domain.UserIdiomProgress{},
		// Connect game
		&domain.ConnectPuzzle{},
		&domain.UserConnectProgress{},
		// Hashi game
		&domain.HashiPuzzle{},
		&domain.UserHashiProgress{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	MigrateModesAndDifficulties(DB)
	DB.Exec("UPDATE gm_blog_posts SET published = true WHERE slug = 
onogram-strategy\")

	// Seed default data
	Seed()
	SeedSudoku()
	SeedMath24()
	SeedSokoban()
	SeedSettings()
	SeedAds()
	SeedAchievements()
	SeedBlog()
	SeedIdioms()
	SeedConnect()
	SeedHashi()

	log.Println("Database connected and migrated successfully")
}

func MigrateModesAndDifficulties(db *gorm.DB) {
	// Migrate Modes
	db.Exec("UPDATE gm_user_game_stats SET mode = 'speed' WHERE mode = 'same_pk_speed'")
	db.Exec("UPDATE gm_user_game_stats SET mode = 'steal' WHERE mode = 'same_pk_steal'")
	db.Exec("UPDATE gm_user_game_stats SET mode = 'score' WHERE mode IN ('same_pk_score', 'diff_pk_score')")
	db.Exec("UPDATE gm_user_game_stats SET mode = 'battle' WHERE mode IN ('diff_pk_attack', 'same_pk_classic')")

	// Migrate Difficulties
	db.Exec("UPDATE gm_user_game_stats SET difficulty = 'easy' WHERE difficulty = 'beginner'")
	db.Exec("UPDATE gm_user_game_stats SET difficulty = 'medium' WHERE difficulty IN ('intermediate', 'standard')")
	db.Exec("UPDATE gm_user_game_stats SET difficulty = 'hard' WHERE difficulty = 'advanced'")
	db.Exec("UPDATE gm_user_game_stats SET difficulty = 'hard_1' WHERE difficulty = 'hard_mode'")
	db.Exec("UPDATE gm_user_game_stats SET difficulty = 'hard_2' WHERE difficulty = 'professional'")
	// Expert and Master usually map to Expert/Master, but in some games they map directly
	// e.g., in minesweeper: Expert maps to Master, but we had Master->Expert previously? Wait,
	// In the old code: Master was 30x22 (now Expert), Expert was 30x24 (now Master).
	// Let's swap them. To avoid collision, rename to temp first.
	db.Exec("UPDATE gm_user_game_stats SET difficulty = 'temp_expert' WHERE difficulty = 'expert'")
	db.Exec("UPDATE gm_user_game_stats SET difficulty = 'temp_master' WHERE difficulty = 'master'")
	db.Exec("UPDATE gm_user_game_stats SET difficulty = 'master' WHERE difficulty = 'temp_expert'")
	db.Exec("UPDATE gm_user_game_stats SET difficulty = 'expert' WHERE difficulty = 'temp_master'")
}

func Seed() {
	var games []domain.GameConfig
	registeredEngines := engine.GetAllRegisteredGames()
	for _, engineID := range registeredEngines {
		games = append(games, domain.GameConfig{
			ID:       engineID,
			Config:   "{}",
			IsActive: true,
		})
	}

	for _, game := range games {
		var count int64
		DB.Model(&domain.GameConfig{}).Where("id = ?", game.ID).Count(&count)
		if count == 0 {
			// Does not exist, create it
			if err := DB.Create(&game).Error; err != nil {
				log.Printf("Failed to create game %s: %v", game.ID, err)
			}
		} else {
			// Exists, update the configuration fields while leaving dynamic stats like VisitCount intact.
			if err := DB.Model(&domain.GameConfig{}).Where("id = ?", game.ID).Updates(map[string]interface{}{
				"config":    game.Config,
				"is_active": game.IsActive,
			}).Error; err != nil {
				log.Printf("Failed to update game %s: %v", game.ID, err)
			}
		}
	}

	var userCount int64
	DB.Model(&domain.User{}).Count(&userCount)
	if userCount == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err == nil {
			defaultAdmin := domain.User{
				Username: "admin",
				Password: string(hashedPassword),
				Role:     domain.RoleAdmin,
				Status:   domain.StatusActive,
			}
			DB.Create(&defaultAdmin)
			log.Println("Created default admin user (admin / admin123)")
		} else {
			log.Printf("Failed to hash password for default admin: %v", err)
		}
	}
}

func SeedSettings() {
	defaultSettings := []domain.SystemSetting{
		{Key: "site_maintenance", Value: "false"},
		{Key: "maintenance_message", Value: ""},
		{Key: "multiplayer_enabled", Value: "true"},
		{Key: "pk_multi_round_enabled", Value: "true"},
		{Key: "simulator_enabled", Value: "true"},
		{Key: "registration_enabled", Value: "true"},
	}

	for _, setting := range defaultSettings {
		DB.Where(domain.SystemSetting{Key: setting.Key}).FirstOrCreate(&setting)
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
