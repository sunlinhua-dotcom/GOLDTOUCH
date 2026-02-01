import requests
import json
import sys

# Color codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def check(name, condition, value=None):
    if condition:
        print(f"{GREEN}✅ {name}: PASS{RESET}")
        if value: print(f"   Value: {value}")
        return True
    else:
        print(f"{RED}❌ {name}: FAIL{RESET}")
        if value: print(f"   Value: {value}")
        return False

def verify_flow(code="01810"):
    print(f"\n🚀 DIAGNOSING DATA FLOW FOR: {code}\n")
    
    # 1. Check Backend API
    url = f"http://localhost:8000/fundamentals/{code}"
    print(f"📡 Requesting Backend: {url} ...")
    
    try:
        resp = requests.get(url, timeout=10)
        if not check("API Connectivity", resp.status_code == 200, resp.status_code):
            return
        
        data = resp.json()
        print(f"📦 Payload Size: {len(str(data))} bytes")
        
        # 2. Check Fundamentals
        print("\n--- 1. Basic Fundamentals ---")
        check("EPS", data.get('eps') is not None, data.get('eps'))
        check("ROE", data.get('roe') is not None, data.get('roe'))
        check("Revenue", data.get('revenue') is not None, data.get('revenue'))
        
        # 3. Check Technicals (The "Real Data")
        print("\n--- 2. Technical Indicators (Backend Calculated) ---")
        tech = data.get('technicals', {})
        if not tech:
            print(f"{RED}❌ Technicals Object is MISSING{RESET}")
        else:
            check("MA250 (Annual Line)", tech.get('ma250') is not None, tech.get('ma250'))
            check("MA120 (Semi-Annual)", tech.get('ma120') is not None, tech.get('ma120'))
            check("RSI(6)", tech.get('rsi_6') is not None, tech.get('rsi_6'))
            check("MACD", tech.get('macd') is not None, tech.get('macd'))
            
        # 4. Check Capital Flow
        print("\n--- 3. Capital Flow (Money Stream) ---")
        flow = data.get('capital_flow', {})
        if not flow:
            print(f"{YELLOW}⚠️ Capital Flow Object is EMPTY (Best Effort){RESET}")
        else:
            check("Net Inflow", flow.get('net_inflow_str') is not None, flow.get('net_inflow_str'))
            
        # 5. Simulate Prompt Construction (Frontend Logic)
        print("\n--- 4. Simulated AI Prompt (Frontend Logic) ---")
        
        # Replicate logic from analysis.ts
        technicalsText = "暂无技术指标数据"
        if tech:
            parts = []
            if tech.get('ma5'): parts.append(f"MA5={tech['ma5']}")
            if tech.get('ma20'): parts.append(f"MA20={tech['ma20']}")
            if tech.get('ma250'): parts.append(f"MA250={tech['ma250']}")
            if tech.get('rsi_6'): parts.append(f"RSI(6)={tech['rsi_6']}")
            if parts: technicalsText = ", ".join(parts)
            
        capFlowText = "暂无资金流向数据"
        if flow and flow.get('net_inflow_str'):
            capFlowText = f"主力净流入: {flow['net_inflow_str']}"
            
        print(f"{YELLOW}[Simulated PROMPT Context]{RESET}")
        print(f"资金流: {capFlowText}")
        print(f"技术指标: {technicalsText}")
        
        if "暂无" in technicalsText:
            print(f"\n{RED}🚨 CRITICAL: AI will receive 'No Data' for technicals!{RESET}")
        else:
            print(f"\n{GREEN}✅ AI Prompt will contain valid technical data.{RESET}")

    except Exception as e:
        print(f"{RED}❌ Connection Failed: {e}{RESET}")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "01810"
    verify_flow(target)
