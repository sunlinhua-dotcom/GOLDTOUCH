import { fetchStockNews } from "../lib/news";

(async () => {
    console.log("Fetching news for 00700 (HK)...");
    const news1 = await fetchStockNews("00700.HK", "HK");
    console.log(`Items found: ${news1.length}`);
    if (news1.length > 0) console.log(news1[0]);

    console.log("\nFetching news for 920146 (BJ)...");
    const news2 = await fetchStockNews("920146.BJ", "BJ");
    console.log(`Items found: ${news2.length}`);
    if (news2.length > 0) console.log(news2[0]);
})();
