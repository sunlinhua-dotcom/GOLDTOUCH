# TradingAgents/graph/setup.py

from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph, START
from langgraph.prebuilt import ToolNode

from tradingagents.agents import *
from tradingagents.agents.utils.agent_states import AgentState
from tradingagents.agents.utils.agent_utils import Toolkit

from .conditional_logic import ConditionalLogic

# 导入统一日志系统
from tradingagents.utils.logging_init import get_logger
logger = get_logger("default")


class GraphSetup:
    """Handles the setup and configuration of the agent graph."""

    def __init__(
        self,
        quick_thinking_llm: ChatOpenAI,
        deep_thinking_llm: ChatOpenAI,
        toolkit: Toolkit,
        tool_nodes: Dict[str, ToolNode],
        bull_memory,
        bear_memory,
        trader_memory,
        invest_judge_memory,
        risk_manager_memory,
        conditional_logic: ConditionalLogic,
        config: Dict[str, Any] = None,
        react_llm = None,
    ):
        """Initialize with required components."""
        self.quick_thinking_llm = quick_thinking_llm
        self.deep_thinking_llm = deep_thinking_llm
        self.toolkit = toolkit
        self.tool_nodes = tool_nodes
        self.bull_memory = bull_memory
        self.bear_memory = bear_memory
        self.trader_memory = trader_memory
        self.invest_judge_memory = invest_judge_memory
        self.risk_manager_memory = risk_manager_memory
        self.conditional_logic = conditional_logic
        self.config = config or {}
        self.react_llm = react_llm

    def setup_graph(
        self, selected_analysts=["market", "social", "news", "fundamentals"]
    ):
        """Set up and compile the agent workflow graph.

        Args:
            selected_analysts (list): List of analyst types to include. Options are:
                - "unified": Unified analyst (single LLM call for all 4 analysts)
                - "market": Market analyst
                - "social": Social media analyst
                - "news": News analyst
                - "fundamentals": Fundamentals analyst
        """
        if len(selected_analysts) == 0:
            raise ValueError("Trading Agents Graph Setup Error: no analysts selected!")

        # 🔥 统一分析师模式（单一LLM调用，避免rate limiting）
        if "unified" in selected_analysts:
            logger.info("🚀 [统一分析师模式] 使用单一LLM调用替代4个独立分析师")
            logger.info("💰 [成本优化] 减少75%的API调用（4次→1次）")
            return self._setup_unified_graph()

        # Create analyst nodes
        analyst_nodes = {}
        delete_nodes = {}
        tool_nodes = {}

        if "market" in selected_analysts:
            # 现在所有LLM都使用标准市场分析师（包括阿里百炼的OpenAI兼容适配器）
            llm_provider = self.config.get("llm_provider", "").lower()

            # 检查是否使用OpenAI兼容的阿里百炼适配器
            using_dashscope_openai = (
                "dashscope" in llm_provider and
                hasattr(self.quick_thinking_llm, '__class__') and
                'OpenAI' in self.quick_thinking_llm.__class__.__name__
            )

            if using_dashscope_openai:
                logger.debug(f"📈 [DEBUG] 使用标准市场分析师（阿里百炼OpenAI兼容模式）")
            elif "dashscope" in llm_provider or "阿里百炼" in self.config.get("llm_provider", ""):
                logger.debug(f"📈 [DEBUG] 使用标准市场分析师（阿里百炼原生模式）")
            elif "deepseek" in llm_provider:
                logger.debug(f"📈 [DEBUG] 使用标准市场分析师（DeepSeek）")
            else:
                logger.debug(f"📈 [DEBUG] 使用标准市场分析师")

            # 所有LLM都使用标准分析师
            analyst_nodes["market"] = create_market_analyst(
                self.quick_thinking_llm, self.toolkit
            )
            delete_nodes["market"] = create_msg_delete()
            tool_nodes["market"] = self.tool_nodes["market"]

        if "social" in selected_analysts:
            analyst_nodes["social"] = create_social_media_analyst(
                self.quick_thinking_llm, self.toolkit
            )
            delete_nodes["social"] = create_msg_delete()
            tool_nodes["social"] = self.tool_nodes["social"]

        if "news" in selected_analysts:
            analyst_nodes["news"] = create_news_analyst(
                self.quick_thinking_llm, self.toolkit
            )
            delete_nodes["news"] = create_msg_delete()
            tool_nodes["news"] = self.tool_nodes["news"]

        if "fundamentals" in selected_analysts:
            # 现在所有LLM都使用标准基本面分析师（包括阿里百炼的OpenAI兼容适配器）
            llm_provider = self.config.get("llm_provider", "").lower()

            # 检查是否使用OpenAI兼容的阿里百炼适配器
            using_dashscope_openai = (
                "dashscope" in llm_provider and
                hasattr(self.quick_thinking_llm, '__class__') and
                'OpenAI' in self.quick_thinking_llm.__class__.__name__
            )

            if using_dashscope_openai:
                logger.debug(f"📊 [DEBUG] 使用标准基本面分析师（阿里百炼OpenAI兼容模式）")
            elif "dashscope" in llm_provider or "阿里百炼" in self.config.get("llm_provider", ""):
                logger.debug(f"📊 [DEBUG] 使用标准基本面分析师（阿里百炼原生模式）")
            elif "deepseek" in llm_provider:
                logger.debug(f"📊 [DEBUG] 使用标准基本面分析师（DeepSeek）")
            else:
                logger.debug(f"📊 [DEBUG] 使用标准基本面分析师")

            # 所有LLM都使用标准分析师（包含强制工具调用机制）
            analyst_nodes["fundamentals"] = create_fundamentals_analyst(
                self.quick_thinking_llm, self.toolkit
            )
            delete_nodes["fundamentals"] = create_msg_delete()
            tool_nodes["fundamentals"] = self.tool_nodes["fundamentals"]

        # Create researcher and manager nodes
        bull_researcher_node = create_bull_researcher(
            self.quick_thinking_llm, self.bull_memory
        )
        bear_researcher_node = create_bear_researcher(
            self.quick_thinking_llm, self.bear_memory
        )
        research_manager_node = create_research_manager(
            self.deep_thinking_llm, self.invest_judge_memory
        )
        trader_node = create_trader(self.quick_thinking_llm, self.trader_memory)

        # Create risk analysis nodes
        risky_analyst = create_risky_debator(self.quick_thinking_llm)
        neutral_analyst = create_neutral_debator(self.quick_thinking_llm)
        safe_analyst = create_safe_debator(self.quick_thinking_llm)
        risk_manager_node = create_risk_manager(
            self.deep_thinking_llm, self.risk_manager_memory
        )

        # Create workflow
        workflow = StateGraph(AgentState)

        # Add analyst nodes to the graph
        for analyst_type, node in analyst_nodes.items():
            workflow.add_node(f"{analyst_type.capitalize()} Analyst", node)
            workflow.add_node(
                f"Msg Clear {analyst_type.capitalize()}", delete_nodes[analyst_type]
            )
            workflow.add_node(f"tools_{analyst_type}", tool_nodes[analyst_type])

        # Add other nodes
        workflow.add_node("Bull Researcher", bull_researcher_node)
        workflow.add_node("Bear Researcher", bear_researcher_node)
        workflow.add_node("Research Manager", research_manager_node)
        workflow.add_node("Trader", trader_node)
        workflow.add_node("Risky Analyst", risky_analyst)
        workflow.add_node("Neutral Analyst", neutral_analyst)
        workflow.add_node("Safe Analyst", safe_analyst)
        workflow.add_node("Risk Judge", risk_manager_node)

        # Define edges
        # Start with the first analyst
        first_analyst = selected_analysts[0]
        workflow.add_edge(START, f"{first_analyst.capitalize()} Analyst")

        # Connect analysts in sequence
        for i, analyst_type in enumerate(selected_analysts):
            current_analyst = f"{analyst_type.capitalize()} Analyst"
            current_tools = f"tools_{analyst_type}"
            current_clear = f"Msg Clear {analyst_type.capitalize()}"

            # Add conditional edges for current analyst
            workflow.add_conditional_edges(
                current_analyst,
                getattr(self.conditional_logic, f"should_continue_{analyst_type}"),
                [current_tools, current_clear],
            )
            workflow.add_edge(current_tools, current_analyst)

            # Connect to next analyst or to Bull Researcher if this is the last analyst
            if i < len(selected_analysts) - 1:
                next_analyst = f"{selected_analysts[i+1].capitalize()} Analyst"
                workflow.add_edge(current_clear, next_analyst)
            else:
                workflow.add_edge(current_clear, "Bull Researcher")

        # Add remaining edges
        workflow.add_conditional_edges(
            "Bull Researcher",
            self.conditional_logic.should_continue_debate,
            {
                "Bear Researcher": "Bear Researcher",
                "Research Manager": "Research Manager",
            },
        )
        workflow.add_conditional_edges(
            "Bear Researcher",
            self.conditional_logic.should_continue_debate,
            {
                "Bull Researcher": "Bull Researcher",
                "Research Manager": "Research Manager",
            },
        )
        workflow.add_edge("Research Manager", "Trader")
        workflow.add_edge("Trader", "Risky Analyst")
        workflow.add_conditional_edges(
            "Risky Analyst",
            self.conditional_logic.should_continue_risk_analysis,
            {
                "Safe Analyst": "Safe Analyst",
                "Risk Judge": "Risk Judge",
            },
        )
        workflow.add_conditional_edges(
            "Safe Analyst",
            self.conditional_logic.should_continue_risk_analysis,
            {
                "Neutral Analyst": "Neutral Analyst",
                "Risk Judge": "Risk Judge",
            },
        )
        workflow.add_conditional_edges(
            "Neutral Analyst",
            self.conditional_logic.should_continue_risk_analysis,
            {
                "Risky Analyst": "Risky Analyst",
                "Risk Judge": "Risk Judge",
            },
        )

        workflow.add_edge("Risk Judge", END)

        # Compile and return
        return workflow.compile()

    def _setup_unified_graph(self):
        """设置统一分析师图（单一LLM调用模式）

        优势：
        - 减少75%的API调用（4次→1次）
        - 避免并发rate limiting问题
        - 更快的执行速度（减少3次网络往返）
        - 减少70%的token消耗（去除重复的system prompt）
        """
        logger.info("🔧 [统一分析师] 开始构建简化图结构...")

        # 创建统一分析师节点
        unified_analyst_node = create_unified_analyst(
            self.quick_thinking_llm, self.toolkit
        )

        # 创建其他节点（研究员、交易员、风险管理）
        bull_researcher_node = create_bull_researcher(
            self.quick_thinking_llm, self.bull_memory
        )
        bear_researcher_node = create_bear_researcher(
            self.quick_thinking_llm, self.bear_memory
        )
        research_manager_node = create_research_manager(
            self.deep_thinking_llm, self.invest_judge_memory
        )
        trader_node = create_trader(self.quick_thinking_llm, self.trader_memory)

        # 创建风险分析节点
        risky_analyst = create_risky_debator(self.quick_thinking_llm)
        neutral_analyst = create_neutral_debator(self.quick_thinking_llm)
        safe_analyst = create_safe_debator(self.quick_thinking_llm)
        risk_manager_node = create_risk_manager(
            self.deep_thinking_llm, self.risk_manager_memory
        )

        # 创建工作流
        workflow = StateGraph(AgentState)

        # 添加节点
        workflow.add_node("Unified Analyst", unified_analyst_node)
        workflow.add_node("Bull Researcher", bull_researcher_node)
        workflow.add_node("Bear Researcher", bear_researcher_node)
        workflow.add_node("Research Manager", research_manager_node)
        workflow.add_node("Trader", trader_node)
        workflow.add_node("Risky Analyst", risky_analyst)
        workflow.add_node("Neutral Analyst", neutral_analyst)
        workflow.add_node("Safe Analyst", safe_analyst)
        workflow.add_node("Risk Judge", risk_manager_node)

        # 定义边（简化流程）
        workflow.add_edge(START, "Unified Analyst")
        workflow.add_edge("Unified Analyst", "Bull Researcher")  # 统一分析师直接到研究员

        # 研究员辩论循环
        workflow.add_conditional_edges(
            "Bull Researcher",
            self.conditional_logic.should_continue_debate,
            {
                "Bear Researcher": "Bear Researcher",
                "Research Manager": "Research Manager",
            },
        )
        workflow.add_conditional_edges(
            "Bear Researcher",
            self.conditional_logic.should_continue_debate,
            {
                "Bull Researcher": "Bull Researcher",
                "Research Manager": "Research Manager",
            },
        )

        # 交易和风险管理流程
        workflow.add_edge("Research Manager", "Trader")
        workflow.add_edge("Trader", "Risky Analyst")
        workflow.add_conditional_edges(
            "Risky Analyst",
            self.conditional_logic.should_continue_risk_analysis,
            {
                "Safe Analyst": "Safe Analyst",
                "Risk Judge": "Risk Judge",
            },
        )
        workflow.add_conditional_edges(
            "Safe Analyst",
            self.conditional_logic.should_continue_risk_analysis,
            {
                "Neutral Analyst": "Neutral Analyst",
                "Risk Judge": "Risk Judge",
            },
        )
        workflow.add_conditional_edges(
            "Neutral Analyst",
            self.conditional_logic.should_continue_risk_analysis,
            {
                "Risky Analyst": "Risky Analyst",
                "Risk Judge": "Risk Judge",
            },
        )

        workflow.add_edge("Risk Judge", END)

        logger.info("✅ [统一分析师] 图结构构建完成")
        logger.info("📊 [节点数量] 9个节点（vs 原来的17+个节点）")
        logger.info("🚀 [性能提升] 预计分析速度提升30-50%")

        # 编译并返回
        return workflow.compile()
