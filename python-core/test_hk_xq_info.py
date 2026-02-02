import akshare as ak

def test_hk_xq_info():
    symbol = "00772"
    print(f"🔍 Testing stock_individual_basic_info_hk_xq for {symbol}...")
    try:
        df = ak.stock_individual_basic_info_hk_xq(symbol=symbol)
        if df is not None:
            print(df.to_string())
        else:
            print("Returned None")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_hk_xq_info()
