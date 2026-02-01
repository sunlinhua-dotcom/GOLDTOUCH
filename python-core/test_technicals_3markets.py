
import requests
import json
import sys

BASE_URL = "http://localhost:8000/fundamentals"

def test_market(name, code):
    print(f"\n[{name}] Testing {code}...")
    try:
        resp = requests.get(f"{BASE_URL}/{code}")
        if resp.status_code == 200:
            data = resp.json()
            tech = data.get("technicals")
            if tech:
                print(f"✅ Technicals Found:")
                print(f"   MA20: {tech.get('ma20')}")
                print(f"   RSI6: {tech.get('rsi_6')}")
                print(f"   MACD: {tech.get('macd')}")
                print(f"   KDJ_K: {tech.get('kdj_k')}")
                print(f"   MA120: {tech.get('ma120')}")
                print(f"   MA250: {tech.get('ma250')}")
            else:
                print(f"⚠️  No Technicals block found. (Keys: {list(data.keys())})")
            
            cap_flow = data.get('capital_flow', {})
            if cap_flow:
                print(f"💰 Capital Flow: {cap_flow.get('net_inflow_str')} (Ratio: {cap_flow.get('net_inflow_ratio')}%)")
            else:
                print("💰 Capital Flow: N/A")
        else:
            print(f"❌ API Error: {resp.status_code}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    # 1. A-Share
    test_market("A-Share (Moutai)", "600519")
    
    # 2. HK-Share
    test_market("HK-Share (Tencent)", "00700")
    
    # 3. BSE-Share
    test_market("BSE (AnHuiFengHuang)", "920000")
