import yfinance as yf

def verify_hk_variations():
    variations = ["0772.HK", "00772.HK", "0700.HK", "00700.HK"]
    for ticker in variations:
        print(f"🔍 Fetching YFinance Info for {ticker}...")
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            if info and info.get('longName'):
                print(f"✅ Success for {ticker}:")
                print(f"Name: {info.get('longName')}")
                print(f"Market Cap: {info.get('marketCap')}")
                print(f"Industry: {info.get('industry')}")
            else:
                print(f"❌ Failed for {ticker}: No info/name returned.")
        except Exception as e:
            print(f"❌ Error for {ticker}: {e}")
        print("-" * 20)

if __name__ == "__main__":
    verify_hk_variations()
