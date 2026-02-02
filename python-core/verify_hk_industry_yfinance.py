import yfinance as yf

def verify_hk_industry():
    ticker = "00772.HK"
    print(f"🔍 Fetching YFinance Info for {ticker}...")
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        print("✅ YFinance Info Fetched:")
        print(f"Industry: {info.get('industry')}")
        print(f"Sector: {info.get('sector')}")
        print(f"Website: {info.get('website')}")
    except Exception as e:
        print(f"❌ YFinance failed: {e}")

if __name__ == "__main__":
    verify_hk_industry()
