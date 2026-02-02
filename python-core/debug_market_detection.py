import re
from enum import Enum

class StockMarket(Enum):
    """股票市场枚举"""
    CHINA_A = "china_a"      # 中国A股
    HONG_KONG = "hong_kong"  # 港股
    US = "us"                # 美股
    UNKNOWN = "unknown"      # 未知

def identify_stock_market(ticker: str) -> StockMarket:
    if not ticker:
        return StockMarket.UNKNOWN

    ticker = str(ticker).strip().upper()

    # 模拟更加全面的修复逻辑 (Inclusive of BSE .BJ)
    
    # 中国A股 & 北交所
    # 规则：6位数字，可选后缀 .SH, .SZ, .SS, .BJ, .XSHG, .XSHE
    if re.match(r'^\d{6}(\.(SH|SZ|SS|BJ|XSHG|XSHE))?$', ticker):
         return StockMarket.CHINA_A

    # 港股：4-5位数字.HK 或 纯4-5位数字
    if re.match(r'^\d{4,5}\.HK$', ticker) or re.match(r'^\d{4,5}$', ticker):
        return StockMarket.HONG_KONG

    # 美股：1-5位字母
    if re.match(r'^[A-Z]{1,5}$', ticker):
        return StockMarket.US

    return StockMarket.UNKNOWN

def test_identifier():
    test_cases = [
        "600519", "002223",      # A-share Main (No suffix)
        "600111.SH", "002223.SZ", # A-share Main (Suffix)
        "300059", "300059.SZ",   # ChiNext (创业板)
        "688001", "688001.SH",   # STAR Market (科创板)
        "838275", "838275.BJ",   # BSE (北交所) -> Critical Test
        "00700.HK", "9988",      # HK
        "AAPL", "TSLA"           # US
    ]
    
    print("--- Testing Enhanced Market Identification ---")
    print(f"{'Ticker':<12} | {'Market':<10} | {'Status'}")
    print("-" * 35)
    
    for t in test_cases:
        m = identify_stock_market(t)
        status = "✅" if m != StockMarket.UNKNOWN else "❌"
        # Check specific correctness
        if "HK" in t and m != StockMarket.HONG_KONG: status = "❌"
        if t.isalpha() and m != StockMarket.US: status = "❌"
        if t[0] in ['6','0','3','8'] and m != StockMarket.CHINA_A: status = "❌"
        
        print(f"{t:<12} | {m.value:<10} | {status}")

if __name__ == "__main__":
    test_identifier()
