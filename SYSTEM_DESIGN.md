# SYSTEM DESIGN: SentinelAura

SentinelAura is a visual geographic arbitrage engine for Kubernetes. It constantly analyzes spot instance pricing across multiple simulated cloud regions and automatically scales Kubernetes clusters to achieve the lowest possible infrastructure deployment costs.

## Architecture & Data Flow

### 1. The Spot Pricing Oracle
The **Price Oracle** is a Go-based service acting as a simulated cloud spot instance pricing API. 
* It periodically generates or fetches the latest spot prices for specified regions.
* Crucially, the oracle binds these prices directly to specific **Kubernetes Context IDs**, linking the abstract concept of a cloud region directly to the configuration required to administer it.
* Prices are durably cached in **Redis** with brief expirations (TTL) to mimic the volatility of real-world spot markets and prevent stale prices from triggering migrations.

### 2. The 3D Spatial HUD
The Frontend is built on Next.js 15, utilizing React-Three-Fiber (R3F) and Three.js to render a spatial visualization of the globe.
* A high-performance points-based mesh (using `gl.POINTS` or `Points` components) constructs the Earth, enveloped by a custom `ShaderMaterial` that renders a glowing atmospheric halo.
* The frontend subscribes to the Redis pricing data via the backend API. 
* It projects geographical coordinates (Latitude/Longitude) onto the spherical 3D surface. `@react-three/drei`'s `Html` component is used to spatially anchor interactive UI overlays ("One-Click Migrate" buttons) to these regions.
* `framer-motion-3d` smooths the camera and object transitions when users trigger migration actions.

### 3. The Multi-Cluster Operation (Arbitrage Execution)
When an arbitrage opportunity is detected (price drops significantly below the current deployment cost) and the "One-Click Migrate" action is initiated:
1. **Safety Dry Run**: The backend first performs a calculated dry run. It determines if the **Egress Cost** of transferring pod state/data exceeds the projected **Spot Savings** over the next 24-hour period.
2. **Controller Execution**: If profitable, the `migration_controller` activates.
3. **Multi-Cluster Orchestration**: The controller, acting as a true Operator via the `client-go` API, utilizes a `RegionManager` holding multiple configured `kubernetes.Clientset` instances.
4. It simultaneously addresses the source cluster (scaling down the deployment) and the target cluster (scaling up the deployment), orchestrating a rolling geographical migration of the workloads.
