package main

import (
	"log"
	"os"
	"strings"
	"time"

	"warehouse-report-monitoring/internal/database"
	"warehouse-report-monitoring/internal/handlers"
	"warehouse-report-monitoring/internal/middleware"
	"warehouse-report-monitoring/internal/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Connect to database
	database.Connect()
	database.AutoMigrate()
	database.SeedDefaultUsers()

	// Setup Gin
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	r.MaxMultipartMemory = 50 << 20 // 50 MB

	// CORS — read allowed origins from env (comma-separated), default to common dev origins
	allowedOrigins := []string{"http://localhost:5173", "http://localhost:8080", "http://localhost:8070"}
	if envOrigins := os.Getenv("CORS_ORIGINS"); envOrigins != "" {
		allowedOrigins = strings.Split(envOrigins, ",")
		for i := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
		}
	}
	log.Printf("[CORS] Allowed origins: %v", allowedOrigins)
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Public routes
	api := r.Group("/api")

	// Rate limiter for login: 5 attempts per minute per IP
	loginLimiter := middleware.NewLoginRateLimiter(5, 1*time.Minute)
	api.POST("/auth/login", loginLimiter.Middleware(), handlers.Login)

	// Public clock routes (no auth needed for clock in/out kiosk)
	clockEmployees := handlers.NewResource[models.Employee]("employees")
	clockAttendances := handlers.NewResource[models.Attendance]("attendances")
	api.GET("/clock/employees", clockEmployees.List)
	api.GET("/clock/attendances", clockAttendances.List)
	// Clock in/out restricted to warehouse WiFi (default 192.168.4.0/24, configurable via CLOCK_ALLOWED_CIDRS)
	clockGuard := middleware.IPWhitelist()
	api.POST("/clock/attendances", clockGuard, clockAttendances.Create)
	api.PUT("/clock/attendances/:id", clockGuard, clockAttendances.Update)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthRequired())
	protected.GET("/auth/me", handlers.GetCurrentUser)

	// User management routes
	protected.GET("/users", handlers.ListUsers)
	protected.POST("/users", handlers.CreateUser)
	protected.PUT("/users/:id/password", handlers.ChangePassword)
	protected.PUT("/users/:id/role", handlers.ChangeRole)
	protected.DELETE("/users/:id", handlers.DeleteUser)

	// Register all resource routes using generic handler
	arrivals := handlers.NewResource[models.Arrival]("arrivals")
	arrivals.RegisterRoutes(protected.Group("/arrivals"))

	transactions := handlers.NewResource[models.Transaction]("transactions")
	transactions.RegisterRoutes(protected.Group("/transactions"))

	vas := handlers.NewResource[models.Vas]("vas")
	vas.RegisterRoutes(protected.Group("/vas"))

	dcc := handlers.NewResource[models.Dcc]("dcc")
	dcc.RegisterRoutes(protected.Group("/dcc"))

	damages := handlers.NewResource[models.Damage]("damages")
	damages.RegisterRoutes(protected.Group("/damages"))

	soh := handlers.NewResource[models.Soh]("soh")
	soh.RegisterRoutes(protected.Group("/soh"))

	qcReturns := handlers.NewResource[models.QcReturn]("qc-returns")
	qcReturns.RegisterRoutes(protected.Group("/qc-returns"))

	locations := handlers.NewResource[models.Location]("locations")
	locations.RegisterRoutes(protected.Group("/locations"))

	attendances := handlers.NewResource[models.Attendance]("attendances")
	attendances.RegisterRoutes(protected.Group("/attendances"))

	employees := handlers.NewResource[models.Employee]("employees")
	employees.RegisterRoutes(protected.Group("/employees"))

	productivity := handlers.NewResource[models.ProjectProductivity]("project-productivities")
	productivity.RegisterRoutes(protected.Group("/project-productivities"))

	unloadings := handlers.NewResource[models.Unloading]("unloadings")
	unloadings.RegisterRoutes(protected.Group("/unloadings"))

	// Serve React static files (production build in ./static)
	r.Static("/assets", "./static/assets")
	r.StaticFile("/favicon.svg", "./static/favicon.svg")
	r.StaticFile("/favicon.ico", "./static/favicon.ico")

	// SPA fallback: serve index.html for all non-API routes
	r.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("[Server] Starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
