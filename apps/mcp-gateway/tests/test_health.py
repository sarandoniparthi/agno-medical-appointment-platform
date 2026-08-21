from httpx import ASGITransport, AsyncClient

from agno_platform.settings import McpGatewaySettings
from mcp_gateway import main


async def test_mcp_gateway_health() -> None:
    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"service": "mcp-gateway", "status": "ok"}


def test_http_server_uses_configured_gateway_port() -> None:
    settings = McpGatewaySettings(MCP_GATEWAY_PORT=8110)

    server = main.create_http_server(settings)

    assert server.config.port == 8110
