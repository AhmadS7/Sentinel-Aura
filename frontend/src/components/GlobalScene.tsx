"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion-3d";
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
        glowColor: { type: "c", value: new THREE.Color(0x52525b) }, // Zinc 600
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

    useFrame((state) => {
        if (earthRef.current && !currentTarget) {
            earthRef.current.rotation.y += 0.0005; // Base rotation
        }
    });

    // Calculate dynamic rotation if a target is selected
    const targetCoords = currentTarget && REGION_COORDS[currentTarget];
    const targetRotation = targetCoords
        ? [0, Math.atan2(targetCoords[0], targetCoords[2]), 0]
        : [0, 0, 0];

    return (
        <motion.group
            ref={earthRef as any}
            animate={{
                rotation: currentTarget ? targetRotation : [0, earthRef.current?.rotation.y || 0, 0]
            }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
        >
            {/* 3D Earth Points Globe */}
            <points scale={2.5}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particles.length / 3}
                        array={particles}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial color="#52525b" size={0.015} sizeAttenuation transparent opacity={0.8} />
            </points>

            {/* Core surface to block see-through for the grid */}
            <mesh scale={2.5}>
                <sphereGeometry args={[0.98, 32, 32]} />
                <meshBasicMaterial color="#020617" />
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
                                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 cursor-pointer ${isCheap
                                    ? "bg-neutral-900/80 backdrop-blur-md border border-neutral-700/80 text-white scale-110 shadow-xl z-50 hover:border-neutral-600"
                                    : "bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 text-neutral-400 opacity-60 hover:opacity-100 hover:bg-neutral-900/60"
                                    }`}
                                onClick={() => onSelectTarget(rp.region)}
                            >
                                <div className="font-semibold text-xs tracking-wider uppercase">{rp.region}</div>
                                <div className={`text-[10px] font-mono mt-1 ${isCheap ? 'text-neutral-300' : 'text-neutral-500'}`}>${rp.price.toFixed(3)}/hr</div>

                                {isCheap && (
                                    <button
                                        className="mt-3 text-[10px] font-medium tracking-widest uppercase bg-neutral-800 border border-neutral-700 text-white px-3 py-1.5 rounded-lg transition-colors hover:bg-neutral-700 hover:border-neutral-600"
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
        </motion.group>
    );
}
