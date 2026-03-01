package main

import (
	"context"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/shah/sentinelaura-backend/api"
	"github.com/shah/sentinelaura-backend/k8s"
	"github.com/shah/sentinelaura-backend/oracle"
)

func main() {
	redisUrl := os.Getenv("REDIS_URL")
	if redisUrl == "" {
		redisUrl = "localhost:6379"
	}

	// Initialize Controllers
	priceOracle := oracle.NewPriceOracle(redisUrl)
	k8sController := k8s.NewMigrationController()
	apiHandlers := api.NewAPI(priceOracle, k8sController)

	// Start Price Simulation in background
	go priceOracle.StartSimulation(context.Background())

	// Setup Server
	r := gin.Default()

	// Allow frontend to communicate
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Allow all for demo
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.GET("/api/prices", apiHandlers.GetPrices)
	r.POST("/api/migrate", apiHandlers.Migrate)
	r.GET("/api/ws", apiHandlers.Hub.WebsocketHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("SentinelAura Backend starting on :%s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
