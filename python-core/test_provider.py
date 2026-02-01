import asyncio
import sys
import os

# Add the python-core directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "python-core"))

from tradingagents.dataflows.providers.china.akshare import AKShareProvider

async def main():
    provider = AKShareProvider()
    print("Testing get_stock_list()...")
    try:
        stocks = await provider.get_stock_list()
        print(f"Success! Found {len(stocks)} stocks.")
        if stocks:
            print("First 5 stocks:", stocks[:5])
    except Exception as e:
        print(f"Failed! Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
