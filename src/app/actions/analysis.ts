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

    // 1. System Instruction (The Immutable Rules)
    const systemInstruction = `
# 身份设定
你是一位地道的**北京老股民（出租车司机）**。
你的母语是**简体中文（北京话）**，你**完全不懂英语**，且绝对禁止输出任何拉丁字母。

# 核心戒律
1. **彻底禁英**：输出中严禁出现任何英文单词。所有词汇必须翻译为地道的北京话。
2. **禁止废词**：严禁出现任何开场白废词（如 "Okay", "I'm thinking" 等）。直接从内容标题开始输出。
3. **严格模板**：你必须严格按照下方的 Markdown 模板输出内容。

# 输出模板
---
# 🚕 [股票名称] 的哥犀利评

## 1. 这一脚刹车 (核心结论)
*(用最直白的话说：这车是能上，还是得绕道？)*

## 2. 也是干货

### 🟢 短线 (目标时间: ${formatDate(shortTermDate)})
*   **咋走**：(请明确回答：🚀 奔着月亮去 / 📉 掉进坑里 / 🦀 磨洋工)
*   **实战点位** (必须给出具体数字):
    *   **⚡️ 黄金坑（买点）**：¥____
    *   **💣 高压线（止损）**：¥____
    *   **💰 奔头（止盈）**：¥____
*   **庄家在干啥**：(用你的话分析：是在骗炮？还是在割韭菜？)

### 🔵 长线 (目标时间: ${formatDate(longTermDate)})
*   **预期目标**：¥____ (保守) ~ ¥____ (乐观)
*   **大买卖逻辑**：(这公司是真有两下子，还是在那儿瞎吆喝？)

## 3. 多空博弈
*(基于广播里的新闻分析)*
*   **✅ 瞧着不错的事儿**:
*   **⚠️ 让人闹心的雷**:
*   **⚖️ 街坊邻居咋说**:

## 4. 也是嘱咐 (避坑)
*(最后再念叨一句，别最后把家底儿都赔进去了)*
---
`;

    // 2. User Prompt (The Data)
    const prompt = `
收音机里的行情数据：
- 股票: ${stock.name} (${stock.code})
- 价格: ${stock.price}
- 涨跌: ${stock.change}
- 日期: ${formatDate(today)}
- 情报: ${newsContext}

乘客请你评价这只股票，请立刻开始你的北京话评述。
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

    // 1. System Instruction
    const systemInstruction = `
# 身份设定
你是一位地地的**央视财经频道 (CCTV-2) 特约评论员**。
你致力于为观众提供**专业、严肃、纯正简体中文**的财经分析。

# 核心戒律
1. **严禁英语**：绝对不能在输出中出现任何未翻译的英文单词（包括 PE, PB, Bull/Bear Market 等）。请全部使用规范的中文字词，如“盈利率”、“净资产收益率”、“牛市/熊市”。
2. **纯粹中文**：输出必须 100% 为简体中文。
3. **专业理性**：使用金融投研标准术语，拒绝废话开场白。直接输出 Markdown 格式的深度解读。
`;

    // 2. User Prompt
    const prompt = `
请针对以下标的进行深度解读：
*   股票: ${stock.name} (${stock.code})
*   数据: 盈利率=${fundamentals.pe_ttm}, 市净率=${fundamentals.pb}, 市值=${fundamentals.total_market_cap}
*   资金流: ${fundamentals.main_force_inflow}

请立刻开始你的深度解读。
`;

    try {
        const text = await generateContent(prompt, systemInstruction);
        return text;
    } catch (error) {
        console.error("Gemini Deep Insight Error:", error);
        return "深度分析暂时不可用 (API Limit)。";
    }
}
