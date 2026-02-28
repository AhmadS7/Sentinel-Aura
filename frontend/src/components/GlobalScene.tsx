"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RegionPrice } from "@/lib/api";

function latLongToVector3(lat: number, lon: number, radius: number): [number, number, number] {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return [x, y, z];
}

const REGION_COORDS: Record<string, [number, number, number]> = {
    "US-East": latLongToVector3(38, -78, 1.05 * 2.5),
    "US-West": latLongToVector3(37, -121, 1.05 * 2.5),
    "EU-West": latLongToVector3(53, -8, 1.05 * 2.5),
    "AP-South": latLongToVector3(19, 72.8, 1.05 * 2.5),
    "AP-Northeast": latLongToVector3(35.6, 139.6, 1.05 * 2.5),
};

const AtmosphereShader = {
    uniforms: {
        c: { type: "f", value: 0.5 },
        p: { type: "f", value: 3.5 },
        glowColor: { type: "c", value: new THREE.Color(0xa1a1aa) }, // Zinc 400
        viewVector: { type: "v3", value: new THREE.Vector3() },
    },
    vertexShader: `
    uniform vec3 viewVector;
    uniform float c;
    uniform float p;
    varying float intensity;
    void main() {
      vec3 vNormal = normalize( normalMatrix * normal );
      vec3 vNormel = normalize( normalMatrix * viewVector );
      intensity = pow( c - dot(vNormal, vNormel), p );
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
    fragmentShader: `
    uniform vec3 glowColor;
    varying float intensity;
    void main() {
      vec3 glow = glowColor * intensity;
      gl_FragColor = vec4( glow, 1.0 );
    }
  `
};

export default function GlobalScene({ prices, onSelectTarget, currentTarget }: { prices: RegionPrice[], onSelectTarget: (r: string) => void, currentTarget: string | null }) {
    const earthRef = useRef<THREE.Group>(null);

    // Calculate points for the Earth sphere
    const particles = useMemo(() => {
        const p = [];
        for (let i = 0; i < 4000; i++) {
            const lat = (Math.random() - 0.5) * 180;
            const lon = (Math.random() - 0.5) * 360;
            p.push(...latLongToVector3(lat, lon, 1));
        }
        return new Float32Array(p);
    }, []);

    const targetCoords = currentTarget && REGION_COORDS[currentTarget];
    const targetYRotation = targetCoords
        ? Math.atan2(targetCoords[0], targetCoords[2])
        : null;

    useFrame((state, delta) => {
        if (!earthRef.current) return;

        if (targetYRotation !== null) {
            const PI2 = Math.PI * 2;
            let currentY = earthRef.current.rotation.y;

            // Normalize target to 0-2PI
            let targetY = targetYRotation % PI2;
            if (targetY < 0) targetY += PI2;

            // Normalize current to 0-2PI
            let modCurrentY = currentY % PI2;
            if (modCurrentY < 0) modCurrentY += PI2;

            // Find shortest path direction
            let diff = targetY - modCurrentY;
            if (diff > Math.PI) diff -= PI2;
            if (diff < -Math.PI) diff += PI2;

            // Interpoloate using damped spring
            earthRef.current.rotation.y = THREE.MathUtils.damp(currentY, currentY + diff, 4, delta);
        } else {
            // Continual base rotation when unselected
            earthRef.current.rotation.y += 0.05 * delta;
        }
    });

    return (
        <group ref={earthRef}>
            {/* 3D Earth Points Globe */}
            <points scale={2.5}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[particles, 3]}
                    />
                </bufferGeometry>
                <pointsMaterial color="#d4d4d8" size={0.03} sizeAttenuation transparent opacity={0.8} />
            </points>

            {/* Core surface to block see-through for the grid */}
            <mesh scale={2.5}>
                <sphereGeometry args={[0.98, 32, 32]} />
                <meshBasicMaterial color="#0a0a0a" />
            </mesh>

            {/* Atmospheric Glow */}
            <mesh scale={2.5}>
                <sphereGeometry args={[1.15, 32, 32]} />
                <shaderMaterial
                    args={[AtmosphereShader]}
                    transparent
                    blending={THREE.AdditiveBlending}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Region Markers */}
            {prices.map((rp) => {
                const coords = REGION_COORDS[rp.region] || [0, 1.05, 0];
                const isCheap = rp.price < 0.04;

                return (
                    <group key={rp.region} position={coords}>
                        {/* HTML Tooltip on the marker */}
                        <Html center distanceFactor={2}>
                            <div
                                className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs text-white cursor-pointer transition-all duration-300 ${isCheap
                                    ? "bg-green-600/80 backdrop-blur-md border border-green-400 rotate-0 scale-125 shadow-[0_0_25px_rgba(34,197,94,0.7)] z-50 hover:bg-green-500"
                                    : "bg-red-900/50 backdrop-blur-sm border border-red-700/50 opacity-50 hover:opacity-100"
                                    }`}
                                onClick={() => onSelectTarget(rp.region)}
                            >
                                <div className="font-bold tracking-wider">{rp.region}</div>
                                <div className={`text-[10px] font-mono mt-1 ${isCheap ? 'text-green-200' : 'text-red-300'}`}>${rp.price.toFixed(3)}/hr</div>

                                {isCheap && (
                                    <button
                                        className="mt-2 text-[10px] font-bold uppercase tracking-widest bg-white text-green-900 px-3 py-1 rounded transition-colors hover:bg-green-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectTarget(rp.region);
                                        }}
                                    >
                                        1-Click Migrate
                                    </button>
                                )}
                            </div>
                        </Html>
                    </group>
                );
            })}
        </group>
    );
}
