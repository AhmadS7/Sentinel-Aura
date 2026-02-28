"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { TrendingDown, Coins } from "lucide-react";

export default function SavingsHUD({ currentTotalSaving, latestDropRegion, previousPrice, currentPrice }: {
    currentTotalSaving: number,
    latestDropRegion: string | null,
    previousPrice: number,
    currentPrice: number
}) {
    const animatedSavings = useSpring(0, { bounce: 0, duration: 2000 });

    useEffect(() => {
        animatedSavings.set(currentTotalSaving);
    }, [currentTotalSaving, animatedSavings]);

    const displaySavings = useTransform(animatedSavings, (latest) => `$${latest.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`);

    return (
        <div className="fixed top-8 left-8 right-8 pointer-events-none z-10 flex justify-between items-start">
            {/* Total Savings HUD */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 p-6 rounded-2xl"
            >
                <div className="text-xs text-neutral-500 uppercase tracking-widest font-medium mb-2 flex items-center gap-2">
                    PROJECTED ANNUAL SAVINGS
                </div>
                <motion.div className="text-4xl lg:text-5xl font-light text-white tracking-tight">
                    {displaySavings}
                </motion.div>
            </motion.div>

            {/* Latest Alert */}
            {latestDropRegion && (
                <motion.div
                    initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    key={latestDropRegion + currentPrice}
                    className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 p-5 rounded-2xl max-w-sm pointer-events-auto"
                >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-300 mb-3">
                        <TrendingDown className="w-4 h-4 text-neutral-400" />
                        Region Price Alert
                    </div>
                    <p className="text-sm text-neutral-300 mb-4 tracking-wide leading-relaxed">
                        <span className="text-white font-medium">{latestDropRegion}</span> spot threshold reached.
                    </p>
                    <div className="flex items-center gap-3 mb-4 text-sm font-mono bg-neutral-950/50 p-3 rounded-lg border border-neutral-800/50">
                        <span className="text-neutral-500 line-through">${previousPrice.toFixed(3)}/hr</span>
                        <span className="text-neutral-400">→</span>
                        <span className="text-white">${currentPrice.toFixed(3)}/hr</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                        Select marker on map to migrate
                    </div>
                </motion.div>
            )}
        </div>
    );
}
