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

// Tencent Smartbox API for Search
// URL: http://smartbox.gtimg.cn/s3/?t=all&q={query}
export async function searchStocks(query: string): Promise<SearchResult[]> {
    try {
        const res = await fetch(`http://smartbox.gtimg.cn/s3/?t=all&q=${encodeURIComponent(query)}`, {
            cache: 'no-store'
        });
        // Response is like: v_hint="1~00700~腾讯控股~txkg~HK~GP-HK~1";
        const text = await res.text();

        // Extract content inside quotes
        const match = text.match(/"([^"]*)"/);
        if (!match || !match[1] || match[1] === "N") return [];

        const lines = match[1].split("^");
        const results: SearchResult[] = [];

        for (const line of lines) {
            const parts = line.split("~");
            // parts[0] is market type (us, hk, sh, sz etc)
            // parts[1] is code
            // parts[2] is name
            // parts[3] is pinyin
            if (parts.length < 3) continue;

            let [market, code, name] = [parts[0], parts[1], parts[2]];

            // Normalize Market & Code
            let normalizedMarket = "";
            if (market === "hk") normalizedMarket = "HK";
            else if (market === "us") normalizedMarket = "US";
            else if (market === "sh") normalizedMarket = "SH";
            else if (market === "sz") normalizedMarket = "SZ";
            else if (market === "bj") normalizedMarket = "BJ"; // Tencent might group BJ in sh/sz sometimes, need verification

            if (!normalizedMarket) continue;

            // Format Code: 00700 -> 00700.HK
            const formattedCode = `${code}.${normalizedMarket}`;

            results.push({
                name,
                code: formattedCode,
                market: normalizedMarket
            });

            if (results.length >= 5) break;
        }

        return results;
    } catch (error) {
        console.error("Smartbox Search Error:", error);
        return [];
    }
}

// Tencent Qt API for Quotes
// URL: http://qt.gtimg.cn/q={market}{code}
// e.g. q=hk00700, q=sh600519
export async function getStockQuote(fullCode: string): Promise<StockQuote | null> {
    // fullCode ex: "00700.HK", "600519.SH"
    const [code, market] = fullCode.split(".");
    if (!code || !market) return null;

    const marketPrefix = market.toLowerCase();
    const queryCode = `${marketPrefix}${code}`;

    try {
        const res = await fetch(`http://qt.gtimg.cn/q=${queryCode}`, {
            cache: 'no-store',
            headers: {
                // Sometimes standard headers help avoid blocking, though qt is very open
                "User-Agent": "Mozilla/5.0"
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
