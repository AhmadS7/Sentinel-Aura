"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { RegionPrice, fetchPrices, migrateWorkload } from "@/lib/api";
import dynamic from "next/dynamic";
import SavingsHUD from "@/components/SavingsHUD";
import { Loader2, Zap } from "lucide-react";

const GlobalScene = dynamic(() => import("@/components/GlobalScene"), {
  ssr: false,
  loading: () => null
});

export default function Dashboard() {
  const [prices, setPrices] = useState<RegionPrice[]>([]);
  const [targetRegion, setTargetRegion] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Data for HUD
  const [totalSaving, setTotalSaving] = useState(12450.00);
  const [latestDrop, setLatestDrop] = useState<{ region: string, prev: number, curr: number } | null>(null);

  useEffect(() => {
    const fetcher = async () => {
      const data = await fetchPrices();
      if (data && data.length > 0) {
        setPrices(prev => {
          if (prev.length > 0) {
            const drops = data.filter(d => {
              const old = prev.find(p => p.region === d.region);
              return old && d.price < old.price * 0.8;
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
    setGlobalError(null);
    const priceData = prices.find(p => p.region === region);
    if (priceData && priceData.price < 0.04) {
      setTargetRegion(region);
    } else {
      setTargetRegion(region); // Allow looking at it, but maybe not migrate if not cheap
    }
  };

  const handleMigrate = async () => {
    if (!targetRegion) return;
    setIsMigrating(true);
    setGlobalError(null);

    // Abstract Source Region assumption
    const sourceRegion = targetRegion === "US-East" ? "US-West" : "US-East";

    // Attempt the migration with dryrun active on backend
    const success = await migrateWorkload(sourceRegion, targetRegion);

    if (success) {
      const cheapPrice = prices.find(p => p.region === targetRegion)?.price || 0.01;
      const oldPrice = 0.05;
      const annualSaving = (oldPrice - cheapPrice) * 50 * 24 * 365; // 50 nodes 

      setTotalSaving(prev => prev + annualSaving);

      setTimeout(() => {
        setIsMigrating(false);
        setTargetRegion(null);
        setLatestDrop(null);
      }, 1500);
    } else {
      setIsMigrating(false);
      setGlobalError("Migration Blocked: DryRun indicated egress costs exceed spot savings margin.");
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0a0a0a] relative overflow-hidden text-neutral-200 font-sans">
      <SavingsHUD
        currentTotalSaving={totalSaving}
        latestDropRegion={latestDrop?.region || null}
        previousPrice={latestDrop?.prev || 0}
        currentPrice={latestDrop?.curr || 0}
      />

      {globalError && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-neutral-900/90 border border-red-900/40 text-red-400 px-6 py-4 rounded-2xl shadow-xl backdrop-blur-md text-sm tracking-wide font-medium">
          {globalError}
        </div>
      )}

      <div className="absolute inset-0 z-0 w-full h-full pointer-events-auto">
        <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <GlobalScene prices={prices} onSelectTarget={handleSelectTarget} currentTarget={targetRegion} />
          <OrbitControls enableZoom={true} enablePan={false} maxDistance={6} minDistance={1.5} />
        </Canvas>
      </div>

      {targetRegion && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full max-w-xl px-4">
          <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-8 rounded-2xl text-center w-full shadow-2xl">
            <h3 className="text-xl font-light tracking-wide text-white mb-2">Target Region: <span className="font-medium">{targetRegion}</span></h3>
            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
              Pods will be smoothly migrated over. A background <strong className="text-neutral-300 font-medium">Dry Run</strong> will execute first to prevent negative arbitrage margins from Egress costs.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setTargetRegion(null)}
                className="flex-1 bg-transparent border border-neutral-800 text-neutral-300 font-medium py-3 px-6 rounded-xl transition-colors hover:bg-neutral-800/50 hover:text-white uppercase tracking-wider text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="flex-2 relative group overflow-hidden bg-neutral-100 text-neutral-950 font-semibold py-3 px-6 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
              >
                {isMigrating ? (
                  <><Loader2 className="animate-spin w-4 h-4" /> VALIDATING...</>
                ) : (
                  <><Zap className="w-4 h-4" /> EXECUTE ARBITRAGE</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
