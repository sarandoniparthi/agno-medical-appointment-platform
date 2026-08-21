from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Literal

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

from agent_runtime.grpc_server import create_grpc_server
from agno_platform.settings import AgentRuntimeSettings


class HealthResponse(BaseModel):
    service: Literal["agent-runtime"]
    status: Literal["ok"]


async def health() -> HealthResponse:
    return HealthResponse(service="agent-runtime", status="ok")


def create_app(settings: AgentRuntimeSettings | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
        runtime_settings = settings or AgentRuntimeSettings()
        grpc_server = create_grpc_server("0.0.0.0", runtime_settings.grpc_port)
        await grpc_server.start()
        try:
            yield
        finally:
            await grpc_server.stop(grace=5)

    runtime_app = FastAPI(
        title="Agent Runtime",
        version="0.1.0",
        lifespan=lifespan,
    )
    runtime_app.get("/health", response_model=HealthResponse)(health)
    return runtime_app


def create_http_server(
    settings: AgentRuntimeSettings | None = None,
) -> uvicorn.Server:
    runtime_settings = settings or AgentRuntimeSettings()
    config = uvicorn.Config(
        create_app(runtime_settings),
        host="0.0.0.0",
        port=runtime_settings.http_port,
    )
    return uvicorn.Server(config)


def serve() -> None:
    create_http_server().run()


app = create_app()


if __name__ == "__main__":
    serve()
