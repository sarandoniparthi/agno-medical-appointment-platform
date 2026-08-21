import grpc

from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2
from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2_grpc


class AgentRuntimeService(agent_runtime_pb2_grpc.AgentRuntimeServiceServicer):
    async def CheckHealth(
        self,
        request: agent_runtime_pb2.HealthRequest,
        context: grpc.aio.ServicerContext[
            agent_runtime_pb2.HealthRequest, agent_runtime_pb2.HealthResponse
        ],
    ) -> agent_runtime_pb2.HealthResponse:
        del context
        return agent_runtime_pb2.HealthResponse(
            service="agent-runtime",
            status=agent_runtime_pb2.SERVING_STATUS_SERVING,
            correlation_id=request.correlation_id,
        )
