"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { RegionPrice } from "@/lib/api";

// Map lat/lon to 3D position
function latLongToVector3(lat: number, lon: number, radius: number): [number, number, number] {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return [x, y, z];
}

const REGION_COORDS: Record<string, [number, number, number]> = {
    "US-East": latLongToVector3(38, -78, 1.05),
    "US-West": latLongToVector3(37, -121, 1.05),
    "EU-West": latLongToVector3(53, -8, 1.05),
    "AP-South": latLongToVector3(19, 72.8, 1.05),
    "AP-Northeast": latLongToVector3(35.6, 139.6, 1.05),
};

export default function Earth3D({ prices, onSelectTarget }: { prices: RegionPrice[], onSelectTarget: (r: string) => void }) {
    const earthRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (earthRef.current) {
            earthRef.current.rotation.y += 0.001; // slow rotation
        }
    });

    return (
        <group ref={earthRef}>
            {/* 3D Earth Globe */}
            <Sphere args={[1, 64, 64]}>
                <meshStandardMaterial color="#0f172a" wireframe={true} opacity={0.3} transparent />
            </Sphere>

            {/* Core surface to block see-through for the grid */}
            <Sphere args={[0.98, 32, 32]}>
                <meshBasicMaterial color="#020617" />
            </Sphere>

            {/* Region Markers */}
            {prices.map((rp) => {
                const coords = REGION_COORDS[rp.region] || [0, 1.05, 0];
                const isCheap = rp.price < 0.04;

                // Dynamic scale and color
                const markerColor = isCheap ? "#22c55e" : "#ef4444";
                const scale = isCheap ? 0.04 + (Math.sin(Date.now() / 200) * 0.01) : 0.02;

                return (
                    <group key={rp.region} position={coords}>
                        <Sphere args={[scale, 16, 16]} onClick={() => onSelectTarget(rp.region)}>
                            <meshBasicMaterial color={markerColor} />
                        </Sphere>

                        {/* HTML Tooltip on the marker */}
                        <Html center distanceFactor={2}>
                            <div
                                className={`px-2 py-1 rounded text-xs text-white font-bold cursor-pointer transition-all ${isCheap ? "bg-green-600 border border-green-400 animate-pulse scale-110 shadow-[0_0_15px_rgba(34,197,94,0.5)]" : "bg-red-900 border border-red-700"
                                    }`}
                                onClick={() => onSelectTarget(rp.region)}
                            >
                                {rp.region}
                                <div className="text-[10px] font-mono">${rp.price.toFixed(3)}/hr</div>
                            </div>
                        </Html>
                    </group>
                );
            })}
        </group>
    );
}
