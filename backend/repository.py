"""Readable SQL shared by list/detail endpoints and context assembly."""

from fastapi import HTTPException
from .db import query, one

PROJECT_SQL = """SELECT p.*,
 (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.project_id) task_count,
 (SELECT COUNT(*) FROM memories m WHERE m.project_id=p.project_id) memory_count,
 fn_project_open_task_count(p.project_id) open_task_count FROM projects p"""
TASK_SQL = """SELECT t.*,p.project_name,a.agent_name FROM tasks t
 JOIN projects p ON p.project_id=t.project_id LEFT JOIN agents a ON a.agent_id=t.agent_id"""
SESSION_SQL = """SELECT s.*,u.name user_name,a.agent_name,p.project_name FROM sessions s
 JOIN users u ON u.user_id=s.user_id JOIN agents a ON a.agent_id=s.agent_id
 JOIN projects p ON p.project_id=s.project_id"""
MEMORY_SQL = """SELECT m.*,p.project_name,
 (SELECT COUNT(*) FROM memory_tags mt WHERE mt.memory_id=m.memory_id) tag_count,
 fn_memory_relevance(m.memory_id) relevance_score
 FROM memories m JOIN projects p ON p.project_id=m.project_id"""


def require(cursor, table, column, record_id, lock=False):
    return one(
        cursor,
        f"SELECT * FROM {table} WHERE {column}=:id" + (" FOR UPDATE" if lock else ""),
        id=record_id,
    )


def validate_links(cursor, project_id, task_id, session_id):
    require(cursor, "projects", "project_id", project_id)
    for table, field, value in [
        ("tasks", "task_id", task_id),
        ("sessions", "session_id", session_id),
    ]:
        if value is not None:
            result = query(
                cursor,
                f"SELECT project_id FROM {table} WHERE {field}=:id FOR UPDATE",
                id=value,
            )
            if not result or result[0]["project_id"] != project_id:
                raise HTTPException(422, f"{field} must belong to the selected project")


def replace_tags(cursor, memory_id, tag_ids):
    cursor.execute("DELETE FROM memory_tags WHERE memory_id=:id", id=memory_id)
    for tag_id in sorted(set(tag_ids)):
        # FK violations roll back the entire memory + tag operation.
        cursor.execute(
            "INSERT INTO memory_tags(memory_id,tag_id) VALUES(:mid,:tid)",
            mid=memory_id,
            tid=tag_id,
        )


def attach_tags(cursor, memories):
    if not memories:
        return memories
    binds = {f"id{i}": m["memory_id"] for i, m in enumerate(memories)}
    placeholders = ",".join(":" + key for key in binds)
    tags = query(
        cursor,
        f"""SELECT mt.memory_id,t.tag_id,t.tag_name FROM memory_tags mt
        JOIN tags t ON t.tag_id=mt.tag_id WHERE mt.memory_id IN ({placeholders}) ORDER BY t.tag_name""",
        **binds,
    )
    for memory in memories:
        memory["tags"] = [
            {"tag_id": t["tag_id"], "tag_name": t["tag_name"]}
            for t in tags
            if t["memory_id"] == memory["memory_id"]
        ]
        memory["tag_ids"] = [t["tag_id"] for t in memory["tags"]]
    return memories


def memory_detail(cursor, memory_id):
    return attach_tags(
        cursor, [one(cursor, MEMORY_SQL + " WHERE m.memory_id=:id", id=memory_id)]
    )[0]


def memory_list(
    cursor,
    project_id=None,
    memory_type=None,
    min_importance=None,
    keyword=None,
    tag_id=None,
    sort="relevance",
    limit=50,
    offset=0,
    task_id=None,
):
    sql = MEMORY_SQL + " WHERE 1=1"
    binds = dict(limit=limit, offset=offset)
    for column, value, comparison in [
        ("project_id", project_id, "="),
        ("memory_type", memory_type, "="),
        ("importance", min_importance, ">="),
        ("task_id", task_id, "="),
    ]:
        if value is not None:
            sql += f" AND m.{column}{comparison}:{column}"
            binds[column] = value
    if keyword:
        sql += " AND (INSTR(LOWER(m.title),:term)>0 OR DBMS_LOB.INSTR(LOWER(m.content),:term)>0)"
        binds["term"] = keyword.lower()
    if tag_id:
        sql += " AND EXISTS (SELECT 1 FROM memory_tags mt WHERE mt.memory_id=m.memory_id AND mt.tag_id=:tag_id)"
        binds["tag_id"] = tag_id
    order = {
        "relevance": "relevance_score DESC,m.memory_id",
        "recent": "m.updated_at DESC,m.memory_id DESC",
        "title": "LOWER(m.title),m.memory_id",
    }[sort]
    sql += f" ORDER BY {order} OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY"
    return attach_tags(cursor, query(cursor, sql, **binds))


def filtered_list(cursor, sql, alias, filters, order, limit, offset):
    binds = {key: value for key, value in filters.items() if value is not None}
    conditions = " AND ".join(f"{alias}.{key}=:{key}" for key in binds)
    if conditions:
        sql += " WHERE " + conditions
    return query(
        cursor,
        sql + f" ORDER BY {order} OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY",
        **binds,
        limit=limit,
        offset=offset,
    )
