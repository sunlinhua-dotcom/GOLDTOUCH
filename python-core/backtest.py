
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import akshare as ak
from datetime import datetime, timedelta
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

class BacktestRequest(BaseModel):
    code: str
    start_date: str = None
    end_date: str = None
    strategy: str = "ma_cross"  # Default to MA Cross
    initial_capital: float = 100000.0

@router.post("/backtest")
async def run_backtest(req: BacktestRequest):
    try:
        logger.info(f"🚀 Starting Backtest for {req.code}...")
        
        # 1. Fetch Historical Data (Last 1 Year by default)
        end_date = req.end_date or datetime.now().strftime("%Y%m%d")
        start_date = req.start_date or (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")
        
        # Standardize code for AkShare (assuming A-share for now)
        # Simple heuristic: if 6 start, SH; if 0/3 start, SZ
        symbol = req.code
        if symbol.isdigit():
             # Use the qfq (forward adjusted) data for backtest
            try:
                stock_df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date=start_date, end_date=end_date, adjust="qfq")
            except Exception as e:
                logger.error(f"AkShare fetch failed: {e}")
                raise HTTPException(status_code=404, detail="Stock data not found")
        else:
             raise HTTPException(status_code=400, detail="Invalid stock code format")

        if stock_df.empty:
            raise HTTPException(status_code=404, detail="No data found for this period")

        # 2. Strategy Logic (Simple MA Cross: MA5 vs MA20)
        # Rename columns for convenience
        df = stock_df.rename(columns={
            "日期": "date", "开盘": "open", "收盘": "close", 
            "最高": "high", "最低": "low", "成交量": "volume"
        })
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
        
        # Calculate Indicators
        df['MA5'] = df['close'].rolling(window=5).mean()
        df['MA20'] = df['close'].rolling(window=20).mean()
        
        # 3. Vectorized Backtest
        # Signal: 1 (Buy) if MA5 > MA20, 0 (Sell) otherwise
        df['Signal'] = 0
        df.loc[df['MA5'] > df['MA20'], 'Signal'] = 1
        
        # Position: Shift signal by 1 day to avoid look-ahead bias (trade on next open)
        df['Position'] = df['Signal'].shift(1)
        
        # Daily Returns
        df['Market_Return'] = df['close'].pct_change()
        df['Strategy_Return'] = df['Position'] * df['Market_Return']
        
        # Equity Curve
        df['Market_Value'] = req.initial_capital * (1 + df['Market_Return']).cumprod()
        df['Strategy_Value'] = req.initial_capital * (1 + df['Strategy_Return']).cumprod()
        
        # Fill NaN
        df.fillna(method='bfill', inplace=True)
        df.fillna(req.initial_capital, inplace=True)

        # 4. Metrics
        total_return = (df['Strategy_Value'].iloc[-1] / req.initial_capital) - 1
        annualized_return = (1 + total_return) ** (252 / len(df)) - 1
        max_drawdown = ((df['Strategy_Value'].cummax() - df['Strategy_Value']) / df['Strategy_Value'].cummax()).max()

        # Format Chart Data
        chart_data = []
        for date, row in df.iterrows():
            chart_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "value": round(row['Strategy_Value'], 2),
                "benchmark": round(row['Market_Value'], 2),
                "ma5": round(row['MA5'], 2) if not pd.isna(row['MA5']) else None,
                "ma20": round(row['MA20'], 2) if not pd.isna(row['MA20']) else None,
            })

        return {
            "code": req.code,
            "metrics": {
                "total_return": f"{total_return*100:.2f}%",
                "annualized_return": f"{annualized_return*100:.2f}%",
                "max_drawdown": f"{max_drawdown*100:.2f}%",
                "final_capital": round(df['Strategy_Value'].iloc[-1], 2)
            },
            "chart_data": chart_data
        }

    except Exception as e:
        logger.error(f"Backtest error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
