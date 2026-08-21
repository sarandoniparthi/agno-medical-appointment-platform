from collections.abc import AsyncIterator
from typing import TYPE_CHECKING, cast

import grpc
import pytest_asyncio

from agent_runtime.grpc_service import AgentRuntimeService
from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2, agent_runtime_pb2_grpc

if TYPE_CHECKING:
    from agno_platform.generated.agent_runtime.v1.agent_runtime_pb2_grpc import (
        AgentRuntimeServiceAioStub,
    )


@pytest_asyncio.fixture
async def grpc_channel() -> AsyncIterator[grpc.aio.Channel]:
    server = grpc.aio.server()
    channel: grpc.aio.Channel | None = None
    try:
        agent_runtime_pb2_grpc.add_AgentRuntimeServiceServicer_to_server(
            AgentRuntimeService(), server
        )
        port = server.add_insecure_port("127.0.0.1:0")
        assert port > 0
        await server.start()
        channel = grpc.aio.insecure_channel(f"127.0.0.1:{port}")
        yield channel
    finally:
        if channel is not None:
            await channel.close()
        await server.stop(grace=None)


async def test_check_health_returns_serving_and_preserves_correlation_id(
    grpc_channel: grpc.aio.Channel,
) -> None:
    stub = cast(
        "AgentRuntimeServiceAioStub",
        agent_runtime_pb2_grpc.AgentRuntimeServiceStub(grpc_channel),
    )
    response = await stub.CheckHealth(
        agent_runtime_pb2.HealthRequest(correlation_id="test-123")
    )

    assert response.service == "agent-runtime"
    assert response.status == agent_runtime_pb2.SERVING_STATUS_SERVING
    assert response.correlation_id == "test-123"
