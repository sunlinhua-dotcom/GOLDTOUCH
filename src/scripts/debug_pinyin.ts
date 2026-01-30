
import { searchStocks } from "../lib/market";

(async () => {
    const query = "jbsw";
    console.log(`Testing searchStocks('${query}')...`);
    const results = await searchStocks(query);
    console.log("Results:", results);

    console.log("\n--- Direct Sina API ---");
    const url = `http://suggest3.sinajs.cn/suggest/type=&key=${query}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder("gbk");
    const text = decoder.decode(buffer);
    console.log("Raw Response:", text);
})();
