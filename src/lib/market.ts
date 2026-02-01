// lib/market.ts

export interface StockQuote {
    name: string;
    code: string;
    price: string;
    change: string; // e.g. "+1.2%"
    changeValue: string;
    market: "HK" | "US" | "SH" | "SZ" | "BJ";
}

export interface SearchResult {
    name: string;
    code: string; // e.g. "00700.HK"
    market: string;
}

// Hybrid Search: Tencent Smartbox (Better for HK/US/Ranking) + Sina Suggest (Essential for BJ)
export async function searchStocks(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const seenCodes = new Set<string>();

    // Helper to add results with deduplication
    const addResults = (items: SearchResult[]) => {
        for (const item of items) {
            if (!seenCodes.has(item.code)) {
                seenCodes.add(item.code);
                results.push(item);
            }
        }
    };

    // 1. Define Fetchers
    const fetchTencent = async (): Promise<SearchResult[]> => {
        try {
            const url = `https://smartbox.gtimg.cn/s3/?t=all&q=${encodeURIComponent(query)}`;
            const res = await fetch(url, {
                cache: 'no-store',
                headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
            });
            const text = await res.text();

            if (!res.ok) {
                console.error(`[Search] Tencent API failed with status ${res.status}: ${text.substring(0, 100)}`);
                return [];
            }

            const match = text.match(/"([^"]*)"/);
            if (!match || !match[1] || match[1] === "N") return [];

            return match[1].split("^").map(line => {
                const parts = line.split("~");
                if (parts.length < 3) return null;
                let [market, code, name] = [parts[0], parts[1], parts[2]];

                // Fix Unicode
                try { name = JSON.parse(`"${name}"`); } catch (e) { }

                let normalizedMarket = "";
                if (market === "hk") normalizedMarket = "HK";
                else if (market === "us") normalizedMarket = "US";
                else if (market === "sh") normalizedMarket = "SH";
                else if (market === "sz") normalizedMarket = "SZ";
                else if (market === "bj") normalizedMarket = "BJ";

                if (!normalizedMarket) return null;
                return { name, code: `${code}.${normalizedMarket}`, market: normalizedMarket };
            }).filter(item => item !== null) as SearchResult[];
        } catch (e) {
            console.error("Tencent Search Fatal Error:", e);
            return [];
        }
    };

    const fetchSina = async (): Promise<SearchResult[]> => {
        try {
            const res = await fetch(`https://suggest3.sinajs.cn/suggest/type=&key=${encodeURIComponent(query)}`, {
                cache: 'no-store',
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            const buffer = await res.arrayBuffer();
            const decoder = new TextDecoder("gbk");
            const text = decoder.decode(buffer);
            const match = text.match(/"([^"]*)"/);
            if (!match || !match[1]) return [];

            return match[1].split(";").map(line => {
                const parts = line.split(",");
                if (parts.length < 5) return null;
                const type = parts[1];
                const code = parts[2];
                const marketCode = parts[3];
                const name = parts[4];

                // Prioritize BJ here, others might be duplicates of Tencent
                // 11=A, 31=HK, 41=US
                if (!["11", "31", "41"].includes(type) && !marketCode.startsWith("bj")) return null;

                let normalizedMarket = "";
                let cleanCode = code;

                if (marketCode.startsWith("sh")) normalizedMarket = "SH";
                else if (marketCode.startsWith("sz")) normalizedMarket = "SZ";
                else if (marketCode.startsWith("bj")) normalizedMarket = "BJ";
                else if (marketCode.startsWith("hk")) normalizedMarket = "HK";
                else if (marketCode.startsWith("us")) normalizedMarket = "US";
                if (!normalizedMarket && type === "41") normalizedMarket = "US";

                if (!normalizedMarket) return null;
                return { name, code: `${cleanCode}.${normalizedMarket}`, market: normalizedMarket };
            }).filter(item => item !== null) as SearchResult[];
        } catch (e) {
            console.error("Sina Search Error:", e);
            return [];
        }
    };

    // 2. Execute in Parallel
    const [tencentResults, sinaResults] = await Promise.all([fetchTencent(), fetchSina()]);

    // 3. Merge: Prioritize Tencent results (better quality/rank usually), append Sina (covers BJ)
    addResults(tencentResults);
    addResults(sinaResults);

    // Limit total
    return results.slice(0, 10);
}

