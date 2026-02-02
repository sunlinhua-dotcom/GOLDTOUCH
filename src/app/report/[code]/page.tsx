"use client";

import React, { useEffect, useState, use } from "react";
// import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import styles from "./page.module.css";
import { fetchRealTimeQuote } from "@/app/actions/stock";
import { generateStockReportAI, checkAndUseQuota } from "@/app/actions/analysis";
import { fetchFundamentals, type FundamentalsData } from "@/app/actions/fundamentals";
import { checkSession } from "@/app/actions/auth";
import LoginModal from "@/components/LoginModal";
import Header from "@/components/Header";
import ReportCard from "@/components/ReportCard";

import LoadingBoot from "@/components/LoadingBoot";
import PaymentModal from "@/components/PaymentModal";
import { TermTooltip } from "@/components/TermTooltip";
import { TERM_DEFINITIONS } from "@/lib/definitions";

// NEW: Premium Components (Refined)
import StockHeader from "@/components/stock/StockHeader";
import SignalPanel from "@/components/stock/SignalPanel";
import FundamentalsMatrix from "@/components/stock/FundamentalsMatrix";

// Strategy interface for both short-term and long-term
interface StrategyData {
    timeframe: string;
    rationale: string;
    key_levels: {
        support: string;
        resistance: string;
        stop_loss: string;
    };
}

// Helper to extract sections from Markdown
interface ReportSections {
    signal: string;
    sentiment: string;
    technical: string;
    plan: string;
    risk: string;
    analysis_summary?: string;
    ai_score?: number;
    sentiment_score?: number;
    deep_insight?: string;
    data_evidence?: {
        capital_flow?: string;
        valuation?: string;
        technical_context?: string;
    };
    short_term?: StrategyData;
    long_term?: StrategyData;
    // Legacy support
    strategy?: StrategyData;
}

const parseReport = (text: string): ReportSections => {
    console.log("[DEBUG] Raw AI Text received:", text.substring(0, 100));
    const cleanText = text.replace(/```json\s*|\s*```/g, "").trim();

    try {
        let data = JSON.parse(cleanText);

        // Handle common AI wrapper keys
        if (data.analysis_summary && !data.strategy) {
            data = { ...data, ...data.analysis_summary };
        }
        if (data.report && !data.strategy) {
            data = { ...data, ...data.report };
        }

        // Map rogue AI schemas (from logs)
        const signal = data.signal || data.trend_analysis?.short_term || data.suggestion || "分析完毕(PRO)";
        const technical = data.technical || data.technical_context?.analysis || data.trend_analysis?.description || "暂无叙述 (AI)";
        const sentiment = data.sentiment || data.market_sentiment || data.market_sentiment_analysis || "暂无分析 (AI)";
        const plan = data.plan || data.action_plan || data.trading_strategy || "暂无建议 (AI)";
        const risk = data.risk || data.risk_warning || data.risk_assessment || "暂无提示 (AI)";

        // Parse short-term strategy
        const short_term: StrategyData = data.short_term || {
            timeframe: "短期 (4-12周)",
            rationale: data.strategy?.rationale || "基于MA20/MA60趋势判断",
            key_levels: data.strategy?.key_levels || {
                support: "--",
                resistance: "--",
                stop_loss: "--"
            }
        };

        // Parse long-term strategy
        const long_term: StrategyData = data.long_term || {
            timeframe: "长期 (6-12个月)",
            rationale: "基于MA120/MA250趋势判断",
            key_levels: {
                support: "--",
                resistance: "--",
                stop_loss: "--"
            }
        };

        return {
            signal,
            sentiment,
            technical,
            plan,
            risk,
            ai_score: data.ai_score,
            sentiment_score: data.sentiment_score || data.score || 85,
            deep_insight: data.deep_insight || data.deepInsight || "**深度报告生成完毕 (AI)**",
            data_evidence: data.data_evidence || {
                capital_flow: data.capital_flow_analysis || data.capital_flow || "数据获取中",
                valuation: data.valuation_analysis || data.valuation || "数据获取中",
                technical_context: data.technical_summary || data.technical_context || "数据获取中"
            },
            short_term,
            long_term,
            // Legacy support
            strategy: data.strategy
        };
    } catch (e) {
        console.error("[CRITICAL] JSON Parse Failed:", e, text);
        return {
            signal: "解析异常 (AI)",
            sentiment: "**格式错误 (AI)**",
            technical: text,
            plan: "**请重新生成 (AI)**",
            risk: "**AI 返回格式不兼容**"
        };
    }
};

