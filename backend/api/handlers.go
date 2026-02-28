package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/shah/sentinelaura-backend/k8s"
	"github.com/shah/sentinelaura-backend/oracle"
)

type API struct {
	oracleController *oracle.PriceOracle
	k8sController    *k8s.MigrationController
}

func NewAPI(oc *oracle.PriceOracle, kc *k8s.MigrationController) *API {
	return &API{
		oracleController: oc,
		k8sController:    kc,
	}
}

func (api *API) GetPrices(c *gin.Context) {
	prices, err := api.oracleController.GetPrices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get prices"})
		return
	}
	c.JSON(http.StatusOK, prices)
}

type MigrateRequest struct {
	SourceRegion string `json:"sourceRegion" binding:"required"`
	TargetRegion string `json:"targetRegion" binding:"required"`
}

func (api *API) Migrate(c *gin.Context) {
	var req MigrateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch current prices to feed into DryRun
	prices, err := api.oracleController.GetPrices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read pricing oracle"})
		return
	}

	var sourceCtx, targetCtx string
	var currentPrice, targetPrice float64

	for _, p := range prices {
		if p.Region == req.SourceRegion {
			sourceCtx = p.ContextID
			currentPrice = p.Price
		}
		if p.Region == req.TargetRegion {
			targetCtx = p.ContextID
			targetPrice = p.Price
		}
	}

	if sourceCtx == "" || targetCtx == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid source or target region"})
		return
	}

	// Excecute DryRun Safety Logic
	ok, err := api.k8sController.DryRun(context.Background(), sourceCtx, targetCtx, currentPrice, targetPrice)
	if !ok || err != nil {
		c.JSON(http.StatusPreconditionFailed, gin.H{"error": "Migration blocked by DryRun: " + err.Error()})
		return
	}

	// Trigger real multi-cluster migration
	err = api.k8sController.Migrate(context.Background(), sourceCtx, targetCtx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Migration execution failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Arbitrage Migration executed successfully across contexts"})
}
