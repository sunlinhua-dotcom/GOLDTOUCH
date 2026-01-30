"use server";

import { generateContent } from "@/lib/gemini";
import { fetchStockNews } from "@/lib/news"; // Import RAG service

interface StockInfo {
    name: string;
    code: string;
    price: string;
    change: string;
}

export async function generateStockReportAI(stock: StockInfo): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return `**错误**: 未配置 Gemini API Key。`;
    }

    // 1. RAG: Fetch News in Parallel (with mild timeout/fallback)
    // We identify market roughly by code format
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

    // 2. Construct Prompt with RAG Context
    const prompt = `
[Role Definition]
你是一位拥有 20 年经验的华尔街顶级交易员，同时也是一位擅长用大白话解释复杂的金融逻辑的博主。你的受众是普通的散户投资者。你的风格是：**犀利、直接、敢于预测**，但会提示风险。

[Input Data]
*   **股票**: ${stock.name} (${stock.code})
*   **当前价**: ${stock.price}
*   **今日涨幅**: ${stock.change}
*   **时间**: ${new Date().toLocaleDateString()}

[Deep Research Context (Real-time News)]
以下是刚刚从交易所和新闻网站抓取的最新资讯（请务必在分析中结合这些事实，不要瞎编）：
${newsContext}

[Task Instruction]
请分四个维度进行分析，并严格遵守输出格式，不要使用过多的Markdown一级标题，多用二级或三级标题：

**第一部分：一句话结论 (The Verdict)**
*   用最直白的话告诉用户现在的状态。是“赶紧上车”、“快跑”，还是“再等等”？
*   例如：“现在就是倒车接人，别犹豫！”或“刀口舔血，新手勿碰！”

**第二部分：未来 3 个月价格预测 (Price Target)**
*   **基于技术面支撑/压力位与市场情绪，若新闻中有重大利好/利空，请修正你的预测值。以此格式输出表格**：
    | 策略 | 价格点位 | 操作建议 |
    | :--- | :--- | :--- |
    | **抄底线** | {Price_Level} | 到这个价位大胆买入 (强支撑) |
    | **止盈线** | {Price_Level} | 涨到这里分批卖出 (强压力) |
    | **止损线** | {Price_Level} | 跌破这里必须跑 |
*   *注意：必须给出具体数字，不能模糊。可以基于当前价格上下波动 10%-20% 结合波动率估算。*

**第三部分：大白话逻辑 (The Why)**
*   结合 [Deep Research Context] 中的新闻进行分析。
*   解释为什么会涨或跌？
*   **主力动向**：机构是在偷偷买，还是在跑路？
*   **消息面**：最近有什么新闻（必须引用上面的抓取结果，哪怕是驳斥它）。

**第四部分：散户避坑指南 (Risk)**
*   告诉用户最大的坑在哪里。
*   语言要犀利，直击痛点。

(请直接输出 Markdown 内容，不要包含 "Here is the report" 等无关废话)
`;

    try {
        const text = await generateContent(prompt);
        return text;
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        return `### 分析服务暂时繁忙
    
    API 连接失败。请检查 Key 和代理配置。
    
    *Error Details: AI Connection Failed*`;
    }
}
