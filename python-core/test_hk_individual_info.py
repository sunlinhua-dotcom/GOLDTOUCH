import akshare as ak

def test_hk_individual_info():
    symbol = "00772"
    print(f"🔍 Testing stock_hk_individual_info_em for {symbol}...")
    try:
        df = ak.stock_hk_individual_info_em(symbol=symbol)
        if df is not None:
            print(df.to_string())
        else:
            print("Returned None")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_hk_individual_info()
