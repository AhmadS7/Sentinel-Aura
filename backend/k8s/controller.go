package k8s

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

type Controller struct {
	clientSet *kubernetes.Clientset
	mockMode  bool
}

func NewController() *Controller {
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
			log.Printf("Failed to load kubeconfig: %v, falling back to in-cluster", err)
			config, err = rest.InClusterConfig()
		}
	} else {
		config, err = rest.InClusterConfig()
	}

	if err != nil {
		log.Printf("Kubernetes client initialization failed, running in MOCK mode: %v", err)
		return &Controller{mockMode: true}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Printf("Kubernetes clientset initialization failed, running in MOCK mode: %v", err)
		return &Controller{mockMode: true}
	}

	log.Println("Successfully connected to Kubernetes cluster")
	return &Controller{clientSet: clientset, mockMode: false}
}

func (c *Controller) Migrate(ctx context.Context, sourceRegion, targetRegion string) error {
	log.Printf("Initiating migration: Scaling down %s, Scaling up %s", sourceRegion, targetRegion)

	if c.mockMode {
		log.Println("Running in mock mode. Migration simulated successfully.")
		return nil
	}

	namespace := "default" // Assuming default namespace for the demo

	// Scale down source
	sourceDepName := fmt.Sprintf("sentinelaura-%s", formatRegion(sourceRegion))
	err := c.scaleDeployment(ctx, namespace, sourceDepName, 0)
	if err != nil {
		log.Printf("Warning: Failed to scale down %s (maybe it doesn't exist?): %v", sourceDepName, err)
	} else {
		log.Printf("Scaled down Deployment %s to 0", sourceDepName)
	}

	// Scale up target
	targetDepName := fmt.Sprintf("sentinelaura-%s", formatRegion(targetRegion))
	err = c.scaleDeployment(ctx, namespace, targetDepName, 3)
	if err != nil {
		log.Printf("Warning: Failed to scale up %s: %v", targetDepName, err)
		return err
	}
	log.Printf("Scaled up Deployment %s to 3", targetDepName)

	return nil
}

func (c *Controller) scaleDeployment(ctx context.Context, namespace, deploymentName string, replicas int32) error {
	deploymentsClient := c.clientSet.AppsV1().Deployments(namespace)

	result, err := deploymentsClient.Get(ctx, deploymentName, metav1.GetOptions{})
	if err != nil {
		return err
	}

	result.Spec.Replicas = &replicas
	_, err = deploymentsClient.Update(ctx, result, metav1.UpdateOptions{})
	return err
}

func formatRegion(region string) string {
	// e.g., US-East -> us-east
	return strings.ToLower(region)
}
