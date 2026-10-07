import os
import requests
import json
import time

# Configuration
API_KEY = os.environ["APIYI_API_KEY"]
BASE_URL = "https://api.apiyi.com/v1beta"
MODEL_NAME = "gemini-2.0-flash"

# Minimal Prompt Payload (Sync with analysis.ts)
SYSTEM_INSTRUCTION = """
JSON STRUCTURE:
{
  "ai_score": 85, 
  "signal": "...",
  "deep_insight": "深度研报内容",
  "data_evidence": { ... }
}

CRITICAL: YOU MUST ONLY RETURN A VALID JSON OBJECT.
DEEP INSIGHT CONTENT (PREMIUM):
   The "deep_insight" field is NOT optional. It must provide institutional-grade analysis:
   - **Chip Distribution (主力筹码)**: Estimate the cost basis of institutional holders vs retail. (e.g., "Profit chips > 60%, Main force cost ~$23.5").
   - **Smart Money (北向/主力资金)**: Analyze the flow of "Smart Money" (Northbound/Institutions).
   - **Institutional View (机构观点)**: Summarize the consensus or divergence among major institutions.
   - **Format**: Concise Markdown, bullet points.
"""

def test_deep_insight():
    print("💎 Testing Deep Insight Generation...")
    
    # Test Case: Jinbo Bio (Deep Insight Demo)
    prompt = """
    [标的] 锦波生物 (832982) / 北交所
    [基本面] 重组人源化胶原蛋白龙头，业绩超预期，毛利率高
    [技术面] 股价创历史新高后高位震荡，均线多头排列
    [资金面] 机构持续加仓，北交所流动性改善
    """
    
    url = f"{BASE_URL}/models/{MODEL_NAME}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": SYSTEM_INSTRUCTION + "\n" + prompt}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
    }
    
    try:
        resp = requests.post(url, headers={"Content-Type": "application/json"}, json=payload)
        data = resp.json()
        
        if 'candidates' not in data:
            print(f"❌ Error: No candidates returned. {data}")
            return

        text = data['candidates'][0]['content']['parts'][0]['text']
        parsed = json.loads(text)
        
        insight = parsed.get('deep_insight', '')
        print(f"✅ Response Received.")
        print("-" * 50)
        print(insight)
        print("-" * 50)
        
        # Validation
        keywords = ["筹码", "资金", "机构", "主力"]
        found = [k for k in keywords if k in insight]
        
        if len(found) >= 2:
             print(f"🎉 SUCCESS: Deep Insight contains rich keywords: {found}")
        else:
             print(f"⚠️ WARNING: Content might be too generic. Found words: {found}")
             print("Snippet:", insight[:100])
             
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_deep_insight()
