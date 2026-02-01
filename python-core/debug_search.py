import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tradingagents.dataflows.providers.china.akshare import AKShareProvider
from tradingagents.utils.logging_manager import get_logger

async def test_search():
    print("🚀 Initializing Provider...")
    provider = AKShareProvider()
    
    print("📋 Fetching Stock List...")
    stocks = await provider.get_stock_list()
    
    print(f"✅ Loaded {len(stocks)} stocks.")
    
    # Test Search
    queries = ["腾讯", "紫金", "601899", "00700"]
    
    for q in queries:
        print(f"\n🔍 Searching for '{q}':")
        found = []
        for s in stocks:
            if q in s['name'] or q in s['code']:
                found.append(s)
        
        if found:
            for f in found[:3]:
                print(f"   - {f['name']} ({f['code']})")
            if len(found) > 3:
                print(f"   ... and {len(found)-3} more")
        else:
            print("   ❌ Not found")

if __name__ == "__main__":
    asyncio.run(test_search())
