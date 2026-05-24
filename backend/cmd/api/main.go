package main

import (
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/joho/godotenv"
	"github.com/x-game/backend/internal/handlers/rest"
	ws "github.com/x-game/backend/internal/handlers/ws"
	"github.com/x-game/backend/pkg/db"
	"github.com/x-game/backend/pkg/middleware"
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
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
	}))

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

	// Admin routes
	admin := v1.Group("/admin")
	admin.Use(middleware.Protected())
	admin.Use(middleware.AdminProtected())
	admin.Get("/users", rest.GetUsers)
	admin.Put("/users/:id/status", rest.ToggleUserStatus)

	// WebSocket routes
	ws.Register(v1.Group("/ws"))

	log.Println("Starting server on :3001")
	if err := app.Listen(":3001"); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
