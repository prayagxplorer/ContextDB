"""ContextDB HTTP API. Start from the root: uvicorn backend.main:app --reload."""

from typing import Annotated, Literal
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .config import CORS_ORIGINS
from .db import connection, query, one, insert, update
from .models import (
    MemoryCreate,
    MemoryPatch,
    MemoryType,
    TaskCreate,
    TaskPatch,
    TaskStatus,
    Assignment,
    ProjectCreate,
    ProjectPatch,
    Status,
    Priority,
)
from . import repository as repo

app = FastAPI(
    title="ContextDB API",
    version="2.0.0",
    description="Persistent project memory. Deterministic ranking; no agent runtime.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
Limit = Annotated[int, Query(ge=1, le=200)]
Offset = Annotated[int, Query(ge=0)]
TABLES = (
    "users",
    "agents",
    "projects",
    "sessions",
    "tasks",
    "memories",
    "tags",
    "memory_tags",
)


@app.get("/api/health")
def health():
    with connection() as conn, conn.cursor() as c:
        counts = {
            table: one(c, f"SELECT COUNT(*) total FROM {table}")["total"]
            for table in TABLES
        }
    return {"status": "ok", "table_counts": counts}


@app.get("/api/overview")
def overview(project_id: int | None = None):
    with connection() as conn, conn.cursor() as c:
        if project_id is not None:
            repo.require(c, "projects", "project_id", project_id)
        projects = query(
            c,
            repo.PROJECT_SQL + (" WHERE p.project_id=:id" if project_id else ""),
            **({"id": project_id} if project_id else {}),
        )
        recent_sessions = repo.filtered_list(
            c,
            repo.SESSION_SQL,
            "s",
            {"project_id": project_id},
            "s.start_time DESC,s.session_id DESC",
            5,
            0,
        )
        return {
            "counts": {
                "projects": len(projects),
                "active_projects": sum(p["status"] == "ACTIVE" for p in projects),
                "open_tasks": sum(p["open_task_count"] for p in projects),
                "memories": sum(p["memory_count"] for p in projects),
            },
            "projects": projects,
            "recent_memories": repo.memory_list(
                c, project_id=project_id, sort="recent", limit=5
            ),
            "recent_sessions": recent_sessions,
        }


@app.get("/api/projects")
def projects():
    with connection() as conn, conn.cursor() as c:
        return query(c, repo.PROJECT_SQL + " ORDER BY p.project_id")


@app.get("/api/projects/{project_id}")
def project_detail(project_id: int):
    with connection() as conn, conn.cursor() as c:
        return one(c, repo.PROJECT_SQL + " WHERE p.project_id=:id", id=project_id)


@app.get("/api/projects/{project_id}/memory-score")
def project_memory_score(project_id: int):
    with connection() as conn, conn.cursor() as c:
        result = one(
            c,
            "SELECT fn_project_memory_score_total(:id) total_memory_score FROM dual",
            id=project_id,
        )
        return {
            "project_id": project_id,
            "total_memory_score": result["total_memory_score"],
        }


@app.post("/api/projects", status_code=201)
def create_project(item: ProjectCreate):
    with connection() as conn, conn.cursor() as c:
        record_id = insert(c, "projects", item.model_dump(), "project_id")
        return one(c, repo.PROJECT_SQL + " WHERE p.project_id=:id", id=record_id)


@app.patch("/api/projects/{project_id}")
def edit_project(project_id: int, item: ProjectPatch):
    with connection() as conn, conn.cursor() as c:
        repo.require(c, "projects", "project_id", project_id, lock=True)
        update(
            c, "projects", "project_id", project_id, item.model_dump(exclude_unset=True)
        )
        return one(c, repo.PROJECT_SQL + " WHERE p.project_id=:id", id=project_id)


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int):
    with connection() as conn, conn.cursor() as c:
        repo.require(c, "projects", "project_id", project_id, lock=True)
        c.execute("DELETE FROM projects WHERE project_id=:id", id=project_id)
        return {"deleted_project_id": project_id}


@app.get("/api/memories")
def memories(
    project_id: int | None = None,
    memory_type: MemoryType | None = None,
    min_importance: Annotated[int | None, Query(ge=1, le=5)] = None,
    keyword: Annotated[str | None, Query(max_length=200)] = None,
    tag_id: int | None = None,
    task_id: int | None = None,
    sort: Literal["relevance", "recent", "title"] = "relevance",
    limit: Limit = 50,
    offset: Offset = 0,
):
    with connection() as conn, conn.cursor() as c:
        return repo.memory_list(
            c,
            project_id,
            memory_type,
            min_importance,
            keyword,
            tag_id,
            sort,
            limit,
            offset,
            task_id,
        )


