
import os
import sys
import asyncio
import math
import pandas as pd
import numpy as np
import yfinance as yf
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import akshare as ak

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG
from tradingagents.utils.logging_manager import get_logger
import backtest
from tradingagents.dataflows.providers.china.akshare import AKShareProvider

try:
    from tradingagents.dataflows.providers.hk.improved_hk import get_hk_financial_indicators
    HK_AVAILABLE = True
except ImportError:
    HK_AVAILABLE = False

# Initialize Provider
stock_provider = AKShareProvider()
logger = get_logger("api")

app = FastAPI(title="Mojin Quant Core", version="1.0.0")
app.include_router(backtest.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class AnalyzeRequest(BaseModel):
    code: str
    date: Optional[str] = None
    user_id: Optional[str] = None

# Utilities
def clean_value(value):
    if value is None: return None
    try:
        # Aggressively try to convert to float
        val = float(value)
        if math.isnan(val) or math.isinf(val): return None
        return val
    except:
        # If it's truly a string label and not a number, return as is
        return value

def clean_dict(d):
    if isinstance(d, dict):
        return {k: clean_dict(v) for k, v in d.items()}
    elif isinstance(d, list):
        return [clean_dict(item) for item in d]
    else: return clean_value(d)

def calculate_technicals(df: pd.DataFrame) -> Dict[str, float]:
    if df.empty or len(df) < 5: return {}
    
    # Standardize column names (Handle Chinese AKShare headers)
    column_mapping = {
        '日期': 'date', '开盘': 'open', '最高': 'high', '最低': 'low', '收盘': 'close',
        '成交量': 'volume', '成交额': 'amount', 
        'Date': 'date', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'
    }
    df = df.rename(columns=column_mapping)
    df.columns = [c.lower() for c in df.columns]
    
    if 'close' not in df.columns:
        logger.warning(f"Technical calculation failed: 'close' column missing. Columns: {df.columns.tolist()}")
        return {}
    
    # Calculate MAs
    for period in [5, 10, 20, 60, 120, 250]:
        df[f'ma{period}'] = df['close'].rolling(window=period).mean()
        
    # Calculate RSI
    def calculate_rsi(data, window):
        delta = data.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / (loss + 1e-9)
        return 100 - (100 / (1 + rs))
        
    for period in [6, 12, 24]:
        df[f'rsi_{period}'] = calculate_rsi(df['close'], period)
        
    # MACD
    exp1 = df['close'].ewm(span=12, adjust=False).mean()
    exp2 = df['close'].ewm(span=26, adjust=False).mean()
    df['macd'] = exp1 - exp2
    df['signal_val'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['hist'] = df['macd'] - df['signal_val']
    
    # KDJ
    low_9 = df['low'].rolling(window=9).min()
    high_9 = df['high'].rolling(window=9).max()
    rsv = (df['close'] - low_9) / (high_9 - low_9 + 1e-9) * 100
    df['k'] = rsv.ewm(com=2).mean()
    df['d'] = df['k'].ewm(com=2).mean()
    df['j'] = 3 * df['k'] - 2 * df['d']
    
    latest = df.iloc[-1]
    return {
        'ma5': clean_value(latest.get('ma5')),
        'ma10': clean_value(latest.get('ma10')),
        'ma20': clean_value(latest.get('ma20')),
        'ma60': clean_value(latest.get('ma60')),
        'ma120': clean_value(latest.get('ma120')),
        'ma250': clean_value(latest.get('ma250')),
        'rsi_6': clean_value(latest.get('rsi_6')),
        'rsi_12': clean_value(latest.get('rsi_12')),
        'rsi_24': clean_value(latest.get('rsi_24')),
        'macd': clean_value(latest.get('macd')),
        'macd_signal': clean_value(latest.get('signal_val')),
        'macd_hist': clean_value(latest.get('hist')),
        'kdj_k': clean_value(latest.get('k')),
        'kdj_d': clean_value(latest.get('d')),
        'kdj_j': clean_value(latest.get('j'))
    }

def get_capital_flow(code: str) -> Dict[str, Any]:
    try:
        # Determine market
        market = "sh" if code.startswith("6") else "sz"
        if code.startswith(("8", "4", "9")): market = "bj"
        
        df = ak.stock_individual_fund_flow(stock=code, market=market)
        if df is not None and not df.empty:
            latest = df.iloc[-1]
            net_inflow = float(latest['主力净流入-净额'])
            return {
                'net_inflow': net_inflow,
                'net_inflow_str': f"{net_inflow/100000000:.2f}亿",
                'net_inflow_ratio': float(latest['主力净流入-净占比']),
                'date': str(latest['日期'])
            }
    except Exception as e:
        logger.warning(f"Capital flow failed for {code}: {e}")
    return {}

# Routes
@app.get("/")
def health(): return {"status": "ok"}

@app.get("/search")
async def search(q: str):
    try:
        stocks = await stock_provider.get_stock_list()
        q_str = q.lower().strip()
        results = []
        for s in stocks:
            c, n = str(s.get("code", "")), str(s.get("name", ""))
            if q_str in c.lower() or q_str in n.lower():
                m = "SH" if c.startswith("6") else ("SZ" if c.startswith(("0", "3")) else ("BJ" if c.startswith(("8", "4", "9")) else "CN"))
                results.append({"name": n, "code": c, "market": m})
            if len(results) >= 10: break
        return {"results": results}
    except Exception as e:
        logger.error(f"Search error: {e}")
        return {"results": []}

@app.get("/fundamentals/{code}")
async def get_fundamentals(code: str):
    try:
        is_hk = code.endswith(".HK") or (len(code) == 5 and code.isdigit())
        is_us = any(c.isalpha() for c in code) and not code.endswith(".HK")
        
        result = {"code": code}
        technicals = {}
        capital_flow = {}

        if is_hk:
            code_hk = f"{int(code):05d}.HK" if code.isdigit() else code
            if HK_AVAILABLE:
                hk_f = await asyncio.to_thread(get_hk_financial_indicators, code_hk)
                result.update({
                    'eps': hk_f.get('eps_basic'), 'bvps': hk_f.get('bps'),
                    'roe': hk_f.get('roe_avg'), 'roa': hk_f.get('roa'),
                    'revenue': hk_f.get('operate_income'), 'net_profit': hk_f.get('holder_profit'),
                    'gross_margin': hk_f.get('gross_profit_ratio'), 'debt_ratio': hk_f.get('debt_asset_ratio')
                })
            try:
                hist = await asyncio.to_thread(ak.stock_hk_daily, symbol=code_hk.split('.')[0], adjust="qfq")
                technicals = calculate_technicals(hist)
            except: pass

        elif is_us:
            ticker = yf.Ticker(code)
            info = ticker.info
            result.update({
                'eps': info.get('trailingEps'), 'bvps': info.get('bookValue'),
                'roe': info.get('returnOnEquity', 0)*100 if info.get('returnOnEquity') else None,
                'revenue': info.get('totalRevenue'), 'net_profit': info.get('netIncomeToCommon'),
                'gross_margin': info.get('grossMargins', 0)*100 if info.get('grossMargins') else None,
                'debt_ratio': info.get('debtToEquity')
            })
            try:
                hist = ticker.history(period="2y")
                technicals = calculate_technicals(hist)
            except: pass

        else:
            # -------------------------------------------------------------
            # A-Share / BJ-Share Handling
            # -------------------------------------------------------------
            
            # Helper to extract value from AKShare records list
            def get_val(records: List[Dict], key_list: List[str]) -> Any:
                if not records: return None
                for r in records:
                    label = r.get('指标') or r.get('item') or r.get('项目') or r.get('项目说明')
                    if label in key_list:
                        # Extract data columns (excluding labels)
                        data_keys = [k for k in r.keys() if k.isdigit()]
                        # Sort keys numerically (dates) to find latest
                        date_keys = sorted(data_keys, reverse=True)
                        if date_keys: return r.get(date_keys[0])
                return None

            try:
                # 1. Fetch MAIN INDICATORS (One single, stable source for all key metrics)
                df_main = await asyncio.to_thread(ak.stock_financial_abstract, symbol=code)
                if df_main is not None and not df_main.empty:
                    main_recs = df_main.to_dict('records')
                    
                    result.update({
                        'eps': get_val(main_recs, ['基本每股收益', '每股收益']),
                        'bvps': get_val(main_recs, ['每股净资产']),
                        'roe': get_val(main_recs, ['净资产收益率(ROE)', '净资产收益率']),
                        'revenue': get_val(main_recs, ['营业总收入', '营业收入']),
                        'net_profit': get_val(main_recs, ['归母净利润', '净利润']),
                        'gross_margin': get_val(main_recs, ['毛利率', '销售毛利率']),
                        'debt_ratio': get_val(main_recs, ['资产负债率'])
                    })
                else:
                    logger.warning(f"Financial abstract empty for {code}")
            except Exception as e:
                logger.error(f"Failed to fetch financial abstract for {code}: {e}")
            
            # 2. Capital Flow (Best effort)
            try:
                market_prefix = "sh" if code.startswith("6") else "sz"
                df_flow = await asyncio.to_thread(ak.stock_individual_fund_flow, symbol=code, market=market_prefix)
                if df_flow is not None and not df_flow.empty:
                    latest_flow = df_flow.iloc[0].to_dict()
                    capital_flow = {
                        'main_net_inflow': latest_flow.get('主力净流入-净额'),
                        'main_net_ratio': latest_flow.get('主力净流入-净占比'),
                        'super_large_net_inflow': latest_flow.get('超大单净流入-净额'),
                        'large_net_inflow': latest_flow.get('大单净流入-净额'),
                        'date': str(latest_flow.get('日期'))
                    }
                    result['capital_flow'] = capital_flow
            except Exception as e:
                logger.debug(f"Capital flow failed for {code}: {e}")

            # 3. Technicals (History)
            try:
                hist = await asyncio.to_thread(ak.stock_zh_a_hist, symbol=code, period="daily", start_date="20230101", adjust="qfq")
                technicals = calculate_technicals(hist)
            except: pass

            # 4. Capital Flow
            try:
                capital_flow = await asyncio.to_thread(get_capital_flow, code)
            except: pass

        result['technicals'] = technicals
        result['capital_flow'] = capital_flow
        return clean_dict(result)

    except Exception as e:
        logger.error(f"Fundamentals error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        config = DEFAULT_CONFIG.copy()
        config.update({
            "llm_provider": "google",
            "backend_url": os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"),
            "deep_think_llm": os.getenv("GEMINI_MODEL", "gemini-3-pro-preview"),
            "quick_think_llm": os.getenv("GEMINI_MODEL", "gemini-3-pro-preview"),
        })
        if "GEMINI_API_KEY" in os.environ: os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]
        ta = TradingAgentsGraph(debug=True, config=config)
        final_state, decision = ta.propagate(req.code, req.date)
        return {"code": req.code, "decision": decision, "final_state": final_state}
    except Exception as e:
        logger.error(f"Analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
