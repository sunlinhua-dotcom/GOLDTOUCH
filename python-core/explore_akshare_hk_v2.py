import akshare as ak
import pandas as pd

def explore_hk_spot_targeted():
    print("🔍 Exploring AKShare HK Spot Data (Targeted)...")
    try:
        df = ak.stock_hk_spot()
        if df is not None and not df.empty:
            print(f"Columns: {df.columns.tolist()}")
            # Look for 00700 (Tencent) or 00772 (Yuewen)
            matched = df[df['代码'].isin(['00700', '00772'])]
            if not matched.empty:
                print("\nMatched Rows:")
                print(matched.to_string())
            else:
                print("\nNo direct match for 00700/00772, printing first row:")
                print(df.iloc[0].to_dict())
        else:
            print("stock_hk_spot returned None or empty")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    explore_hk_spot_targeted()
