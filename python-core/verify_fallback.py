import requests
import json

STOCK_CODE = "002223"

def check_fallback():
    print(f"\n--- Checking API Fallback for {STOCK_CODE} (Data likely missing in DB) ---")
    url = f"http://localhost:8000/api/stocks/{STOCK_CODE}/fundamentals"
    try:
        response = requests.get(url, timeout=20) # Longer timeout for realtime fetch
        if response.status_code == 200:
            data = response.json().get('data', {})
            print("✅ API Call Successful")
            
            required_fields = [
                'revenue', 'net_profit', 'net_profit_parent', 
                'eps', 'bvps', 'gross_margin', 'net_profit_margin', 'debt_ratio'
            ]
            
            missing = []
            for field in required_fields:
                val = data.get(field)
                if val is None:
                    missing.append(field)
                    print(f"   ❌ Missing/Null: {field}")
                else:
                    print(f"   ✅ Found: {field} = {val}")
            
            if not missing:
                print("\n🎉 SUCCESS: Fallback mechanism worked! Data fetched live.")
            else:
                print(f"\n⚠️ Conclusion: Fallback missing {len(missing)} fields.")
                if 'revenue' in missing and 'net_profit' in missing:
                    print("❌ Fallback seems to have failed completely for financial data.")
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ API Request Failed: {e}")

if __name__ == "__main__":
    check_fallback()