// Tencent Qt API for Quotes
// URL: http://qt.gtimg.cn/q={market}{code}
// e.g. q=hk00700, q=sh600519
export async function getStockQuote(fullCode: string): Promise<StockQuote | null> {
    // 1. Auto-fix incomplete codes (e.g. "01810" -> "01810.HK")
    if (!fullCode.includes(".")) {
        if (fullCode.length === 5) fullCode += ".HK"; // 00700 -> 00700.HK
        else if (fullCode.length === 6 && (fullCode.startsWith("6") || fullCode.startsWith("9") || fullCode.startsWith("5") || fullCode.startsWith("1"))) fullCode += ".SH"; // 600xxx -> SH
        else if (fullCode.length === 6 && (fullCode.startsWith("0") || fullCode.startsWith("3") || fullCode.startsWith("1"))) fullCode += ".SZ"; // 000xxx -> SZ
        else if (fullCode.length <= 4) fullCode += ".US"; // AAPL -> AAPL.US (Fallback)
    }

    // fullCode ex: "00700.HK", "600519.SH"
    const [code, market] = fullCode.split(".");
    if (!code || !market) return null;

    const marketPrefix = market.toLowerCase();
    // Clean code for US: strip suffixes like .n, .oq, etc.
    let cleanCode = code.toUpperCase();
    if (marketPrefix === "us") {
        cleanCode = cleanCode.split(".")[0];
    }
    const queryCode = `${marketPrefix}${cleanCode}`;

    try {
        const url = `https://qt.gtimg.cn/q=${queryCode}`;
        const res = await fetch(url, {
            cache: 'no-store',
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        // Response: v_hk00700="51~腾讯控股~385.200~382.600~386.000~..."
        // Encoding usually GBK, might need handling if deployed on non-GBK aware env?
        // Actually modern fetch might decode utf-8 by default but this API returns GBK.
        // For simple numbers it's fine. For Name, we might get garbled text if not careful.
        // Let's assume for MVP we fetch numbers primarily. The name we already have from search.

        const buffer = await res.arrayBuffer();
        const decoder = new TextDecoder("gbk");
        const text = decoder.decode(buffer);

        const match = text.match(/="([^"]*)"/);
        if (!match || !match[1]) return null;

        const data = match[1].split("~");
        if (data.length < 30) return null;

        // QT API Format varies by market slightly but generally:
        // 1: Name
        // 2: Code
        // 3: Current Price
        // 31: Change (Value)
        // 32: Change (%)

        const name = data[1];
        const currentPrice = data[3];
        const changeValue = data[31];
        const changePercent = data[32];

        return {
            name,
            code: fullCode,
            price: currentPrice,
            change: `${parseFloat(changePercent) >= 0 ? '+' : ''}${changePercent}%`,
            changeValue,
            market: market as any
        };

    } catch (error) {
        console.error("Quote Fetch Error:", error);
        return null;
    }
}

// Helper to map our code format to EastMoney SecID
// 00700.HK -> 116.00700
// 600519.SH -> 1.600519
// 000001.SZ -> 0.000001
function mapToSecId(formattedCode: string): string | null {
    const [code, market] = formattedCode.split(".");
    if (!code || !market) return null;

    // Ensure code is uppercase (important for US tickers if secid heavily relies on string match)
    const upperCode = code.toUpperCase();

    if (market === "HK") return `116.${upperCode}`;
    if (market === "SH") return `1.${upperCode}`;
    if (market === "SZ") return `0.${upperCode}`;
    if (market === "US") return `105.${upperCode}`; // Rough guess for US, might need search
    // BJ? 
    if (market === "BJ") return `0.${code}`; // Often same as SZ/SH internal logic in some APIs, strictly 0 or 1.

    return null;
}

export interface FundamentalData {
    pe_ttm: string; // 市盈率
    pb: string;      // 市净率
    total_market_cap: string; // 总市值
    gross_profit_margin: string; // 毛利率 (mock or fetch)
    main_force_inflow: string; // 主力净流入
}

export async function fetchStockFundamentals(fullCode: string): Promise<FundamentalData | null> {
    const secId = mapToSecId(fullCode);
    if (!secId) return null;

    // EastMoney Fields: 
    // f162: PE (Static/TTM?) (Verified for A-share/BJ)
    // f164: PE (Dynamic/TTM?) (Verified for HK)
    // f167: PB (Verified)
    // f116: Total Market Cap (Verified)
    // f135: Main Force Net Inflow (Today) (Verified)

    // URL for snapshot Data
    const url = `https://push2.eastmoney.com/api/qt/stock/get?invt=2&fltt=2&fields=f162,f164,f167,f116,f135&secid=${secId}`;

    try {
        const res = await fetch(url, { headers: { "Referer": "https://eastmoney.com" }, next: { revalidate: 60 } });
        const json = await res.json();
        const data = json.data;

        if (!data) return null;

        // Convert large numbers
        const cleanNumber = (num: number | string) => {
            if (num === null || num === undefined) return "--";
            if (typeof num === "string" && (num === "-" || num.trim() === "")) return "--";
            const val = Number(num);
            if (isNaN(val)) return "--";

            if (val > 100000000) return (val / 100000000).toFixed(2) + "亿";
            if (val > 10000) return (val / 10000).toFixed(2) + "万";
            return val.toString();
        };

        const pe = (!data.f162 || data.f162 === "-") ? (data.f164 || "亏损") : data.f162;
        const pb = data.f167;
        const mcap = cleanNumber(data.f116);
        const inflow = cleanNumber(data.f135);

        return {
            pe_ttm: pe === "-" ? "亏损" : pe,
            pb: pb,
            total_market_cap: mcap,
            gross_profit_margin: "--", // Not available in this endpoint yet
            main_force_inflow: inflow
        };

    } catch (e) {
        console.error("Fundamentall Fetch Error:", e);
        return null;
    }
}
