"use server";

import { searchStocks, getStockQuote, StockQuote, SearchResult } from "@/lib/market";

export interface StockData {
    name: string;
    code: string;
    market: string;
}

// New: Auto-suggest Action
export async function searchStocksAction(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 1) return [];
    return await searchStocks(query);
}

export async function identifyStock(query: string): Promise<StockData | null> {
    const results = await searchStocks(query);

    if (results && results.length > 0) {
        // Return the best match
        return {
            name: results[0].name,
            code: results[0].code,
            market: results[0].market
        };
    }

    return null;
}

export async function fetchRealTimeQuote(code: string): Promise<StockQuote | null> {
    return await getStockQuote(code);
}

import { fetchStockFundamentals, FundamentalData } from "@/lib/market";

export async function getDeepInsightsAction(code: string): Promise<FundamentalData | null> {
    const data = await fetchStockFundamentals(code);
    return data;
}
