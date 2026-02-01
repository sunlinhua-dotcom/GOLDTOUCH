"""
快速检查数据库中是否存在 Decimal128 类型的字段
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson.decimal128 import Decimal128
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import get_settings


def has_decimal128(obj, path=""):
    """递归检查对象是否包含 Decimal128，并返回路径"""
    found_paths = []

    if isinstance(obj, Decimal128):
        return [path]
    elif isinstance(obj, dict):
        for key, value in obj.items():
            current_path = f"{path}.{key}" if path else key
            found_paths.extend(has_decimal128(value, current_path))
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            current_path = f"{path}[{i}]"
            found_paths.extend(has_decimal128(item, current_path))

    return found_paths


async def check_collection(db, collection_name):
    """检查集合中是否有 Decimal128"""
    collection = db[collection_name]

    total_docs = await collection.count_documents({})
    if total_docs == 0:
        return None

    # 检查前100个文档
    check_limit = min(100, total_docs)
    decimal_docs = []

    async for doc in collection.find({}).limit(check_limit):
        decimal_paths = has_decimal128(doc)
        if decimal_paths:
            decimal_docs.append({
                '_id': doc.get('_id'),
                'paths': decimal_paths
            })

    if decimal_docs:
        return {
            'total_docs': total_docs,
            'checked_docs': check_limit,
            'decimal_docs_count': len(decimal_docs),
            'sample_docs': decimal_docs[:5]  # 只显示前5个
        }

    return None


async def main():
    """主函数"""
    print("="*60)
    print("MongoDB Decimal128 检查工具")
    print("="*60)

    try:
        settings = get_settings()
        mongo_url = settings.MONGO_URI
        db_name = settings.MONGO_DB

        print(f"\n连接到 MongoDB: {mongo_url}")
        print(f"数据库: {db_name}\n")

        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]

        await client.admin.command('ping')
        print("✓ MongoDB 连接成功\n")

        collections = await db.list_collection_names()
        print(f"找到 {len(collections)} 个集合\n")

        problematic_collections = []

        for collection_name in collections:
            if collection_name.startswith('system.'):
                continue

            print(f"检查: {collection_name}...", end=" ")

            try:
                result = await check_collection(db, collection_name)

                if result:
                    print(f"⚠️  发现问题!")
                    problematic_collections.append((collection_name, result))
                    print(f"    - 总文档数: {result['total_docs']}")
                    print(f"    - 检查文档数: {result['checked_docs']}")
                    print(f"    - 包含 Decimal128 的文档数: {result['decimal_docs_count']}")

                    if result['sample_docs']:
                        print(f"    - 示例问题字段:")
                        for doc in result['sample_docs'][:2]:
                            print(f"      文档 {doc['_id']}: {', '.join(doc['paths'][:3])}")
                else:
                    print("✓ 正常")

            except Exception as e:
                print(f"✗ 检查失败: {e}")

        print("\n" + "="*60)
        print("检查结果汇总")
        print("="*60)

        if problematic_collections:
            print(f"\n发现 {len(problematic_collections)} 个集合存在 Decimal128 问题:\n")
            for coll_name, info in problematic_collections:
                print(f"  • {coll_name}")
                print(f"    包含问题的文档: {info['decimal_docs_count']} / {info['checked_docs']} (抽样)")

            print("\n建议操作:")
            print("  1. 运行修复脚本预览:")
            print("     python fix_decimal128_issue.py --dry-run")
            print("\n  2. 确认后执行修复:")
            print("     python fix_decimal128_issue.py")
            print("\n  3. 或针对特定集合:")
            for coll_name, _ in problematic_collections[:3]:
                print(f"     python fix_decimal128_issue.py --collection {coll_name}")
        else:
            print("\n✓ 所有集合检查正常，未发现 Decimal128 问题")

        print()

    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
