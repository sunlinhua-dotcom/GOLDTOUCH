import akshare as ak
import pandas as pd

def explore_hk_industry():
    print("🔍 Exploring AKShare HK Industry Data...")
    
    # 1. Try stock_hk_spot (Realtime quotes) - Check for 'industry' column
    try:
        print("\n1. Testing stock_hk_spot...")
        df = ak.stock_hk_spot()
        if df is not None:
            print(f"Columns: {df.columns.tolist()}")
            # Check for industry-related columns?
            row = df[df['代码'] == '00772']
            if not row.empty:
                print(f"Row for 00772: {row.iloc[0].to_dict()}")
        else:
            print("stock_hk_spot returned None")
    except Exception as e:
        print(f"stock_hk_spot failed: {e}")

    # 2. Try stock_board_industry_name_em (Usually A-share, checking if HK is mixed)
    try:
        print("\n2. Testing stock_board_industry_name_em...")
        df = ak.stock_board_industry_name_em()
        print(f"First 5 boards: {df.head().to_dict('records')}")
    except Exception as e:
        print(f"stock_board_industry_name_em failed: {e}")

    # 3. Try stock_board_concept_name_em
    try:
        print("\n3. Testing stock_board_concept_name_em...")
        df = ak.stock_board_concept_name_em()
        print(f"First 5 concepts: {df.head().to_dict('records')}")
    except Exception as e:
        print(f"stock_board_concept_name_em failed: {e}")

if __name__ == "__main__":
    explore_hk_industry()
