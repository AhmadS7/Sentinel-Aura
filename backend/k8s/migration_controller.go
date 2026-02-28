package k8s

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

// RegionManager holds multiple kubernetes.Clientset instances, keyed by specific contextual context IDs
type RegionManager struct {
	Clients map[string]*kubernetes.Clientset
}

type MigrationController struct {
	rm       *RegionManager
	mockMode bool
}

func NewMigrationController() *MigrationController {
	// In a real environment, we would iterate through a kubeconfig file to parse out each distinct Context
	// and initialize a Clientset for each, mapping them to the contexts (e.g. ctx-us-east).
	// For SentinelAura, we'll try to get the local config and mock multiple contexts pointing to the same cluster.
	var config *rest.Config
	var err error

	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homedir.HomeDir(); home != "" {
			kubeconfig = filepath.Join(home, ".kube", "config")
		}
	}

	if _, statErr := os.Stat(kubeconfig); statErr == nil {
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			config, err = rest.InClusterConfig()
		}
	} else {
		config, err = rest.InClusterConfig()
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Printf("Kubernetes client init failed, running purely in mock mode: %v", err)
		return &MigrationController{rm: &RegionManager{Clients: make(map[string]*kubernetes.Clientset)}, mockMode: true}
	}

	// Mocking multiple kubernetes.Clientset instances under RegionManager matching our specific K8s Contexts
	rm := &RegionManager{
		Clients: map[string]*kubernetes.Clientset{
			"ctx-us-east":      clientset,
			"ctx-us-west":      clientset,
			"ctx-eu-west":      clientset,
			"ctx-ap-south":     clientset,
			"ctx-ap-northeast": clientset,
		},
	}

	log.Println("Successfully connected to Kubernetes contexts via RegionManager")
	return &MigrationController{rm: rm, mockMode: false}
}

// DryRun calculates if "Egress Cost" of moving the pod exceeds "Spot Savings" for the next 24 hours.
func (c *MigrationController) DryRun(ctx context.Context, sourceCtx, targetCtx string, currentPrice, targetPrice float64) (bool, error) {
	log.Printf("Performing Safety DryRun: migrating %s -> %s", sourceCtx, targetCtx)

	// Abstract Arbitrage Logic
	// Assume state transfer is large: 500GB of egress data required per migration sequence
	egressDataGB := 500.0
	egressCostPerGB := 0.09 // Example Cloud Provider Egress bandwidth pricing
	totalEgressCost := egressDataGB * egressCostPerGB

	// Projected Savings calculation over a 24-hour horizon (Assume 50 replicas)
	replicas := 50.0
	hourlySavings := (currentPrice - targetPrice) * replicas
	dailySavings := hourlySavings * 24.0

	log.Printf("DryRun Analytics - Egress Cost: $%.2f | Projected 24h Savings: $%.2f", totalEgressCost, dailySavings)

	if totalEgressCost > dailySavings {
		return false, fmt.Errorf("migration vetoed by DryRun: egress cost ($%.2f) exceeds projected 24h savings ($%.2f)", totalEgressCost, dailySavings)
	}

	log.Println("DryRun Analytics - Migration action is profitable. Activating Kubernetes controller.")
	return true, nil
}

func (c *MigrationController) Migrate(ctx context.Context, sourceCtx, targetCtx string) error {
	// Respect contextual cancellation timeout requirements immediately
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	log.Printf("Executing Operator action across Contexts: %s -> %s", sourceCtx, targetCtx)

	if c.mockMode {
		log.Println("Running in mock mode. Migration simulated successfully.")
		return nil
	}

	sourceClient, sourceExists := c.rm.Clients[sourceCtx]
	targetClient, targetExists := c.rm.Clients[targetCtx]

	if !sourceExists || !targetExists {
		return fmt.Errorf("invalid Kubernetes Context map: missing clientset for source or target")
	}

	namespace := "default"

	// Formatting Context ID (ctx-us-east) mapping to Deployment name (sentinelaura-us-east)
	sourceDepName := fmt.Sprintf("sentinelaura-%s", strings.TrimPrefix(sourceCtx, "ctx-"))
	targetDepName := fmt.Sprintf("sentinelaura-%s", strings.TrimPrefix(targetCtx, "ctx-"))

	// 1. Scale Up Target Context Cluster Deployment
	err := c.scaleDeployment(ctx, targetClient, namespace, targetDepName, 3)
	if err != nil {
		log.Printf("Error scaling up target cluster deployment %s: %v", targetDepName, err)
		return err
	}
	log.Printf("Successfully scaled up target deployment %s", targetDepName)

	// Context delay before scaling down to ensure rolling liveness (simulated)
	time.Sleep(1 * time.Second)

	// 2. Scale Down Source Context Cluster Deployment
	err = c.scaleDeployment(ctx, sourceClient, namespace, sourceDepName, 0)
	if err != nil {
		log.Printf("Error scaling down source cluster deployment %s: %v", sourceDepName, err)
		return err // In production this would require state rollback mechanisms
	}
	log.Printf("Successfully scaled down source deployment %s", sourceDepName)

	return nil
}

func (c *MigrationController) scaleDeployment(ctx context.Context, client *kubernetes.Clientset, namespace, deploymentName string, replicas int32) error {
	deploymentsClient := client.AppsV1().Deployments(namespace)

	result, err := deploymentsClient.Get(ctx, deploymentName, metav1.GetOptions{})
	if err != nil {
		return err
	}

	result.Spec.Replicas = &replicas
	_, err = deploymentsClient.Update(ctx, result, metav1.UpdateOptions{})
	return err
}
