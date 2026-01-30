
import { searchStocks } from "../lib/market";

async function run() {
    console.log("Testing searchStocks('839946')...");
    const results1 = await searchStocks("839946");
    console.log("Results for 839946:", results1);

    console.log("\nTesting searchStocks('华阳变速')...");
    const results2 = await searchStocks("华阳变速");
    console.log("Results for 华阳变速:", results2);
}

run();
