"use client";

import { useEffect, useState, use } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./page.module.css";
// import { generateMockReport } from "@/lib/mockReport"; // Deprecated
import { fetchRealTimeQuote } from "@/app/actions/stock";
import { generateStockReportAI } from "@/app/actions/analysis";

export default function ReportPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);

    const [status, setStatus] = useState<"thinking" | "streaming" | "done">("thinking");
    const [thinkingText, setThinkingText] = useState("正在接入交易所...");
    const [reportContent, setReportContent] = useState("");

    // Real Data State
    const [stockName, setStockName] = useState("Loading...");
    const [priceInfo, setPriceInfo] = useState<{ price: string, change: string } | null>(null);

    useEffect(() => {
        const decodedCode = decodeURIComponent(code);

        const initPage = async () => {
            // 1. Fetch Price
            const quote = await fetchRealTimeQuote(decodedCode);

            if (quote) {
                setStockName(quote.name);
                setPriceInfo({ price: quote.price, change: quote.change });
                setThinkingText(`正在分析 ${quote.name} (${decodedCode})...`);
            } else {
                setStockName(decodedCode);
            }

            // 2. Start Thinking Simulation (Parallel)
            const steps = [
                // Dynamic text updates based on what we are doing
                { text: `正在读取 ${quote?.name || decodedCode} 财报数据...`, delay: 800 },
                { text: "正在扫描全网新闻与舆情...", delay: 2000 },
                { text: "Gemini 深度推理中...", delay: 3500 },
            ];

            steps.forEach(({ text, delay }) => {
                setTimeout(() => setThinkingText(text), delay);
            });

            // 3. Trigger Real AI Analysis
            try {
                const aiReport = await generateStockReportAI({
                    name: quote ? quote.name : decodedCode,
                    code: decodedCode,
                    price: quote ? quote.price : "--",
                    change: quote ? quote.change : "--",
                });

                // Ensure we show "thinking" for at least 4.5s to feel "deep"
                setTimeout(() => {
                    setStatus("streaming");
                    streamResponse(aiReport);
                }, 4500);

            } catch (error) {
                console.error(error);
                setTimeout(() => {
                    setStatus("streaming");
                    streamResponse("## AI 服务连接失败\n请检查 API Key 配置。");
                }, 4500);
            }
        };

        initPage();
    }, [code]);

    // Helper to stream text
    const streamResponse = (fullText: string) => {
        let currentIndex = 0;
        // Faster typing for long reports
        const interval = setInterval(() => {
            if (currentIndex >= fullText.length) {
                clearInterval(interval);
                setStatus("done");
                return;
            }
            setReportContent((prev) => prev + fullText[currentIndex]);
            currentIndex++;
        }, 10);

        return () => clearInterval(interval);
    };

    if (status === "thinking") {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <div className={styles.pulsingIcon}></div>
                    <div className={styles.loadingText}>{thinkingText}</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.reportContainer}>
                <div className={styles.header}>
                    <div className={styles.stockTitle}>
                        {stockName}
                        <span className={styles.stockCode}>{decodeURIComponent(code)}</span>
                    </div>
                    {priceInfo ? (
                        <div className={styles.priceBlock}>
                            <div className={styles.price}>{priceInfo.price}</div>
                            <div
                                className={styles.change}
                                style={{
                                    color: priceInfo.change.startsWith('-') ? 'var(--accent-green)' : 'var(--accent-red)'
                                }}
                            >
                                {priceInfo.change}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.priceBlock}>
                            <div className={styles.price}>--.--</div>
                        </div>
                    )}
                </div>

                <div className={styles.markdownBody}>
                    <ReactMarkdown>{reportContent}</ReactMarkdown>
                </div>

                {/* Paywall */}
                {status === "done" && (
                    <div className={styles.paywallContainer}>
                        <div className={styles.paywallTitle}>解锁更多深度洞察</div>
                        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
                            AI 已为您生成更详细的机构资金流向与风险预警
                        </p>
                        <div className={styles.paywallActions}>
                            <button className={styles.btnSecondary}>单次解读 ¥20</button>
                            <button className={styles.btnPrimary}>开通月卡 ¥199</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
