"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { RegionPrice, fetchPrices, migrateWorkload } from "@/lib/api";
import Earth3D from "@/components/Earth3D";
import SavingsHUD from "@/components/SavingsHUD";
import { Loader2, Zap } from "lucide-react";

export default function Dashboard() {
  const [prices, setPrices] = useState<RegionPrice[]>([]);
  const [targetRegion, setTargetRegion] = useState<string | null>(null);

  // Data for HUD
  const [totalSaving, setTotalSaving] = useState(12450.00); // Initial mock saving
  const [latestDrop, setLatestDrop] = useState<{ region: string, prev: number, curr: number } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Poll prices
  useEffect(() => {
    const fetcher = async () => {
      const data = await fetchPrices();
      if (data && data.length > 0) {
        setPrices(prev => {
          // Check for drops to trigger the alert
          if (prev.length > 0) {
            const drops = data.filter(d => {
              const old = prev.find(p => p.region === d.region);
              return old && d.price < old.price * 0.8; // 20% drop means opportunity
            });
            if (drops.length > 0) {
              const drop = drops[0];
              const prevPrice = prev.find(p => p.region === drop.region)?.price || 0.05;
              setLatestDrop({ region: drop.region, prev: prevPrice, curr: drop.price });
            }
          }
          return data;
        });
      }
    };

    fetcher();
    const interval = setInterval(fetcher, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTarget = (region: string) => {
    const priceData = prices.find(p => p.region === region);
    if (priceData && priceData.price < 0.04) {
      setTargetRegion(region);
    }
  };

  const handleMigrate = async () => {
    if (!targetRegion) return;
    setIsMigrating(true);

    // Assume we're currently in US-East if target is not US-East
    const sourceRegion = targetRegion === "US-East" ? "US-West" : "US-East";

    await migrateWorkload(sourceRegion, targetRegion);

    // Calculate simulated savings based on difference scaled up
    const cheapPrice = prices.find(p => p.region === targetRegion)?.price || 0.01;
    const oldPrice = 0.05;
    const annualSaving = (oldPrice - cheapPrice) * 10 * 24 * 365; // 10 nodes

    setTotalSaving(prev => prev + annualSaving);

    setTimeout(() => {
      setIsMigrating(false);
      setTargetRegion(null);
      setLatestDrop(null); // Clear alert
    }, 1500);
  };

  return (
    <div className="w-screen h-screen bg-[#020617] relative overflow-hidden text-white font-sans">
      <SavingsHUD
        currentTotalSaving={totalSaving}
        latestDropRegion={latestDrop?.region || null}
        previousPrice={latestDrop?.prev || 0}
        currentPrice={latestDrop?.curr || 0}
      />

      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 3] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Earth3D prices={prices} onSelectTarget={handleSelectTarget} />
          <OrbitControls enableZoom={true} enablePan={false} maxDistance={6} minDistance={1.5} />
        </Canvas>
      </div>

      {/* Migration Action Overlay */}
      {targetRegion && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
          <div className="bg-black/80 backdrop-blur border border-white/20 p-6 rounded-xl text-center mb-4 max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Target Region: {targetRegion}</h3>
            <p className="text-gray-400 text-sm mb-4">
              Deployments will be drained from the current region and scaled up in <strong className="text-white">{targetRegion}</strong>.
              Traffic will shift automatically via global load balancer.
            </p>
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="w-full relative group overflow-hidden bg-white text-black font-bold py-4 px-8 rounded-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isMigrating ? (
                <><Loader2 className="animate-spin w-5 h-5" /> EXECUTING MIGRATION...</>
              ) : (
                <><Zap className="w-5 h-5 text-yellow-500" /> 1-CLICK MIGRATE WORKLOADS</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
