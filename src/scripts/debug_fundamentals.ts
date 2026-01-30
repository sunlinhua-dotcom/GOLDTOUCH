
import { fetchStockFundamentals } from "../lib/market";

(async () => {
    const codes = ["920982.BJ", "00700.HK", "600519.SH"];

    for (const code of codes) {
        console.log(`\nFetching fundamentals for '${code}'...`);
        const result = await fetchStockFundamentals(code);
        console.log("Result:", result);
    }
})();
