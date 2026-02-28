"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { TrendingDown, Coins, ArrowRight } from "lucide-react";

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
        <div className="fixed top-8 left-8 right-8 pointer-events-none z-10 flex flex-col md:flex-row gap-4 justify-between items-start">
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
                <motion.div className="text-4xl lg:text-5xl font-mono font-bold text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                    {displaySavings}
                </motion.div>
            </motion.div>

            {/* Latest Alert */}
            {latestDropRegion && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={latestDropRegion + currentPrice}
                    className="bg-green-900/40 backdrop-blur-md border border-green-500/50 p-6 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)] max-w-sm pointer-events-auto"
                >
                    <div className="flex items-center gap-3 text-green-400 mb-2 font-bold uppercase tracking-wider">
                        <TrendingDown className="w-5 h-5 animate-bounce" />
                        Arbitrage Opportunity!
                    </div>
                    <p className="text-white text-lg">
                        <span className="font-bold text-green-300">{latestDropRegion}</span> spot price dropped significantly!
                    </p>
                    <div className="flex justify-between items-center mt-3 bg-black/40 p-3 rounded text-sm font-mono">
                        <span className="line-through text-red-500">${previousPrice.toFixed(3)}/hr</span>
                        <span className="text-green-400 text-lg font-bold items-center flex gap-2"><ArrowRight className="w-4 h-4" /> ${currentPrice.toFixed(3)}/hr</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-3 font-medium">
                        Click the <span className="text-green-400 font-bold px-1">{latestDropRegion}</span> marker on the map to migrate.
                    </div>
                </motion.div>
            )}
        </div>
    );
}
