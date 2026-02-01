
import requests
import json
import os
import sys
from dotenv import load_dotenv
import pathlib

# Load env from parent dir (mojin-ai/.env) or current
current_dir = pathlib.Path(__file__).parent.absolute()
env_path = current_dir.parent / ".env"
print(f"DEBUG: Loading .env from {env_path}")
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GEMINI_API_KEY")
print(f"DEBUG: API_KEY present: {bool(API_KEY)}")

try:
    import google.generativeai as genai
    HAS_GENAI = True
    print("DEBUG: google.generativeai imported successfully")
except ImportError as e:
    HAS_GENAI = False
    print(f"DEBUG: google.generativeai import failed: {e}")
    # Try alternate new SDK just in case
    try:
        from google import genai
        print("DEBUG: google.genai imported instead (New SDK detected but script uses old SDK syntax)")
    except ImportError:
        pass

BASE_URL = "http://localhost:8000/fundamentals"

def run_logic_simulation(t):
    # Logic Simulation
    ma20 = t.get('ma20')
    rsi = t.get('rsi_6')
    
    print("\n--- [Report Card: Trading Plan] ---")
    print(f"💡 交易计划 (模拟生成):")
    if ma20:
        print(f"   激进策略：股价现处于 MA20 ({ma20:.2f}) 附近，建议在此关键支撑位尝试低吸。")
        print(f"   止损防守：若有效跌破 MA20 ({ma20:.2f}) 则坚决离场。")
    else:
        print("   （数据不足，无法生成均线策略）")
    
    print("\n--- [Report Card: Risk Warning] ---")
    print(f"⚠️ 风险提示 (模拟生成):")
    if rsi and rsi > 80:
        print(f"   超买预警：RSI(6)高达 {rsi:.2f}，此时追高风险极大，随时面临回调。")
    elif ma20:
        print(f"   技术面风险：密切关注 MA20 ({ma20:.2f}) 的得失，MACD 趋势需确认。")

def generate_report(code, name):
    print(f"\n{'='*40}")
    print(f"📊 Simulating User View for: {name} ({code})")
    print(f"{'='*40}")

    # 1. Fetch "True Data"
    print("Step 1: Fetching Underlying Technical Data...")
    try:
        resp = requests.get(f"{BASE_URL}/{code}")
        data = resp.json()
        
        technicals = data.get("technicals")
        if not technicals:
            print("❌ Failed to get technicals.")
            return

        # 2. Build the "Prompt Context" (The data that forces the AI)
        t = technicals
        tech_text = []
        if t.get('ma20'): tech_text.append(f"MA20={t['ma20']}")
        if t.get('macd'): tech_text.append(f"MACD={t['macd']}")
        if t.get('rsi_6'): tech_text.append(f"RSI(6)={t['rsi_6']}")
        tech_str = ", ".join(tech_text)

        print(f"✅ Data Retrieved: {tech_str}")
        print("-" * 40)

        # 3. Simulate AI Generation
        prompt = f"""
            [Core Data]
            Symbol: {name} ({code})
            Technicals: {tech_str}
            
            [Constraint]
            You are a trading expert. Generate a strict JSON report.
            1. Plan: Must reference {t.get('ma20')} (MA20) as a key level.
            2. Risk: Check RSI ({t.get('rsi_6')}). If >80 warn overbought.
            
            Output strictly JSON: {{ "plan": "...", "risk": "..." }}
            Use Chinese.
            """

        if API_KEY:
            print("Step 2: Calling Gemini AI (Real Generation via Proxy)...")
            try:
                # Use Raw HTTP to support Proxy (mimicking src/lib/gemini.ts)
                base_url = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
                # Remove trailing slash if present
                if base_url.endswith('/'): base_url = base_url[:-1]
                
                url = f"{base_url}/models/gemini-3-pro-preview:generateContent?key={API_KEY}"
                
                headers = {"Content-Type": "application/json"}
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0, "maxOutputTokens": 8192}
                }
                
                print(f"DEBUG: Posting to {base_url}...")
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                
                if response.status_code == 200:
                    data = response.json()
                    # Parse response safely
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        print("✅ AI Response (Real Proxy Output):")
                        print(text)
                    else:
                         print(f"⚠️  AI returned 200 but no candidates: {data}")
                         run_logic_simulation(t)
                else:
                    print(f"❌ API Error: {response.status_code} - {response.text}")
                    print("⚠️  Switching to Logic Simulation...")
                    run_logic_simulation(t)

            except Exception as e:
                print(f"❌ Net Call Failed: {e}")
                print("⚠️  Switching to Logic Simulation due to network failure...")
                run_logic_simulation(t)
        else:
            print("⚠️  Gemini API Key not found.")
            run_logic_simulation(t)

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    generate_report("600519", "贵州茅台")
    generate_report("00700", "腾讯控股")
    generate_report("920000", "安徽凤凰")
