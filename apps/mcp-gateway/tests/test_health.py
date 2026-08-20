from fastapi.testclient import TestClient

from mcp_gateway.main import app


def test_mcp_gateway_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"service": "mcp-gateway", "status": "ok"}
