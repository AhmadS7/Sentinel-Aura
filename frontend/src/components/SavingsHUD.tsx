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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-black/60 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-2xl"
            >
                <div className="flex items-center gap-3 text-gray-400 mb-2 font-medium">
                    <Coins className="text-yellow-400 w-5 h-5" />
                    PROJECTED ANNUAL SAVINGS
                </div>
                <motion.div className="text-5xl font-mono font-bold text-green-400 text-shadow-glow">
                    {displaySavings}
                </motion.div>
            </motion.div>

            {/* Latest Alert */}
            {latestDropRegion && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={latestDropRegion + currentPrice}
                    className="bg-green-900/40 backdrop-blur-md border border-green-500/50 p-6 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)] max-w-sm"
                >
                    <div className="flex items-center gap-3 text-green-400 mb-2 font-bold uppercase tracking-wider">
                        <TrendingDown className="w-5 h-5 animate-bounce" />
                        Arbitrage Opportunity!
                    </div>
                    <p className="text-white text-lg">
                        <span className="font-bold text-green-300">{latestDropRegion}</span> spot price just dropped significantly!
                    </p>
                    <div className="flex justify-between items-center mt-3 bg-black/40 p-3 rounded text-sm font-mono">
                        <span className="line-through text-red-400">${previousPrice.toFixed(3)}/hr</span>
                        <span className="text-green-400 text-lg font-bold">→ ${currentPrice.toFixed(3)}/hr</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-3">
                        Click the <span className="text-green-400 font-bold ">{latestDropRegion}</span> marker to initiate 1-Click Migration.
                    </div>
                </motion.div>
            )}
        </div>
    );
}
