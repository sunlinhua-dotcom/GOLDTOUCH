import finnhub
import os

def verify_hk_finnhub():
    # Try to load API KEY from environment or .env if possible (but simpliest is env)
    # Assuming user set it in their shell or .env
    api_key = os.getenv('FINNHUB_API_KEY')
    if not api_key:
        print("❌ FINNHUB_API_KEY not found in environment.")
        return

    print(f"🔍 Fetching Finnhub Info for 00772.HK using key: {api_key[:5]}...")
    try:
        client = finnhub.Client(api_key=api_key)
        profile = client.company_profile2(symbol="00772.HK")
        
        if profile:
            print("✅ Finnhub Profile Fetched:")
            print(f"Industry: {profile.get('finnhubIndustry')}")
            print(f"Currency: {profile.get('currency')}")
        else:
            print("❌ Finnhub returned empty profile.")
            
    except Exception as e:
        print(f"❌ Finnhub failed: {e}")

if __name__ == "__main__":
    verify_hk_finnhub()
