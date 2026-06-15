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
	"github.com/x-game/backend/pkg/simulator"

	// Register engines
	_ "github.com/x-game/backend/internal/engine/block"
	_ "github.com/x-game/backend/internal/engine/codebreaker"
	_ "github.com/x-game/backend/internal/engine/drop2048"
	_ "github.com/x-game/backend/internal/engine/gomoku"
	_ "github.com/x-game/backend/internal/engine/hexa"
	_ "github.com/x-game/backend/internal/engine/lightsout"
	_ "github.com/x-game/backend/internal/engine/math24"
	_ "github.com/x-game/backend/internal/engine/minesweeper"
	_ "github.com/x-game/backend/internal/engine/sliding"
	_ "github.com/x-game/backend/internal/engine/sokoban"
	_ "github.com/x-game/backend/internal/engine/sudoku"
	_ "github.com/x-game/backend/internal/engine/tetris"
	_ "github.com/x-game/backend/internal/engine/watersort"
)

// Version is injected during build
var Version = "dev"

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

	// Start traffic simulator for fake players/rooms
	simulator.Start()

	// Register routes
	api := app.Group("/api")
	v1 := api.Group("/v1")

	v1.Post("/register", rest.Register)
	v1.Post("/login", rest.Login)
	v1.Post("/guest-login", rest.GuestLogin)

	// Public config and active settings
	v1.Get("/settings", rest.GetPublicSettings)
	v1.Get("/announcements", rest.GetActiveAnnouncements)
	v1.Get("/ads/placements", rest.GetAdPlacements)

	v1.Get("/version", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"version": Version,
		})
	})

	v1.Get("/games", rest.GetGames)
	v1.Post("/games/:id/visit", rest.VisitGame)
	v1.Get("/rooms", rest.GetRooms) // HTTP polling fallback for room list

	// Stats routes (Protected)
	stats := v1.Group("/stats")
	stats.Use(middleware.Protected())
	stats.Get("/:game_id", rest.GetStats)
	stats.Post("/:game_id", rest.SubmitStat)

	// Sudoku routes (Optional auth for guests)
	sudoku := v1.Group("/sudoku")
	sudoku.Use(middleware.OptionalProtected())
	sudoku.Get("/levels/:difficulty", rest.GetSudokuLevels)
	sudoku.Get("/puzzle/:id", rest.GetSudokuPuzzle)
	sudoku.Post("/puzzle/:id/save", rest.SaveSudokuProgress)
	sudoku.Post("/puzzle/:id/finish", rest.FinishSudoku)

	// Math24 routes (Optional auth for guests)
	math24 := v1.Group("/math24")
	math24.Use(middleware.OptionalProtected())
	math24.Get("/levels/:difficulty", rest.GetMath24Levels)
	math24.Get("/puzzle/:id", rest.GetMath24Puzzle)
	math24.Post("/puzzle/:id/finish", rest.FinishMath24)

	// Sokoban routes (Optional auth for guests)
	sokoban := v1.Group("/sokoban")
	sokoban.Use(middleware.OptionalProtected())
	sokoban.Get("/levels/:difficulty", rest.GetSokobanLevels)
	sokoban.Get("/puzzle/:id", rest.GetSokobanPuzzle)
	sokoban.Post("/puzzle/:id/save", rest.SaveSokobanProgress)
	sokoban.Post("/puzzle/:id/finish", rest.FinishSokoban)

	// Admin routes
	admin := v1.Group("/admin")
	admin.Use(middleware.Protected())
	admin.Use(middleware.AdminProtected())
	admin.Get("/users", rest.GetUsers)
	admin.Put("/users/:id/status", rest.ToggleUserStatus)
	admin.Get("/games", rest.GetAdminGames)
	admin.Put("/games/:id", rest.UpdateGame)
	admin.Get("/settings", rest.GetAdminSettings)
	admin.Put("/settings", rest.UpdateSettings)

	// Announcements CRUD
	admin.Get("/announcements", rest.AdminGetAllAnnouncements)
	admin.Post("/announcements", rest.AdminCreateAnnouncement)
	admin.Put("/announcements/:id", rest.AdminUpdateAnnouncement)
	admin.Delete("/announcements/:id", rest.AdminDeleteAnnouncement)

	// Ads CRUD
	admin.Get("/ads/placements", rest.AdminGetAllAdPlacements)
	admin.Put("/ads/placements/:id", rest.AdminUpdateAdPlacement)
	admin.Post("/ads/networks", rest.AdminAddAdNetwork)
	admin.Put("/ads/networks/:id", rest.AdminUpdateAdNetwork)
	admin.Delete("/ads/networks/:id", rest.AdminDeleteAdNetwork)

	// Legacy simulator endpoints (can be removed later or kept for backwards compatibility)
	admin.Get("/simulator", rest.GetSimulatorStatus)
	admin.Put("/simulator", rest.ToggleSimulator)

	// WebSocket routes
	ws.Register(v1.Group("/ws"))

	log.Println("Starting server on :3001")
	if err := app.Listen(":3001"); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}