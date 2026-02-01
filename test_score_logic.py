import requests
import json
import time

# Configuration
API_KEY = "sk-odv3sA6QHXCSt95O8c1902509b6f41A7861f78Ff007d1879"
BASE_URL = "https://api.apiyi.com/v1beta"
MODEL_NAME = "gemini-2.0-flash"

# Minimal Prompt Payload (Sync with analysis.ts)
SYSTEM_INSTRUCTION = """
JSON STRUCTURE:
{
  "ai_score": 85, // (0-100) Multi-dimensional AI Score
  "signal": "核心观点",
  "sentiment": "...",
  "plan": "...",
  "risk": "...",
  "strategy": { ... },
  "data_evidence": { ... }
}

CRITICAL: YOU MUST ONLY RETURN A VALID JSON OBJECT.
SCORING ALGORITHM (0-100):
   You must calculate a holistic score based on the following weights:
   - **Technicals (40%)**: Trend (MA alignment), Momentum (RSI/MACD). Uptrend + Divergence = High Score.
   - **Fundamentals (40%)**: Valuation (PE/PB vs Industry), Growth (Revenue/Profit), ROE. Low Valuation + High Quality = High Score.
   - **Capital Flow (20%)**: Net Inflow/Outflow. Smart money inflow = Bonus.
"""

def test_score_generation():
    print("🚀 Testing Intelligent Score Generation...")
    
    # Test Case: Strong Stock (Expect High Score)
    prompt = """
    [标的] 贵州茅台 (600519)
    [基本面] ROE=28%, PE=25 (合理), 净利润增长=15%
    [技术面] 股价站稳MA250, RSI=65 (强势)
    [资金面] 北向资金连续3日净流入
    """
    
    url = f"{BASE_URL}/models/{MODEL_NAME}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": SYSTEM_INSTRUCTION + "\n" + prompt}]}],
        "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
    }
    
    try:
        resp = requests.post(url, headers={"Content-Type": "application/json"}, json=payload)
        data = resp.json()
        text = data['candidates'][0]['content']['parts'][0]['text']
        parsed = json.loads(text)
        
        score = parsed.get('ai_score')
        print(f"✅ Response Received.")
        print(f"📊 AI SCORE: {score}")
        print(f"💡 Signal: {parsed.get('signal')}")
        
        if score and isinstance(score, (int, float)):
             if score > 80:
                 print("🎉 SUCCESS: High score generated for strong stock logic.")
             else:
                 print("⚠️ WARNING: Score seems low for strong data, but format is correct.")
        else:
             print("❌ FAILED: 'ai_score' field missing or invalid.")
             
    except Exception as e:
        print(f"❌ Error: {e}")
        print(text if 'text' in locals() else "No response text")

if __name__ == "__main__":
    test_score_generation()
