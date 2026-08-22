import json
from typing import Any, Literal, Protocol, cast

import grpc

from agent_runtime.scheduling.models import WorkflowSnapshot
from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2, agent_runtime_pb2_grpc


class SchedulingWorkflowProtocol(Protocol):
    async def start(self, request: str, correlation_id: str) -> WorkflowSnapshot: ...
    def get(self, run_id: str) -> WorkflowSnapshot: ...
    async def respond(
        self, run_id: str,
        response: Literal["approve", "reject", "edit", "find_more"],
        payload: dict[str, Any],
    ) -> WorkflowSnapshot: ...


class AgentRuntimeService(agent_runtime_pb2_grpc.AgentRuntimeServiceServicer):
    def __init__(self, workflow: SchedulingWorkflowProtocol | None = None) -> None:
        self._workflow = workflow

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

    async def StartSchedulingWorkflow(
        self,
        request: agent_runtime_pb2.StartSchedulingWorkflowRequest,
        context: grpc.aio.ServicerContext[
            agent_runtime_pb2.StartSchedulingWorkflowRequest,
            agent_runtime_pb2.WorkflowSnapshotResponse,
        ],
    ) -> agent_runtime_pb2.WorkflowSnapshotResponse:
        del context
        snapshot = await self._required_workflow().start(
            request.request_text, request.correlation_id
        )
        return self._snapshot_response(snapshot, request.correlation_id)

    async def GetSchedulingWorkflow(
        self,
        request: agent_runtime_pb2.GetSchedulingWorkflowRequest,
        context: grpc.aio.ServicerContext[
            agent_runtime_pb2.GetSchedulingWorkflowRequest,
            agent_runtime_pb2.WorkflowSnapshotResponse,
        ],
    ) -> agent_runtime_pb2.WorkflowSnapshotResponse:
        del context
        snapshot = self._required_workflow().get(request.run_id)
        return self._snapshot_response(snapshot, request.correlation_id)

    async def RespondToSchedulingRequirement(
        self,
        request: agent_runtime_pb2.RespondToSchedulingRequirementRequest,
        context: grpc.aio.ServicerContext[
            agent_runtime_pb2.RespondToSchedulingRequirementRequest,
            agent_runtime_pb2.WorkflowSnapshotResponse,
        ],
    ) -> agent_runtime_pb2.WorkflowSnapshotResponse:
        del context
        response_names: dict[int, Literal["approve", "reject", "edit", "find_more"]] = {
            agent_runtime_pb2.REQUIREMENT_RESPONSE_APPROVE: "approve",
            agent_runtime_pb2.REQUIREMENT_RESPONSE_REJECT: "reject",
            agent_runtime_pb2.REQUIREMENT_RESPONSE_EDIT: "edit",
            agent_runtime_pb2.REQUIREMENT_RESPONSE_FIND_MORE: "find_more",
        }
        response_name = response_names.get(request.response)
        if response_name is None:
            raise ValueError("a supported requirement response is required")
        payload_value: object = json.loads(request.payload_json or "{}")
        if not isinstance(payload_value, dict):
            raise ValueError("requirement payload must be an object")
        snapshot = await self._required_workflow().respond(
            request.run_id, response_name, cast(dict[str, Any], payload_value)
        )
        return self._snapshot_response(snapshot, request.correlation_id)

    def _required_workflow(self) -> SchedulingWorkflowProtocol:
        if self._workflow is None:
            raise RuntimeError("scheduling workflow is not configured")
        return self._workflow

    def _snapshot_response(
        self, snapshot: WorkflowSnapshot, correlation_id: str
    ) -> agent_runtime_pb2.WorkflowSnapshotResponse:
        return agent_runtime_pb2.WorkflowSnapshotResponse(
            correlation_id=correlation_id,
            workflow_id=snapshot.workflow_id,
            session_id=snapshot.session_id,
            run_id=snapshot.run_id,
            status=snapshot.status,
            snapshot_json=snapshot.model_dump_json(by_alias=True),
        )
