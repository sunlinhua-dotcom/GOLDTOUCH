"use server";

import { generateContent } from "@/lib/gemini";
import { fetchStockNews } from "@/lib/news"; // Import RAG service

interface StockInfo {
    name: string;
    code: string;
    price: string;
    change: string;
}

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function checkAndUseQuota(stockCode?: string) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("mojin_session")?.value;

    if (!userId) return { allowed: false, error: "请先登录" };

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isVip: true, freeQuotaUsed: true }
    });

    if (!user) return { allowed: false, error: "用户不存在" };

    if (user.isVip) return { allowed: true, isVip: true };

    // Check if this report was already generated recently (12h)
    if (stockCode) {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const existing = await prisma.analysisReport.findFirst({
            where: {
                userId,
                stockCode,
                createdAt: { gt: twelveHoursAgo }
            }
        });
        if (existing) return { allowed: true, isVip: false };
    }

    // For now, always allow for testing
    // Still increment to see usage in DB, but don't block
    if (user.freeQuotaUsed < 999) {
        await prisma.user.update({
            where: { id: userId },
            data: { freeQuotaUsed: { increment: 1 } }
        });
    }

    return { allowed: true, isVip: user.isVip };
}

export async function getUserHistory() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("mojin_session")?.value;

    if (!userId) return [];

    try {
        const history = await prisma.analysisReport.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                stockCode: true,
                stockName: true,
                createdAt: true
            }
        });
        return history;
    } catch (e) {
        console.error("Get History Error:", e);
        return [];
    }
}

export async function generateStockReportAI(stock: StockInfo): Promise<string> {
    const cookieStore = await cookies();
    const userId = cookieStore.get("mojin_session")?.value;

    // 0. CACHING: Check DB for recent report (within 12 hours) to save compute
    if (userId) {
        try {
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
            const cachedReport = await prisma.analysisReport.findFirst({
                where: {
                    userId,
                    stockCode: stock.code,
                    createdAt: { gt: twelveHoursAgo }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (cachedReport) {
                console.log(`[CACHE HIT] Returning existing report for ${stock.code}`);
                return cachedReport.content;
            }
        } catch (e) {
            console.error("Cache check failed:", e);
        }
    }

    if (!process.env.GEMINI_API_KEY) {
        return `**错误**: 未配置 Gemini API Key。`;
    }

    // 1. RAG: Fetch News in Parallel
    let market = "SH";
    if (stock.code.includes("HK")) market = "HK";
    if (stock.code.includes("US")) market = "US";
    if (stock.code.startsWith("30") || stock.code.startsWith("00")) market = "SZ";

    let newsContext = "暂无最新实时新闻";
    try {
        const newsItems = await fetchStockNews(stock.code, market);
        if (newsItems.length > 0) {
            newsContext = newsItems.map((n, i) =>
                `${i + 1}. [${n.date}] ${n.title} ${n.summary}`
            ).join("\n");
        }
    } catch (e) {
        console.warn("RAG failed, proceeding with pure LLM", e);
    }

    // Calculate precise dates
    const today = new Date();
    const shortTermDate = new Date(today);
    shortTermDate.setMonth(today.getMonth() + 3);
    const longTermDate = new Date(today);
    longTermDate.setFullYear(today.getFullYear() + 1);

    const formatDate = (d: Date) => d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, "-");

    // 1. 系统指令 (极致中文化，不给模型留任何英文锚点)
    const systemInstruction = `
你是个老北京，一辈子没出过胡同，一个外文字儿都不认识。
你只说大白话。
准则：
1。禁止出现任何外文字母（A到Z都不行）。
2。禁止任何开场白。
3。直接按下面的模板说话。

模板：
# 🚕 [股票名] 的哥犀利评

## 1。 这一脚刹车
（说地道的北京话，直说这车行不行）

## 2。 也是干货

### 🟢 短线
* 咋走：(🚀 奔月 / 📉 掉坑 / 🦀 磨洋工)
* 位置：
买：¥____
撤：¥____
赚：¥____
* 庄家意图：

### 🔵 长线
* 目标：¥____
* 逻辑：

## 3。 多空博弈
* 好的：
* 坏的：
* 邻居说：

## 4。 也是嘱咐
（最后念叨一句）
`;

    // 2. 这里的 prompt 也要把后缀去掉，防止 AI 看到 .HK 就想飚英语
    const stockCodeOnly = stock.code.split('.')[0];
    const marketName = stock.code.includes('HK') ? '港股' : stock.code.includes('US') ? '美股' : 'A股';

    const prompt = `
情报：
名字：${stock.name}
市场：${marketName}
现价：${stock.price}
涨跌：${stock.change}
消息：${newsContext}

乘客想听你白话。记住了，你一个外文字儿都不认识，全出大白话中文。
`;

    try {
        const text = await generateContent(prompt, systemInstruction);

        // Save to DB if user is logged in
        if (userId) {
            try {
                // Background save? Await is safer for now
                await prisma.analysisReport.create({
                    data: {
                        userId,
                        stockCode: stock.code,
                        stockName: stock.name,
                        content: text
                    }
                });
            } catch (e) {
                console.error("Failed to save report:", e);
            }
        }

        return text;
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        return `### 分析服务暂时繁忙
    
    API 连接失败。请检查 Key 和代理配置。
    
    *Error Details: AI Connection Failed*`;
    }
}

interface StockFundamentals {
    pe_ttm: string | number;
    pb: string | number;
    main_force_inflow: string | number;
    total_market_cap: string | number;
}

export async function generateDeepInsightAI(stock: StockInfo, fundamentals: StockFundamentals): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return `**错误**: 未配置 Gemini API Key。`;
    }

    // 1. 系统指令 (严禁任何英文符号)
    const systemInstruction = `
# 身份
你是一位专业的首席财经评论员。
你只使用规范的简体中文进行深度投研分析。

# 规则
1. **禁止外语**：绝对禁止输出英文字符。
2. **专业用词**：将盈利率、倍率、市值等所有指标汉化。
`;

    // 2. 数据处理，去掉英文后缀
    const stockCodeOnly = stock.code.split('.')[0];
    const prompt = `
针对以下标的进行分析：
*   标的: ${stock.name} (${stockCodeOnly})
*   估值: 动态盈利率=${fundamentals.pe_ttm}, 资产倍率=${fundamentals.pb}, 总身价=${fundamentals.total_market_cap}
*   资金情况: ${fundamentals.main_force_inflow}

请深度解读其投资逻辑。
`;

    try {
        const text = await generateContent(prompt, systemInstruction);
        return text;
    } catch (error) {
        console.error("Gemini Deep Insight Error:", error);
        return "深度分析暂时不可用 (API Limit)。";
    }
}
