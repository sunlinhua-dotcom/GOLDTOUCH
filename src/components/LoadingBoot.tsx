"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingBootProps {
    stockName: string;
    stockCode: string;
    isError?: boolean;
    errorMessage?: string;
}

export default function LoadingBoot({ stockName, stockCode, isError, errorMessage }: LoadingBootProps) {
    const [stage, setStage] = useState(1); // 1 = Data, 2 = Context, 3 = AI
    const [progress, setProgress] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [processId, setProcessId] = useState<string>("000000"); // Stable ID for rendering

    // Stage Definitions
    const STAGES = [
        { id: 1, label: "DATA LINK", desc: "正在从交易所获取实时行情..." },
        { id: 2, label: "AGENT CORE", desc: "正在分析资金流与技术指标..." },
        { id: 3, label: "GEMINI AI", desc: "大模型正在生成深度内参..." }
    ];

    // 1. Stage Controller (Simulated Timeline but distinct steps)
    useEffect(() => {
        // Init Stable Process ID once on mount
        setProcessId(Math.floor(Math.random() * 999999).toString().padStart(6, '0'));

        if (isError) return; // Don't run logic if error

        // Init Stage 1 (0ms) - Data Fetching
        setStage(1);
        setLogs(prev => [...prev, `[INIT] Core v3.0 initializing...`]);
        setLogs(prev => [...prev, `[DATA] Connecting to AkShare Interface...`]);

        // Transition to Stage 2 (1.5s) - Agent Processing
        const t1 = setTimeout(() => {
            setStage(2);
            setProgress(35);
            setLogs(prev => [...prev, `[OK] Real-time Quote Received.`, `[AGENT] Constructing Analysis Context...`]);
        }, 1500);

        // Transition to Stage 3 (3.5s) - Gemini AI Inference
        const t2 = setTimeout(() => {
            setStage(3);
            setProgress(65);
            setLogs(prev => [...prev, `[OK] Context Built (Tokens: 4096).`, `[AI] Sending Request to Gemini Pro...`]);
        }, 3500);

        // Stage 3 "Breathing" (Slow increment until done)
        const t3 = setInterval(() => {
            setProgress(prev => {
                if (prev >= 98) return prev;
                // Only increment if we are in stage 3
                return prev > 60 ? prev + 0.2 : prev;
            });

            // Add random "thinking" logs periodically in Stage 3
            if (Math.random() > 0.7) {
                const thoughts = [
                    "Analyzing MACD Divergence...",
                    "Simulating Risk Scenarios...",
                    "Scanning Institutional Orders...",
                    "Reviewing Historical Volatility...",
                    "Calculating Confidence Score..."
                ];
                const rand = thoughts[Math.floor(Math.random() * thoughts.length)];
                setLogs(prev => [...prev.slice(-8), `[AI] ${rand}`]);
            }
        }, 800);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearInterval(t3);
        }
    }, [isError]);

    // Error Effect
    useEffect(() => {
        if (isError) {
            setStage(3);
            setProgress(100);
            setLogs(prev => [...prev, `[ERROR] Analysis Failed.`, `[SYSTEM] ${errorMessage || "Connection Timed Out"}`]);
        }
    }, [isError, errorMessage]);

    // 3. Auto-Scroll Log
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="fixed inset-0 z-50 bg-[#050505] text-[#E0E0E0] font-mono flex flex-col items-center justify-center p-6">

            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className={`text-xs font-bold tracking-[0.3em] mb-2 ${isError ? 'text-red-500' : 'text-[#D4AF37]'}`}>
                        {isError ? 'SYSTEM FAILURE' : 'MOJIN QUANT TERMINAL'}
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-wider">{stockName} <span className="text-gray-500 text-lg">{stockCode}</span></h1>
                </div>

                {/* 3-Stage Stepper */}
                <div className="flex justify-between items-center mb-8 relative">
                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-800 -z-10"></div>

                    {STAGES.map((s) => {
                        const isActive = stage === s.id;
                        const isDone = stage > s.id;
                        return (
                            <div key={s.id} className="flex flex-col items-center bg-[#050505] px-2">
                                <div className={`w-3 h-3 rounded-full mb-2 transition-all duration-500 
                                    ${isActive ? (isError ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-[#D4AF37] scale-125 shadow-[0_0_10px_#D4AF37]') : ''} 
                                    ${isDone ? (isError && s.id === 3 ? 'bg-red-500' : 'bg-green-500') : ''} 
                                    ${!isActive && !isDone ? 'bg-gray-700' : ''}`}
                                ></div>
                                <div className={`text-[10px] font-bold tracking-widest transition-colors duration-300
                                    ${isActive ? (isError ? 'text-red-500' : 'text-[#D4AF37]') : 'text-gray-600'}`}>
                                    {s.label}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Main Status Display */}
                <div className={`bg-[#0A0A0A] border rounded-lg p-6 mb-6 shadow-2xl relative overflow-hidden transition-colors duration-500
                    ${isError ? 'border-red-900/50' : 'border-gray-800'}`}>

                    {/* Scanning Line Animation - Hide on Error */}
                    {!isError && (
                        <motion.div
                            className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37] opacity-50 shadow-[0_0_20px_#D4AF37]"
                            animate={{ top: ["0%", "100%", "0%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                    )}

                    <div className="text-center">
                        <div className={`text-sm font-bold mb-4 ${isError ? 'text-red-500' : 'text-[#D4AF37] animate-pulse'}`}>
                            {isError ? "分析失败: 请检查网络连接" : STAGES[stage - 1].desc}
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
                            <motion.div
                                className={`h-full ${isError ? 'bg-red-600' : 'bg-[#D4AF37]'}`}
                                initial={{ width: "0%" }}
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                            <span>PROCESS_ID: {processId}</span>
                            <span>{isError ? "FAILED" : `${progress.toFixed(1)}%`}</span>
                        </div>

                        {isError && (
                            <div className="text-xs text-red-400 mt-2 p-2 bg-red-950/30 rounded border border-red-900/50">
                                Error: {errorMessage}
                            </div>
                        )}
                    </div>
                </div>

                {/* Terminal Log */}
                <div
                    ref={scrollRef}
                    className="h-32 overflow-hidden text-[10px] text-gray-500 font-mono border-l-2 border-gray-800 pl-4 space-y-1"
                >
                    <AnimatePresence mode="popLayout">
                        {logs.map((log, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="break-all"
                            >
                                <span className="text-gray-700 mr-2">{new Date().toTimeString().split(' ')[0]}</span>
                                <span className={log.includes('[AI]') ? 'text-[#D4AF37]' : (log.includes('[ERROR]') ? 'text-red-500' : '')}>{log}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {isError && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-900/30 border border-red-500/50 text-red-400 text-xs tracking-widest hover:bg-red-900/50 transition-colors uppercase cursor-pointer"
                        >
                            Restart System
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
