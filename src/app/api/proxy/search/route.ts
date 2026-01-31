
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        const url = `https://smartbox.gtimg.cn/s3/?t=all&q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: {
                "Referer": "https://gu.qq.com/",
                "Host": "smartbox.gtimg.cn",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
            }
        });

        if (!response.ok) {
            console.error(`[Proxy] Upstream Error: ${response.status}`);
            return NextResponse.json({ results: [] });
        }

        // Tencent returns: v_hint="sz~000001~平安银行~BANK OF MINGSHENG^..."
        // Or sometimes nothing if no match
        // Encoding: Usually UTF-8 or GBK. Smartbox is usually UTF-8 compatible or returns unicode escapes.

        const text = await response.text();

        // Parse logic (Same as market.ts but adapted for Edge)
        const match = text.match(/"([^"]*)"/);
        if (!match || !match[1] || match[1] === "N") {
            return NextResponse.json({ results: [] });
        }

        const rawResults = match[1].split("^");
        const results = rawResults.map(line => {
            const parts = line.split("~");
            if (parts.length < 3) return null;
            const market = parts[0];
            const code = parts[1];
            let name = parts[2];

            // Fix Unicode if needed (Tencent sometimes escapes it)
            try {
                if (name.includes("\\u")) {
                    name = JSON.parse(`"${name}"`);
                }
            } catch { }

            let normalizedMarket = "";
            if (market === "hk") normalizedMarket = "HK";
            else if (market === "us") normalizedMarket = "US";
            else if (market === "sh") normalizedMarket = "SH";
            else if (market === "sz") normalizedMarket = "SZ";
            else if (market === "bj") normalizedMarket = "BJ";

            if (!normalizedMarket) return null;

            return {
                name,
                code: `${code}.${normalizedMarket}`,
                market: normalizedMarket
            };
        }).filter(item => item !== null);

        // Deduplicate
        const uniqueResults = [];
        const seen = new Set();
        for (const r of results) {
            if (!seen.has(r!.code)) {
                seen.add(r!.code);
                uniqueResults.push(r);
            }
        }

        return NextResponse.json({ results: uniqueResults.slice(0, 10) });

    } catch (error) {
        console.error("[Proxy] Search Error:", error);
        return NextResponse.json({ results: [] }, { status: 500 });
    }
}
