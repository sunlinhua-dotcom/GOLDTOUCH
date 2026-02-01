from langchain_core.messages import AIMessage
import time
import json

# 导入统一日志系统
from tradingagents.utils.logging_init import get_logger
logger = get_logger("default")


def create_bull_researcher(llm, memory):
    def bull_node(state) -> dict:
        logger.debug(f"🐂 [DEBUG] ===== 看涨研究员节点开始 =====")

        investment_debate_state = state["investment_debate_state"]
        history = investment_debate_state.get("history", "")
        bull_history = investment_debate_state.get("bull_history", "")

        current_response = investment_debate_state.get("current_response", "")
        market_research_report = state["market_report"]
        sentiment_report = state["sentiment_report"]
        news_report = state["news_report"]
        fundamentals_report = state["fundamentals_report"]

        # 使用统一的股票类型检测
        ticker = state.get('company_of_interest', 'Unknown')
        from tradingagents.utils.stock_utils import StockUtils
        market_info = StockUtils.get_market_info(ticker)
        is_china = market_info['is_china']

        # 获取公司名称
        def _get_company_name(ticker_code: str, market_info_dict: dict) -> str:
            """根据股票代码获取公司名称"""
            try:
                if market_info_dict['is_china']:
                    from tradingagents.dataflows.interface import get_china_stock_info_unified
                    stock_info = get_china_stock_info_unified(ticker_code)
                    if stock_info and "股票名称:" in stock_info:
                        name = stock_info.split("股票名称:")[1].split("\n")[0].strip()
                        logger.info(f"✅ [多头研究员] 成功获取中国股票名称: {ticker_code} -> {name}")
                        return name
                    else:
                        # 降级方案
                        try:
                            from tradingagents.dataflows.data_source_manager import get_china_stock_info_unified as get_info_dict
                            info_dict = get_info_dict(ticker_code)
                            if info_dict and info_dict.get('name'):
                                name = info_dict['name']
                                logger.info(f"✅ [多头研究员] 降级方案成功获取股票名称: {ticker_code} -> {name}")
                                return name
                        except Exception as e:
                            logger.error(f"❌ [多头研究员] 降级方案也失败: {e}")
                elif market_info_dict['is_hk']:
                    try:
                        from tradingagents.dataflows.providers.hk.improved_hk import get_hk_company_name_improved
                        name = get_hk_company_name_improved(ticker_code)
                        return name
                    except Exception:
                        clean_ticker = ticker_code.replace('.HK', '').replace('.hk', '')
                        return f"港股{clean_ticker}"
                elif market_info_dict['is_us']:
                    us_stock_names = {
                        'AAPL': '苹果公司', 'TSLA': '特斯拉', 'NVDA': '英伟达',
                        'MSFT': '微软', 'GOOGL': '谷歌', 'AMZN': '亚马逊',
                        'META': 'Meta', 'NFLX': '奈飞'
                    }
                    return us_stock_names.get(ticker_code.upper(), f"美股{ticker_code}")
            except Exception as e:
                logger.error(f"❌ [多头研究员] 获取公司名称失败: {e}")
            return f"股票代码{ticker_code}"

        company_name = _get_company_name(ticker, market_info)
        is_hk = market_info['is_hk']
        is_us = market_info['is_us']

        currency = market_info['currency_name']
        currency_symbol = market_info['currency_symbol']

        logger.debug(f"🐂 [DEBUG] 接收到的报告:")
        logger.debug(f"🐂 [DEBUG] - 市场报告长度: {len(market_research_report)}")
        logger.debug(f"🐂 [DEBUG] - 情绪报告长度: {len(sentiment_report)}")
        logger.debug(f"🐂 [DEBUG] - 新闻报告长度: {len(news_report)}")
        logger.debug(f"🐂 [DEBUG] - 基本面报告长度: {len(fundamentals_report)}")
        logger.debug(f"🐂 [DEBUG] - 基本面报告前200字符: {fundamentals_report[:200]}...")
        logger.debug(f"🐂 [DEBUG] - 股票代码: {ticker}, 公司名称: {company_name}, 类型: {market_info['market_name']}, 货币: {currency}")
        logger.debug(f"🐂 [DEBUG] - 市场详情: 中国A股={is_china}, 港股={is_hk}, 美股={is_us}")

        curr_situation = f"{market_research_report}\n\n{sentiment_report}\n\n{news_report}\n\n{fundamentals_report}"

        # 安全检查：确保memory不为None
        if memory is not None:
            past_memories = memory.get_memories(curr_situation, n_matches=2)
        else:
            logger.warning(f"⚠️ [DEBUG] memory为None，跳过历史记忆检索")
            past_memories = []

        past_memory_str = ""
        for i, rec in enumerate(past_memories, 1):
            past_memory_str += rec["recommendation"] + "\n\n"

        prompt = f"""
CRITICAL: ONLY CHINESE OUTPUT. LATIN CHARACTERS (A-Z) ARE STRICTLY FORBIDDEN.

**身份设定**：
你是一位【资深多头策略师】，不仅看好公司，更要为“买入”决策寻找铁证。
你的职责是：构建逻辑严密的做多逻辑，反驳市场噪音。

**核心准则**：
1. **语言铁律**：全过程使用【简体中文】。严禁输出任何英文字母。
2. **逻辑要求**：不要堆砌数据，要讲清楚“为什么现在是买点”。
3. **辩论风格**：犀利反击空头观点，用增长及护城河数据说话。

**分析维度**：
- **增长引擎**：未来的收入/利润爆发点在哪里？
- **护城河**：为什么竞争对手打不赢它？
- **催化剂**：近期有什么事件能引爆股价？

请基于以下资料构建你的多头论述：
市场研究：{market_research_report}
情绪报告：{sentiment_report}
新闻情报：{news_report}
基本面：{fundamentals_report}
辩论历史：{history}
对手观点：{current_response}

**输出要求**：
直接输出你的多头论述，不要有开场白。
"""

        response = llm.invoke(prompt)

        argument = f"Bull Analyst: {response.content}"

        new_count = investment_debate_state["count"] + 1
        logger.info(f"🐂 [多头研究员] 发言完成，计数: {investment_debate_state['count']} -> {new_count}")

        new_investment_debate_state = {
            "history": history + "\n" + argument,
            "bull_history": bull_history + "\n" + argument,
            "bear_history": investment_debate_state.get("bear_history", ""),
            "current_response": argument,
            "count": new_count,
        }

        return {"investment_debate_state": new_investment_debate_state}

    return bull_node
