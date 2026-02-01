"""
修复 MongoDB 中 Decimal128 类型导致的查询/更新错误

问题：MongoDB 不支持在查询或更新表达式中使用 Decimal128 类型
解决：将所有 Decimal128 字段转换为 float 类型
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson.decimal128 import Decimal128
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import get_settings


def convert_decimal128_to_float(doc):
    """递归地将文档中的所有 Decimal128 转换为 float"""
    if isinstance(doc, dict):
        return {k: convert_decimal128_to_float(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [convert_decimal128_to_float(item) for item in doc]
    elif isinstance(doc, Decimal128):
        return float(str(doc))
    else:
        return doc


async def fix_collection(db, collection_name, dry_run=True):
    """修复指定集合中的 Decimal128 问题"""
    collection = db[collection_name]

    print(f"\n{'='*60}")
    print(f"检查集合: {collection_name}")
    print(f"{'='*60}")

    # 查找所有文档
    total_docs = await collection.count_documents({})
    print(f"总文档数: {total_docs}")

    updated_count = 0
    error_count = 0

    async for doc in collection.find({}):
        doc_id = doc.get('_id')
        has_decimal128 = False

        # 检查是否包含 Decimal128
        def check_decimal128(obj):
            if isinstance(obj, Decimal128):
                return True
            elif isinstance(obj, dict):
                return any(check_decimal128(v) for v in obj.values())
            elif isinstance(obj, list):
                return any(check_decimal128(item) for item in obj)
            return False

        has_decimal128 = check_decimal128(doc)

        if has_decimal128:
            print(f"\n找到包含 Decimal128 的文档: {doc_id}")

            # 转换文档
            converted_doc = convert_decimal128_to_float(doc)

            # 移除 _id 字段（不能更新）
            converted_doc.pop('_id', None)

            if dry_run:
                print(f"  [DRY RUN] 将要更新的字段:")
                for key, value in converted_doc.items():
                    if key in doc and isinstance(doc[key], Decimal128):
                        print(f"    {key}: {doc[key]} (Decimal128) -> {value} (float)")
            else:
                try:
                    # 执行更新
                    result = await collection.update_one(
                        {'_id': doc_id},
                        {'$set': converted_doc}
                    )
                    if result.modified_count > 0:
                        print(f"  ✓ 已更新文档 {doc_id}")
                        updated_count += 1
                    else:
                        print(f"  - 文档 {doc_id} 无需更新")
                except Exception as e:
                    print(f"  ✗ 更新文档 {doc_id} 失败: {e}")
                    error_count += 1

    print(f"\n{collection_name} 统计:")
    print(f"  更新数量: {updated_count}")
    if error_count > 0:
        print(f"  错误数量: {error_count}")

    return updated_count, error_count


async def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='修复 MongoDB Decimal128 问题')
    parser.add_argument('--dry-run', action='store_true',
                       help='仅预览，不实际修改数据库')
    parser.add_argument('--collection', type=str,
                       help='指定要修复的集合名称（不指定则检查所有集合）')
    args = parser.parse_args()

    print("="*60)
    print("MongoDB Decimal128 修复工具")
    print("="*60)
    print(f"模式: {'DRY RUN (预览)' if args.dry_run else 'LIVE (实际修改)'}")
    print()

    try:
        # 获取配置
        settings = get_settings()
        mongo_url = settings.MONGO_URI
        db_name = settings.MONGO_DB

        print(f"连接到 MongoDB: {mongo_url}")
        print(f"数据库: {db_name}")

        # 连接数据库
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]

        # 测试连接
        await client.admin.command('ping')
        print("✓ MongoDB 连接成功\n")

        total_updated = 0
        total_errors = 0

        if args.collection:
            # 修复指定集合
            updated, errors = await fix_collection(db, args.collection, args.dry_run)
            total_updated += updated
            total_errors += errors
        else:
            # 修复所有集合
            collections = await db.list_collection_names()
            print(f"找到 {len(collections)} 个集合\n")

            for collection_name in collections:
                # 跳过系统集合
                if collection_name.startswith('system.'):
                    continue

                try:
                    updated, errors = await fix_collection(db, collection_name, args.dry_run)
                    total_updated += updated
                    total_errors += errors
                except Exception as e:
                    print(f"处理集合 {collection_name} 时出错: {e}")
                    total_errors += 1

        print(f"\n{'='*60}")
        print("总结:")
        print(f"{'='*60}")
        print(f"总更新数量: {total_updated}")
        if total_errors > 0:
            print(f"总错误数量: {total_errors}")

        if args.dry_run:
            print("\n这是预览模式。要实际修改数据库，请运行:")
            print(f"  python {sys.argv[0]} --collection <集合名>")
            print("  或")
            print(f"  python {sys.argv[0]}  (修复所有集合)")

    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
