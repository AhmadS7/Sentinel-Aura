<div align="center">
  <img src="./vibrant-demo.webp" alt="SentinelAura 3D Dashboard Demo" width="100%" />

  <h1>SentinelAura 🌍</h1>
  <p><strong>Visual Geographic Arbitrage Engine for Kubernetes</strong></p>
  
  <p>
    <a href="#overview">Overview</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#features">Features</a> •
    <a href="#getting-started">Getting Started</a>
  </p>
</div>

---

## Overview

**SentinelAura** is a high-performance Kubernetes Operator and 3D Dashboard designed to visualize and execute geographic compute arbitrage in real-time. 

By tracking Spot Instance prices across 5 global infrastructure regions, SentinelAura identifies sudden cost drops (arbitrage opportunities). When a profitable margin is found, operators can trigger a **1-Click Migrate**. The backend operator performs a dry-run calculation to guarantee data egress costs don't eclipse projected savings, before seamlessly scaling down the deployment in the expensive cluster and scaling it up in the cheaper one.

---

## Architecture & Tech Stack

SentinelAura is built with a strict separation of concerns, heavily utilizing concurrent Go and WebGL.

### ⚙️ Backend (Golang Operator)
* **`k8s.io/client-go`**: Directly interfaces with the Kubernetes API. Uses a custom `RegionManager` to hold multiple `kubernetes.Clientset` instances, allowing simultaneous cross-cluster operations.
* **Contextual Timeouts**: Utilizes `context.WithTimeout` to ensure network partitions to remote clusters don't block the Goroutines handling migrations.
* **Redis**: Acts as a high-speed TTL cache for the fluctuating Spot API prices to prevent rate-limiting the Oracle.

### 🎨 Frontend (Next.js 15 & React-Three-Fiber)
* **WebGL Spatial Dashboard**: Renders a Points-based 3D Earth using custom `ShaderMaterial` for atmospheric glow.
* **`framer-motion-3d`**: Powers the physics-based camera rotation and spring transitions when regions are focused.
* **Tailwind v4**: Implements a strict, dark-themed "Memoria" design system alongside vibrant, gamified neon markers for immediate visual alerts.

---

![SentinelAura Highlight Panel](./dummy-demo.webp)

## Core Features

### 1. Multi-Cluster Orchestration
The Go backend doesn't just mock data; it maps specific Region IDs (e.g., `US-East`) to actual Kubernetes Contexts (`ctx-us-east`). The `MigrationController` orchestrates the scale-down/scale-up events atomically.

### 2. Safety DryRun Logic
Migrating compute isn't free. The Go Operator includes a safety function that calculates:
`(Spot Savings Over 24h) - (Egress Data Transfer Cost) = Margin`. 
If the margin is negative, the migration is blocked with a `412 Precondition Failed` error displayed instantly on the HUD.

### 3. Geographic Interactive Markers
The frontend dynamically converts Latitude and Longitude into 3D Vector coordinates (`Math.sin(phi) * Math.cos(theta)`), binding interactive HTML elements precisely to their global positions on the rotating WebGL sphere.

---

## Getting Started

### Prerequisites
- Docker (for Redis)
- Go 1.22+
- Node.js 20+
- (Optional) Multiple `kubeconfig` contexts for true multi-cluster testing.

### Local Development

1. **Start the Cache**
```bash
docker run -p 6379:6379 -d redis
```

2. **Run the Go Operator**
```bash
cd backend
go run .
# Defaults to Mock Mode if KUBECONFIG is missing
```

3. **Run the 3D Dashboard**
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the arbitrage engine.
