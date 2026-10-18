from datetime import datetime, timezone
from unittest.mock import MagicMock
import pytest
import oracledb
from fastapi import HTTPException
from backend.db import materialize, database_error, connection
from backend.models import MemoryCreate


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"project_id": 1, "title": "", "content": "test", "memory_type": "RULE"},
        {"project_id": 1, "title": "valid", "content": "  ", "memory_type": "RULE"},
        {"project_id": 1, "title": "valid", "content": "test", "memory_type": "FAKE"},
        {
            "project_id": 1,
            "title": "valid",
            "content": "test",
            "memory_type": "RULE",
            "importance": 6,
        },
        {"project_id": -1, "title": "valid", "content": "test", "memory_type": "RULE"},
        {
            "project_id": 1,
            "title": "valid",
            "content": "test",
            "memory_type": "RULE",
            "tag_ids": [-1],
        },
    ],
)
def test_memory_input(client, payload):
    assert client.post("/api/memories", json=payload).status_code == 422


@pytest.mark.parametrize(
    "path,payload",
    [
        ("/memories/1", {"title": None}),
        ("/memories/1", {"tag_ids": None}),
        ("/tasks/1", {"status": None}),
        ("/projects/1", {"description": None}),
        ("/memories/1", {"project_id": 2}),
    ],
)
def test_patch_contract(client, path, payload):
    assert client.patch("/api" + path, json=payload).status_code == 422


@pytest.mark.parametrize(
    "query",
    [
        "limit=201",
        "offset=-1",
        "sort=DROP_TABLE",
        "memory_type=INVALID",
        "min_importance=0",
    ],
)
def test_filter_validation(client, query):
    assert client.get("/api/memories?" + query).status_code == 422


def test_list_defaults_are_independent():
    args = dict(project_id=1, title="test", content="knowledge", memory_type="RULE")
    first, second = MemoryCreate(**args), MemoryCreate(**args)
    first.tag_ids.append(1)
    assert second.tag_ids == []


def test_clob_materialization():
    clob = MagicMock()
    clob.read.return_value = "Knowledge Ω" * 10000
    assert materialize(clob) == "Knowledge Ω" * 10000
    assert materialize(datetime(2026, 1, 1)).tzinfo is not None
    aware = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert materialize(aware) == aware


def test_safe_errors():
    error = MagicMock()
    error.code = 1017
    result = database_error(Exception(error))
    assert result.status_code == 503
    assert "1017" not in result.detail


def test_missing_configuration(client, monkeypatch):
    monkeypatch.delenv("ORACLE_PASSWORD", raising=False)
    result = client.get("/api/health")
    assert result.status_code == 503
    assert "ORACLE_PASSWORD" in result.json()["detail"]


def test_transaction_rollback(monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr("backend.db.oracledb.connect", lambda **kwargs: conn)
    with pytest.raises(HTTPException):
        with connection():
            raise HTTPException(422, "invalid tags")
    conn.rollback.assert_called_once()
    conn.commit.assert_not_called()
    conn.close.assert_called_once()
    conn.reset_mock()
    conn.rollback.side_effect = oracledb.DatabaseError("Disconnected")
    conn.close.side_effect = oracledb.DatabaseError("Disconnected")
    with pytest.raises(HTTPException) as caught:
        with connection():
            raise HTTPException(422, "Original operation failed")
    assert caught.value.status_code == 422
    conn.close.assert_called_once()


def test_cors_allowlist(client):
    allowed = client.options(
        "/api/memories",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    rejected = client.options(
        "/api/memories",
        headers={
            "Origin": "https://example.invalid",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in rejected.headers
