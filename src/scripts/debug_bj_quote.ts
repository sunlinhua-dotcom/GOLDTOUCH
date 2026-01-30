
import { getStockQuote } from "../lib/market";

(async () => {
    const code = "920982.BJ";
    console.log(`Testing quote fetch for ${code}...`);
    const start = Date.now();
    try {
        const quote = await getStockQuote(code);
        console.log("Result:", quote);
    } catch (e) {
        console.error("Error:", e);
    }
    console.log(`Duration: ${Date.now() - start}ms`);
})();
