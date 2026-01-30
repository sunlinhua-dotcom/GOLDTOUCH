
import { getStockQuote } from "../lib/market";

(async () => {
    const codes = ["j.US", "J.US", "AAPL.US", "aapl.US"];

    for (const code of codes) {
        console.log(`\nFetching quote for '${code}'...`);
        const result = await getStockQuote(code);
        console.log("Result:", result);
    }
})();
