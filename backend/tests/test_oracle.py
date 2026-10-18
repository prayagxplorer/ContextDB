"""Integration tests create temporary projects and remove them in fixture cleanup."""

from backend.db import connection, one


def memory_payload(project, **extra):
    return dict(
        project_id=project["project_id"],
        title="Integration knowledge",
        content="Oracle content Ω",
        memory_type="RULE",
        importance=5,
        **extra,
    )


def test_memory_crud_tags_context_and_clob(oracle, project):
    tags = oracle.get("/api/tags").json()
    payload = memory_payload(
        project, tag_ids=[tags[0]["tag_id"], tags[1]["tag_id"], tags[0]["tag_id"]]
    )
    created = oracle.post("/api/memories", json=payload)
    assert created.status_code == 201, created.text
    m = created.json()
    mid = m["memory_id"]
    assert len(m["tags"]) == 2 and m["relevance_score"] == 60
    assert oracle.get(f"/api/memories/{mid}").json()["content"] == "Oracle content Ω"
    content = "Large CLOB with Unicode Ω and newlines\n" * 3000
    edited = oracle.patch(
        f"/api/memories/{mid}",
        json={"title": "Edited knowledge", "content": content, "tag_ids": []},
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["content"] == content and edited.json()["tags"] == []
    assert edited.json()["updated_at"] >= m["updated_at"]
    context = oracle.get(f"/api/context-builder/{project['project_id']}").json()
    assert (
        content in context["llm_context_prompt"]
        and context["memories"][0]["relevance_score"] == 50
    )
    assert oracle.delete(f"/api/memories/{mid}").status_code == 200
    assert oracle.get(f"/api/memories/{mid}").status_code == 404
    assert (
        oracle.get(f"/api/context-builder/{project['project_id']}").json()["memories"]
        == []
    )


def test_invalid_tag_rollback_on_create_and_edit(oracle, project):
    tags = oracle.get("/api/tags").json()
    tag = tags[0]["tag_id"]
    failed = oracle.post(
        "/api/memories", json=memory_payload(project, tag_ids=[tag, 999999999])
    )
    assert failed.status_code == 422, failed.text
    assert (
        oracle.get("/api/memories", params={"project_id": project["project_id"]}).json()
        == []
    )
    m = oracle.post("/api/memories", json=memory_payload(project, tag_ids=[tag])).json()
    failed = oracle.patch(
        f"/api/memories/{m['memory_id']}",
        json={"title": "Should roll back", "tag_ids": [999999999]},
    )
    assert failed.status_code == 422
    after = oracle.get(f"/api/memories/{m['memory_id']}").json()
    assert after["title"] == m["title"] and after["tag_ids"] == [tag]


def test_task_procedures_status_assignment_reopen_and_delete(oracle, project):
    agent = oracle.get("/api/agents").json()[0]["agent_id"]
    created = oracle.post(
        "/api/tasks",
        json={
            "project_id": project["project_id"],
            "title": "Test task",
            "description": "Procedure integration",
            "agent_id": agent,
        },
    )
    assert created.status_code == 201, created.text
    tid = created.json()["task_id"]
    assert created.json()["agent_id"] == agent
    response = oracle.put(f"/api/tasks/{tid}/assignment", json={"agent_id": None})
    assert response.status_code == 200 and response.json()["agent_id"] is None
    assert (
        oracle.put(
            f"/api/tasks/{tid}/assignment", json={"agent_id": 999999999}
        ).status_code
        == 422
    )
    done = oracle.put(f"/api/tasks/{tid}/status", json={"status": "COMPLETED"}).json()
    assert done["completed_at"] is not None
    again = oracle.put(f"/api/tasks/{tid}/status", json={"status": "COMPLETED"}).json()
    assert again["completed_at"] == done["completed_at"]
    reopened = oracle.put(f"/api/tasks/{tid}/status", json={"status": "BLOCKED"}).json()
    assert reopened["completed_at"] is None
    assert (
        oracle.get(f"/api/projects/{project['project_id']}").json()["open_task_count"]
        == 1
    )
    m = oracle.post("/api/memories", json=memory_payload(project, task_id=tid)).json()
    assert (
        oracle.get(f"/api/tasks/{tid}").json()["memories"][0]["memory_id"]
        == m["memory_id"]
    )
    assert oracle.delete(f"/api/tasks/{tid}").status_code == 200
    assert oracle.get(f"/api/memories/{m['memory_id']}").json()["task_id"] is None


def test_cross_project_links_and_unknown_ids(oracle, project):
    tasks = oracle.get("/api/tasks").json()
    sessions = oracle.get("/api/sessions").json()
    for links in (
        {"task_id": tasks[0]["task_id"]},
        {"session_id": sessions[0]["session_id"]},
        {"task_id": 999999999},
    ):
        assert (
            oracle.post(
                "/api/memories", json=memory_payload(project, **links)
            ).status_code
            == 422
        )
    for path in (
        "memories",
        "tasks",
        "projects",
        "agents",
        "sessions",
        "context-builder",
    ):
        assert oracle.get(f"/api/{path}/999999999").status_code == 404
    assert (
        oracle.put("/api/tasks/999999999/status", json={"status": "OPEN"}).status_code
        == 404
    )
    assert oracle.delete("/api/memories/999999999").status_code == 404


def test_aggregates_ranking_injection_filters_and_cascade(oracle, project):
    pid = project["project_id"]
    tag = oracle.get("/api/tags").json()[0]["tag_id"]
    ids = []
    for i in range(3):
        p = memory_payload(project, tag_ids=[tag] if i < 2 else [])
        p.update(title=f"Rank {i}", importance=4 if i < 2 else 5)
        ids.append(oracle.post("/api/memories", json=p).json()["memory_id"])
    for status in ("OPEN", "COMPLETED", "BLOCKED"):
        assert (
            oracle.post(
                "/api/tasks",
                json={
                    "project_id": pid,
                    "title": status,
                    "description": "Counts",
                    "status": status,
                },
            ).status_code
            == 201
        )
    p = oracle.get(f"/api/projects/{pid}").json()
    assert (p["task_count"], p["memory_count"], p["open_task_count"]) == (3, 3, 2)
    ranked = oracle.get(f"/api/context-builder/{pid}").json()["memories"]
    assert [m["memory_id"] for m in ranked] == [ids[2], ids[0], ids[1]]
    assert oracle.get("/api/memories", params={"keyword": "' OR 1=1 --"}).json() == []
    filtered = oracle.get(
        "/api/memories",
        params={"project_id": pid, "tag_id": tag, "limit": 1, "offset": 1},
    ).json()
    assert len(filtered) == 1 and filtered[0]["memory_id"] == ids[1]
    assert (
        oracle.get(
            "/api/memories", params={"project_id": pid, "min_importance": 5}
        ).json()[0]["memory_id"]
        == ids[2]
    )
    assert oracle.delete(f"/api/projects/{pid}").status_code == 200
    with connection() as conn, conn.cursor() as c:
        assert (
            one(
                c,
                "SELECT COUNT(*) total FROM memory_tags WHERE memory_id=:id",
                id=ids[0],
            )["total"]
            == 0
        )
        assert (
            one(c, "SELECT COUNT(*) total FROM tasks WHERE project_id=:id", id=pid)[
                "total"
            ]
            == 0
        )


def test_project_conflict_and_agent_sessions(oracle, project):
    duplicate = oracle.post(
        "/api/projects",
        json={"project_name": project["project_name"], "description": "Duplicate"},
    )
    assert duplicate.status_code == 409
    agents = oracle.get("/api/agents").json()
    assert oracle.get(f"/api/agents/{agents[0]['agent_id']}").status_code == 200
    for suffix in ("tasks", "sessions"):
        assert (
            oracle.get(f"/api/agents/{agents[0]['agent_id']}/{suffix}").status_code
            == 200
        )
    r = oracle.patch(
        f"/api/projects/{project['project_id']}", json={"status": "ON_HOLD"}
    )
    assert r.json()["status"] == "ON_HOLD"
