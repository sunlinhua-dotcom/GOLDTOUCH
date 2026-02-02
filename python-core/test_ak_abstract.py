import akshare as ak
import pandas as pd

def test_abstract():
    code = "002223"
    print(f"Fetching financial abstract for {code}...")
    try:
        df = ak.stock_financial_abstract(symbol=code)
        if df is not None and not df.empty:
            print("✅ Fetch Successful")
            print("Columns:", df.columns.tolist())
            print("First Record:", df.iloc[0].to_dict())
            
            # Check for keys we need
            needed = ['营业总收入', '营业收入', '归母净利润', '净利润', '基本每股收益', '每股收益']
            found = [k for k in needed if k in df.columns]
            print("Found Keys:", found)
        else:
            print("❌ DataFrame is empty or None")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_abstract()
