from fastapi.testclient import TestClient

from agent_runtime.main import app


def test_agent_runtime_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"service": "agent-runtime", "status": "ok"}
