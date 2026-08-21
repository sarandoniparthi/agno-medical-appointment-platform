from __future__ import annotations

from typing import Protocol, overload

import grpc

from .agent_runtime_pb2 import HealthRequest, HealthResponse


class _SyncCheckHealthCallable(Protocol):
    def __call__(self, request: HealthRequest, /, **kwargs: object) -> HealthResponse: ...


class _AioCheckHealthCallable(Protocol):
    def __call__(
        self, request: HealthRequest, /, **kwargs: object
    ) -> grpc.aio.UnaryUnaryCall[HealthRequest, HealthResponse]: ...


class AgentRuntimeServiceSyncStub(Protocol):
    CheckHealth: _SyncCheckHealthCallable


class AgentRuntimeServiceAioStub(Protocol):
    CheckHealth: _AioCheckHealthCallable


class AgentRuntimeServiceStub:
    CheckHealth: _SyncCheckHealthCallable | _AioCheckHealthCallable

    @overload
    def __init__(self, channel: grpc.aio.Channel) -> None: ...

    @overload
    def __init__(self, channel: grpc.Channel) -> None: ...


class AgentRuntimeServiceSyncServicer(Protocol):
    def CheckHealth(
        self, request: HealthRequest, context: grpc.ServicerContext
    ) -> HealthResponse: ...


class AgentRuntimeServiceServicer:
    async def CheckHealth(
        self,
        request: HealthRequest,
        context: grpc.aio.ServicerContext[HealthRequest, HealthResponse],
    ) -> HealthResponse: ...


def add_AgentRuntimeServiceServicer_to_server(
    servicer: AgentRuntimeServiceSyncServicer | AgentRuntimeServiceServicer,
    server: grpc.Server | grpc.aio.Server,
) -> None: ...


class AgentRuntimeService:
    @staticmethod
    def CheckHealth(
        request: HealthRequest,
        target: str,
        options: object = ...,
        channel_credentials: grpc.ChannelCredentials | None = ...,
        call_credentials: grpc.CallCredentials | None = ...,
        insecure: bool = ...,
        compression: grpc.Compression | None = ...,
        wait_for_ready: bool | None = ...,
        timeout: float | None = ...,
        metadata: object = ...,
    ) -> HealthResponse: ...
