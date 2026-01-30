
import { searchStocks } from "../lib/market";

async function run() {
    const queries = ["00700", "AAPL", "600519", "839946", "920146"];

    for (const q of queries) {
        console.log(`\nSearching for '${q}'...`);
        try {
            const results = await searchStocks(q);
            console.log(`Results for ${q}:`, results);
        } catch (e) {
            console.error(e);
        }
    }
}

run();
