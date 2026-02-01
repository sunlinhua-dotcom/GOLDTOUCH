import os
import requests
import json
import time

# Mock Data (Simulating missing capital flow)
stock_name = "小米集团-W"
stock_code = "01810"
market_name = "港股"

# The Prompt (Intentionally missing capital flow data)
prompt = f"""
[TIMESTAMP: {int(time.time())}]
[实时核心数据包]
标的：{stock_name} ({stock_code}) / {market_name}
现价：28.5 (模拟数据)
资金流：暂无资金流向数据 (Missing)
技术指标：MA250=25.0, RSI(6)=55
财务：EPS=0.5

[分析任务]
请基于以上数据进行分析。
关键：由于资金流数据缺失，请使用您的【联网搜索能力 (Google Search)】查找该股票最新的主力资金流向、市场热度或相关新闻，补全分析。
如果找不到具体资金流数字，请基于市场情绪和新闻进行定性分析。

输出 JSON 结构：
{{
  "signal": "观点",
  "data_evidence": {{
    "capital_flow": "请在此处填入您搜索到的资金流向描述...",
    "valuation": "估值",
    "technical_context": "技术"
  }},
  "strategy": {{
    "rationale": "逻辑",
    "key_levels": {{ "support": "...", "resistance": "...", "stop_loss": "..." }}
  }}
}}
"""

def test_grounding():
    # User provided credentials
    api_key = "***REMOVED***"
    base_url = "https://api.apiyi.com/v1beta"
    model_name = "gemini-2.0-flash" # gemini-3-pro-preview-thinking 暂不支持 tools，先用 flash 验证搜索能力

    if not api_key:
        print("❌ Error: API Key missing.")
        return

    url = f"{base_url}/models/{model_name}:generateContent?key={api_key}"
    
    # Payload WITH Grounding
    payload = {
        "contents": [{
            "parts": [{ "text": prompt }]
        }],
        # "tools": [
        #     { "googleSearch": {} } # <--- The Magic Switch
        # ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }

    print(f"📡 Sending Request to Gemini (With Google Search)...")
    print(f"   Target: {stock_name} ({stock_code})")
    
    try:
        resp = requests.post(url, headers={"Content-Type": "application/json"}, json=payload)
        
        if resp.status_code != 200:
            print(f"❌ API Error {resp.status_code}: {resp.text}")
            return

        data = resp.json()
        
        # Parse Response
        candidate = data.get('candidates', [{}])[0]
        content = candidate.get('content', {}).get('parts', [{}])[0].get('text', '')
        
        # Check Grounding Metadata
        grounding_metadata = candidate.get('groundingMetadata')
        
        print("\n✅ Response Received!")
        if grounding_metadata:
            print(f"🌍 Grounding Metadata Found: YES")
            print(f"   Search Queries: {grounding_metadata.get('searchEntryPoint', {})}")
        else:
            print(f"⚠️ Grounding Metadata Missing (Maybe it didn't search?)")
            
        print("\n📄 Generated Content Snippet:")
        print(content[:500] + "...")
        
        # Validation
        if "资金" in content and "缺失" not in content and "暂无" not in content and len(content) > 100:
             print("\n✅ TEST PASSED: AI successfully found info or generated analysis despite missing local data.")
        else:
             print("\n⚠️ TEST WARNING: Check if capital flow was actually filled.")

    except Exception as e:
        print(f"❌ Script Error: {e}")

if __name__ == "__main__":
    test_grounding()
