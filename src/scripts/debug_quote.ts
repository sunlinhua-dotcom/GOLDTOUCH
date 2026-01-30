
import { getStockQuote } from "../lib/market";

async function run() {
    const code = "920982.BJ";
    console.log(`Fetching quote for ${code}...`);
    try {
        const start = Date.now();
        const quote = await getStockQuote(code);
        const end = Date.now();
        console.log("Time taken:", end - start, "ms");
        console.log("Result:", quote);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
