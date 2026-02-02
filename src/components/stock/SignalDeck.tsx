
"use client";

import React from "react";
import ReportCard from "@/components/ReportCard";
import SignalBadge from "@/components/SignalBadge";
import { TermTooltip } from "@/components/TermTooltip";

// Reuse the SignalBadge logic or improved
const getSentimentBadge = (text: string) => {
    if (text.includes("看多") || text.includes("上涨") || text.includes("Bullish")) return <SignalBadge type="bull" text="看多信号" intensity="medium" />;
    if (text.includes("看空") || text.includes("下跌") || text.includes("Bearish")) return <SignalBadge type="bear" text="看空信号" intensity="medium" />;
    return <SignalBadge type="neutral" text="观望信号" />;
};

interface SignalDeckProps {
    signal: string;
    flow: string;
    score: number | string;
}

export default function SignalDeck({ signal, flow, score }: SignalDeckProps) {
    const isFlowIn = flow.includes("流入") || flow.includes("Inflow");

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* 1. AI Attitude */}
            <ReportCard variant="featured" className="flex flex-col justify-center items-start min-h-[120px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-4xl">🤖</span>
                </div>
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-2">AI SENTIMENT</div>
                <div className="mt-1 scale-110 origin-left transform transition-transform group-hover:scale-125">
                    {getSentimentBadge(signal)}
                </div>
                <div className="mt-3 text-xs text-gray-500 font-mono">
                    Based on Multi-Agent Consensus
                </div>
            </ReportCard>

            {/* 2. Capital Flow */}
            <ReportCard className="flex flex-col justify-center min-h-[120px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-4xl">💰</span>
                </div>
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">CAPITAL FLOW</div>
                <div className={`text-2xl font-bold tracking-tight ${isFlowIn ? 'text-green-400' : 'text-red-400'}`}>
                    {isFlowIn ? "Net Inflow 🟢" : "Net Outflow 🔴"}
                </div>
                <div className="mt-2 text-xs text-gray-500 font-mono">
                    {flow}
                </div>
            </ReportCard>

            {/* 3. AI Score */}
            <ReportCard className="flex flex-col justify-center items-start min-h-[120px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-4xl">🏆</span>
                </div>
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">
                    <TermTooltip term="System Score">AI COMPOSITE SCORE</TermTooltip>
                </div>
                <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-black text-white relative z-10 font-mono">
                        {score}
                    </div>
                    <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">/ 100</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1 bg-gray-800 rounded-full mt-3 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                        style={{ width: `${Math.min(Number(score), 100)}%` }}
                    />
                </div>
            </ReportCard>
        </div>
    );
}
