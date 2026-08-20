from httpx import ASGITransport, AsyncClient

from mcp_gateway.main import app


async def test_mcp_gateway_health() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"service": "mcp-gateway", "status": "ok"}
