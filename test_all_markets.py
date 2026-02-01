import asyncio
import sys
import os
import json
import traceback
import yfinance as yf

# Add python-core to path
sys.path.append(os.path.join(os.getcwd(), "python-core"))

try:
    from tradingagents.dataflows.providers.china.akshare import AKShareProvider
except ImportError:
    print("❌ Could not import AKShareProvider. Check python path.")
    sys.exit(1)

async def verify_akshare_stock(provider, code, name):
    print(f"\n🔍 Verifying {name} [{code}] using AKShareProvider...")
    
    # 1. Fundamentals
    print(f"   --- {name} Fundamentals ---")
    try:
        fin_data = await provider.get_financial_data(code)
        if fin_data:
             print(f"   ✅ Financials fetched: {len(fin_data)} datasets")
             if 'main_indicators' in fin_data:
                 recs = fin_data['main_indicators']
                 print(f"   ✅ Main Indicators: Found {len(recs)} records")
                 if recs:
                     latest = recs[0]
                     # Print a few key metrics to verify parsing
                     print(f"      EPS: {latest.get('每股收益') or latest.get('基本每股收益')}")
                     print(f"      Revenue: {latest.get('营业收入') or latest.get('营业总收入')}")
             else:
                 print("   ⚠️ 'main_indicators' missing in financial data")
        else:
             print("   ⚠️ Financials empty")
    except Exception as e:
        print(f"   ❌ Financials failed: {e}")

    # 2. Quotes (The main fix!)
    print(f"   --- {name} Real-time Quote (With Fallback) ---")
    try:
        quote = await provider.get_stock_quotes(code)
        if quote:
            print(f"   ✅ Quote received!")
            print(f"      Price: {quote.get('price')}")
            print(f"      Change: {quote.get('change_percent')}%")
            print(f"      Volume: {quote.get('volume')} (Shares)")
            print(f"      Source: {quote.get('data_source')} (Expected: akshare_bid_ask or akshare_snapshot)")
            print(f"      Update Time: {quote.get('updated_at')}")
        else:
            print("   ❌ Quote returned None (All methods failed)")
    except Exception as e:
        print(f"   ❌ Quote failed with error: {e}")
        traceback.print_exc()

async def verify_us_stock(ticker):
    print(f"\n🇺🇸 Verifying US Stock [{ticker}] using yfinance...")
    try:
        t = yf.Ticker(ticker)
        info = t.info
        price = info.get('currentPrice') or info.get('regularMarketPrice')
        print(f"   ✅ Info fetched")
        print(f"      Price: {price}")
        print(f"      Market Cap: {info.get('marketCap')}")
    except Exception as e:
        print(f"   ❌ US Stock failed: {e}")

async def main():
    print("🚀 STARTING COMPREHENSIVE MULTI-MARKET VERIFICATION")
    
    provider = AKShareProvider()
    print("🔌 Connecting to AKShareProvider...")
    if not await provider.connect():
        print("❌ Failed to connect to AKShareProvider")
        return

    # 1. A-Share (Moutai - 600519)
    await verify_akshare_stock(provider, "600519", "Moutai (A-Share)")
    
    # 2. A-Share (Ping An - 000001)
    await verify_akshare_stock(provider, "000001", "Ping An (A-Share)")
    
    # 3. HK-Share (Tencent - 00700)
    # Note: AKShareProvider expects HK codes usually without .HK for some methods, but fallback handles it?
    # provider.get_stock_quotes handles .HK check.
    # Let's try passing "00700"
    await verify_akshare_stock(provider, "00700", "Tencent (HK-Share)")

    # 4. US-Share (Apple - AAPL)
    await verify_us_stock("AAPL")
    
    print("\n✅ Verification Complete")

if __name__ == "__main__":
    asyncio.run(main())
