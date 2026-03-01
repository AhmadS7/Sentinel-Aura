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

  // Migration Event state
  const [activeMigration, setActiveMigration] = useState<{ source: string, target: string } | null>(null);

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

    // WebSocket connection for Live Migration Events
    const wsUrl = `ws://${window.location.hostname}:8080/api/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "MIGRATION_EVENT") {
          const payload = data.payload;
          setActiveMigration({ source: payload.source, target: payload.target });
          
          // Clear the migration line after some time (animation duration)
          setTimeout(() => {
            setActiveMigration(null);
          }, 4000); 
        }
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    return () => {
      clearInterval(interval);
      ws.close();
    };
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
        <Canvas
          camera={{ position: [0, 0, 8], fov: 45 }}
          gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[10, 10, 5]} intensity={2.5} color="#ffffff" />
          <pointLight position={[-10, -10, -10]} intensity={1.5} color="#a1a1aa" />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <GlobalScene 
            prices={prices} 
            onSelectTarget={handleSelectTarget} 
            currentTarget={targetRegion} 
            activeMigration={activeMigration}
          />
          <OrbitControls enableZoom={true} enablePan={false} maxDistance={15} minDistance={1.5} />
        </Canvas>
      </div>

      {targetRegion && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
          <div className="bg-black/80 backdrop-blur border border-white/20 p-6 rounded-xl text-center mb-4 max-w-lg shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <h3 className="text-xl font-bold mb-2">Target Region: {targetRegion}</h3>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Pods will be smoothly migrated over. A background <strong className="text-yellow-400 font-bold">Dry Run</strong> will execute first to prevent negative arbitrage margins from Egress costs.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setTargetRegion(null)}
                className="flex-1 border border-white/20 text-white font-bold py-4 px-8 rounded-lg transition-colors hover:bg-white/10 shadow-lg"
              >
                CANCEL
              </button>
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="flex-2 relative group overflow-hidden bg-white text-black font-bold py-4 px-8 rounded-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              >
                {isMigrating ? (
                  <><Loader2 className="animate-spin w-5 h-5" /> VALIDATING...</>
                ) : (
                  <><Zap className="w-5 h-5 text-yellow-500" /> EXECUTE ARBITRAGE</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
