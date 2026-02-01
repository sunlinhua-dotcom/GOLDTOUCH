import os

file_path = "python-core/tradingagents/dataflows/providers/china/akshare.py"

new_method_code = '''    async def get_stock_quotes(self, code: str) -> Optional[Dict[str, Any]]:
        """
        获取单个股票实时行情 (Robust Version)
        Fallback Strategy: stock_bid_ask_em -> stock_zh_a_spot_em (Snapshot)
        """
        if not self.connected: return None

        # -------------------------------------------------------------
        # 1. Primary Method: stock_bid_ask_em (Detailed Quote)
        # -------------------------------------------------------------
        try:
            logger.info(f"📈 Fetching bid_ask for {code}...")
            # Run in thread pool
            bid_ask_df = await asyncio.to_thread(self.ak.stock_bid_ask_em, symbol=code)
            
            if bid_ask_df is not None and not bid_ask_df.empty:
                data_dict = dict(zip(bid_ask_df['item'], bid_ask_df['value']))
                logger.info(f"✅ Bid/Ask Success for {code}")
                
                 # 🔥 获取当前日期（UTC+8）
                from datetime import datetime, timezone, timedelta
                cn_tz = timezone(timedelta(hours=8))
                now_cn = datetime.now(cn_tz)
                trade_date = now_cn.strftime("%Y-%m-%d")
                
                # 🔥 成交量单位转换：手 → 股（1手 = 100股）
                volume_in_lots = self._safe_int(data_dict.get("总手", 0))  # 单位：手
                volume_in_shares = volume_in_lots * 100  # 单位：股

                # Map to standard format
                return {
                     "code": code,
                     "symbol": code,
                     "name": f"股票{code}",  # stock_bid_ask_em 不返回股票名称
                     "price": self._safe_float(data_dict.get('最新', 0)),
                     "close": self._safe_float(data_dict.get('最新', 0)),
                     "current_price": self._safe_float(data_dict.get('最新', 0)),
                     "change": self._safe_float(data_dict.get('涨跌', 0)), 
                     "change_percent": self._safe_float(data_dict.get('涨幅', 0)),
                     "pct_chg": self._safe_float(data_dict.get('涨幅', 0)),
                     "volume": volume_in_shares,
                     "amount": self._safe_float(data_dict.get("金额", 0)), 
                     "open": self._safe_float(data_dict.get("今开", 0)), 
                     "high": self._safe_float(data_dict.get("最高", 0)), 
                     "low": self._safe_float(data_dict.get("最低", 0)),
                     "pre_close": self._safe_float(data_dict.get("昨收", 0)),
                     "turnover_rate": self._safe_float(data_dict.get("换手", 0)),  
                     "volume_ratio": self._safe_float(data_dict.get("量比", 0)), 
                     "pe": None, 
                     "pe_ttm": None,
                     "pb": None,
                     "total_mv": None,
                     "circ_mv": None,
                     "trade_date": trade_date,
                     "updated_at": now_cn.isoformat(),
                     "full_symbol": self._get_full_symbol(code),
                     "market_info": self._get_market_info(code),
                     "data_source": "akshare_bid_ask",
                     "last_sync": datetime.now(timezone.utc),
                     "sync_status": "success"
                }
        except Exception as e1:
            logger.warning(f"⚠️ Bid/Ask failed for {code}: {e1}")

        # -------------------------------------------------------------
        # 2. Fallback Method: stock_zh_a_spot_em (Snapshot Scan)
        # -------------------------------------------------------------
        try:
             logger.info(f"🔄 Fallback: Scanning market snapshot for {code}...")
             
             if code.endswith(".HK") or (code.isdigit() and len(code) == 5):
                  # HK Fallback
                  df_spot = await asyncio.to_thread(self.ak.stock_hk_spot_em)
                  row = df_spot[df_spot['代码'] == code]
             else:
                  # A-Share Fallback
                  df_spot = await asyncio.to_thread(self.ak.stock_zh_a_spot_em)
                  row = df_spot[df_spot['代码'] == code]
             
             if not row.empty:
                  r = row.iloc[0]
                  logger.info(f"✅ Fallback Success for {code}")
                  
                  from datetime import datetime, timezone, timedelta
                  cn_tz = timezone(timedelta(hours=8))
                  now_cn = datetime.now(cn_tz)
                  trade_date = now_cn.strftime("%Y-%m-%d")
                  
                  return {
                      "code": code,
                      "symbol": code,
                      "price": self._safe_float(r.get('最新价')),
                      "change_percent": self._safe_float(r.get('涨跌幅')),
                      "change": self._safe_float(r.get('涨跌额')),
                      "volume": self._safe_int(r.get('成交量')),
                      "amount": self._safe_float(r.get('成交额')),
                      "pe": self._safe_float(r.get('市盈率-动态')),
                      "market_cap": self._safe_float(r.get('总市值')),
                      "name": str(r.get('名称')),
                      "trade_date": trade_date,
                      "updated_at": now_cn.isoformat(),
                      "full_symbol": self._get_full_symbol(code),
                      "market_info": self._get_market_info(code),
                      "data_source": "akshare_snapshot",
                      "last_sync": datetime.now(timezone.utc),
                      "sync_status": "success"
                  }
        except Exception as e2:
             logger.error(f"❌ All quote fetch methods failed for {code}: {e2}")

        return None
'''

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    start_index = -1
    end_index = -1
    
    # Simple state machine to find start/end lines
    for i, line in enumerate(lines):
        if "async def get_stock_quotes(self, code: str)" in line:
            start_index = i
        if "async def _get_realtime_quotes_data(self, code: str)" in line:
            end_index = i
            break
            
    if start_index != -1 and end_index != -1:
        print(f"Found method block from line {start_index+1} to {end_index}")
        
        # Keep everything before start_index
        new_lines = lines[:start_index]
        
        # Insert new code (split by newlines to match list format)
        new_lines.extend([l + '\\n' for l in new_method_code.split('\\n')])
        
        # Insert a newline margin
        new_lines.append('\\n')
        
        # Keep everything from end_index onwards
        new_lines.extend(lines[end_index:])
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
            
        print("✅ Successfully patched akshare.py")
        
    else:
        print(f"❌ Could not find start/end markers. Start: {start_index}, End: {end_index}")

except Exception as e:
    print(f"❌ Error patching file: {e}")
