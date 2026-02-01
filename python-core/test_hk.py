
import sys
import os
import asyncio

# Ensure python-core is in path
sys.path.append(os.getcwd())

from tradingagents.dataflows.providers.hk.improved_hk import get_hk_financial_indicators

def test():
    print("Testing HK Data Fetch...")
    data = get_hk_financial_indicators("00700")
    print(f"Data for 00700: {data}")

if __name__ == "__main__":
    test()
