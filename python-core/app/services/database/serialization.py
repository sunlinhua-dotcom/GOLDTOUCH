"""
Serialization helpers for MongoDB documents.
"""
from __future__ import annotations

from datetime import datetime
from bson import ObjectId
from bson.decimal128 import Decimal128


def serialize_document(doc: dict) -> dict:
    """Serialize special MongoDB types to JSON-friendly primitives.
    - ObjectId -> str
    - datetime -> ISO string
    - Decimal128 -> float
    - Recurse into nested dict/list
    """
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, Decimal128):
            # Convert Decimal128 to float to avoid MongoDB query/update errors
            serialized[key] = float(str(value))
        elif isinstance(value, dict):
            serialized[key] = serialize_document(value)
        elif isinstance(value, list):
            out_list = []
            for item in value:
                if isinstance(item, dict):
                    out_list.append(serialize_document(item))
                elif isinstance(item, ObjectId):
                    out_list.append(str(item))
                elif isinstance(item, datetime):
                    out_list.append(item.isoformat())
                elif isinstance(item, Decimal128):
                    out_list.append(float(str(item)))
                else:
                    out_list.append(item)
            serialized[key] = out_list
        else:
            serialized[key] = value
    return serialized


def sanitize_for_mongodb(data):
    """
    清理数据以适配 MongoDB 更新操作
    将 Decimal128 转换为 float，避免 FailedToParse 错误

    Args:
        data: 要清理的数据（dict, list 或其他类型）

    Returns:
        清理后的数据
    """
    if isinstance(data, Decimal128):
        return float(str(data))
    elif isinstance(data, dict):
        return {k: sanitize_for_mongodb(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_mongodb(item) for item in data]
    else:
        return data

