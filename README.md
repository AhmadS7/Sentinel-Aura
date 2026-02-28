# SentinelAura 🌍

SentinelAura is a visual geographic arbitrage engine for Kubernetes. It is built as an advanced Kubernetes Operator (using `client-go` in Go) paired with a high-performance 3D spatial dashboard built with Next.js, React-Three-Fiber, and Framer Motion.

## Overview
SentinelAura mocks spot instance pricing across 5 global regions. When an arbitrage opportunity is identified (a sudden price drop), the 3D globe visualization dynamically maps the event. Operators can perform a `1-Click Migrate` which triggers a safety dry-run calculation ensuring the egress costs do not exceed the projected spot savings. If profitable, the system executes a multi-cluster workload migration in real-time.

## Features
- **3D Spatial HUD**: Points-based spherical projection with glowing ShaderMaterials. Coordinates mapped precisely to geographic latitude and longitude.
- **Advanced Go Operator**: Uses `k8s.io/client-go` with a multi-context `RegionManager` to scale Deployments simultaneously across clusters with strict timeout control via Contexts.
- **Safety DryRun Logic**: Prevents costly geographic moves if the data egress transfer fees exceed the 24-hour spot discount.

## Quick Start (Locally)
1. Run a Redis instance (`docker run -p 6379:6379 -d redis`).
2. Run backend: Navigate to `backend/` and execute `go run .`
3. Run frontend: Navigate to `frontend/` and execute `npm run dev`

See `SYSTEM_DESIGN.md` for architectural charts.