@app.get("/api/memories/{memory_id}")
def memory_detail(memory_id: int):
    with connection() as conn, conn.cursor() as c:
        return repo.memory_detail(c, memory_id)


@app.post("/api/memories", status_code=201)
def create_memory(item: MemoryCreate):
    with connection() as conn, conn.cursor() as c:
        repo.validate_links(c, item.project_id, item.task_id, item.session_id)
        memory_id = insert(
            c, "memories", item.model_dump(exclude={"tag_ids"}), "memory_id"
        )
        repo.replace_tags(c, memory_id, item.tag_ids)
        return repo.memory_detail(c, memory_id)


@app.patch("/api/memories/{memory_id}")
@app.put("/api/memories/{memory_id}")
def edit_memory(memory_id: int, item: MemoryPatch):
    with connection() as conn, conn.cursor() as c:
        previous = repo.require(c, "memories", "memory_id", memory_id, lock=True)
        changes = item.model_dump(exclude_unset=True)
        merged = {**previous, **changes}
        repo.validate_links(
            c, previous["project_id"], merged["task_id"], merged["session_id"]
        )
        if "tag_ids" in changes:
            repo.replace_tags(c, memory_id, changes.pop("tag_ids"))
            # Tag-only edits are memory edits too; fire the update trigger.
            c.execute(
                "UPDATE memories SET updated_at=CURRENT_TIMESTAMP WHERE memory_id=:id",
                id=memory_id,
            )
        update(c, "memories", "memory_id", memory_id, changes)
        return repo.memory_detail(c, memory_id)


@app.delete("/api/memories/{memory_id}")
def delete_memory(memory_id: int):
    with connection() as conn, conn.cursor() as c:
        c.execute("DELETE FROM memories WHERE memory_id=:id", id=memory_id)
        if not c.rowcount:
            raise HTTPException(404, "Memory not found")
        return {"deleted_memory_id": memory_id}


@app.get("/api/tasks")
def tasks(
    project_id: int | None = None,
    status: Status | None = None,
    agent_id: int | None = None,
    priority: Priority | None = None,
    limit: Limit = 50,
    offset: Offset = 0,
):
    with connection() as conn, conn.cursor() as c:
        return repo.filtered_list(
            c,
            repo.TASK_SQL,
            "t",
            dict(
                project_id=project_id,
                status=status,
                agent_id=agent_id,
                priority=priority,
            ),
            "CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,t.task_id DESC",
            limit,
            offset,
        )


@app.get("/api/tasks/{task_id}")
def task_detail(task_id: int):
    with connection() as conn, conn.cursor() as c:
        result = one(c, repo.TASK_SQL + " WHERE t.task_id=:id", id=task_id)
        result["memories"] = repo.memory_list(c, task_id=task_id)
        return result


@app.post("/api/tasks", status_code=201)
def create_task(item: TaskCreate):
    with connection() as conn, conn.cursor() as c:
        repo.require(c, "projects", "project_id", item.project_id)
        task_id = insert(
            c, "tasks", item.model_dump(exclude={"agent_id", "status"}), "task_id"
        )
        c.callproc("sp_assign_task", [task_id, item.agent_id])
        c.callproc("sp_update_task_status", [task_id, item.status])
        return one(c, repo.TASK_SQL + " WHERE t.task_id=:id", id=task_id)


@app.patch("/api/tasks/{task_id}")
def edit_task(task_id: int, item: TaskPatch):
    with connection() as conn, conn.cursor() as c:
        repo.require(c, "tasks", "task_id", task_id, lock=True)
        changes = item.model_dump(exclude_unset=True)
        if "agent_id" in changes:
            c.callproc("sp_assign_task", [task_id, changes.pop("agent_id")])
        if "status" in changes:
            c.callproc("sp_update_task_status", [task_id, changes.pop("status")])
        update(c, "tasks", "task_id", task_id, changes)
        return one(c, repo.TASK_SQL + " WHERE t.task_id=:id", id=task_id)


@app.put("/api/tasks/{task_id}/status")
def update_task_status(task_id: int, item: TaskStatus):
    return edit_task(task_id, TaskPatch(status=item.status))


@app.put("/api/tasks/{task_id}/assignment")
def update_task_assignment(task_id: int, item: Assignment):
    return edit_task(task_id, TaskPatch(agent_id=item.agent_id))


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):
    with connection() as conn, conn.cursor() as c:
        c.execute("DELETE FROM tasks WHERE task_id=:id", id=task_id)
        if not c.rowcount:
            raise HTTPException(404, "Task not found")
        return {"deleted_task_id": task_id}