// --- HELPER COMPONENT: ParagraphWithTooltips ---
// Use <div> instead of <p> to allow nested block elements (ul, ol, p) from Markdown
const ParagraphWithTooltips = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="mb-2">
            {React.Children.map(children, (child) => {
                if (typeof child === 'string') {
                    // Split string by known terms (Longest match first to handle MA250 vs MA)
                    const sortedTerms = Object.keys(TERM_DEFINITIONS).sort((a, b) => b.length - a.length);
                    // Build regex: (MA250|MA20|RSI|...)
                    const regex = new RegExp(`(${sortedTerms.map(t => t.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})`, 'g');

                    const parts = child.split(regex);
                    return parts.map((part, i) => {
                        const uppercased = part.toUpperCase();
                        if (TERM_DEFINITIONS[part] || TERM_DEFINITIONS[uppercased]) {
                            return <TermTooltip key={i} term={part}>{part}</TermTooltip>;
                        }
                        return part;
                    });
                }
                return child;
            })}
        </div>
    );
};

export default function ReportPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const [status, setStatus] = useState<"thinking" | "done" | "error" | "unlocking">("thinking");
    const [isUnlocked, setIsUnlocked] = useState(false);

    // Payment State
    const [showPayment, setShowPayment] = useState(false);

    // Real Data State
    const [stockName, setStockName] = useState("Initializing...");
    const [priceInfo, setPriceInfo] = useState<{ price: string | number, change: string | number }>({ price: "--", change: "--" });
    const [parsedReport, setParsedReport] = useState<ReportSections | null>(null);
    const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(null);

    // Auth & Quota State
    const [showLogin, setShowLogin] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Deep Analysis State
    const [deepAnalysisProgress, setDeepAnalysisProgress] = useState(0);
    const [deepAnalysisStage, setDeepAnalysisStage] = useState("初始化中...");

    // Strategy Tab State
    const [activeTab, setActiveTab] = useState<"short" | "long">("short");

    // 1. Click Unlock -> Show Modal
    const handleUnlockClick = () => {
        setShowPayment(true);
    };

    // Deep Analysis Loading State

    // 2. Confirm Payment -> Actually Unlock + Load Deep Analysis
    const confirmPayment = async () => {
        setShowPayment(false);
        if (status !== "done") return;

        setStatus("unlocking");
        setDeepAnalysisProgress(0);

        // Debug日志只输出到console，不在UI显示
        const addDebugLog = (message: string) => {
            const timestamp = new Date().toLocaleTimeString('zh-CN');
            const logMessage = `[${timestamp}] ${message}`;
            console.log(logMessage);
        };

        try {
            addDebugLog("🚀 开始深度分析流程");

            // 调用 Trading Agents 深度分析
            const user = await checkSession();
            addDebugLog(`✓ 用户认证成功: ${user?.id}`);

            if (user) {
                // 模拟分析阶段进度
                const stages = [
                    { name: "正在初始化Trading Agents系统", progress: 10 },
                    { name: "正在获取市场实时数据", progress: 20 },
                    { name: "正在分析技术面指标", progress: 35 },
                    { name: "正在分析基本面数据", progress: 50 },
                    { name: "正在收集新闻资讯", progress: 65 },
                    { name: "正在分析市场情绪", progress: 75 },
                    { name: "CIO团队正在辩论", progress: 85 },
                    { name: "正在生成最终决策", progress: 95 },
                ];

                let currentStage = 0;
                const progressInterval = setInterval(() => {
                    if (currentStage < stages.length) {
                        setDeepAnalysisStage(stages[currentStage].name);
                        setDeepAnalysisProgress(stages[currentStage].progress);
                        addDebugLog(`⏳ ${stages[currentStage].name} (${stages[currentStage].progress}%)`);
                        currentStage++;
                    }
                }, 3000); // 每3秒更新一次

                addDebugLog(`📡 调用Python后端API: /api/analysis/deep-analysis`);
                addDebugLog(`📊 股票代码: ${code}, 用户ID: ${user.id}`);

                const { generateTradingAgentsAnalysis } = await import('@/app/actions/analysis');
                const deepAnalysis = await generateTradingAgentsAnalysis(code, user.id);

                clearInterval(progressInterval);
                setDeepAnalysisProgress(100);
                setDeepAnalysisStage("分析完成");
                addDebugLog("✅ API调用成功，收到分析结果");

                // 将深度分析结果格式化为 Markdown
                const formattedInsight = formatDeepAnalysis(deepAnalysis);

                // 更新 parsedReport 的 deep_insight
                if (parsedReport) {
                    setParsedReport({
                        ...parsedReport,
                        deep_insight: formattedInsight
                    });
                }

                // 等待一下让用户看到完成状态
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to load deep analysis:', error);
            addDebugLog(`❌ 错误: ${errorMessage}`);
            setDeepAnalysisStage(`分析失败: ${errorMessage}`);

            // 等待3秒让用户看到错误信息
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        setIsUnlocked(true);
        setStatus("done");
        setDeepAnalysisStage("");
    };

    // 格式化深度分析结果为 Markdown
    const formatDeepAnalysis = (analysis: {
        cio_decision?: string;
        bull_case?: string;
        bear_case?: string;
        risk_assessment?: string;
        market_analysis?: string;
        fundamentals?: string;
        news_analysis?: string;
        sentiment?: string;
        trading_plan?: string;
    }): string => {
        return `
## 📊 CIO 最终决策

${analysis.cio_decision || '正在生成决策建议...'}

## 🐂 多头论据

${analysis.bull_case || '正在分析看涨因素...'}

## 🐻 空头论据

${analysis.bear_case || '正在分析看跌风险...'}

## ⚠️ 风险评估

${analysis.risk_assessment || '正在评估投资风险...'}

## 📈 技术面深度

${analysis.market_analysis || '正在分析技术指标...'}

## 💰 基本面诊断

${analysis.fundamentals || '正在分析财务数据...'}

## 📰 新闻情报

${analysis.news_analysis || '正在收集新闻资讯...'}

## 📱 市场情绪

${analysis.sentiment || '正在分析市场情绪...'}

## 🎯 最终交易计划

${analysis.trading_plan || '正在制定交易策略...'}
        `.trim();
    };

    useEffect(() => {
        const fetchData = async () => {
            const decodedCodeValue = decodeURIComponent(code);

            console.log("[DEBUG] ========== 开始数据获取流程 ==========");
            console.log("[DEBUG] Step 0: 检查认证状态...");

            // 0. Auth Check
            const user = await checkSession();
            if (!user) {
                console.log("[DEBUG] 认证失败，显示登录页面");
                setStatus("done"); // 重要: 停止loading动画
                setShowLogin(true);
                return;
            }
            console.log("[DEBUG] 认证成功，用户:", user);
            if (user.isVip) setIsUnlocked(true);
            await checkAndUseQuota(decodedCodeValue);

            console.log("[DEBUG] Step 1: 获取实时报价...");
            // 1. Fetch Price
            const decodedCode = decodeURIComponent(code);
            setStockName(decodedCode);
            let quote = null;
            try {
                quote = await fetchRealTimeQuote(decodedCode);
                if (quote) {
                    setStockName(quote.name);
                    setPriceInfo({ price: quote.price, change: quote.change });
                    console.log("[DEBUG] 报价获取成功:", quote);
                } else {
                    console.log("[DEBUG] 报价获取失败: 返回null");
                }
            } catch (e) {
                console.error("[DEBUG] 报价获取异常:", e);
            }

            // 2. Sim Progress (Handled by component now)
            // const progressInterval = setInterval(() => { ... }, 150);

            console.log("[DEBUG] Step 2: 获取财务数据...");
            // 2.5. Fetch Fundamentals
            let fundamentalsData: FundamentalsData | null = null;
            try {
                const startTime = Date.now();
                fundamentalsData = await fetchFundamentals(decodedCode);
                const endTime = Date.now();
                setFundamentals(fundamentalsData);
                console.log(`[DEBUG] 财务数据获取完成 (耗时: ${endTime - startTime}ms):`, fundamentalsData);
            } catch (error) {
                console.error("[DEBUG] 财务数据获取失败:", error);
            }

            console.log("[DEBUG] Step 3: 调用AI分析...");
            // 3. AI Analysis (with fundamentals)
            try {
                const startTime = Date.now();
                const aiReport = await generateStockReportAI({
                    name: quote ? quote.name : decodedCode,
                    code: decodedCode,
                    price: quote ? quote.price : "--",
                    change: quote ? quote.change : "--",
                }, fundamentalsData);
                const endTime = Date.now();
                console.log(`[DEBUG] AI分析完成 (耗时: ${endTime - startTime}ms), 长度: ${aiReport.length} 字符`);

                // Parse for UI
                const sections = parseReport(aiReport);
                setParsedReport(sections);
                setStatus("done");
                console.log("[DEBUG] ========== 数据获取流程完成 ==========");

            } catch (error: unknown) {
                console.error("[DEBUG] AI分析失败:", error);
                const errorMsg = error instanceof Error ? error.message : "Unknown Error";
                setErrorMessage(errorMsg);
                setParsedReport(null);
                setStatus("error");
            }
        };

        fetchData();
    }, [code]);

    // Helper to determine sentiment badge


    const decodedCode = decodeURIComponent(code);

    return (
        <div className={`min-h-screen bg-[#050505] text-gray-200 selection:bg-yellow-500/30 ${styles.pageContainer}`}>
            {status === "thinking" || status === "error" ? (
                <LoadingBoot stockName={stockName} stockCode={decodedCode} isError={status === "error"} errorMessage={errorMessage} />
            ) : (
                <>
                    <Header />
                    {showLogin && <LoginModal onSuccess={() => {
                        setShowLogin(false);
                        window.location.reload(); // 登录成功后刷新页面重新获取数据
                    }} />}


                    {/* NEW: Premium Header */}
                    <StockHeader
                        name={stockName}
                        code={decodedCode}
                        price={priceInfo.price}
                        change={priceInfo.change}
                    />



                    {/* MAIN DASHBOARD */}
                    {status === "done" && parsedReport && (
                        <div className="max-w-7xl mx-auto px-4 md:px-0">

                            {/* Standard Flow: Signal -> Fundamentals */}
                            <div className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <SignalPanel
                                    signal={parsedReport.signal}
                                    flow={parsedReport.data_evidence?.capital_flow || "--"}
                                    score={parsedReport.ai_score || 85}
                                    rationale={parsedReport.short_term?.rationale || parsedReport.analysis_summary?.substring(0, 100)}
                                />

                                <FundamentalsMatrix data={fundamentals} />
                            </div>

                            {/* 🔥 付费深度内参 - 解锁后置顶显示 - 保持原样动画逻辑 */}
                            {isUnlocked && parsedReport.deep_insight && (
                                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                                    {/* 尊贵标识 */}
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent h-px"></div>
                                        <div className="text-center">
                                            <div className="inline-flex items-center gap-3 bg-black px-6 py-3 relative">
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                                <span className="text-yellow-500 font-bold tracking-[0.3em] text-xs">
                                                    黑金深度内参
                                                </span>
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 机构级深度分析卡片 */}
                                    <div className="relative group">
                                        {/* 发光边框效果 */}
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-500"></div>

                                        <div className="relative bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-black border border-yellow-500/30 rounded-2xl p-8 shadow-2xl">
                                            {/* 顶部标签组 */}
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold tracking-wider flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                                                    机构筹码分析
                                                </span>
                                                <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold tracking-wider flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                                                    北向资金穿透
                                                </span>
                                                <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold tracking-wider flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                                                    CIO决策建议
                                                </span>
                                            </div>

                                            {/* 主要内容 */}
                                            <div className={`${styles.markdownBody} premium-content`}>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => <ParagraphWithTooltips>{children}</ParagraphWithTooltips>,
                                                        strong: ({ children }) => (
                                                            <span className="text-yellow-400 font-bold bg-yellow-500/20 px-2 py-0.5 rounded border border-yellow-500/30 mx-1 shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                                                                {children}
                                                            </span>
                                                        ),
                                                        h2: ({ children }) => (
                                                            <h2 className="text-xl font-bold text-yellow-500 mt-6 mb-3 flex items-center gap-2">
                                                                <span className="w-1 h-6 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded"></span>
                                                                {children}
                                                            </h2>
                                                        ),
                                                        ul: ({ children }) => (
                                                            <ul className="space-y-2 my-4 border-l-2 border-yellow-500/30 pl-4">
                                                                {children}
                                                            </ul>
                                                        ),
                                                        li: ({ children }) => (
                                                            <li className="text-gray-300 flex items-start gap-2">
                                                                <span className="text-yellow-500 mt-1.5">▸</span>
                                                                <span className="flex-1">{children}</span>
                                                            </li>
                                                        )
                                                    }}
                                                >
                                                    {typeof parsedReport.deep_insight === 'string'
                                                        ? parsedReport.deep_insight
                                                        : (parsedReport.deep_insight ? String(parsedReport.deep_insight) : '')}
                                                </ReactMarkdown>
                                            </div>

                                            {/* 底部水印 */}
                                            <div className="mt-8 pt-6 border-t border-yellow-500/10 flex items-center justify-between text-xs text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 border border-yellow-500/30 rounded-full flex items-center justify-center">
                                                        <span className="text-yellow-500 text-[10px] font-bold">M</span>
                                                    </div>
                                                    <span className="tracking-wider">摩金量化专业版</span>
                                                </div>
                                                <span className="text-yellow-500/50">机构级深度投研分析</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Main Content Grid (Strategy + Analysis) */}
                            <div className={styles.dashboardGrid}>


                                {/* Strategy Dashboard with Tab Switch */}
                                {(parsedReport.short_term || parsedReport.long_term) && (
                                    <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        {/* Tab Switcher - Segmented Control Style */}
                                        <div className="flex items-center p-1 bg-gray-900 rounded-lg border border-gray-800 mb-6 w-fit">
                                            <button
                                                onClick={() => setActiveTab("short")}
                                                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === "short"
                                                    ? "bg-[#1E1E1E] text-blue-400 shadow-sm ring-1 ring-white/10"
                                                    : "text-gray-500 hover:text-gray-300"
                                                    }`}
                                            >
                                                ⚡ 短期
                                            </button>
                                            <button
                                                onClick={() => setActiveTab("long")}
                                                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === "long"
                                                    ? "bg-[#1E1E1E] text-purple-400 shadow-sm ring-1 ring-white/10"
                                                    : "text-gray-500 hover:text-gray-300"
                                                    }`}
                                            >
                                                📈 长期
                                            </button>
                                        </div>

                                        {/* Active Strategy Content */}
                                        {(() => {
                                            const strategy = activeTab === "short" ? parsedReport.short_term : parsedReport.long_term;
                                            if (!strategy) return null;
                                            return (
                                                <>
                                                    {/* NEW: Strategy Cards (Premium + Lucide Icons) */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {/* 支撑位 */}
                                                        <ReportCard className="bg-gradient-to-b from-gray-900 to-black border-t-2 border-t-green-500/50 border-x border-b border-gray-800 flex flex-col justify-between relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                {/* Icon placeholder - will maintain pure CSS for now or use Lucide if imported */}
                                                                <div className="w-16 h-16 bg-green-500 rounded-full blur-xl"></div>
                                                            </div>
                                                            <div className="text-green-500 text-xs font-bold tracking-widest mb-2 uppercase flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                                第一支撑位
                                                            </div>
                                                            <div className="text-3xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 tracking-tighter">
                                                                {strategy.key_levels.support}
                                                            </div>
                                                            <div className="text-gray-500 text-xs mt-3 font-medium">
                                                                建议在此点位附近逢低关注
                                                            </div>
                                                        </ReportCard>

                                                        {/* 压力位 */}
                                                        <ReportCard className="bg-gradient-to-b from-gray-900 to-black border-t-2 border-t-red-500/50 border-x border-b border-gray-800 flex flex-col justify-between relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                <div className="w-16 h-16 bg-red-500 rounded-full blur-xl"></div>
                                                            </div>
                                                            <div className="text-red-500 text-xs font-bold tracking-widest mb-2 uppercase flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                                关键压力位
                                                            </div>
                                                            <div className="text-3xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-600 tracking-tighter">
                                                                {strategy.key_levels.resistance}
                                                            </div>
                                                            <div className="text-gray-500 text-xs mt-3 font-medium">
                                                                如未能放量突破建议分批减仓
                                                            </div>
                                                        </ReportCard>

                                                        {/* 止损位 */}
                                                        <ReportCard className="bg-gradient-to-b from-gray-900 to-black border-t-2 border-t-orange-500/50 border-x border-b border-gray-800 flex flex-col justify-between relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                <div className="w-16 h-16 bg-orange-500 rounded-full blur-xl"></div>
                                                            </div>
                                                            <div className="text-orange-500 text-xs font-bold tracking-widest mb-2 uppercase flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                                                防守止损线
                                                            </div>
                                                            <div className="text-3xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-600 tracking-tighter">
                                                                {strategy.key_levels.stop_loss || "--"}
                                                            </div>
                                                            <div className="text-gray-500 text-xs mt-3 font-medium">
                                                                跌破此位需严格执行风控
                                                            </div>
                                                        </ReportCard>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                                {parsedReport.data_evidence && (
                                    <div className="mt-4 flex flex-wrap gap-6 px-1">
                                        <div className="text-sm text-gray-300 flex items-center gap-1.5">
                                            <span className="text-yellow-500">●</span> 资金: {parsedReport.data_evidence.capital_flow}
                                        </div>
                                        <div className="text-sm text-gray-300 flex items-center gap-1.5">
                                            <span className="text-blue-500">●</span> 估值: {parsedReport.data_evidence.valuation}
                                        </div>
                                        <div className="text-sm text-gray-300 flex items-center gap-1.5">
                                            <span className="text-purple-500">●</span> 技术: {parsedReport.data_evidence.technical_context}
                                        </div>
                                    </div>
                                )}



                                {/* Left Column: Analysis */}
                                <div className={styles.mainContent}>
                                    <ReportCard title="技术面解构">
                                        <div className={styles.markdownBody}>
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <ParagraphWithTooltips>{children}</ParagraphWithTooltips>,
                                                    strong: ({ children }) => {
                                                        return <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30 font-mono font-bold mx-1 text-lg shadow-[0_0_10px_rgba(234,179,8,0.2)]">{children}</span>
                                                    }
                                                }}
                                            >
                                                {parsedReport.technical}
                                            </ReactMarkdown>
                                        </div>
                                    </ReportCard>
                                    <ReportCard title="市场情绪与资金">
                                        <div className={styles.markdownBody}>
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <ParagraphWithTooltips>{children}</ParagraphWithTooltips>,
                                                    strong: ({ children }) => <span className="text-pink-400 font-bold bg-pink-500/10 px-1 rounded mx-1">{children}</span>
                                                }}
                                            >
                                                {parsedReport.sentiment}
                                            </ReactMarkdown>
                                        </div>
                                    </ReportCard>
                                </div>

                                {/* Right Column: Action Plan */}
                                <div className={styles.sidePanel}>
                                    <div className="sticky top-6 flex flex-col gap-6">
                                        <ReportCard title="交易计划" variant="featured">
                                            <div className={styles.markdownBody}>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => <ParagraphWithTooltips>{children}</ParagraphWithTooltips>
                                                    }}
                                                >
                                                    {parsedReport.plan}
                                                </ReactMarkdown>
                                            </div>
                                        </ReportCard>

                                        <ReportCard title="风险提示" variant="danger">
                                            <div className={styles.markdownBody}>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => <ParagraphWithTooltips>{children}</ParagraphWithTooltips>
                                                    }}
                                                >
                                                    {parsedReport.risk}
                                                </ReactMarkdown>
                                            </div>
                                        </ReportCard>
                                    </div>
                                </div>

                                {/* Paywall - 仅在未解锁时显示 */}
                                {!isUnlocked && (
                                    <div className={styles.paywallContainer}>
                                        <div className="relative z-10">
                                            <div className="text-5xl mb-4">💎</div>
                                            <h3 className="text-2xl font-bold text-yellow-500 mb-2">解锁黑金深度内参</h3>
                                            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                                                获取机构视角的【筹码分布】、【北向资金穿透】及【精确买卖点位】。
                                            </p>
                                            <button
                                                onClick={handleUnlockClick}
                                                className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform"
                                            >
                                                立即解锁 · ¥19.9
                                            </button>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    )}

                    {/* Payment Modal */}
                    {
                        showPayment && (
                            <PaymentModal
                                onClose={() => setShowPayment(false)}
                                onPaid={confirmPayment}
                            />
                        )
                    }

                    {/* 🔥 Deep Analysis Loading Screen - 超级炫酷的全屏加载 */}
                    {
                        status === "unlocking" && deepAnalysisStage && (
                            <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-500">
                                <div className="relative w-full max-w-4xl px-8">
                                    {/* 背景动画效果 */}
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
                                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>
                                    </div>

                                    {/* 主要内容 */}
                                    <div className="relative z-10 text-center">
                                        {/* Logo动画 */}
                                        <div className="mb-12 animate-in zoom-in duration-700">
                                            <div className="inline-flex items-center justify-center w-32 h-32 relative">
                                                {/* 外圈旋转光环 */}
                                                <div className="absolute inset-0 border-4 border-yellow-500/30 rounded-full animate-spin"></div>
                                                <div className="absolute inset-2 border-4 border-yellow-400/20 rounded-full animate-spin-reverse"></div>

                                                {/* 中心图标 */}
                                                <div className="relative w-20 h-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-500/50">
                                                    <svg className="w-12 h-12 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 标题 */}
                                        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent animate-in slide-in-from-bottom-4 duration-700 delay-200">
                                            多智能体深度分析
                                        </h2>

                                        <p className="text-gray-400 text-lg mb-12 animate-in slide-in-from-bottom-4 duration-700 delay-300">
                                            机构级多维度智能分析系统正在运行
                                        </p>

                                        {/* 进度条 */}
                                        <div className="mb-8 animate-in slide-in-from-bottom-4 duration-700 delay-400">
                                            <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden border border-yellow-500/20">
                                                {/* 进度条背景光效 */}
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400 transition-all duration-500 ease-out"
                                                    style={{ width: `${deepAnalysisProgress}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                                </div>
                                            </div>

                                            {/* 进度百分比 */}
                                            <div className="flex justify-between items-center mt-3">
                                                <span className="text-yellow-500 font-mono text-sm">{deepAnalysisProgress}%</span>
                                                <span className="text-gray-500 text-sm">预计需要 30-60 秒</span>
                                            </div>
                                        </div>

                                        {/* 当前阶段 */}
                                        <div className="bg-gradient-to-r from-yellow-500/10 via-yellow-400/10 to-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8 animate-in slide-in-from-bottom-4 duration-700 delay-500">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="flex gap-1">
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce delay-100"></div>
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce delay-200"></div>
                                                </div>
                                                <p className="text-yellow-400 font-medium text-lg">{deepAnalysisStage}</p>
                                            </div>
                                        </div>

                                        {/* 分析维度展示 */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-600">
                                            {[
                                                { icon: "📊", label: "技术分析", active: deepAnalysisProgress > 30 },
                                                { icon: "💰", label: "基本面", active: deepAnalysisProgress > 45 },
                                                { icon: "📰", label: "新闻情报", active: deepAnalysisProgress > 60 },
                                                { icon: "🎯", label: "CIO决策", active: deepAnalysisProgress > 80 },
                                            ].map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-4 rounded-xl border transition-all duration-500 ${item.active
                                                        ? "bg-yellow-500/10 border-yellow-500/50 shadow-lg shadow-yellow-500/20"
                                                        : "bg-gray-800/50 border-gray-700/50"
                                                        }`}
                                                >
                                                    <div className="text-3xl mb-2">{item.icon}</div>
                                                    <div className={`text-sm font-medium ${item.active ? "text-yellow-400" : "text-gray-500"}`}>
                                                        {item.label}
                                                    </div>
                                                    {item.active && (
                                                        <div className="mt-2 text-xs text-yellow-500">✓ 完成</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* 底部提示 */}
                                        <div className="mt-12 text-gray-500 text-sm animate-in slide-in-from-bottom-4 duration-700 delay-700">
                                            <p>系统正在调用多个AI分析师进行协同分析</p>
                                            <p className="mt-1">请勿关闭页面</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </>
            )}
        </div>
    );
}
