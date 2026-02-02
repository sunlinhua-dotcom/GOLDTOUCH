
"use client";

import React from "react";
import { type FundamentalsData } from "@/app/actions/fundamentals";

interface FundamentalsGridProps {
    data: FundamentalsData | null;
}

const MetricCard = ({
    label,
    value,
    unit = "",
    size = "normal",
    trend = "neutral",
    subLabel = ""
}: {
    label: string;
    value: string | number | null | undefined;
    unit?: string;
    size?: "normal" | "large" | "wide";
    trend?: "up" | "down" | "neutral";
    subLabel?: string;
}) => {
    const formatValue = (val: string | number | null | undefined) => {
        if (val === null || val === undefined || val === "--") return "--";
        // If number, format it
        if (typeof val === 'number') return val.toLocaleString('en-US');
        return val;
    };

    const displayValue = formatValue(value);

    // Size classes
    let gridClass = "col-span-1";
    if (size === "large") gridClass = "col-span-2 row-span-2";
    if (size === "wide") gridClass = "col-span-2";

    // Color classes
    let valueColor = "text-white";
    if (trend === "up") valueColor = "text-[#00ff9d]";
    if (trend === "down") valueColor = "text-[#ff3864]";

    return (
        <div className={`${gridClass} relative p-4 bg-gray-900/40 backdrop-blur-md rounded-xl border border-white/5 hover:border-white/10 transition-all group overflow-hidden`}>
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">
                    {label}
                </div>

                <div className="flex items-baseline gap-1">
                    <span className={`${size === 'large' ? 'text-3xl md:text-4xl' : 'text-xl'} font-mono font-bold tracking-tight ${valueColor}`}>
                        {displayValue}
                    </span>
                    {unit && <span className="text-xs text-gray-600 font-medium">{unit}</span>}
                </div>

                {subLabel && (
                    <div className="mt-1 text-[10px] text-gray-600 truncate">{subLabel}</div>
                )}
            </div>
        </div>
    );
};

export default function FundamentalsGrid({ data }: FundamentalsGridProps) {
    if (!data) return null;

    // Helper to process billions/millions safely
    const toBillion = (val: number | undefined | null) => {
        if (val === undefined || val === null) return "--";
        return (val / 100000000).toFixed(2);
    };

    // Safe toFixed helper
    const safeFixed = (val: number | undefined | null, digits: number = 2) => {
        if (val === undefined || val === null) return "--";
        return val.toFixed(digits);
    };

    // Safe number extraction for trend logic
    const safeNum = (val: number | undefined | null) => {
        if (val === undefined || val === null) return 0;
        return val;
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-yellow-500/80 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-4 bg-yellow-500/50 rounded-full" />
                Fundamental Intelligence
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Profitability (Large) */}
                <MetricCard
                    label="ROE (净资产收益率)"
                    value={safeFixed(data.roe)}
                    unit="%"
                    size="large"
                    trend={safeNum(data.roe) > 15 ? "up" : safeNum(data.roe) > 0 ? "neutral" : "down"}
                    subLabel="Core Profitability Indicator"
                />

                {/* 2. Scale Metrics (Wide) */}
                <MetricCard
                    label="Total Revenue"
                    value={toBillion(data.revenue)}
                    unit="亿"
                    size="wide"
                />

                <MetricCard
                    label="Net Profit"
                    value={toBillion(data.net_profit)}
                    unit="亿"
                    size="wide"
                    trend={safeNum(data.net_profit) > 0 ? "up" : "neutral"}
                />

                {/* 3. Valuation Ratios (Normal) */}
                <MetricCard
                    label="EPS"
                    value={safeFixed(data.eps, 3)}
                    unit="元"
                />
                <MetricCard
                    label="BVPS"
                    value={safeFixed(data.bvps)}
                    unit="元"
                />
                <MetricCard
                    label="Gross Margin"
                    value={safeFixed(data.gross_margin)}
                    unit="%"
                />
                <MetricCard
                    label="Debt Ratio"
                    value={safeFixed(data.debt_ratio)}
                    unit="%"
                    trend={safeNum(data.debt_ratio) > 70 ? "down" : "neutral"}
                />
            </div>
        </div>
    );
}