@app.get("/api/agents")
def agents():
    with connection() as conn, conn.cursor() as c:
        return query(
            c,
            """SELECT a.*,(SELECT COUNT(*) FROM tasks t WHERE t.agent_id=a.agent_id) task_count,
            (SELECT COUNT(*) FROM sessions s WHERE s.agent_id=a.agent_id) session_count FROM agents a ORDER BY a.agent_id""",
        )


@app.get("/api/agents/{agent_id}")
def agent_detail(agent_id: int):
    with connection() as conn, conn.cursor() as c:
        agent = repo.require(c, "agents", "agent_id", agent_id)
        agent["tasks"] = repo.filtered_list(
            c, repo.TASK_SQL, "t", {"agent_id": agent_id}, "t.task_id DESC", 200, 0
        )
        agent["sessions"] = repo.filtered_list(
            c,
            repo.SESSION_SQL,
            "s",
            {"agent_id": agent_id},
            "s.start_time DESC",
            200,
            0,
        )
        agent["memories"] = repo.attach_tags(
            c,
            query(
                c,
                repo.MEMORY_SQL
                + """ WHERE
            EXISTS (SELECT 1 FROM tasks t WHERE t.task_id=m.task_id AND t.agent_id=:id)
            OR EXISTS (SELECT 1 FROM sessions s WHERE s.session_id=m.session_id AND s.agent_id=:id)
            ORDER BY m.updated_at DESC FETCH FIRST 200 ROWS ONLY""",
                id=agent_id,
            ),
        )
        return agent


@app.get("/api/agents/{agent_id}/tasks")
def agent_tasks(agent_id: int, limit: Limit = 50, offset: Offset = 0):
    with connection() as conn, conn.cursor() as c:
        repo.require(c, "agents", "agent_id", agent_id)
        return repo.filtered_list(
            c,
            repo.TASK_SQL,
            "t",
            {"agent_id": agent_id},
            "t.task_id DESC",
            limit,
            offset,
        )


@app.get("/api/agents/{agent_id}/sessions")
def agent_sessions(agent_id: int, limit: Limit = 50, offset: Offset = 0):
    with connection() as conn, conn.cursor() as c:
        repo.require(c, "agents", "agent_id", agent_id)
        return repo.filtered_list(
            c,
            repo.SESSION_SQL,
            "s",
            {"agent_id": agent_id},
            "s.start_time DESC",
            limit,
            offset,
        )


@app.get("/api/sessions")
def sessions(
    project_id: int | None = None,
    agent_id: int | None = None,
    status: Literal["ACTIVE", "COMPLETED", "ABORTED"] | None = None,
    limit: Limit = 50,
    offset: Offset = 0,
):
    with connection() as conn, conn.cursor() as c:
        return repo.filtered_list(
            c,
            repo.SESSION_SQL,
            "s",
            dict(project_id=project_id, agent_id=agent_id, status=status),
            "s.start_time DESC,s.session_id DESC",
            limit,
            offset,
        )


@app.get("/api/sessions/{session_id}")
def session_detail(session_id: int):
    with connection() as conn, conn.cursor() as c:
        return one(c, repo.SESSION_SQL + " WHERE s.session_id=:id", id=session_id)


@app.get("/api/tags")
def tags():
    with connection() as conn, conn.cursor() as c:
        return query(c, "SELECT * FROM tags ORDER BY tag_name")


@app.get("/api/context-builder/{project_id}")
def context_builder(
    project_id: int,
    limit: Annotated[int, Query(ge=1, le=20)] = 5,
    memory_type: MemoryType | None = None,
    min_importance: Annotated[int, Query(ge=1, le=5)] = 1,
    tag_id: int | None = None,
):
    with connection() as conn, conn.cursor() as c:
        project = repo.require(c, "projects", "project_id", project_id)
        selected = repo.memory_list(
            c,
            project_id=project_id,
            memory_type=memory_type,
            min_importance=min_importance,
            tag_id=tag_id,
            limit=limit,
        )
        prompt = (
            f"Project context: {project['project_name']}\n{project['description']}\n\n"
        )
        prompt += (
            "\n\n".join(
                f"## {i}. {m['title']}\n[{m['memory_type']} | importance {m['importance']} | score {m['relevance_score']}]\n{m['content']}"
                for i, m in enumerate(selected, 1)
            )
            if selected
            else "No memories match these filters. Add project knowledge or broaden the filters."
        )
        return {
            "project_id": project_id,
            "project_name": project["project_name"],
            "memories": selected,
            "ranking_formula": "importance * 10 + tag_count * 5",
            "llm_context_prompt": prompt,
        }
