//go:generate go run gen_engines.go

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
	"github.com/x-game/backend/pkg/r2"
	"github.com/x-game/backend/pkg/simulator"
)

// Version is injected during build
var Version = "dev"

func main() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// Initialize R2 client (non-fatal if not configured)
	if err := r2.Init(); err != nil {
		log.Println("R2 not initialized:", err)
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
	v1.Get("/games/meta", rest.GetGamesMeta)
	v1.Post("/games/:id/visit", rest.VisitGame)
	v1.Get("/rooms", rest.GetRooms) // HTTP polling fallback for room list

	// Profile (Protected)
	v1.Get("/profile/me", middleware.Protected(), rest.GetProfileMe)

	// Match history (Protected)
	v1.Get("/history", middleware.Protected(), rest.GetMatchHistory)

	// Friends (Protected)
	friends := v1.Group("/friends")
	friends.Use(middleware.Protected())
	friends.Get("/", rest.GetFriends)
	friends.Post("/request", rest.SendFriendRequest)
	friends.Post("/accept", rest.AcceptFriendRequest)
	friends.Post("/reject", rest.RejectFriendRequest)

	// Blog (public read)
	blog := v1.Group("/blog")
	blog.Get("/posts", rest.ListBlogPosts)
	blog.Get("/posts/:slug", rest.GetBlogPost)

	// Achievements (optional auth for public list, protected for personal)
	achievements := v1.Group("/achievements")
	achievements.Use(middleware.OptionalProtected())
	achievements.Get("/", rest.GetAchievements)
	achievements.Get("/my", middleware.Protected(), rest.GetMyAchievements)

	// Leaderboard (optional auth to show my_rank)
	leaderboard := v1.Group("/leaderboard")
	leaderboard.Use(middleware.OptionalProtected())
	leaderboard.Get("/global", rest.GetGlobalLeaderboard)
	leaderboard.Get("/my-ranks", middleware.Protected(), rest.GetMyRanks)
	leaderboard.Get("/:gameId", rest.GetLeaderboard)

	// Daily challenge (optional auth)
	daily := v1.Group("/daily-challenge")
	daily.Use(middleware.OptionalProtected())
	daily.Get("/", rest.GetTodayChallenge)
	daily.Post("/finish", middleware.Protected(), rest.FinishDailyChallenge)
	daily.Get("/history", middleware.Protected(), rest.GetDailyChallengeHistory)

	// Stats routes (Protected)
	stats := v1.Group("/stats")
	stats.Use(middleware.Protected())
	stats.Get("/:game_id", rest.GetStats)
	stats.Post("/:game_id", rest.SubmitStat)

	// Puzzle game routes (Optional auth for guests)
	sudoku := v1.Group("/sudoku")
	sudoku.Use(middleware.OptionalProtected())
	rest.RegisterPuzzleRoutes(sudoku, "sudoku", rest.NewSudokuRepo())

	math24 := v1.Group("/math24")
	math24.Use(middleware.OptionalProtected())
	rest.RegisterPuzzleRoutes(math24, "math24", rest.NewMath24Repo())

	sokoban := v1.Group("/sokoban")
	sokoban.Use(middleware.OptionalProtected())
	rest.RegisterPuzzleRoutes(sokoban, "sokoban", rest.NewSokobanRepo())

	connect := v1.Group("/connect")
	connect.Use(middleware.OptionalProtected())
	rest.RegisterPuzzleRoutes(connect, "connect", rest.NewConnectRepo())

	hashi := v1.Group("/hashi")
	hashi.Use(middleware.OptionalProtected())
	rest.RegisterPuzzleRoutes(hashi, "hashi", rest.NewHashiRepo())

	// Idiom game routes
	idiom := v1.Group("/idiom")
	idiom.Use(middleware.OptionalProtected())
	idiom.Get("/fill", rest.IdiomGetFill)
	idiom.Post("/fill/submit", rest.IdiomSubmitFill)
	idiom.Get("/daily/state", rest.IdiomDailyState)
	idiom.Post("/daily/guess", rest.IdiomDailyGuess)
	idiom.Get("/stats", rest.IdiomStats)
	idiom.Get("/history", rest.IdiomHistory)
	idiom.Get("/daily/social", rest.IdiomDailySocial)

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
	admin.Put("/settings/bulk", rest.BulkUpdateSettings)

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

	// Achievements management
	admin.Get("/achievements", rest.AdminListAchievements)
	admin.Post("/achievements", rest.AdminCreateAchievement)
	admin.Put("/achievements/:id", rest.AdminUpdateAchievement)
	admin.Delete("/achievements/:id", rest.AdminDeleteAchievement)
	admin.Get("/users/:id/achievements", rest.AdminGetUserAchievements)

	// Daily challenge management
	admin.Get("/daily-challenges", rest.AdminListDailyChallenges)
	admin.Post("/daily-challenges", rest.AdminCreateDailyChallenge)
	admin.Post("/daily-challenges/bulk", rest.AdminBulkCreateDailyChallenges)
	admin.Put("/daily-challenges/:id", rest.AdminUpdateDailyChallenge)
	admin.Delete("/daily-challenges/:id", rest.AdminDeleteDailyChallenge)

	// Leaderboard management
	admin.Get("/leaderboard", rest.AdminGetLeaderboard)
	admin.Delete("/leaderboard/stat/:statId", rest.AdminDeleteLeaderboardEntry)

	// Idiom management
	admin.Get("/idioms", rest.AdminListIdioms)
	admin.Post("/idioms", rest.AdminCreateIdiom)
	admin.Put("/idioms/:id", rest.AdminUpdateIdiom)
	admin.Delete("/idioms/:id", rest.AdminDeleteIdiom)

	// Legacy simulator endpoints (can be removed later or kept for backwards compatibility)
	// Blog admin CRUD
	admin.Get("/blog/posts", rest.AdminListBlogPosts)
	admin.Get("/blog/posts/:id", rest.AdminGetBlogPost)
	admin.Post("/blog/posts", rest.AdminCreateBlogPost)
	admin.Put("/blog/posts/:id", rest.AdminUpdateBlogPost)
	admin.Delete("/blog/posts/:id", rest.AdminDeleteBlogPost)
	admin.Patch("/blog/posts/:id/toggle", rest.AdminToggleBlogPost)
	admin.Get("/blog/distributions", rest.GetBlogDistributions)
	admin.Post("/blog/posts/:id/distribute", rest.RecordBlogDistribution)
	admin.Post("/blog/posts/:id/publish/devto", rest.PublishToDevTo)

	// Content promotion system
	content := admin.Group("/content")
	content.Get("/categories", rest.GetContentCategories)
	content.Post("/categories", rest.CreateContentCategory)
	content.Put("/categories/:id", rest.UpdateContentCategory)
	content.Delete("/categories/:id", rest.DeleteContentCategory)
	content.Get("/articles", rest.ListContentArticles)
	content.Get("/articles/:id", rest.GetContentArticle)
	content.Post("/articles", rest.CreateContentArticle)
	content.Put("/articles/:id", rest.UpdateContentArticle)
	content.Delete("/articles/:id", rest.DeleteContentArticle)
	content.Patch("/articles/:id/toggle", rest.ToggleContentArticle)
	content.Get("/articles/:id/distributions", rest.GetContentDistributions)
	content.Post("/articles/:id/distribute", rest.RecordContentDistribution)

	// Image manager (R2)
	admin.Get("/images", rest.AdminListImages)
	admin.Get("/images/raw", rest.AdminGetImageRaw)
	admin.Post("/images/upload", rest.AdminUploadImages)
	admin.Delete("/images", rest.AdminDeleteImages)

	// Cover image generation (batch before :id to avoid route conflict)
	admin.Post("/blog/posts/covers/batch", rest.AdminGenerateBlogCoversBatch)
	admin.Post("/blog/posts/:id/cover", rest.AdminGenerateBlogCover)
	admin.Patch("/blog/posts/:id/cover", rest.AdminSetBlogCoverImage)
	admin.Post("/content/articles/:id/publish/devto", rest.PublishArticleToDevTo)
	admin.Post("/content/articles/covers/batch", rest.AdminGenerateArticleCoversBatch)
	admin.Post("/content/articles/:id/cover", rest.AdminGenerateArticleCover)
	admin.Patch("/content/articles/:id/cover", rest.AdminSetArticleCoverImage)

	admin.Get("/simulator", rest.GetSimulatorStatus)
	admin.Put("/simulator", rest.ToggleSimulator)

	// Database management
	admin.Get("/db/tables", rest.AdminDBTables)
	admin.Post("/db/backup/download", rest.AdminDBBackupDownload)
	admin.Post("/db/backup/save", rest.AdminDBBackupSave)
	admin.Post("/db/backup/inspect", rest.AdminDBInspectBackup)
	admin.Get("/db/backups", rest.AdminDBListBackups)
	admin.Get("/db/backups/:name/download", rest.AdminDBDownloadSavedBackup)
	admin.Delete("/db/backups/:name", rest.AdminDBDeleteBackup)
	admin.Post("/db/restore", rest.AdminDBRestore)

	// WebSocket routes
	ws.Register(v1.Group("/ws"))

	log.Println("Starting server on :3001")
	if err := app.Listen(":3001"); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}