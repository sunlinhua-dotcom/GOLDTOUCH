import akshare as ak
import pandas as pd
import sys

print("Python Version:", sys.version)

try:
    print("\nTesting: stock_info_a_code_name()...")
    df1 = ak.stock_info_a_code_name()
    print("Success! Row count:", len(df1))
    print(df1.head())
except Exception as e:
    print("Failed: stock_info_a_code_name() Error:", str(e))

try:
    print("\nTesting: stock_zh_a_spot_em()...")
    df2 = ak.stock_zh_a_spot_em()
    print("Success! Row count:", len(df2))
    print(df2.head())
except Exception as e:
    print("Failed: stock_zh_a_spot_em() Error:", str(e))
