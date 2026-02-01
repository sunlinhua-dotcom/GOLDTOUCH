from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import time
import json
from datetime import datetime

# 导入统一日志系统和分析模块日志装饰器
from tradingagents.utils.logging_init import get_logger
from tradingagents.utils.tool_logging import log_analyst_module
# 导入统一新闻工具
from tradingagents.tools.unified_news_tool import create_unified_news_tool
# 导入股票工具类
from tradingagents.utils.stock_utils import StockUtils
# 导入Google工具调用处理器
from tradingagents.agents.utils.google_tool_handler import GoogleToolCallHandler

logger = get_logger("analysts.news")


def create_news_analyst(llm, toolkit):
    @log_analyst_module("news")
    def news_analyst_node(state):
        start_time = datetime.now()

        # 🔧 工具调用计数器 - 防止无限循环
        tool_call_count = state.get("news_tool_call_count", 0)
        max_tool_calls = 3  # 最大工具调用次数
        logger.info(f"🔧 [死循环修复] 当前工具调用次数: {tool_call_count}/{max_tool_calls}")

        current_date = state["trade_date"]
        ticker = state["company_of_interest"]

        logger.info(f"[新闻分析师] 开始分析 {ticker} 的新闻，交易日期: {current_date}")
        session_id = state.get("session_id", "未知会话")
        logger.info(f"[新闻分析师] 会话ID: {session_id}，开始时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 获取市场信息
        market_info = StockUtils.get_market_info(ticker)
        logger.info(f"[新闻分析师] 股票类型: {market_info['market_name']}")
        
        # 获取公司名称
        def _get_company_name(ticker: str, market_info: dict) -> str:
            """根据股票代码获取公司名称"""
            try:
                if market_info['is_china']:
                    # 中国A股：使用统一接口获取股票信息
                    from tradingagents.dataflows.interface import get_china_stock_info_unified
                    stock_info = get_china_stock_info_unified(ticker)
                    
                    # 解析股票名称
                    if "股票名称:" in stock_info:
                        company_name = stock_info.split("股票名称:")[1].split("\n")[0].strip()
                        logger.debug(f"📊 [DEBUG] 从统一接口获取中国股票名称: {ticker} -> {company_name}")
                        return company_name
                    else:
                        logger.warning(f"⚠️ [DEBUG] 无法从统一接口解析股票名称: {ticker}")
                        return f"股票代码{ticker}"
                        
                elif market_info['is_hk']:
                    # 港股：使用改进的港股工具
                    try:
                        from tradingagents.dataflows.providers.hk.improved_hk import get_hk_company_name_improved
                        company_name = get_hk_company_name_improved(ticker)
                        logger.debug(f"📊 [DEBUG] 使用改进港股工具获取名称: {ticker} -> {company_name}")
                        return company_name
                    except Exception as e:
                        logger.debug(f"📊 [DEBUG] 改进港股工具获取名称失败: {e}")
                        # 降级方案：生成友好的默认名称
                        clean_ticker = ticker.replace('.HK', '').replace('.hk', '')
                        return f"港股{clean_ticker}"
                        
                elif market_info['is_us']:
                    # 美股：使用简单映射或返回代码
                    us_stock_names = {
                        'AAPL': '苹果公司',
                        'TSLA': '特斯拉',
                        'NVDA': '英伟达',
                        'MSFT': '微软',
                        'GOOGL': '谷歌',
                        'AMZN': '亚马逊',
                        'META': 'Meta',
                        'NFLX': '奈飞'
                    }
                    
                    company_name = us_stock_names.get(ticker.upper(), f"美股{ticker}")
                    logger.debug(f"📊 [DEBUG] 美股名称映射: {ticker} -> {company_name}")
                    return company_name
                    
                else:
                    return f"股票{ticker}"
                    
            except Exception as e:
                logger.error(f"❌ [DEBUG] 获取公司名称失败: {e}")
                return f"股票{ticker}"
        
        company_name = _get_company_name(ticker, market_info)
        logger.info(f"[新闻分析师] 公司名称: {company_name}")
        
        # 🔧 使用统一新闻工具，简化工具调用
        logger.info(f"[新闻分析师] 使用统一新闻工具，自动识别股票类型并获取相应新闻")
   # 创建统一新闻工具
        unified_news_tool = create_unified_news_tool(toolkit)
        unified_news_tool.name = "get_stock_news_unified"
        
        tools = [unified_news_tool]
        logger.info(f"[新闻分析师] 已加载统一新闻工具: get_stock_news_unified")

        system_message = (
            """
CRITICAL: ONLY CHINESE OUTPUT. LATIN CHARACTERS (A-Z) ARE STRICTLY FORBIDDEN.

**身份设定**：
你是一位【首席财经新闻分析师】，服务于顶级量化交易团队。
你的职责不是复述新闻，而是从海量资讯中提取“交易信号”。
你的风格是：客观、量化、直接。拒绝模棱两可。

**核心准则**：
1. **语言铁律**：全过程使用【简体中文】。严禁输出任何英文字母。
2. **拒绝废话**：不要复述新闻标题，直接给出影响分析。
3. **结构化输出**：必须包含【新闻情绪评分】和【价格影响预判】。

**分析模板**：

# 📰 [股票名] 核心新闻情报

## 1. 关键事件驱动
（用一句话概括最重要的新闻事件，并定性：重大利好/利空/中性）

## 2. 也是干货：交易影响分析
*   **短期冲击**：(1-3天价格影响预判)
*   **情绪评分**：(0-10分，0为极度恐慌，10为极度狂热)
*   **机构视角**：(机构资金可能如何解读此消息)

## 3. 风险预警
（新闻中隐藏的雷点，如财报不及预期、监管风险等）
"""
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                (
                    "system",
                    """
**任务指令**：
1. **必须** 首先调用 `get_stock_news_unified` 获取数据。
2. 获取数据后，立即应用上述【首席财经新闻分析师】系统提示词进行分析。
3. **严禁** 在无数据情况下编造分析。
4. **再次强调**：全篇禁止英文，必须包含具体的情绪评分。

开始执行。
""",
                ),
                ),
                MessagesPlaceholder(variable_name="messages"),
            ]
        )

        prompt = prompt.partial(system_message=system_message)
        prompt = prompt.partial(tool_names=", ".join([tool.name for tool in tools]))
        prompt = prompt.partial(current_date=current_date)
        prompt = prompt.partial(ticker=ticker)
        
        # 获取模型信息用于统一新闻工具的特殊处理
        model_info = ""
        try:
            if hasattr(llm, 'model_name'):
                model_info = f"{llm.__class__.__name__}:{llm.model_name}"
            else:
                model_info = llm.__class__.__name__
        except:
            model_info = "Unknown"
        
        logger.info(f"[新闻分析师] 准备调用LLM进行新闻分析，模型: {model_info}")
        
        # 🚨 DashScope/DeepSeek/Zhipu预处理：强制获取新闻数据
        pre_fetched_news = None
        if ('DashScope' in llm.__class__.__name__ 
            or 'DeepSeek' in llm.__class__.__name__
            or 'Zhipu' in llm.__class__.__name__
            ):
            logger.warning(f"[新闻分析师] 🚨 检测到{llm.__class__.__name__}模型，启动预处理强制新闻获取...")
            try:
                # 强制预先获取新闻数据
                logger.info(f"[新闻分析师] 🔧 预处理：强制调用统一新闻工具...")
                logger.info(f"[新闻分析师] 📊 调用参数: stock_code={ticker}, max_news=10, model_info={model_info}")

                pre_fetched_news = unified_news_tool(stock_code=ticker, max_news=10, model_info=model_info)

                logger.info(f"[新闻分析师] 📋 预处理返回结果长度: {len(pre_fetched_news) if pre_fetched_news else 0} 字符")
                logger.info(f"[新闻分析师] 📄 预处理返回结果预览 (前500字符): {pre_fetched_news[:500] if pre_fetched_news else 'None'}")

                if pre_fetched_news and len(pre_fetched_news.strip()) > 100:
                    logger.info(f"[新闻分析师] ✅ 预处理成功获取新闻: {len(pre_fetched_news)} 字符")

                    # 直接基于预获取的新闻生成分析，跳过工具调用
                    # 🔧 重要：构建不包含工具调用指导的系统提示词
                    analysis_system_prompt = f"""
CRITICAL: ONLY CHINESE OUTPUT. LATIN CHARACTERS (A-Z) ARE STRICTLY FORBIDDEN.

**身份设定**：
你是一位【首席财经新闻分析师】。
你的职责是基于提供的新闻数据，提取“交易信号”。

**核心准则**：
1. **语言铁律**：全过程使用【简体中文】。严禁输出任何英文字母。
2. **拒绝废话**：直接给出影响分析。
3. **结构化输出**：
    - 关键事件
    - 情绪评分 (0-10)
    - 价格影响 (利多/利空/中性)

重要说明：新闻数据已经为您提供，您无需调用任何工具。
"""

                    enhanced_prompt = f"""请基于以下已获取的最新新闻数据，对股票 {ticker}（{company_name}）进行详细的新闻分析：

=== 最新新闻数据 ===
{pre_fetched_news}

请撰写详细的中文分析报告，包括：
1. 新闻事件总结
2. 对股票的影响分析
3. 市场情绪评估
4. 投资建议"""

                    logger.info(f"[新闻分析师] 🔄 使用预获取新闻数据直接生成分析...")
                    logger.info(f"[新闻分析师] 📝 系统提示词长度: {len(analysis_system_prompt)} 字符")
                    logger.info(f"[新闻分析师] 📝 用户提示词长度: {len(enhanced_prompt)} 字符")

                    llm_start_time = datetime.now()
                    # 🔧 重要：传递系统消息和用户消息，不包含工具调用
                    result = llm.invoke([
                        {"role": "system", "content": analysis_system_prompt},
                        {"role": "user", "content": enhanced_prompt}
                    ])

                    llm_end_time = datetime.now()
                    llm_time_taken = (llm_end_time - llm_start_time).total_seconds()
                    logger.info(f"[新闻分析师] LLM调用完成（预处理模式），耗时: {llm_time_taken:.2f}秒")

                    # 直接返回结果，跳过后续的工具调用检测
                    if hasattr(result, 'content') and result.content:
                        report = result.content
                        logger.info(f"[新闻分析师] ✅ 预处理模式成功，报告长度: {len(report)} 字符")
                        logger.info(f"[新闻分析师] 📄 报告预览 (前300字符): {report[:300]}")

                        # 跳转到最终处理
                        from langchain_core.messages import AIMessage
                        clean_message = AIMessage(content=report)

                        end_time = datetime.now()
                        time_taken = (end_time - start_time).total_seconds()
                        logger.info(f"[新闻分析师] 新闻分析完成（预处理模式），总耗时: {time_taken:.2f}秒")
                        # 🔧 更新工具调用计数器
                        return {
                            "messages": [clean_message],
                            "news_report": report,
                            "news_tool_call_count": tool_call_count + 1
                        }
                    else:
                        logger.warning(f"[新闻分析师] ⚠️ LLM返回结果为空，回退到标准模式")

                else:
                    logger.warning(f"[新闻分析师] ⚠️ 预处理获取新闻失败或内容过短（{len(pre_fetched_news) if pre_fetched_news else 0}字符），回退到标准模式")
                    if pre_fetched_news:
                        logger.warning(f"[新闻分析师] 📄 失败的新闻内容: {pre_fetched_news}")

            except Exception as e:
                logger.error(f"[新闻分析师] ❌ 预处理失败: {e}，回退到标准模式")
                import traceback
                logger.error(f"[新闻分析师] 📋 异常堆栈: {traceback.format_exc()}")
        
        # 使用统一的Google工具调用处理器
        llm_start_time = datetime.now()
        chain = prompt | llm.bind_tools(tools)
        logger.info(f"[新闻分析师] 开始LLM调用，分析 {ticker} 的新闻")
        # 修复：传递字典而不是直接传递消息列表，以便 ChatPromptTemplate 能正确处理所有变量
        result = chain.invoke({"messages": state["messages"]})
        
        llm_end_time = datetime.now()
        llm_time_taken = (llm_end_time - llm_start_time).total_seconds()
        logger.info(f"[新闻分析师] LLM调用完成，耗时: {llm_time_taken:.2f}秒")

        # 使用统一的Google工具调用处理器
        if GoogleToolCallHandler.is_google_model(llm):
            logger.info(f"📊 [新闻分析师] 检测到Google模型，使用统一工具调用处理器")
            
            # 创建分析提示词
            analysis_prompt_template = GoogleToolCallHandler.create_analysis_prompt(
                ticker=ticker,
                company_name=company_name,
                analyst_type="新闻分析",
                specific_requirements="重点关注新闻事件对股价的影响、市场情绪变化、政策影响等。"
            )
            
            # 处理Google模型工具调用
            report, messages = GoogleToolCallHandler.handle_google_tool_calls(
                result=result,
                llm=llm,
                tools=tools,
                state=state,
                analysis_prompt_template=analysis_prompt_template,
                analyst_name="新闻分析师"
            )
        else:
            # 非Google模型的处理逻辑
            logger.info(f"[新闻分析师] 非Google模型 ({llm.__class__.__name__})，使用标准处理逻辑")

            # 检查工具调用情况
            current_tool_calls = len(result.tool_calls) if hasattr(result, 'tool_calls') else 0
            logger.info(f"[新闻分析师] LLM调用了 {current_tool_calls} 个工具")
            logger.debug(f"📊 [DEBUG] 累计工具调用次数: {tool_call_count}/{max_tool_calls}")

            if current_tool_calls == 0:
                logger.warning(f"[新闻分析师] ⚠️ {llm.__class__.__name__} 没有调用任何工具，启动补救机制...")
                logger.warning(f"[新闻分析师] 📄 LLM原始响应内容 (前500字符): {result.content[:500] if hasattr(result, 'content') else 'No content'}")

                try:
                    # 强制获取新闻数据
                    logger.info(f"[新闻分析师] 🔧 强制调用统一新闻工具获取新闻数据...")
                    logger.info(f"[新闻分析师] 📊 调用参数: stock_code={ticker}, max_news=10")

                    forced_news = unified_news_tool(stock_code=ticker, max_news=10, model_info=model_info)

                    logger.info(f"[新闻分析师] 📋 强制获取返回结果长度: {len(forced_news) if forced_news else 0} 字符")
                    logger.info(f"[新闻分析师] 📄 强制获取返回结果预览 (前500字符): {forced_news[:500] if forced_news else 'None'}")

                    if forced_news and len(forced_news.strip()) > 100:
                        logger.info(f"[新闻分析师] ✅ 强制获取新闻成功: {len(forced_news)} 字符")

                        # 基于真实新闻数据重新生成分析
                        forced_prompt = f"""
您是一位专业的财经新闻分析师。请基于以下最新获取的新闻数据，对股票 {ticker}（{company_name}）进行详细的新闻分析：

=== 最新新闻数据 ===
{forced_news}

=== 分析要求 ===
{system_message}

请基于上述真实新闻数据撰写详细的中文分析报告。
"""

                        logger.info(f"[新闻分析师] 🔄 基于强制获取的新闻数据重新生成完整分析...")
                        logger.info(f"[新闻分析师] 📝 强制提示词长度: {len(forced_prompt)} 字符")

                        forced_result = llm.invoke([{"role": "user", "content": forced_prompt}])

                        if hasattr(forced_result, 'content') and forced_result.content:
                            report = forced_result.content
                            logger.info(f"[新闻分析师] ✅ 强制补救成功，生成基于真实数据的报告，长度: {len(report)} 字符")
                            logger.info(f"[新闻分析师] 📄 报告预览 (前300字符): {report[:300]}")
                        else:
                            logger.warning(f"[新闻分析师] ⚠️ 强制补救LLM返回为空，使用原始结果")
                            report = result.content if hasattr(result, 'content') else ""
                    else:
                        logger.warning(f"[新闻分析师] ⚠️ 统一新闻工具获取失败或内容过短（{len(forced_news) if forced_news else 0}字符），使用原始结果")
                        if forced_news:
                            logger.warning(f"[新闻分析师] 📄 失败的新闻内容: {forced_news}")
                        report = result.content if hasattr(result, 'content') else ""

                except Exception as e:
                    logger.error(f"[新闻分析师] ❌ 强制补救过程失败: {e}")
                    import traceback
                    logger.error(f"[新闻分析师] 📋 异常堆栈: {traceback.format_exc()}")
                    report = result.content if hasattr(result, 'content') else ""
            else:
                # 有工具调用，直接使用结果
                report = result.content
        
        total_time_taken = (datetime.now() - start_time).total_seconds()
        logger.info(f"[新闻分析师] 新闻分析完成，总耗时: {total_time_taken:.2f}秒")

        # 🔧 修复死循环问题：返回清洁的AIMessage，不包含tool_calls
        # 这确保工作流图能正确判断分析已完成，避免重复调用
        from langchain_core.messages import AIMessage
        clean_message = AIMessage(content=report)

        logger.info(f"[新闻分析师] ✅ 返回清洁消息，报告长度: {len(report)} 字符")

        # 🔧 更新工具调用计数器
        return {
            "messages": [clean_message],
            "news_report": report,
            "news_tool_call_count": tool_call_count + 1
        }

    return news_analyst_node
