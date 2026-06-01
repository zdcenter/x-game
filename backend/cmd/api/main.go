package main

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/joho/godotenv"
	"github.com/x-game/backend/internal/handlers/rest"
	ws "github.com/x-game/backend/internal/handlers/ws"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/middleware"

	// Register engines
	_ "github.com/x-game/backend/internal/engine/minesweeper"
	_ "github.com/x-game/backend/internal/engine/sudoku"
	_ "github.com/x-game/backend/internal/engine/sliding"
	_ "github.com/x-game/backend/internal/engine/hexa"
	_ "github.com/x-game/backend/internal/engine/tetris"
	_ "github.com/x-game/backend/internal/engine/gomoku"
	_ "github.com/x-game/backend/internal/engine/codebreaker"
	_ "github.com/x-game/backend/internal/engine/math24"
)

func main() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// Initialize Fiber app
	app := fiber.New()

	// Use middleware
	app.Use(logger.New())

	// Health check route
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "message": "Game Engine API is running"})
	})

	// Initialize database
	db.InitPostgres()

	// Register routes
	api := app.Group("/api")
	v1 := api.Group("/v1")

	v1.Post("/register", rest.Register)
	v1.Post("/login", rest.Login)
	v1.Post("/guest-login", rest.GuestLogin)

	v1.Get("/games", rest.GetGames)

	// Stats routes (Protected)
	stats := v1.Group("/stats")
	stats.Use(middleware.Protected())
	stats.Get("/:game_id", rest.GetStats)
	stats.Post("/:game_id", rest.SubmitStat)

	// Sudoku routes (Protected)
	sudoku := v1.Group("/sudoku")
	sudoku.Use(middleware.Protected())
	sudoku.Get("/levels/:difficulty", rest.GetSudokuLevels)
	sudoku.Get("/puzzle/:id", rest.GetSudokuPuzzle)
	sudoku.Post("/puzzle/:id/save", rest.SaveSudokuProgress)
	sudoku.Post("/puzzle/:id/finish", rest.FinishSudoku)

	// Math24 routes (Protected)
	math24 := v1.Group("/math24")
	math24.Use(middleware.Protected())
	math24.Get("/levels/:difficulty", rest.GetMath24Levels)
	math24.Get("/puzzle/:id", rest.GetMath24Puzzle)
	math24.Post("/puzzle/:id/finish", rest.FinishMath24)

	// Admin routes
	admin := v1.Group("/admin")
	admin.Use(middleware.Protected())
	admin.Use(middleware.AdminProtected())
	admin.Get("/users", rest.GetUsers)
	admin.Put("/users/:id/status", rest.ToggleUserStatus)
	admin.Get("/games", rest.GetAdminGames)
	admin.Put("/games/:id", rest.UpdateGame)

	// WebSocket routes
	ws.Register(v1.Group("/ws"))

	log.Println("Starting server on :3001")
	if err := app.Listen(":3001"); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
