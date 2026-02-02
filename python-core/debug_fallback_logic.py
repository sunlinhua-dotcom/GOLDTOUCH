import asyncio
import akshare as ak
import json
import logging
from typing import List, Dict, Any

# Setup Logging to verify logic flow
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def run_logic(code6: str):
    print(f"\n--- Testing Fallback Logic for {code6} ---\n")
    financial_data = None
    
    # --- PASTE LOGIC START ---
    if not financial_data:
        logger.warning(f"⚠️ 数据库未找到 {code6} 的财务数据，尝试从 AKShare 实时获取...")
        try:
            # 🔥 Fallback Mechanism: Fetch from AKShare directly
            
            # Helper to extract value from AKShare records list (Mirroring api.py logic)
            def get_val(records: List[Dict], key_list: List[str]) -> Any:
                if not records: return None
                for r in records:
                    label = r.get('指标') or r.get('item') or r.get('项目') or r.get('项目说明')
                    if label in key_list:
                        # Extract data columns (excluding labels)
                        data_keys = [k for k in r.keys() if k.isdigit()]
                        # Sort keys numerically (dates) to find latest
                        date_keys = sorted(data_keys, reverse=True)
                        if date_keys: 
                            val = r.get(date_keys[0])
                            # Handle empty strings or None
                            if val == '' or val is None:
                                return None
                            try:
                                return float(val)
                            except:
                                return val
                return None

            print("Called ak.stock_financial_abstract...")
            df_main = await asyncio.to_thread(ak.stock_financial_abstract, symbol=code6)
            
            if df_main is not None:
                print(f"AKShare returned data shape: {df_main.shape}")
                # print("First 5 columns:", df_main.columns[:5].tolist())
            else:
                print("AKShare returned None")

            if df_main is not None and not df_main.empty:
                main_recs = df_main.to_dict('records')

                # Construct a temporary financial_data object
                financial_data = {
                    'eps': get_val(main_recs, ['基本每股收益', '每股收益']),
                    'bvps': get_val(main_recs, ['每股净资产']),
                    'roe': get_val(main_recs, ['净资产收益率(ROE)', '净资产收益率']),
                    'roa': get_val(main_recs, ['总资产报酬率', 'ROA']), # Try to get ROA
                    'revenue': get_val(main_recs, ['营业总收入', '营业收入']),
                    'net_profit': get_val(main_recs, ['归母净利润', '净利润']),
                    'net_profit_parent': get_val(main_recs, ['归母净利润']), # Alias
                    'gross_margin': get_val(main_recs, ['毛利率', '销售毛利率']),
                    'net_profit_margin': get_val(main_recs, ['净利率', '销售净利率']), # Try to get Net Margin
                    'debt_to_assets': get_val(main_recs, ['资产负债率']),
                    'report_period': 'realtime_fallback',
                    'source': 'akshare_fallback'
                }

                logger.info(f"✅ 从 AKShare 实时获取财务数据成功 (Source: {financial_data['source']})")
                print("\nConstructed Data:")
                print(json.dumps(financial_data, indent=2, ensure_ascii=False))
            else:
                logger.warning(f"⚠️ AKShare 实时获取财务数据为空: {code6}")
        except Exception as e:
            logger.error(f"❌ AKShare 实时获取财务数据失败: {e}")
            import traceback
            traceback.print_exc()

    # --- PASTE LOGIC END ---

if __name__ == "__main__":
    asyncio.run(run_logic("002223"))
