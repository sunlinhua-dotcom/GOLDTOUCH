import * as cheerio from 'cheerio';

export interface NewsItem {
    title: string;
    summary: string;
    date: string;
    source: string;
}

/**
 * Fetch latest news for a stock from EastMoney Guba
 * @param code Stock code (e.g. 00700)
 * @param market Market type (HK, SH, SZ, US)
 */
/**
 * Fetch latest news for a stock from EastMoney Guba
 * @param code Stock code (e.g. 00700)
 * @param market Market type (HK, SH, SZ, US, BJ)
 */
export async function fetchStockNews(code: string, market: string = "HK"): Promise<NewsItem[]> {
    // Construct URL based on EastMoney rules
    // Https is required.
    let url = "";
    // Remove all non-alphanumeric chars first
    let cleanCode = code.replace(/[^0-9a-zA-Z]/g, "");

    // Logic to strip market suffix if it was included in code (e.g. 920146BJ -> 920146)
    // For HK/US, we might need prefix in URL, but cleanCode should be just the number/symbol usually.
    // Actually, input code is like "00700.HK".
    if (code.includes(".")) {
        cleanCode = code.split(".")[0];
    }

    if (market === "HK") {
        url = `https://guba.eastmoney.com/list,hk${cleanCode}.html`;
    } else if (market === "US") {
        url = `https://guba.eastmoney.com/list,us${cleanCode}.html`;
    } else {
        // A-Share (SH/SZ/BJ) uses just the code
        // e.g. list,600519.html, list,920146.html
        url = `https://guba.eastmoney.com/list,${cleanCode}.html`;
    }

    console.log(`[RAG] Fetching news from: ${url}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            next: { revalidate: 60 } // Cache for 1 min
        });
        clearTimeout(timeoutId);

        if (!res.ok) return [];

        const html = await res.text();
        const newsList: NewsItem[] = [];

        // Strategy 1: Parse "var article_list=..." JSON (Most reliable for new Guba)
        // Note: It's an object {"re": [...], ...} not just array
        // Use [\s\S] instead of . with /s flag for compatibility
        const jsonMatch = html.match(/var\s+article_list\s*=\s*(\{[\s\S]*?\});/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const data = JSON.parse(jsonMatch[1]);
                // Data.re is array of objects
                const list = data.re || [];
                for (const item of list) {
                    if (newsList.length >= 8) break;

                    const title = item.post_title;
                    const date = item.post_publish_time; // "2026-01-30 15:30:00"
                    const readCount = item.post_click_count;
                    // const id = item.post_id;

                    if (!title || title.length < 4) continue;
                    if (title.includes("广告")) continue;

                    newsList.push({
                        title,
                        summary: `(热度: ${readCount})`,
                        date: date ? date.split(" ")[0] : "", // just date part
                        source: "EastMoney"
                    });
                }
            } catch (e) {
                console.warn("[RAG] JSON parse failed, falling back to cheerio", e);
            }
        }

        // Strategy 2: Cheerio fallback (if JSON missing or empty)
        if (newsList.length === 0) {
            const $ = cheerio.load(html);
            $('.listitem').each((i, el) => {
                if (newsList.length >= 8) return;

                const title = $(el).find('.l3 a').text().trim();
                const readCount = $(el).find('.l1').text().trim();
                const date = $(el).find('.l5').text().trim();

                if (!title || title.length < 5) return;

                newsList.push({
                    title,
                    summary: `(热度: ${readCount})`,
                    date,
                    source: "EastMoney"
                });
            });
        }

        // Strategy 3: Older structure fallback
        if (newsList.length === 0) {
            const $ = cheerio.load(html);
            $('.articleh').each((i, el) => {
                if (newsList.length >= 8) return;
                const title = $(el).find('.l3 a').text().trim();
                const date = $(el).find('.l5').text().trim();
                if (title) {
                    newsList.push({
                        title,
                        summary: "最新资讯",
                        date,
                        source: "EastMoney"
                    });
                }
            });
        }

        return newsList;

    } catch (e) {
        console.error("[RAG] News fetch failed:", e);
        return [];
    }
}
