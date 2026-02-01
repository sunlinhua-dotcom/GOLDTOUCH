import requests
import json
import time

# Configuration
API_KEY = "sk-odv3sA6QHXCSt95O8c1902509b6f41A7861f78Ff007d1879"
BASE_URL = "https://api.apiyi.com/v1beta"
MODEL_NAME = "gemini-2.0-flash"

# The EXACT System Instruction from analysis.ts (Manually synced)
SYSTEM_INSTRUCTION = """
[SCHEMA VERSION: 2.1]
[STRICT MODE: ENABLED]

CRITICAL: YOU MUST ONLY RETURN A VALID JSON OBJECT.
DO NOT WRAP IN "report" OR "analysis_summary".
DO NOT ADD ANY TEXT OUTSIDE THE JSON.

JSON STRUCTURE:
{
  "signal": "核心观点 (看多/看空/观望)",
  "strategy": {
    "timeframe": "短期(4-12周) / 长期(6-12个月)",
    "rationale": "一句话核心逻辑",
    "key_levels": {
       "support": "关键支撑位 (数字)",
       "resistance": "上方压力位 (数字)",
       "stop_loss": "止损防守位 (数字)"
    }
  },
  "data_evidence": {
    "capital_flow": "资金流向分析 (如无数据，基于成交量分析)",
    "valuation": "估值分析",
    "technical_context": "技术面概览"
  },
  "technical": "技术面深度解构 (Markdown)",
  "sentiment": "市场情绪与资金分析 (Markdown)",
  "plan": "实战交易计划 (Markdown)",
  "risk": "风险提示 (Markdown)",
  "deep_insight": "深度研报内容 (可选)"
}

CRITICAL INSTRUCTIONS:
1. **MANDATORY FIELDS**: "sentiment", "plan", "risk" MUST NOT BE EMPTY.
2. **MISSING DATA HANDLING**:
   - If 'Capital Flow' is missing, analyze based on 'Volume' and 'Price Action'.
   - NEVER return "No Data". Always provide a professional estimate or conservative analysis based on available Technical Indicators (MA, RSI, MACD).
3. **STRICT JSON**: Output must be valid JSON without Markdown formatting (no markdown code blocks).
"""

TEST_CASES = [
    {
        "market": "HK", "name": "小米集团-W", "code": "01810",
        "price": "28.5", "change": "-3.06%",
        "cap_flow": "暂无资金流向数据",  # <--- Simulating the PROBLEM case
        "tech": "MA250=25.0, RSI(6)=55",
        "fund": "EPS=0.5"
    },
    {
        "market": "A-Share", "name": "贵州茅台", "code": "600519",
        "price": "1750.0", "change": "+1.2%",
        "cap_flow": "主力净流入: -1.2亿", # Simulating normal case
        "tech": "MA250=1680.0, RSI(6)=65",
        "fund": "EPS=30.5, ROE=28%"
    },
    {
        "market": "BJ-Share", "name": "安徽凤凰", "code": "838275",
        "price": "12.5", "change": "+5.5%",
        "cap_flow": "暂无资金流向数据", # Simulating missing data for BJ
        "tech": "MA250=10.0, RSI(6)=78",
        "fund": "EPS=0.8"
    },
    {
        "market": "US-Share", "name": "Apple", "code": "AAPL",
        "price": "185.0", "change": "+0.5%",
        "cap_flow": "暂无资金流向数据", # Simulating missing data for US
        "tech": "MA250=170.0, RSI(6)=60",
        "fund": "EPS=6.5"
    }
]

def run_test():
    print(f"🚀 Starting Prompt Resilience Test across {len(TEST_CASES)} markets...\n")
    
    url = f"{BASE_URL}/models/{MODEL_NAME}:generateContent?key={API_KEY}"
    
    for case in TEST_CASES:
        print(f"🧪 Testing {case['market']}: {case['name']} ({case['code']})...")
        
        # Construct Prompt (Embed System Instruction for Safety)
        prompt = f"""
{SYSTEM_INSTRUCTION}

[TIMESTAMP: {int(time.time())}]
[实时核心数据包]
标的：{case['name']} ({case['code']}) / {case['market']}
现价：{case['price']} ({case['change']})
资金流：{case['cap_flow']}
技术指标：{case['tech']}
财务：{case['fund']}
最新资讯：暂无最新实时新闻

[分析任务]
基于【MA120/MA250】判断宏观长期趋势，基于【MA20/MA60】判断波段短期趋势。
结合主力资金流向（{case['cap_flow']}）判断筹码热度。
输出要求的 JSON 结构。

[关键要求]
1. strategy.key_levels 中的价格必须是基于 MA 线或近期高低点的具体数值。
2. 严禁胡乱猜测价格，必须参考上方提供的【技术指标】。
3. 如果股价低于 MA250，必须在 technical_context 中说明其处于长期走弱趋势。
"""
        
        # NOTE: We still send system_instruction field to be sure, or we can remove it.
        # Let's keep it clean: if we put it in prompt, the model WILL see it.
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
        }
        
        try:
            start_t = time.time()
            resp = requests.post(url, headers={"Content-Type": "application/json"}, json=payload)
            duration = time.time() - start_t
            
            if resp.status_code != 200:
                print(f"  ❌ API Error: {resp.status_code}")
                continue
                
            data = resp.json()
            text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
            
            # Validation
            try:
                parsed = json.loads(text)
                
                # Check Mandatory Fields
                missing = []
                if not parsed.get('sentiment') or "无" in parsed['sentiment'] or len(parsed['sentiment']) < 10: missing.append("sentiment")
                if not parsed.get('plan') or "无" in parsed['plan'] or len(parsed['plan']) < 10: missing.append("plan")
                if not parsed.get('risk') or "无" in parsed['risk'] or len(parsed['risk']) < 10: missing.append("risk")
                
                if missing:
                     print(f"  ⚠️ Content Warning: Fields might be empty/invalid: {missing}")
                     print(f"     Snippet: {text[:100]}...")
                else:
                     print(f"  ✅ PASS ({duration:.1f}s)")
                     print(f"     Signal: {parsed.get('signal')}")
                     print(f"     Strategy: {parsed.get('strategy', {}).get('rationale')}")
                     # print(f"     Sentiment: {parsed.get('sentiment')[:50]}...")
                     
            except json.JSONDecodeError:
                print(f"  ❌ JSON Parse Error: {text[:100]}")
                
        except Exception as e:
            print(f"  ❌ Unexpected Error: {e}")
            
        print("-" * 50)
        time.sleep(1) # Be nice to API

if __name__ == "__main__":
    run_test()
