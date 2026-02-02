import requests
import os
import json

API_KEY = "sk-odv3sA6QHXCSt95O8c1902509b6f41A7861f78Ff007d1879"
BASE_DOMAIN = "https://api.apiyi.com"

def test_openai_style(suffix, model):
    url = f"{BASE_DOMAIN}{suffix}/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 10
    }
    try:
        print(f"Testing OpenAI Style: {url} ...", end=" ", flush=True)
        resp = requests.post(url, headers=headers, json=data, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text[:200]}")
        else:
            print("Success!")
    except Exception as e:
        print(f"Exception: {e}")

def test_google_style(suffix):
    # Google style: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
    # Proxies usually map: BASE/v1beta/models/...
    url = f"{BASE_DOMAIN}{suffix}/models/gemini-3-pro-preview:generateContent"
    # Try both query param and header for key
    params = {"key": API_KEY} 
    headers = {"Content-Type": "application/json"}
    
    data = {
        "contents": [{"parts": [{"text": "Hi"}]}]
    }
    
    try:
        print(f"Testing Google Style (Query Param): {url} ...", end=" ", flush=True)
        resp = requests.post(url, headers=headers, params=params, json=data, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
             print("Success!")
             return

        # Try Header 'x-goog-api-key'
        print(f"Testing Google Style (Header): {url} ...", end=" ", flush=True)
        headers["x-goog-api-key"] = API_KEY
        resp = requests.post(url, headers=headers, json=data, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text[:200]}")
        else:
            print("Success!")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    print("--- Verifying API Paths ---")
    
    # 1. Test OpenAI Style v1
    test_openai_style("/v1", "gemini-3-pro-preview")
    
    # 2. Test OpenAI Style v1beta
    test_openai_style("/v1beta", "gemini-3-pro-preview")
    
    # 3. Test Google Style v1beta
    test_google_style("/v1beta")
    
    # 4. Test Root (sometimes proxies serve at root)
    test_openai_style("", "gemini-3-pro-preview")
