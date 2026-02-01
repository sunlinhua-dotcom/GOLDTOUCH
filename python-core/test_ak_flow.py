
import akshare as ak
import pandas as pd

def test_flow():
    print("Testing Capital Flow for 600519...")
    try:
        # 1. Individual Fund Flow (Sector/Concept flow is easier, but let's try individual)
        # stock_individual_fund_flow_rank is for rank.
        # stock_individual_fund_flow is widely used.
        df = ak.stock_individual_fund_flow(stock="600519", market="sh")
        if df is not None and not df.empty:
            print("✅ Flow Data Found:")
            print(df.tail(3))
        else:
            print("❌ No Flow Data returned.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_flow()
