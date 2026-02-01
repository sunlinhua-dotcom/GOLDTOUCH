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
import SignalBadge from "@/components/SignalBadge";
import LoadingBoot from "@/components/LoadingBoot";
import PaymentModal from "@/components/PaymentModal";
import { TermTooltip } from "@/components/TermTooltip";
import { TERM_DEFINITIONS } from "@/lib/definitions";

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

    // Strategy Tab State
    const [activeTab, setActiveTab] = useState<"short" | "long">("short");

    // 1. Click Unlock -> Show Modal
    const handleUnlockClick = () => {
        setShowPayment(true);
    };

    // 2. Confirm Payment -> Actually Unlock
    const confirmPayment = async () => {
        setShowPayment(false);
        if (status !== "done") return;

        setStatus("unlocking");
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate verifying

        setIsUnlocked(true);
        setStatus("done");
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
    const getSentimentBadge = (text: string) => {
        if (text.includes("看多") || text.includes("上涨")) return <SignalBadge type="bull" text="看多信号" intensity="medium" />;
        if (text.includes("看空") || text.includes("下跌")) return <SignalBadge type="bear" text="看空信号" intensity="medium" />;
        return <SignalBadge type="neutral" text="观望信号" />;
    };

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

                    {/* HEADER HERO */}
                    <div className={styles.header}>
                        <div>
                            <h1 className={styles.stockTitle}>{stockName}</h1>
                            <span className={styles.stockCode}>{decodedCode}</span>
                        </div>
                        <div className={styles.priceBlock}>
                            <div className={styles.price}>{priceInfo?.price || "--.--"}</div>
                            <div className={styles.change} style={{
                                color: String(priceInfo?.change || "").startsWith('-') ? 'var(--accent-green)' : 'var(--accent-red)',
                                backgroundColor: String(priceInfo?.change || "").startsWith('-') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                            }}>
                                {priceInfo?.change}
                            </div>
                        </div>
                    </div>

                    {/* MAIN DASHBOARD */}
                    {status === "done" && parsedReport && (
                        <div className={styles.dashboardGrid}>

                            {/* Signal Deck (Top Row) */}
                            <div className={styles.signalDeck}>
                                <ReportCard variant="featured" className="flex flex-col justify-center items-start min-h-[100px]">
                                    <div className="text-gray-400 text-sm uppercase mb-1">AI 态度</div>
                                    <div className="mt-1">
                                        {getSentimentBadge(parsedReport.signal)}
                                    </div>
                                </ReportCard>
                                <ReportCard className="flex flex-col justify-center">
                                    <div className="text-gray-400 text-sm mb-1">主力资金</div>
                                    <div className="text-xl font-bold text-yellow-500">
                                        {parsedReport.data_evidence?.capital_flow?.includes("流入") ? "资金流入 🟢" : "资金流出 🔴"}
                                    </div>
                                </ReportCard>
                                <ReportCard className="flex flex-col justify-center items-start">
                                    <div className="text-gray-400 text-sm mb-1">
                                        <TermTooltip term="System Score">系统多维评分</TermTooltip>
                                    </div>
                                    <div className="text-xl font-bold text-white relative z-10 flex items-baseline gap-1">
                                        {parsedReport.ai_score ? parsedReport.ai_score : (fundamentals?.roe ? (fundamentals.roe / 10 + 7.5).toFixed(1) : "8.5")}
                                        <span className="text-sm text-gray-500 font-normal">/ 100</span>
                                    </div>
                                </ReportCard>
                            </div>

                            {/* Strategy Dashboard with Tab Switch */}
                            {(parsedReport.short_term || parsedReport.long_term) && (
                                <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {/* Tab Switcher */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <button
                                            onClick={() => setActiveTab("short")}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                activeTab === "short"
                                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                                                    : "bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50"
                                            }`}
                                        >
                                            ⚡ 短期 (4-12周)
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("long")}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                activeTab === "long"
                                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                                                    : "bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50"
                                            }`}
                                        >
                                            📈 长期 (6-12个月)
                                        </button>
                                    </div>

                                    {/* Active Strategy Content */}
                                    {(() => {
                                        const strategy = activeTab === "short" ? parsedReport.short_term : parsedReport.long_term;
                                        if (!strategy) return null;
                                        return (
                                            <>
                                                <div className="flex items-center gap-3 mb-3 px-1">
                                                    <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 tracking-wide ${
                                                        activeTab === "short"
                                                            ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                                                            : "bg-purple-500/10 border border-purple-500/30 text-purple-400"
                                                    }`}>
                                                        <span className="animate-pulse">⏱️</span> {strategy.timeframe}
                                                    </div>
                                                    <div className="text-gray-400 text-sm italic truncate max-w-[300px] md:max-w-none">
                                                        &ldquo;{strategy.rationale}&rdquo;
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <ReportCard className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20 flex flex-col justify-between">
                                                        <div className="text-green-500/80 text-sm uppercase font-bold tracking-wider mb-1">🛡️ 支撑位</div>
                                                        <div className="text-2xl font-mono font-bold text-green-400 tracking-tighter leading-none">
                                                            {strategy.key_levels.support}
                                                        </div>
                                                        <div className="text-gray-400 text-sm mt-2 leading-tight">建议在此点位附近逢低关注</div>
                                                    </ReportCard>

                                                    <ReportCard className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20 flex flex-col justify-between">
                                                        <div className="text-red-500/80 text-sm uppercase font-bold tracking-wider mb-1">⚔️ 压力位</div>
                                                        <div className="text-2xl font-mono font-bold text-red-400 tracking-tighter leading-none">
                                                            {strategy.key_levels.resistance}
                                                        </div>
                                                        <div className="text-gray-400 text-sm mt-2 leading-tight">如未能放量突破建议分批减仓</div>
                                                    </ReportCard>

                                                    <ReportCard className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20 flex flex-col justify-between">
                                                        <div className="text-orange-500/80 text-sm uppercase font-bold tracking-wider mb-1">🛑 止损位</div>
                                                        <div className="text-2xl font-mono font-bold text-orange-400 tracking-tighter leading-none">
                                                            {strategy.key_levels.stop_loss}
                                                        </div>
                                                        <div className="text-gray-400 text-sm mt-2 leading-tight">有效跌破此位需执行离场策略</div>
                                                    </ReportCard>
                                                </div>
                                            </>
                                        );
                                    })()}

                                    {/* Data Evidence Badges */}
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
                                </div>
                            )}

                            {/* Fundamentals Deck (Financial Data) */}
                            {fundamentals && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                                    {[
                                        { label: "每股收益", value: fundamentals.eps, unit: "元" },
                                        { label: "每股净资产", value: fundamentals.bvps, unit: "元", fixed: 2 },
                                        { label: "净资产收益率", value: fundamentals.roe, unit: "%", color: "text-green-400", fixed: 2 },
                                        { label: "总资产报酬率", value: fundamentals.roa, unit: "%", color: "text-green-400", fixed: 2 },
                                        { label: "营业收入", value: fundamentals.revenue ? fundamentals.revenue / 100000000 : null, unit: "亿", fixed: 2 },
                                        { label: "净利润", value: fundamentals.net_profit ? fundamentals.net_profit / 100000000 : null, unit: "亿", fixed: 2 },
                                        { label: "毛利率", value: fundamentals.gross_margin, unit: "%", color: "text-green-400", fixed: 2 },
                                        { label: "资产负债率", value: fundamentals.debt_ratio, unit: "%", color: "text-red-400", fixed: 2 },
                                    ].map((item, idx) => {
                                        const getVal = (val: number | string | null | undefined) => {
                                            if (val === null || val === undefined) return '--';
                                            const num = typeof val === 'number' ? val : parseFloat(String(val));
                                            return isNaN(num) ? '--' : `${num.toFixed(item.fixed || 2)}${item.unit || ''}`;
                                        };
                                        return (
                                            <ReportCard key={idx} className="flex flex-col justify-center items-start min-h-[80px]">
                                                <div className="text-gray-400 text-sm mb-0.5">{item.label}</div>
                                                <div className={`text-xl font-bold tracking-tight ${item.color || 'text-white'}`}>
                                                    {getVal(item.value)}
                                                </div>
                                            </ReportCard>
                                        );
                                    })}
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

                            {/* Paywall / Deep Insight */}
                            <div className={styles.paywallContainer}>
                                {!isUnlocked ? (
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
                                ) : (
                                    <div className="text-left w-full max-w-4xl mx-auto">
                                        <div className="text-yellow-500 font-bold mb-4 tracking-widest text-sm text-center">PRIVILEGED INSIGHT UNLOCKED</div>
                                        <ReportCard variant="featured">
                                            <div className={styles.markdownBody}>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => <ParagraphWithTooltips>{children}</ParagraphWithTooltips>
                                                    }}
                                                >
                                                    {parsedReport.deep_insight || "**正在生成深度数据...**"}
                                                </ReactMarkdown>
                                            </div>
                                        </ReportCard>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </>
            )
            }

            {/* Payment Modal */}
            {
                showPayment && (
                    <PaymentModal
                        onClose={() => setShowPayment(false)}
                        onPaid={confirmPayment}
                    />
                )
            }
        </div >
    );
}
