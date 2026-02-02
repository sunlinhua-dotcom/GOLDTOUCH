"use client";

import React from "react";
import { Activity, Zap, BarChart3, TrendingUp, TrendingDown } from "lucide-react";

interface SignalPanelProps {
    signal: string;
    score: number;
    flow: string;
    rationale?: string; // New: 决策逻辑
}

export default function SignalPanel({ signal, score, flow, rationale }: SignalPanelProps) {
    // 解析信号逻辑
    const isBull = signal.includes("看多") || signal.includes("上涨") || signal.includes("积极");
    const isBear = signal.includes("看空") || signal.includes("下跌") || signal.includes("消极");

    // 信号文字提取 (只取第一个字: 多/空/观)
    let signalChar = "观";
    let signalColor = "text-gray-400";
    let bgGradient = "from-gray-800 to-gray-900";
    let borderColor = "border-gray-700";
    let Icon = Activity;

    if (isBull) {
        signalChar = "多";
        signalColor = "text-[#FF4D4F]"; // 金融红
        bgGradient = "from-[#2A1215] to-[#1A0A0B]"; // 深红背景
        borderColor = "border-[#FF4D4F]/30";
        Icon = TrendingUp;
    } else if (isBear) {
        signalChar = "空";
        signalColor = "text-[#00B578]"; // 金融绿
        bgGradient = "from-[#0A1F16] to-[#05140E]"; // 深绿背景
        borderColor = "border-[#00B578]/30";
        Icon = TrendingDown;
    }

    // 评分环逻辑
    const circumference = 2 * Math.PI * 26; // r=26
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const scoreColor = score >= 80 ? "text-[#FFD700]" : score >= 60 ? "text-[#FF4D4F]" : "text-gray-400";

    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* 1. 左侧：AI 综合评分 (占1份) */}
            <div className="bg-[#121212] border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center col-span-1">
                <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                    {/* 评分环背景 */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="26" stroke="#2a2a2a" strokeWidth="4" fill="transparent" />
                        <circle
                            cx="40" cy="40" r="26"
                            stroke={score >= 80 ? "#FFD700" : "#FF4D4F"}
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <span className={`text-2xl font-bold font-mono ${scoreColor}`}>
                        {score}
                    </span>
                </div>
                <div className="text-gray-500 text-sm font-medium tracking-wide flex items-center gap-1">
                    <Zap className="w-3 h-3" /> AI 评分
                </div>
            </div>

            {/* 2. 中间：核心信号 + 解读 (占2份) */}
            <div className={`relative overflow-hidden border ${borderColor} rounded-lg p-6 flex flex-col justify-between bg-gradient-to-br ${bgGradient} col-span-1 md:col-span-2`}>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-gray-400 text-xs mb-1 tracking-wider uppercase flex items-center gap-1.5 opacity-80">
                            <Activity className="w-3 h-3" /> 当前策略信号
                        </div>
                        <div className={`text-5xl font-bold ${signalColor} font-serif mt-1 flex items-center gap-2`}>
                            {signalChar}
                            <Icon className={`w-8 h-8 opacity-50 ${signalColor}`} />
                        </div>
                    </div>

                    {/* 装饰大字 */}
                    <div className={`text-8xl font-bold opacity-5 ${signalColor} absolute right-4 top-2 pointer-events-none select-none`}>
                        {signalChar}
                    </div>
                </div>

                {/* 新增：决策逻辑摘要 */}
                {rationale && (
                    <div className="mt-4 relative">
                        <div className={`text-sm ${isBull ? "text-red-200/70" : isBear ? "text-green-200/70" : "text-gray-400"} leading-relaxed border-l-2 ${isBull ? "border-[#FF4D4F]/30" : isBear ? "border-[#00B578]/30" : "border-gray-700"} pl-3 italic`}>
                            “{rationale}”
                        </div>
                    </div>
                )}
            </div>

            {/* 3. 右侧：关键指标列表 (占1份) - 改为上下结构防止挤压 */}
            <div className="bg-[#121212] border border-gray-800 rounded-lg p-5 flex flex-col gap-4 justify-center col-span-1">
                {/* 主力资金 - 上下结构 */}
                <div className="border-b border-gray-800 pb-3">
                    <div className="text-gray-500 text-xs mb-2 flex items-center gap-1.5">
                        <BarChart3 className="w-3 h-3" /> 主力资金流向
                    </div>
                    {/* 给长文本一个独立的背景块，防止视觉混乱 */}
                    <div className="bg-gray-900/50 rounded p-2 border border-gray-800/50">
                        <span className={`text-sm font-medium leading-relaxed ${flow.includes("流出") ? "text-[#00B578]" : "text-[#FF4D4F]"}`}>
                            {flow}
                        </span>
                    </div>
                </div>

                {/* 信号强度 - 保持左右，因为"强/中/弱"很短 */}
                <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-500 text-xs">AI 置信度</span>
                    <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${score > 80 ? "bg-[#FF4D4F]" : "bg-gray-600"}`}></div>
                        <div className={`w-1.5 h-1.5 rounded-full ${score > 60 ? "bg-[#FF4D4F]" : "bg-gray-600"}`}></div>
                        <div className={`w-1.5 h-1.5 rounded-full ${score > 40 ? "bg-[#FF4D4F]" : "bg-gray-600"}`}></div>
                        <span className="text-xs font-bold text-gray-300 ml-1">
                            {score > 80 ? "强" : score > 60 ? "中" : "弱"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
