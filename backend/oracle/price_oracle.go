package oracle

import (
	"context"
	"encoding/json"
	"math/rand"
	"time"

	"github.com/redis/go-redis/v9"
)

type RegionPrice struct {
	Region string  `json:"region"`
	Price  float64 `json:"price"`
}

var Regions = []string{"US-East", "US-West", "EU-West", "AP-South", "AP-Northeast"}

type PriceOracle struct {
	redisClient *redis.Client
}

func NewPriceOracle(redisUrl string) *PriceOracle {
	if redisUrl == "" {
		redisUrl = "localhost:6379"
	}
	rdb := redis.NewClient(&redis.Options{
		Addr: redisUrl,
	})
	return &PriceOracle{redisClient: rdb}
}

func (po *PriceOracle) StartSimulation(ctx context.Context) {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	// Initial population
	po.updatePrices(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			po.updatePrices(ctx)
		}
	}
}

func (po *PriceOracle) updatePrices(ctx context.Context) {
	// Base prices around $0.05/hr
	for _, region := range Regions {
		price := 0.04 + rand.Float64()*0.02
		
		// Simulate a rare sudden price drop (arbitrage opportunity)
		if rand.Float64() < 0.15 {
			price = price * 0.3 // Huge 70% drop
		}

		data, _ := json.Marshal(RegionPrice{Region: region, Price: price})
		po.redisClient.Set(ctx, "price:"+region, data, 10*time.Second)
	}
}

func (po *PriceOracle) GetPrices(ctx context.Context) ([]RegionPrice, error) {
	var prices []RegionPrice
	for _, region := range Regions {
		val, err := po.redisClient.Get(ctx, "price:"+region).Result()
		if err != nil {
			// If missing, use a default fallback
			prices = append(prices, RegionPrice{Region: region, Price: 0.05})
			continue
		}
		var rp RegionPrice
		json.Unmarshal([]byte(val), &rp)
		prices = append(prices, rp)
	}
	return prices, nil
}
