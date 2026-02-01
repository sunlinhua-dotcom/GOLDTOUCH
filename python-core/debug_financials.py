import akshare as ak
import json
import pandas as pd

def test():
    code = "600519"
    try:
        df = ak.stock_financial_abstract(symbol=code)
        print("Columns:", df.columns.tolist())
        print("First 5 rows:")
        print(df.head().to_dict('records'))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test()
