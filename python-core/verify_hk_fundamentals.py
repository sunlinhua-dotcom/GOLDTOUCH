import requests
import json
import sys

BASE_URL = "http://localhost:8000"
TICKER = "00772.HK"

def verify_hk_fundamentals():
    print(f"🔍 Testing HK Fundamentals for {TICKER}...")
    
    url = f"{BASE_URL}/api/stocks/{TICKER}/fundamentals?force_refresh=true"
    try:
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Response Structure:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # Check deep logic
            if data.get("success"):
                fund_data = data.get("data")
                if not fund_data:
                    print("❌ Error: 'data' field is null or empty.")
                else:
                    print("✅ Data field found.")
                    # Check specific fields
                    revenue = fund_data.get("revenue")
                    eps = fund_data.get("eps")
                    print(f"Revenue: {revenue}")
                    print(f"EPS: {eps}")
            else:
                 print("❌ Success is False")
        else:
            print(f"❌ API Error: {response.text}")

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    verify_hk_fundamentals()
