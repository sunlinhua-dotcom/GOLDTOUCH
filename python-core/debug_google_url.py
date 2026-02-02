
import os
import asyncio
from tradingagents.llm_adapters.google_openai_adapter import ChatGoogleOpenAI

from dotenv import load_dotenv

# 加载真实环境配置
load_dotenv(".env")

api_key = os.getenv("GOOGLE_API_KEY")
base_url = os.getenv("CUSTOM_OPENAI_BASE_URL")

print(f"🔧 Testing ChatGoogleOpenAI with:")
print(f"   API Key: {api_key[:10]}...")
print(f"   Base URL: {base_url}")

# 实例化 Adapter
llm = ChatGoogleOpenAI(
    model="gemini-3-pro-preview",
    google_api_key=api_key,
    base_url=base_url,
    transport="rest"
)

async def test_invoke():
    try:
        print("🚀 Sending request...")
        # 尝试发送请求，即使失败也能看到底层的报错URL
        response = await llm.ainvoke("Hello")
        print(f"✅ Response: {response.content}")
    except Exception as e:
        print(f"❌ Error: {e}")
        # 尝试从异常中提取更多信息
        if hasattr(e, 'response'):
             print(f"📥 Error Response: {e.response}")

if __name__ == "__main__":
    asyncio.run(test_invoke())
