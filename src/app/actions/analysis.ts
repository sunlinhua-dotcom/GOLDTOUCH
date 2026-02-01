"use server";

import { generateContent } from "@/lib/gemini";
import { fetchStockNews } from "@/lib/news"; // Import RAG service
import { fetchFundamentals, type FundamentalsData } from "./fundamentals";

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
                createdAt: true,
                // @ts-ignore
                aiScore: true,
                // @ts-ignore
                type: true,
                // @ts-ignore
                isUnlocked: true,
                // @ts-ignore
                deepInsight: true
            }
        });
        return history;
    } catch (e) {
        console.error("Get History Error:", e);
        return [];
    }
}

export async function getLatestProReport(stockCode: string) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("mojin_session")?.value;
    if (!userId) return null;

    try {
        const report = await prisma.analysisReport.findFirst({
            where: {
                userId,
                stockCode: stockCode,
                // We want the latest one that has deep insight
                OR: [
                    // @ts-ignore
                    { type: "PRO" },
                    // @ts-ignore
                    { deepInsight: { not: null } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        return report;
    } catch (e) {
        console.error("Get Pro Report Error:", e);
        return null;
    }
}

export async function generateStockReportAI(stock: StockInfo, fundamentals?: FundamentalsData | null): Promise<string> {
    const cookieStore = await cookies();
    const userId = cookieStore.get("mojin_session")?.value;

    // 获取财务数据（如果未提供）
    if (!fundamentals) {
        fundamentals = await fetchFundamentals(stock.code);
    }

    // 0. CHECK PERSISTENCE (MongoDB)
    /* 
       We re-enable this to support "History Persistence". 
       If a user views a past report, we load the EXACT same content from DB.
    */
    if (userId) {
        try {
            // Check for existing report (valid for 24h or if it's in history)
            // Actually, for "History" function, we might want to return it regardless of time?
            // But for "Live Analysis", we want fresh.
            // Let's stick to a 24h cache for now to prevent spamming AI.
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const cachedReport = await prisma.analysisReport.findFirst({
                where: {
                    userId,
                    stockCode: stock.code,
                    createdAt: { gt: twentyFourHoursAgo }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (cachedReport) {
                console.log(`[DB HIT] Returning persisted report for ${stock.code}`);
                // If the report was Pro, we should ideally ensure the JSON includes the deep_insight
                // The 'content' field stores the full JSON string, so it should be fine.
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
    const longTermDate = new Date(today);
    longTermDate.setFullYear(today.getFullYear() + 1);

    // 1. 系统指令 (JSON Mode - 强制结构化输出)
    const systemInstruction = `
[SCHEMA VERSION: 2.1]
[STRICT MODE: ENABLED]

CRITICAL: YOU MUST ONLY RETURN A VALID JSON OBJECT.
DO NOT WRAP IN "report" OR "analysis_summary".
DO NOT ADD ANY TEXT OUTSIDE THE JSON.

JSON STRUCTURE:
{
  "ai_score": 85, // (0-100) Multi-dimensional AI Score
  "signal": "核心观点 (看多/看空/观望)",
  "short_term": {
    "timeframe": "短期 (4-12周)",
    "rationale": "短期核心逻辑 (基于MA20/MA60和短期资金流向)",
    "key_levels": {
       "support": "短期支撑位 (基于MA20/MA60，数字)",
       "resistance": "短期压力位 (基于近期高点，数字)",
       "stop_loss": "短期止损位 (基于支撑位下方3-5%，数字)"
    }
  },
  "long_term": {
    "timeframe": "长期 (6-12个月)",
    "rationale": "长期核心逻辑 (必须综合分析: 1.MA120/MA250趋势 2.基本面ROE/营收增长 3.行业地位 4.估值水平PE/PB)",
    "key_levels": {
       "support": "长期支撑位 (基于MA120/MA250或历史重要底部，必须是具体数字)",
       "resistance": "长期压力位 (基于历史高点或重要压力区，必须是具体数字)",
       "stop_loss": "长期止损位 (基于长期支撑下方5-8%，必须是具体数字)"
    }
  },
  "data_evidence": {
    "capital_flow": "资金流向分析 (如无数据，基于成交量分析)",
    "valuation": "估值分析",
    "technical_context": "技术面概览"
  },
  "technical": "技术面深度解构 (Markdown)",
  "sentiment": "市场情绪与资金分析 (Markdown)",
  "plan": "实战交易计划 (Markdown)",
  "risk": "风险提示 (Markdown)",
  "deep_insight": "深度研报内容 (可选)"
}

CRITICAL INSTRUCTIONS:
1. **MANDATORY FIELDS**: "sentiment", "plan", "risk" MUST NOT BE EMPTY.
2. **MISSING DATA HANDLING**:
   - If 'Capital Flow' is missing, analyze based on 'Volume' and 'Price Action'.
   - NEVER return "No Data". Always provide a professional estimate or conservative analysis based on available Technical Indicators (MA, RSI, MACD).
3. **STRICT JSON**: Output must be valid JSON without Markdown formatting (no markdown code blocks).
4. **LANGUAGE STYLE (CRITICAL)**:
   - **Audience**: Intelligent Individual Investor (not professional quant).
   - **Plain Language**: Avoid obscure jargon. Use "Counter-trend buying" instead of "Left-side trading".
   - **Contextualize**: When mentioning indicators (RSI, MA), explain *implication* immediately.
     - Bad: "RSI is 85."
     - Good: "RSI is at 85 (Overbought/High Risk)."
5. **SCORING ALGORITHM (0-100)**:
   You must calculate a holistic score based on the following weights:
   - **Technicals (40%)**: Trend (MA alignment), Momentum (RSI/MACD). Uptrend + Divergence = High Score.
   - **Fundamentals (40%)**: Valuation (PE/PB vs Industry), Growth (Revenue/Profit), ROE. Low Valuation + High Quality = High Score.
   - **Capital Flow (20%)**: Net Inflow/Outflow. Smart money inflow = Bonus.
   
   * > 90: Strong Buy (Rare)
   * 80-90: Buy
   * 60-79: Hold
   * < 60: Sell
   * < 60: Sell

6. **DEEP INSIGHT CONTENT (PREMIUM)**:
   The "deep_insight" field is NOT optional. It must provide institutional-grade analysis:
   - **Chip Distribution (主力筹码)**: Estimate the cost basis of institutional holders vs retail. (e.g., "Profit chips > 60%, Main force cost ~$23.5").
   - **Smart Money (北向/主力资金)**: Analyze the flow of "Smart Money" (Northbound/Institutions).
   - **Institutional View (机构观点)**: Summarize the consensus or divergence among major institutions.
   - **Format**: Concise Markdown, bullet points.
    `;

    // 2. Prompt 优化
    const marketName = stock.code.includes('HK') ? '港股' : stock.code.includes('US') ? '美股' : 'A股';

    // 构建财务数据文本
    let fundamentalsText = "暂无财务数据";
    if (fundamentals) {
        const parts = [];
        if (fundamentals.eps != null) parts.push(`每股收益 = ${fundamentals.eps} 元`);
        if (fundamentals.roe != null) parts.push(`净资产收益率 = ${fundamentals.roe.toFixed(2)}% `);
        if (fundamentals.revenue != null) parts.push(`营业收入 = ${(fundamentals.revenue / 100000000).toFixed(2)} 亿元`);
        if (fundamentals.net_profit != null) parts.push(`净利润 = ${(fundamentals.net_profit / 100000000).toFixed(2)} 亿元`);
        if (fundamentals.gross_margin != null) parts.push(`毛利率 = ${fundamentals.gross_margin.toFixed(2)}% `);
        if (parts.length > 0) fundamentalsText = parts.join(', ');
    }

    // Build Technical Data Text (The "True Data")
    let technicalsText = "暂无技术指标数据";
    if (fundamentals && fundamentals.technicals) {
        const t = fundamentals.technicals;
        const parts = [];
        if (t.ma5) parts.push(`MA5 = ${t.ma5.toFixed(2)} `);
        if (t.ma20) parts.push(`MA20 = ${t.ma20.toFixed(2)} `);
        if (t.ma60) parts.push(`MA60 = ${t.ma60.toFixed(2)} `);
        if (t.ma120) parts.push(`MA120 = ${t.ma120.toFixed(2)} `);
        if (t.ma250) parts.push(`MA250 = ${t.ma250.toFixed(2)} `);
        if (t.rsi_6) parts.push(`RSI(6) = ${t.rsi_6.toFixed(2)} `);
        if (t.macd) parts.push(`MACD = ${t.macd.toFixed(3)} `);
        if (parts.length > 0) technicalsText = parts.join(', ');
    }

    // Capital Flow
    let capFlowText = "暂无资金流向数据";
    if (fundamentals && fundamentals.capital_flow && fundamentals.capital_flow.net_inflow_str) {
        const ratio = fundamentals.capital_flow.net_inflow_ratio;
        capFlowText = `主力净流入: ${fundamentals.capital_flow.net_inflow_str}, 占比: ${ratio != null ? ratio.toFixed(2) : '--'}% `;
    }

    const prompt = `
${systemInstruction}

[TIMESTAMP: ${Date.now()}]
[实时核心数据包]
标的：${stock.name} (${stock.code}) / ${marketName}
现价：${stock.price} (${stock.change})
资金流：${capFlowText}
技术指标：${technicalsText}
财务：${fundamentalsText}
最新资讯：${newsContext}

    [分析任务]
    你必须同时提供【短期】和【长期】两套独立的交易策略：

    ## 短期策略 (short_term) - 波段交易视角
    - 时间范围: 4-12周
    - 核心依据: MA20/MA60 均线系统 + 短期资金流向 + RSI/MACD动量
    - 适合: 波段交易者，追求短期收益

    ## 长期策略 (long_term) - 价值投资视角 [重要：必须进行二次深度分析]
    - 时间范围: 6-12个月
    - 核心依据:
      1. **技术面**: MA120/MA250 宏观趋势判断
      2. **基本面**: ROE水平(${fundamentals?.roe ? fundamentals.roe.toFixed(2) + '%' : '需评估'}), 营收增长, 净利润趋势
      3. **估值面**: 当前PE/PB vs 历史分位数 vs 行业平均
      4. **竞争格局**: 行业地位、护城河、市场份额
    - 适合: 价值投资者，追求长期复利
    - **注意**: 长期策略的 rationale 必须包含基本面分析，不能只看技术指标

    结合主力资金流向（${capFlowText}）判断筹码热度。

    [关键要求]
    1. short_term.key_levels 必须基于 MA20/MA60 和近期高低点计算具体数值
    2. long_term.key_levels 必须基于 MA120/MA250 和历史重要支撑/压力区计算具体数值
    3. 严禁胡乱猜测价格，必须参考上方提供的【技术指标】
    4. 如果股价低于 MA250，必须在 long_term.rationale 中说明处于长期走弱趋势
    5. 短期和长期的支撑/压力/止损必须是不同的数值，反映不同时间维度的分析
    6. long_term.rationale 必须包含基本面分析（ROE、营收、利润），不能只有技术面
    7. 所有价格必须是具体数字，禁止使用"--"或"暂无"
    `;

    console.log(`[AI REQUEST] Generating report for ${stock.name}...`);
    try {
        const text = await generateContent(prompt, systemInstruction);
        console.log(`[AI RESPONSE]Length: ${text.length} chars.Snippet: ${text.substring(0, 100)} `);


        // Save to DB if user is logged in
        if (userId) {
            try {
                // Parse JSON to extract fields for index/schema
                let parsed: any = {};
                try {
                    const clean = text.replace(/```json\s*|\s*```/g, "").trim();
                    parsed = JSON.parse(clean);
                } catch (e) {
                    console.warn("Failed to parse AI JSON for DB saving", e);
                }

                const aiScore = parsed.ai_score || parsed.score || null;
                const deepInsight = parsed.deep_insight || parsed.deepInsight || null;
                const summary = parsed.signal || "已生成";

                // Background save? Await is safer for now
                await prisma.analysisReport.create({
                    data: {
                        userId,
                        stockCode: stock.code,
                        stockName: stock.name,
                        content: text,
                        // @ts-ignore
                        aiScore: typeof aiScore === 'number' ? aiScore : null,
                        // @ts-ignore
                        deepInsight: typeof deepInsight === 'string' ? deepInsight : null,
                        summary: String(summary),
                        // @ts-ignore
                        type: deepInsight ? "PRO" : "BASIC"
                    }
                });
            } catch (e) {
                console.error("Failed to save report:", e);
            }
        }

        return text;
    } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        // Throw error so page.tsx can catch it and show red error screen
        throw new Error(error.message || "AI Analysis Failed");
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
        return `** 错误 **: 未配置 Gemini API Key。`;
    }

    // 1. 系统指令 (极致专业化，严禁英文)
    const systemInstruction = `
# 身份设定
    你是一位顶级投资机构的首席策略分析师。
    你的职责是基于给定的财务数据和资金流向，进行深度的价值发现和风险预警。

# 核心规则
    1. ** 语言纯洁性 **：全过程使用简体中文。绝对禁止输出英文字符（A - Z）。
    2. ** 术语规范化 **：所有金融术语必须使用中文标准译名（如将PE转换为市盈率，PB转换为市净率）。
    3. ** 风格专业化 **：使用机构研报的专业措辞，言简意赅，直击本质。
    `;

    // 2. 数据处理，去掉英文后缀
    const stockCodeOnly = stock.code.split('.')[0];
    const prompt = `
    针对以下标的进行分析：
* 标的: ${stock.name} (${stockCodeOnly})
* 估值: 动态盈利率 = ${fundamentals.pe_ttm}, 资产倍率 = ${fundamentals.pb}, 总身价 = ${fundamentals.total_market_cap}
* 资金情况: ${fundamentals.main_force_inflow}

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
