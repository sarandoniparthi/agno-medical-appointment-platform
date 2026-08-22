"""Lazy construction of the production Agno scheduling workflow."""

import asyncio
from typing import Any, Literal

import httpx
from pydantic import TypeAdapter

from agent_runtime.scheduling.intent_parser import create_intent_parser
from agent_runtime.scheduling.models import WorkflowSnapshot
from agent_runtime.scheduling.store import create_agno_store
from agent_runtime.scheduling.tools_client import SchedulingToolsClient
from agent_runtime.scheduling.workflow import SchedulingWorkflow
from agno_platform.models.bedrock import create_bedrock_model
from agno_platform.settings import AgentRuntimeSettings, BedrockSettings

_object_adapter: TypeAdapter[dict[str, Any]] = TypeAdapter(dict[str, Any])


class HttpWorkflowTools:
    def __init__(self, base_url: str) -> None:
        self._base_url = base_url

    async def search_patients(self, query: str, correlation_id: str) -> list[dict[str, str]]:
        async with httpx.AsyncClient() as client:
            return await SchedulingToolsClient(self._base_url, client).search_patients(
                query, correlation_id
            )

    async def find_open_slots(
        self, query: dict[str, str], correlation_id: str
    ) -> list[dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            return await SchedulingToolsClient(self._base_url, client).find_open_slots(
                query, correlation_id
            )

    async def get_appointment(
        self, appointment_id: str, correlation_id: str
    ) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            return await SchedulingToolsClient(self._base_url, client).get_appointment(
                appointment_id, correlation_id
            )


class HttpWorkflowMutationExecutor:
    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def execute(
        self, snapshot: dict[str, Any], payload: dict[str, Any], correlation_id: str
    ) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/api/internal/workflow-mutations",
                json={"snapshot": snapshot, "payload": payload},
                headers={"x-correlation-id": correlation_id},
                timeout=10.0,
            )
            response.raise_for_status()
            return _object_adapter.validate_python(response.json())


def create_default_workflow() -> SchedulingWorkflow:
    runtime_settings = AgentRuntimeSettings()
    if runtime_settings.database_url is None:
        raise RuntimeError("DATABASE_URL is required for Agno workflow persistence")
    parser = create_intent_parser(
        create_bedrock_model(BedrockSettings())  # pyright: ignore[reportCallIssue]
    )
    tools = HttpWorkflowTools(runtime_settings.nest_internal_url)
    store = create_agno_store(runtime_settings.database_url)
    return SchedulingWorkflow(
        parser, tools, store, HttpWorkflowMutationExecutor(runtime_settings.nest_internal_url)
    )


class LazySchedulingWorkflow:
    def __init__(self) -> None:
        self._workflow: SchedulingWorkflow | None = None
        self._lock = asyncio.Lock()

    async def _get_workflow(self) -> SchedulingWorkflow:
        if self._workflow is None:
            async with self._lock:
                if self._workflow is None:
                    self._workflow = create_default_workflow()
        return self._workflow

    async def start(self, request: str, correlation_id: str) -> WorkflowSnapshot:
        return await (await self._get_workflow()).start(request, correlation_id)

    def get(self, run_id: str) -> WorkflowSnapshot:
        if self._workflow is None:
            self._workflow = create_default_workflow()
        return self._workflow.get(run_id)

    async def respond(
        self, run_id: str,
        response: Literal["approve", "reject", "edit", "find_more"],
        payload: dict[str, Any],
    ) -> WorkflowSnapshot:
        return await (await self._get_workflow()).respond(run_id, response, payload)
