import os
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def oracle(client):
    if os.getenv("RUN_ORACLE_TESTS") != "1":
        pytest.skip("Set RUN_ORACLE_TESTS=1 to test the configured Oracle schema")
    health = client.get("/api/health")
    assert health.status_code == 200, health.text
    return client


@pytest.fixture
def project(oracle):
    result = oracle.post(
        "/api/projects",
        json={
            "project_name": "pytest-" + uuid.uuid4().hex,
            "description": "Temporary integration test project",
        },
    )
    assert result.status_code == 201, result.text
    project = result.json()
    yield project
    response = oracle.delete(f"/api/projects/{project['project_id']}")
    assert response.status_code in (200, 404), response.text
