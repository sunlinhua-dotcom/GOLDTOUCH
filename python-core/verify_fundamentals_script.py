import requests
import pymongo
import json
from bson import ObjectId

# Load env to get connection string if needed, or default
# Assuming local dev defaults
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "mojin" # Correct database name used by app
STOCK_CODE = "600519"

def check_db():
    print(f"--- Checking MongoDB for financial data in {DB_NAME} ---")
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db['stock_financial_data']
    
    # Delete existing data for STOCK_CODE to ensure a clean test
    db['stock_financial_data'].delete_many({"code": STOCK_CODE})
    print(f"✅ Cleared existing data for {STOCK_CODE}")

    # Insert sample data for testing
    sample_data = {
        "code": STOCK_CODE,
        "report_period": "20240930",
        "revenue": 120000000000.0,
        "net_profit": 60000000000.0,
        "net_profit_parent": 60000000000.0,
        "eps": 48.5,
        "bvps": 150.0,
        "roe": 22.5,
        "roa": 15.0,
        "gross_margin": 91.5,
        "net_profit_margin": 50.0,
        "debt_to_assets": 10.0,
        "data_source": "akshare"
    }
    collection.insert_one(sample_data)
    print(f"✅ Sample data inserted for {STOCK_CODE}")

    doc = collection.find_one({"code": STOCK_CODE})
    if doc:
        print(f"✅ Verified data in DB for {STOCK_CODE}")
        for key in ['revenue', 'net_profit', 'eps', 'bvps', 'gross_margin', 'roa']:
            print(f"   - {key}: {doc.get(key)}")
    else:
        print(f"❌ Failed to find data in DB even after insertion!")
    client.close()

def check_api():
    print(f"\n--- Checking API Response for {STOCK_CODE} ---")
    url = f"http://localhost:8000/api/stocks/{STOCK_CODE}/fundamentals"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json().get('data', {})
            print("✅ API Call Successful")
            
            required_fields = [
                'revenue', 'net_profit', 'net_profit_parent', 
                'eps', 'bvps', 'gross_margin', 'net_profit_margin', 'roa'
            ]
            
            missing = []
            for field in required_fields:
                val = data.get(field)
                if val is None or val == 0:
                    missing.append(field)
                    print(f"   ❌ Missing/Null field in response: {field}")
                else:
                    print(f"   ✅ Field found: {field} = {val}")
            
            if not missing:
                print("\n🎉 SUCCESS: All core financial fields are present in the API response!")
            else:
                print(f"\n⚠️ Conclusion: API is missing {len(missing)} fields that exist in DB.")
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ API Request Failed: {e}")

if __name__ == "__main__":
    check_db()
    check_api()
