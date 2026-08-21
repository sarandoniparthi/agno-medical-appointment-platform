import grpc

from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2
from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2_grpc
from agent_runtime.grpc_service import AgentRuntimeService


async def test_check_health_returns_serving_and_preserves_correlation_id() -> None:
    server = grpc.aio.server()
    agent_runtime_pb2_grpc.add_AgentRuntimeServiceServicer_to_server(
        AgentRuntimeService(), server
    )
    port = server.add_insecure_port("127.0.0.1:0")
    await server.start()

    channel = grpc.aio.insecure_channel(f"127.0.0.1:{port}")
    try:
        response = await agent_runtime_pb2_grpc.AgentRuntimeServiceStub(channel).CheckHealth(
            agent_runtime_pb2.HealthRequest(correlation_id="test-123")
        )
    finally:
        await channel.close()
        await server.stop(grace=None)

    assert response.service == "agent-runtime"
    assert response.status == agent_runtime_pb2.SERVING_STATUS_SERVING
    assert response.correlation_id == "test-123"
