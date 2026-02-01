"use server";

// 财务数据接口
export interface FundamentalsData {
    code: string;
    eps: number | null;  // 每股收益
    bvps: number | null;  // 每股净资产
    roe: number | null;  // 净资产收益率
    roa: number | null;  // 总资产报酬率
    revenue: number | null;  // 营业收入
    net_profit: number | null;  // 净利润
    net_profit_parent: number | null;  // 归母净利润
    gross_margin: number | null;  // 毛利率
    net_profit_margin: number | null;  // 销售净利率
    debt_ratio: number | null;  // 资产负债率
    technicals?: {
        ma5?: number | null;
        ma10?: number | null;
        ma20?: number | null;
        ma60?: number | null;
        ma120?: number | null;
        ma250?: number | null;
        rsi_6?: number | null;
        rsi_12?: number | null;
        rsi_24?: number | null;
        macd?: number | null;
        macd_signal?: number | null;
        macd_hist?: number | null;
        kdj_k?: number | null;
        kdj_d?: number | null;
        kdj_j?: number | null;
    } | null;
    capital_flow?: {
        net_inflow?: number | null;
        net_inflow_str?: string | null;
        net_inflow_ratio?: number | null;
        date?: string | null;
    } | null;
}

/**
 * 从 Python 后端获取股票财务数据
 */
export async function fetchFundamentals(code: string): Promise<FundamentalsData | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        // 移除后缀（如 .SH, .SZ, .HK, .US）
        const cleanCode = code.split('.')[0];
        console.log(`[FUNDAMENTALS] 开始获取财务数据: ${cleanCode}`);

        const response = await fetch(`http://localhost:8000/fundamentals/${cleanCode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store', // 不缓存，确保获取最新数据
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[FUNDAMENTALS] HTTP错误 ${response.status} for ${code}`);
            return null;
        }

        const data = await response.json();
        console.log(`[FUNDAMENTALS] 数据获取成功: ${cleanCode}`);
        return data as FundamentalsData;
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            console.error(`[FUNDAMENTALS] ⏱️ 超时 (15秒) for ${code}`);
        } else {
            console.error(`[FUNDAMENTALS] ❌ 获取失败 for ${code}:`, error);
        }
        return null;
    }
}
