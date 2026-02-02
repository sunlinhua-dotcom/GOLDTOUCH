"use client";

import React from "react";
import { type FundamentalsData } from "@/app/actions/fundamentals";

interface FundamentalsMatrixProps {
    data: FundamentalsData | null;
}

const MatrixItem = ({
    label,
    value,
    unit = "",
    trend = "neutral",
    isPrimary = false
}: {
    label: string;
    value: string | number | null | undefined;
    unit?: string;
    trend?: "up" | "down" | "neutral";
    isPrimary?: boolean; // 是否为主数据，字号更大
}) => {

    // 安全格式化数值
    const formatValue = (val: string | number | null | undefined) => {
        if (val === null || val === undefined || val === "--") return "--";
        if (typeof val === 'number') return val.toLocaleString('en-US');
        return val;
    };

    const displayValue = formatValue(value);

    // 颜色处理
    let valueColor = "text-gray-200";
    if (trend === "up") valueColor = "text-[#FF4D4F]";
    if (trend === "down") valueColor = "text-[#00B578]";

    return (
        <div className="flex flex-col justify-between p-5 bg-[#121212] border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="text-gray-500 text-xs font-medium tracking-wide mb-2">
                {label}
            </div>
            <div className="flex items-baseline justify-end gap-1">
                <span className={`${isPrimary ? 'text-2xl' : 'text-xl'} font-mono font-medium tracking-tight ${valueColor}`}>
                    {displayValue}
                </span>
                <span className="text-xs text-gray-600 font-normal self-end mb-1">{unit}</span>
            </div>
            {/* 极简底部条 */}
            {trend !== "neutral" && (
                <div className={`w-full h-0.5 mt-3 ${trend === "up" ? "bg-[#FF4D4F]" : "bg-[#00B578]"} opacity-50`}></div>
            )}
        </div>
    );
};

export default function FundamentalsMatrix({ data }: FundamentalsMatrixProps) {
    if (!data) return null;

    // 数据处理辅助函数
    const safeFixed = (val: number | undefined | null, digits: number = 2) => {
        if (val === undefined || val === null) return "--";
        return val.toFixed(digits);
    };

    const toBillion = (val: number | undefined | null) => {
        if (val === undefined || val === null) return "--";
        return (val / 100000000).toFixed(2);
    };

    const safeNum = (val: number | undefined | null) => val ?? 0;

    return (
        <div className="mb-8">
            {/* 标题 */}
            <h3 className="text-base font-bold text-gray-100 mb-4 flex items-center gap-2 border-l-2 border-[#FFD700] pl-3">
                基本面核心数据
            </h3>

            {/* 2x4 矩阵网格 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-800 border border-gray-800 rounded-lg overflow-hidden">
                {/* 盈利能力 */}
                <MatrixItem
                    label="净资产收益率 (ROE)"
                    value={safeFixed(data.roe)}
                    unit="%"
                    isPrimary
                    trend={safeNum(data.roe) > 15 ? "up" : safeNum(data.roe) > 0 ? "neutral" : "down"}
                />

                <MatrixItem
                    label="净利润 (当季)"
                    value={toBillion(data.net_profit)}
                    unit="亿"
                    trend={safeNum(data.net_profit) > 0 ? "up" : "down"}
                />

                <MatrixItem
                    label="营业收入"
                    value={toBillion(data.revenue)}
                    unit="亿"
                />

                <MatrixItem
                    label="销售毛利率"
                    value={safeFixed(data.gross_margin)}
                    unit="%"
                />

                {/* 估值与风险 */}
                <MatrixItem
                    label="每股收益 (EPS)"
                    value={safeFixed(data.eps, 3)}
                    unit="元"
                    isPrimary
                />

                <MatrixItem
                    label="每股净资产"
                    value={safeFixed(data.bvps)}
                    unit="元"
                />

                <MatrixItem
                    label="资产负债率"
                    value={safeFixed(data.debt_ratio)}
                    unit="%"
                    trend={safeNum(data.debt_ratio) > 70 ? "down" : "neutral"}
                />

                <MatrixItem
                    label="总资产报酬率 (ROA)"
                    value={safeFixed(data.roa)}
                    unit="%"
                />
            </div>
        </div>
    );
}
