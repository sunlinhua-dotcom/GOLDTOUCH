import time
import json

# 导入统一日志系统
from tradingagents.utils.logging_init import get_logger
logger = get_logger("default")


def create_research_manager(llm, memory):
    def research_manager_node(state) -> dict:
        history = state["investment_debate_state"].get("history", "")
        market_research_report = state["market_report"]
        sentiment_report = state["sentiment_report"]
        news_report = state["news_report"]
        fundamentals_report = state["fundamentals_report"]

        investment_debate_state = state["investment_debate_state"]

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
你是一位【首席投资官 (CIO)】，拥有最终决策权。
你的职责是：听取多空双方辩论，做出唯一的投资决策（买入/卖出/持有）。

**核心准则**：
1. **语言铁律**：全过程使用【简体中文】。严禁输出任何英文字母。
2. **决策要求**：不要和稀泥。如果多头逻辑更强，就坚决买入；如果风险太大，就坚决卖出或观望。
3. **输出结构**：必须包含【最终决策】、【核心理由】、【交易计划】。

**分析维度**：
- **基本面**：估值是否合理？
- **技术面**：现在是介入的好时机吗？
- **情绪面**：市场是否过于拥挤？

请基于以下资料做出决策：
市场研究：{market_research_report}
情绪报告：{sentiment_report}
新闻情报：{news_report}
基本面：{fundamentals_report}
辩论历史：{history}

**输出模板**：

# Not Financial Advice (仅供参考)

## 1. CIO最终决策：[买入 / 卖出 / 持有]
（一句话解释为什么）

## 2. 核心逻辑支撑
*   **支持方**：(引用多头或空头最有力的论点)
*   **否决方**：(指出另一方逻辑的致命弱点)

## 3. 交易执行计划
*   **目标价格**：¥____
*   **抄底/入场位**：¥____
*   **止损红线**：¥____
*   **仓位建议**：(轻仓/半仓/重仓)

## 4. 风险控制
（如果行情走反了，怎么办？）
"""

        # 📊 统计 prompt 大小
        prompt_length = len(prompt)
        estimated_tokens = int(prompt_length / 1.8)

        logger.info(f"📊 [Research Manager] Prompt 统计:")
        logger.info(f"   - 辩论历史长度: {len(history)} 字符")
        logger.info(f"   - 总 Prompt 长度: {prompt_length} 字符")
        logger.info(f"   - 估算输入 Token: ~{estimated_tokens} tokens")

        # ⏱️ 记录开始时间
        start_time = time.time()

        response = llm.invoke(prompt)

        # ⏱️ 记录结束时间
        elapsed_time = time.time() - start_time

        # 📊 统计响应信息
        response_length = len(response.content) if response and hasattr(response, 'content') else 0
        estimated_output_tokens = int(response_length / 1.8)

        logger.info(f"⏱️ [Research Manager] LLM调用耗时: {elapsed_time:.2f}秒")
        logger.info(f"📊 [Research Manager] 响应统计: {response_length} 字符, 估算~{estimated_output_tokens} tokens")

        new_investment_debate_state = {
            "judge_decision": response.content,
            "history": investment_debate_state.get("history", ""),
            "bear_history": investment_debate_state.get("bear_history", ""),
            "bull_history": investment_debate_state.get("bull_history", ""),
            "current_response": response.content,
            "count": investment_debate_state["count"],
        }

        return {
            "investment_debate_state": new_investment_debate_state,
            "investment_plan": response.content,
        }

    return research_manager_node
