package oracle

import (
	"context"
	"encoding/json"
	"math/rand"
	"time"

	"github.com/redis/go-redis/v9"
)

type RegionContext struct {
	Region    string `json:"region"`
	ContextID string `json:"contextId"`
}

var ContextMap = []RegionContext{
	{"US-East", "ctx-us-east"},
	{"US-West", "ctx-us-west"},
	{"EU-West", "ctx-eu-west"},
	{"AP-South", "ctx-ap-south"},
	{"AP-Northeast", "ctx-ap-northeast"},
}

type RegionPrice struct {
	Region    string  `json:"region"`
	ContextID string  `json:"contextId"`
	Price     float64 `json:"price"`
}

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
	for _, rc := range ContextMap {
		price := 0.04 + rand.Float64()*0.02

		// Simulate a rare sudden price drop (arbitrage opportunity)
		if rand.Float64() < 0.15 {
			price = price * 0.3 // Huge 70% drop
		}

		data, _ := json.Marshal(RegionPrice{Region: rc.Region, ContextID: rc.ContextID, Price: price})
		po.redisClient.Set(ctx, "price:"+rc.Region, data, 10*time.Second)
	}
}

func (po *PriceOracle) GetPrices(ctx context.Context) ([]RegionPrice, error) {
	var prices []RegionPrice
	for _, rc := range ContextMap {
		val, err := po.redisClient.Get(ctx, "price:"+rc.Region).Result()
		if err != nil {
			// If missing, use a default fallback
			prices = append(prices, RegionPrice{Region: rc.Region, ContextID: rc.ContextID, Price: 0.05})
			continue
		}
		var rp RegionPrice
		json.Unmarshal([]byte(val), &rp)
		prices = append(prices, rp)
	}
	return prices, nil
}
