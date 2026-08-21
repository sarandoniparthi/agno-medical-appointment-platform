from typing import Literal

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

from agno_platform.settings import McpGatewaySettings


class HealthResponse(BaseModel):
    service: Literal["mcp-gateway"]
    status: Literal["ok"]


app = FastAPI(title="MCP Gateway", version="0.1.0")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(service="mcp-gateway", status="ok")


def create_http_server(
    settings: McpGatewaySettings | None = None,
) -> uvicorn.Server:
    gateway_settings = settings or McpGatewaySettings()
    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=gateway_settings.http_port,
    )
    return uvicorn.Server(config)


def serve() -> None:
    create_http_server().run()


if __name__ == "__main__":
    serve()
