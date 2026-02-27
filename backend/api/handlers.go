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
	k8sController    *k8s.Controller
}

func NewAPI(oc *oracle.PriceOracle, kc *k8s.Controller) *API {
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

	err := api.k8sController.Migrate(context.Background(), req.SourceRegion, req.TargetRegion)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Migration failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Migration initiated successfully"})
}
