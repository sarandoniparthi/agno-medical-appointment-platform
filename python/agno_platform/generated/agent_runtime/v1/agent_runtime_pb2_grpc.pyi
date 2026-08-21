import grpc

from .agent_runtime_pb2 import HealthRequest, HealthResponse


class AgentRuntimeServiceStub:
    CheckHealth: grpc.aio.UnaryUnaryMultiCallable[HealthRequest, HealthResponse]

    def __init__(self, channel: grpc.aio.Channel) -> None: ...


class AgentRuntimeServiceServicer:
    async def CheckHealth(
        self,
        request: HealthRequest,
        context: grpc.aio.ServicerContext[HealthRequest, HealthResponse],
    ) -> HealthResponse: ...


def add_AgentRuntimeServiceServicer_to_server(
    servicer: AgentRuntimeServiceServicer,
    server: grpc.aio.Server,
) -> None: ...
