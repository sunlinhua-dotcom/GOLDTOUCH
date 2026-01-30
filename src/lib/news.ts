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
export async function fetchStockNews(code: string, market: string = "HK"): Promise<NewsItem[]> {
    // Construct URL based on EastMoney rules
    let url = "";
    const cleanCode = code.replace(/[^0-9a-zA-Z]/g, ""); // remove dots if any

    if (market === "HK") {
        url = `http://guba.eastmoney.com/list,hk${cleanCode}.html`;
    } else if (market === "SH") {
        url = `http://guba.eastmoney.com/list,60${cleanCode.slice(-4)}.html`; // rough guess, better use full code
        // Revised: EastMoney usually uses just the code if 6 digits match
        // Let's rely on what we get passed. 
        // If code is 600519 (SH), url is list,600519.html
        url = `http://guba.eastmoney.com/list,${cleanCode}.html`;
    } else if (market === "SZ") {
        url = `http://guba.eastmoney.com/list,${cleanCode}.html`;
    } else if (market === "US") {
        url = `http://guba.eastmoney.com/list,us${cleanCode}.html`;
    } else {
        url = `http://guba.eastmoney.com/list,${cleanCode}.html`;
    }

    // Correction for A-share:
    // SH usually starts with 6, SZ with 0 or 3. 
    // If incoming code is 6 digits, we just use it.
    // HK needs 'hk' prefix. US needs 'us'.

    // Normalize logic based on our app's standard (e.g. 00700.HK)
    if (code.includes(".HK")) {
        const c = code.split(".")[0];
        url = `http://guba.eastmoney.com/list,hk${c}.html`;
    } else if (code.includes(".US")) {
        const c = code.split(".")[0];
        url = `http://guba.eastmoney.com/list,us${c}.html`;
    } else if (code.length === 5 && /^\d+$/.test(code)) {
        // Most likely HK without suffix
        url = `http://guba.eastmoney.com/list,hk${code}.html`;
    }

    console.log(`[RAG] Fetching news from: ${url}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

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
        const $ = cheerio.load(html);
        const newsList: NewsItem[] = [];

        // Parsing logic for EastMoney Guba List
        // Selector might change, but usually: .articleh .l3 a (title)

        // Strategy: Get the main list items
        $('.listitem').each((i, el) => {
            if (i >= 8) return; // Limit to latest 8

            const title = $(el).find('.l3 a').text().trim();
            const link = $(el).find('.l3 a').attr('href');
            const date = $(el).find('.l5').text().trim(); // Last update time
            const readCount = $(el).find('.l1').text().trim();

            // Filter out obviously irrelevant posts (ad/spam often have low reads or specific keywords)
            if (!title || title.length < 5) return;
            if (title.includes("广告")) return;

            newsList.push({
                title,
                summary: `(热度: ${readCount})`, // We don't fetch detail page for speed, just title is often enough for "sentiment"
                date,
                source: "EastMoney"
            });
        });

        // Fallback for new list style (EastMoney updates structure often)
        if (newsList.length === 0) {
            $('.articleh').each((i, el) => {
                if (i >= 8) return;
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
