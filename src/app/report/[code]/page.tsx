"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import styles from "./page.module.css";
import { fetchRealTimeQuote, getDeepInsightsAction } from "@/app/actions/stock";
import { generateStockReportAI, generateDeepInsightAI, checkAndUseQuota } from "@/app/actions/analysis";
import { checkSession } from "@/app/actions/auth";
import LoginModal from "@/components/LoginModal";
import Header from "@/components/Header";

export default function ReportPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const router = useRouter();

    const [status, setStatus] = useState<"thinking" | "streaming" | "done" | "unlocking">("thinking");
    const [thinkingText, setThinkingText] = useState("正在接入交易所...");
    const [reportContent, setReportContent] = useState("");
    const [isUnlocked, setIsUnlocked] = useState(false); // New state

    // Real Data State
    const [stockName, setStockName] = useState("Initializing..."); // Changed default to debug
    const [priceInfo, setPriceInfo] = useState<{ price: string, change: string } | null>(null);

    // Auth & Quota State
    const [showLogin, setShowLogin] = useState(false);
    const [isVip, setIsVip] = useState(false);

    // Progress State
    const [progress, setProgress] = useState(0);

    // Helper to stream text
    const streamText = (fullText: string) => {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex >= fullText.length - 1) {
                clearInterval(interval);
                setStatus("done");
                setReportContent(fullText);
                return;
            }
            setReportContent((prev) => prev + fullText[currentIndex]);
            currentIndex++;
        }, 10);
        return () => clearInterval(interval);
    };

    // Callback when login successful
    const handleLoginSuccess = () => {
        setShowLogin(false);
        // Restart the process
        initPage();
    };

    // Unlock Handler
    const handleUnlock = async () => {
        if (status !== "done") return;
        setStatus("unlocking");

        // 1. Simulate Payment (Mock)
        await new Promise(resolve => setTimeout(resolve, 800)); // Slightly faster simulation

        // 2. Fetch Deep Data
        const decodedCode = decodeURIComponent(code);
        const deepData = await getDeepInsightsAction(decodedCode);

        // 3. Generate Deep Insight AI Analysis
        if (deepData) {
            // Stream placeholder first
            setReportContent(prev => prev + "\n\n---\n*正在生成深度机构解读...*\n");

            const aiInsight = await generateDeepInsightAI(
                {
                    name: stockName,
                    code: decodedCode,
                    price: priceInfo?.price || "--",
                    change: priceInfo?.change || "--"
                },
                deepData
            );

            setIsUnlocked(true);
            setStatus("done");

            // Replace placeholder with real content
            setReportContent(prev => prev.replace("\n\n---\n*正在生成深度机构解读...*\n", "") + aiInsight);
        } else {
            setIsUnlocked(true);
            setStatus("done");
            setReportContent(prev => prev + "\n\n**⚠️ 抱歉，暂未获取到该标的的深度财务数据。**");
        }
    };

    const initPage = async () => {
        console.log("initPage started for:", code);
        // 0. Auth & Quota Check
        try {
            const user = await checkSession();
            if (!user) {
                setShowLogin(true);
                return;
            }

            if (user.isVip) {
                setIsVip(true);
                setIsUnlocked(true);
            }

            // Always allow for now, just register usage
            const decodedCodeValue = decodeURIComponent(code);
            await checkAndUseQuota(decodedCodeValue);
        } catch (e) {
            console.error("Auth/Quota error:", e);
            setShowLogin(true);
            return;
        }

        const decodedCode = decodeURIComponent(code);
        setStockName(decodedCode); // Set initial stock name from code

        // 1. Fetch Real-time Data
        let quote = null;
        try {
            console.log("Fetching quote for:", decodedCode);
            quote = await fetchRealTimeQuote(decodedCode);
            console.log("Quote received:", quote);
            if (quote) {
                setStockName(quote.name); // Update with actual name if available
                setPriceInfo({ price: quote.price, change: quote.change });
            }
        } catch (e) {
            console.error("Quote fetch failed:", e);
        }

        // 2. Start Thinking & Progress Simulation
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                // Slower as it gets higher to simulate "thinking"
                let increment = Math.random() * 5;
                if (prev > 50) increment = Math.random() * 2;
                if (prev > 80) increment = Math.random() * 0.5;
                if (prev >= 95) return 95; // Cap at 95% until done
                return Math.min(prev + increment, 95);
            });
        }, 200);

        setThinkingText(`正在接入交易所实时数据...`);

        // Dynamic text updates
        setTimeout(() => setThinkingText(`读取 ${quote?.name || decodedCode} 财报与公告...`), 1500);
        setTimeout(() => setThinkingText("扫描全网舆情与机构持仓..."), 3500);
        setTimeout(() => setThinkingText("Gemini 深度推理模型运算中..."), 6000);

        // 3. Trigger Real AI Analysis
        try {
            const aiReport = await generateStockReportAI({
                name: quote ? quote.name : decodedCode,
                code: decodedCode,
                price: quote ? quote.price : "--",
                change: quote ? quote.change : "--",
            });

            clearInterval(progressInterval);
            setProgress(100); // Complete

            setTimeout(() => {
                setStatus("streaming");
                streamText(aiReport);
            }, 500);

        } catch (error) {
            console.error(error);
            clearInterval(progressInterval);
            setTimeout(() => {
                setStatus("streaming");
                streamText("## AI 服务连接失败\n请检查 API Key 配置。");
            }, 500);
        }
    };

    // Trigger on mount
    useEffect(() => {
        initPage();
    }, []);

    // ... existing render ...

    return (
        <div className={styles.container}>
            {/* ... fixed button & header ... */}
            <div className="fixed top-6 left-6 z-50">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-95"
                >
                    ←
                </button>
            </div>
            <Header />

            {/* Login Modal */}
            {showLogin && <LoginModal onSuccess={handleLoginSuccess} />}

            <div className={styles.reportContainer}>
                {/* ... header block ... */}

                <div className={styles.header}>
                    <div className={styles.stockTitle}>
                        {stockName}
                        <span className={styles.stockCode}>{decodeURIComponent(code)}</span>
                    </div>
                    {priceInfo ? (
                        <div className={styles.priceBlock}>
                            <div className={styles.price}>{priceInfo.price}</div>
                            <div className={styles.change} style={{ color: priceInfo.change.startsWith('-') ? 'var(--accent-green)' : 'var(--accent-red)' }}>{priceInfo.change}</div>
                        </div>
                    ) : (<div className={styles.priceBlock}><div className={styles.price}>--.--</div></div>)}
                </div>

                {/* Loading / Thinking State */}
                {status === "thinking" && (
                    <div className={styles.loadingContainer}>
                        <div className={styles.progressWrapper}>
                            <div className={styles.progressContainer}>
                                <div
                                    className={styles.progressBar}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className={styles.progressText}>{Math.round(progress)}%</div>
                        </div>
                        <div className={styles.loadingText}>{thinkingText}</div>
                    </div>
                )}

                {/* Content */}
                <div className={styles.markdownBody}>
                    <ReactMarkdown>{reportContent}</ReactMarkdown>
                </div>

                {/* Paywall Section */}
                {(status === "done" || status === "unlocking") && !isUnlocked && (
                    <div className={styles.paywallContainer}>
                        <div className={styles.paywallTitle}>解锁更多深度洞察</div>
                        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
                            AI 已为您生成更详细的机构资金流向与风险预警
                        </p>
                        <div className={styles.paywallActions}>
                            <button className={styles.btnSecondary} onClick={handleUnlock}>
                                {status === "unlocking" ? "解锁中..." : "单次解读 ¥20"}
                            </button>
                            <button className={styles.btnPrimary} onClick={handleUnlock}>开通月卡 ¥199</button>
                        </div>
                    </div>
                )}

                {/* Loading State for Unlock */}
                {status === "unlocking" && (
                    <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
