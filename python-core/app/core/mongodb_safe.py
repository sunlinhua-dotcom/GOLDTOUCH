"""
MongoDB 安全操作包装器
自动清理 Decimal128 等问题类型，防止 FailedToParse 错误
"""
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorCollection
from app.services.database.serialization import sanitize_for_mongodb


class SafeMongoCollection:
    """
    MongoDB 集合的安全包装器
    所有写入操作自动清理 Decimal128
    """

    def __init__(self, collection: AsyncIOMotorCollection):
        self._collection = collection

    async def insert_one(self, document: Dict[str, Any], *args, **kwargs):
        """安全的 insert_one，自动清理 Decimal128"""
        clean_doc = sanitize_for_mongodb(document)
        return await self._collection.insert_one(clean_doc, *args, **kwargs)

    async def insert_many(self, documents: List[Dict[str, Any]], *args, **kwargs):
        """安全的 insert_many，自动清理 Decimal128"""
        clean_docs = [sanitize_for_mongodb(doc) for doc in documents]
        return await self._collection.insert_many(clean_docs, *args, **kwargs)

    async def update_one(self, filter: Dict[str, Any], update: Dict[str, Any], *args, **kwargs):
        """安全的 update_one，自动清理 Decimal128"""
        clean_filter = sanitize_for_mongodb(filter)
        clean_update = sanitize_for_mongodb(update)
        return await self._collection.update_one(clean_filter, clean_update, *args, **kwargs)

    async def update_many(self, filter: Dict[str, Any], update: Dict[str, Any], *args, **kwargs):
        """安全的 update_many，自动清理 Decimal128"""
        clean_filter = sanitize_for_mongodb(filter)
        clean_update = sanitize_for_mongodb(update)
        return await self._collection.update_many(clean_filter, clean_update, *args, **kwargs)

    async def replace_one(self, filter: Dict[str, Any], replacement: Dict[str, Any], *args, **kwargs):
        """安全的 replace_one，自动清理 Decimal128"""
        clean_filter = sanitize_for_mongodb(filter)
        clean_replacement = sanitize_for_mongodb(replacement)
        return await self._collection.replace_one(clean_filter, clean_replacement, *args, **kwargs)

    # 读取操作不需要清理，直接传递
    async def find_one(self, *args, **kwargs):
        return await self._collection.find_one(*args, **kwargs)

    def find(self, *args, **kwargs):
        return self._collection.find(*args, **kwargs)

    async def count_documents(self, *args, **kwargs):
        return await self._collection.count_documents(*args, **kwargs)

    async def delete_one(self, *args, **kwargs):
        return await self._collection.delete_one(*args, **kwargs)

    async def delete_many(self, *args, **kwargs):
        return await self._collection.delete_many(*args, **kwargs)

    def __getattr__(self, name):
        """其他方法直接传递给原始集合"""
        return getattr(self._collection, name)


def make_safe(collection: AsyncIOMotorCollection) -> SafeMongoCollection:
    """
    将普通 MongoDB 集合包装为安全集合

    使用方法:
        from app.core.mongodb_safe import make_safe

        # 原来的代码
        collection = db.my_collection
        await collection.insert_one(data)  # 可能有 Decimal128 错误

        # 安全的代码
        collection = make_safe(db.my_collection)
        await collection.insert_one(data)  # 自动清理，不会出错
    """
    return SafeMongoCollection(collection)
