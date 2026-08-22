from __future__ import annotations

from typing import Protocol, overload

import grpc

from .agent_runtime_pb2 import HealthRequest, HealthResponse, StartSchedulingWorkflowRequest, WorkflowSnapshotResponse, GetSchedulingWorkflowRequest, RespondToSchedulingRequirementRequest

class _SyncCheckHealthCallable(Protocol):
    def __call__(self, request: HealthRequest, /, **kwargs: object) -> HealthResponse: ...


class _AioCheckHealthCallable(Protocol):
    def __call__(self, request: HealthRequest, /, **kwargs: object) -> grpc.aio.UnaryUnaryCall[HealthRequest, HealthResponse]: ...


class _SyncStartSchedulingWorkflowCallable(Protocol):
    def __call__(self, request: StartSchedulingWorkflowRequest, /, **kwargs: object) -> WorkflowSnapshotResponse: ...


class _AioStartSchedulingWorkflowCallable(Protocol):
    def __call__(self, request: StartSchedulingWorkflowRequest, /, **kwargs: object) -> grpc.aio.UnaryUnaryCall[StartSchedulingWorkflowRequest, WorkflowSnapshotResponse]: ...


class _SyncGetSchedulingWorkflowCallable(Protocol):
    def __call__(self, request: GetSchedulingWorkflowRequest, /, **kwargs: object) -> WorkflowSnapshotResponse: ...


class _AioGetSchedulingWorkflowCallable(Protocol):
    def __call__(self, request: GetSchedulingWorkflowRequest, /, **kwargs: object) -> grpc.aio.UnaryUnaryCall[GetSchedulingWorkflowRequest, WorkflowSnapshotResponse]: ...


class _SyncRespondToSchedulingRequirementCallable(Protocol):
    def __call__(self, request: RespondToSchedulingRequirementRequest, /, **kwargs: object) -> WorkflowSnapshotResponse: ...


class _AioRespondToSchedulingRequirementCallable(Protocol):
    def __call__(self, request: RespondToSchedulingRequirementRequest, /, **kwargs: object) -> grpc.aio.UnaryUnaryCall[RespondToSchedulingRequirementRequest, WorkflowSnapshotResponse]: ...


class AgentRuntimeServiceSyncStub(Protocol):
    CheckHealth: _SyncCheckHealthCallable
    StartSchedulingWorkflow: _SyncStartSchedulingWorkflowCallable
    GetSchedulingWorkflow: _SyncGetSchedulingWorkflowCallable
    RespondToSchedulingRequirement: _SyncRespondToSchedulingRequirementCallable


class AgentRuntimeServiceAioStub(Protocol):
    CheckHealth: _AioCheckHealthCallable
    StartSchedulingWorkflow: _AioStartSchedulingWorkflowCallable
    GetSchedulingWorkflow: _AioGetSchedulingWorkflowCallable
    RespondToSchedulingRequirement: _AioRespondToSchedulingRequirementCallable


class AgentRuntimeServiceStub:
    CheckHealth: _SyncCheckHealthCallable | _AioCheckHealthCallable
    StartSchedulingWorkflow: _SyncStartSchedulingWorkflowCallable | _AioStartSchedulingWorkflowCallable
    GetSchedulingWorkflow: _SyncGetSchedulingWorkflowCallable | _AioGetSchedulingWorkflowCallable
    RespondToSchedulingRequirement: _SyncRespondToSchedulingRequirementCallable | _AioRespondToSchedulingRequirementCallable

    @overload
    def __init__(self, channel: grpc.aio.Channel) -> None: ...

    @overload
    def __init__(self, channel: grpc.Channel) -> None: ...


class AgentRuntimeServiceServicer:
    async def CheckHealth(self, request: HealthRequest, context: grpc.aio.ServicerContext[HealthRequest, HealthResponse]) -> HealthResponse: ...

    async def StartSchedulingWorkflow(self, request: StartSchedulingWorkflowRequest, context: grpc.aio.ServicerContext[StartSchedulingWorkflowRequest, WorkflowSnapshotResponse]) -> WorkflowSnapshotResponse: ...

    async def GetSchedulingWorkflow(self, request: GetSchedulingWorkflowRequest, context: grpc.aio.ServicerContext[GetSchedulingWorkflowRequest, WorkflowSnapshotResponse]) -> WorkflowSnapshotResponse: ...

    async def RespondToSchedulingRequirement(self, request: RespondToSchedulingRequirementRequest, context: grpc.aio.ServicerContext[RespondToSchedulingRequirementRequest, WorkflowSnapshotResponse]) -> WorkflowSnapshotResponse: ...


def add_AgentRuntimeServiceServicer_to_server(
    servicer: AgentRuntimeServiceServicer,
    server: grpc.Server | grpc.aio.Server,
) -> None: ...

