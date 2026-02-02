"use client";

import React from "react";
import { ArrowUpIcon, ArrowDownIcon, ClockIcon } from "lucide-react";

interface StockHeaderProps {
    name: string;
    code: string;
    price: string | number;
    change: string | number;
}

export default function StockHeader({ name, code, price, change }: StockHeaderProps) {
    // 强制转换为数字以便比较
    const numChange = parseFloat(String(change).replace("%", ""));
    const isUp = numChange > 0;
    const isZero = numChange === 0;

    // 格式化价格
    const displayPrice = price === "--" ? "--" : Number(price).toFixed(2);

    // 颜色逻辑 - 纯粹的金融色
    const colorClass = isUp ? "text-[#FF4D4F]" : isZero ? "text-gray-400" : "text-[#00B578]";
    const icon = isUp ? <ArrowUpIcon className="w-6 h-6" /> : isZero ? null : <ArrowDownIcon className="w-6 h-6" />;

    return (
        <div className="w-full bg-[#121212] border-b border-gray-800 pb-6 pt-8 mb-8">
            <div className="max-w-7xl mx-auto px-4 md:px-0">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">

                    {/* 左侧：核心身份 */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-4">
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-100 tracking-tight">
                                {name}
                            </h1>
                            <span className="text-xl text-gray-500 font-mono tracking-wider">
                                {code}
                            </span>
                        </div>

                        {/* 状态胶囊 */}
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-xs text-gray-400">
                                <ClockIcon className="w-3 h-3" />
                                <span>交易中</span>
                            </div>
                            <div className="px-2.5 py-0.5 rounded bg-blue-900/30 border border-blue-800 text-xs text-blue-400">
                                A股主板
                            </div>
                        </div>
                    </div>

                    {/* 右侧：核心行情 */}
                    <div className="flex items-end gap-6">
                        <div className="text-right">
                            <div className={`text-6xl font-mono font-medium tracking-tighter flex items-center gap-2 ${colorClass}`}>
                                {displayPrice}
                            </div>
                        </div>

                        <div className="flex flex-col justify-end pb-2">
                            <div className={`flex items-center gap-1 text-2xl font-mono font-medium ${colorClass}`}>
                                {icon}
                                {Math.abs(numChange).toFixed(2)}%
                            </div>
                            <div className={`text-sm text-right mt-1 font-medium ${colorClass}`}>
                                {isUp ? "当日上涨" : isZero ? "平盘" : "当日下跌"}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
