from httpx import ASGITransport, AsyncClient

from agent_runtime.main import app


async def test_agent_runtime_health() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"service": "agent-runtime", "status": "ok"}
