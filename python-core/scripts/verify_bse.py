
import asyncio
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tradingagents.dataflows.providers.china.akshare import AKShareProvider
from tradingagents.utils.logging_manager import get_logger

logger = get_logger("verify_bse")

async def test_bse():
    print("🚀 Starting Beijing Stock Exchange (BSE) Data Verification...")
    
    provider = AKShareProvider()
    await provider.connect()
    
    # 1. Test Stock List (Check for 8xxxxx or 4xxxxx codes)
    print("\n1. Fetching Market Snapshot...")
    stock_list = await provider.get_stock_list()
    bse_stocks = [s for s in stock_list if s['code'].startswith('8') or s['code'].startswith('4')]
    
    print(f"Found {len(bse_stocks)} BSE stocks in total.")
    if len(bse_stocks) > 0:
        print(f"Example BSE stocks: {[s['code'] for s in bse_stocks[:5]]}")
    
    # 2. Test Specific BSE Stock (e.g., 838275 驱动力 / 838924 锦波生物)
    test_code = "838275" # 驱动力 (A typical BSE stock)
    if len(bse_stocks) > 0:
        test_code = bse_stocks[0]['code']
        print(f"Selecting {test_code} ({bse_stocks[0]['name']}) for deep dive test.")
        
    print(f"\n2. Fetching Real-time Quote for {test_code}...")
    quote = await provider.get_stock_quotes(test_code)
    
    if quote:
        print(f"✅ Quote Success:")
        print(f"   Name: {quote.get('name')}")
        print(f"   Price: {quote.get('price')}")
        print(f"   Change: {quote.get('change_percent')}%")
        print(f"   Market: {quote.get('market_info', {}).get('exchange_name')}")
    else:
        print("❌ Quote Failed.")

    # 3. Test News
    print(f"\n3. Fetching News for {test_code}...")
    # Note: Accessing private method for testing, in real usage goes through DataManager
    news_df = provider._get_stock_news_direct(test_code, limit=3)
    if news_df is not None and not news_df.empty:
        print(f"✅ News Success: Found {len(news_df)} articles.")
        print(news_df[['新闻标题', '发布时间']].to_string())
    else:
        print("⚠️ No news found or fetch failed.")

if __name__ == "__main__":
    asyncio.run(test_bse())
