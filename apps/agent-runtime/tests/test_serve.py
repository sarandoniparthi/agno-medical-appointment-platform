from pathlib import Path
from typing import cast

import grpc
import pytest

from agent_runtime import main
from agno_platform.settings import AgentRuntimeSettings


class RecordingGrpcServer:
    def __init__(self) -> None:
        self.started = False
        self.stop_grace: float | None = None

    async def start(self) -> None:
        self.started = True

    async def stop(self, grace: float | None) -> None:
        self.stop_grace = grace


def test_local_settings_load_agent_ports_from_an_env_file(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "AGENT_HTTP_PORT=8123\nAGENT_GRPC_PORT=51234\n",
        encoding="utf-8",
    )

    settings = AgentRuntimeSettings(
        _env_file=env_file  # pyright: ignore[reportCallIssue]
    )

    assert settings.http_port == 8123
    assert settings.grpc_port == 51234


def test_http_server_uses_configured_agent_port() -> None:
    settings = AgentRuntimeSettings(
        AGENT_HTTP_PORT=8123,
        AGENT_GRPC_PORT=51234,
    )

    server = main.create_http_server(settings)

    assert server.config.port == 8123


async def test_fastapi_lifespan_coordinates_grpc_startup_and_shutdown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grpc_server = RecordingGrpcServer()
    bound_address: str | None = None

    def create_recording_server(host: str, port: int) -> grpc.aio.Server:
        nonlocal bound_address
        bound_address = f"{host}:{port}"
        return cast(grpc.aio.Server, grpc_server)

    monkeypatch.setattr(main, "create_grpc_server", create_recording_server)
    settings = AgentRuntimeSettings(
        AGENT_HTTP_PORT=8123,
        AGENT_GRPC_PORT=51234,
    )
    app = main.create_app(settings)

    async with app.router.lifespan_context(app):
        assert grpc_server.started is True
        assert grpc_server.stop_grace is None

    assert bound_address == "0.0.0.0:51234"
    assert grpc_server.stop_grace == 5
