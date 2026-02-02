#!/usr/bin/env python
"""
测试 Gemini API 连接
"""
import os
import sys

# 设置环境变量
os.environ["GOOGLE_API_KEY"] = "sk-odv3sA6QHXCSt95O8c1902509b6f41A7861f78Ff007d1879"

print("=" * 60)
print("测试 Gemini API 连接")
print("=" * 60)
print(f"API Key: {os.environ['GOOGLE_API_KEY'][:20]}...")
print(f"Base URL: https://api.apiyi.com/v1beta")
print(f"Model: gemini-3-pro-preview")
print("=" * 60)

try:
    from langchain_google_genai import ChatGoogleGenerativeAI

    print("\n✅ 成功导入 ChatGoogleGenerativeAI")

    # 创建客户端
    llm = ChatGoogleGenerativeAI(
        model="gemini-3-pro-preview",
        google_api_key=os.environ["GOOGLE_API_KEY"],
        temperature=0.1,
        client_options={"api_endpoint": "https://api.apiyi.com"}
    )

    print("✅ 成功创建 LLM 客户端")

    # 测试简单调用
    print("\n🔄 发送测试消息...")
    response = llm.invoke("你好，请用一句话介绍自己。")

    print(f"\n✅ API 调用成功！")
    print(f"响应: {response.content}")
    print("\n" + "=" * 60)
    print("✅ Gemini API 配置正确，工作正常！")
    print("=" * 60)

except Exception as e:
    print(f"\n❌ 错误: {e}")
    print(f"错误类型: {type(e).__name__}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
