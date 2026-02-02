import akshare as ak

def test_hk_em_spot():
    print("🔍 Testing stock_hk_spot_em...")
    try:
        df = ak.stock_hk_spot_em()
        if df is not None and not df.empty:
            print(f"Columns: {df.columns.tolist()}")
            matched = df[df['代码'].isin(['00700', '00772'])]
            if not matched.empty:
                print(matched.to_string())
            else:
                print(df.iloc[0].to_dict())
        else:
            print("Returned None or empty")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_hk_em_spot()
