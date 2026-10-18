"""Real network smoke test. Creates and removes only its temporary project."""

import os
import uuid
import httpx

base = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
with httpx.Client(base_url=base, timeout=30) as client:

    def request(method, path, **kwargs):
        response = client.request(method, "/api" + path, **kwargs)
        response.raise_for_status()
        return response.json()

    before = request("GET", "/health")["table_counts"]
    project = request(
        "POST",
        "/projects",
        json={
            "project_name": "HTTP smoke " + uuid.uuid4().hex,
            "description": "Temporary verification",
        },
    )
    pid = project["project_id"]
    try:
        task = request(
            "POST",
            "/tasks",
            json={
                "project_id": pid,
                "title": "HTTP task",
                "description": "Stored procedure verification",
            },
        )
        agents = request("GET", "/agents")
        assigned = request(
            "PUT",
            f"/tasks/{task['task_id']}/assignment",
            json={"agent_id": agents[0]["agent_id"]},
        )
        assert assigned["agent_id"] == agents[0]["agent_id"]
        done = request(
            "PUT", f"/tasks/{task['task_id']}/status", json={"status": "COMPLETED"}
        )
        assert done["completed_at"]
        opened = request(
            "PUT", f"/tasks/{task['task_id']}/status", json={"status": "OPEN"}
        )
        assert opened["completed_at"] is None
        memory = request(
            "POST",
            "/memories",
            json={
                "project_id": pid,
                "task_id": task["task_id"],
                "title": "HTTP memory",
                "content": "Created over HTTP",
                "memory_type": "FINDING",
                "importance": 5,
            },
        )
        mid = memory["memory_id"]
        request("PATCH", f"/memories/{mid}", json={"content": "Edited over HTTP"})
        assert (
            request("GET", "/memories", params={"project_id": pid})[0]["content"]
            == "Edited over HTTP"
        )
        context = request("GET", f"/context-builder/{pid}")
        assert "Edited over HTTP" in context["llm_context_prompt"]
        request("DELETE", f"/memories/{mid}")
        assert request("GET", f"/context-builder/{pid}")["memories"] == []
        print(
            "PASS: real HTTP project/task/memory lifecycle, assignment/status procedures, reopen, ranking, and deletion"
        )
    finally:
        request("DELETE", f"/projects/{pid}")
    after = request("GET", "/health")["table_counts"]
    assert before == after, (before, after)
    print("PASS: all eight application table counts restored after cleanup:", after)
