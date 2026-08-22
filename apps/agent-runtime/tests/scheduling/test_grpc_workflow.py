import json
from datetime import datetime
from typing import Any, Literal

import pytest

from agent_runtime.grpc_service import AgentRuntimeService
from agent_runtime.scheduling.models import WorkflowEvent, WorkflowSnapshot
from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2


class FakeWorkflow:
    async def start(self, request: str, correlation_id: str) -> WorkflowSnapshot:
        assert request == "Schedule Maya"
        assert correlation_id == "corr-1"
        return snapshot()

    def get(self, run_id: str) -> WorkflowSnapshot:
        assert run_id == "run-1"
        return snapshot()

    async def respond(
        self, run_id: str, response: str, payload: dict[str, Any]
    ) -> WorkflowSnapshot:
        assert (run_id, response, payload) == ("run-1", "approve", {"candidate_id": "slot-1"})
        return snapshot(status="approved")


def snapshot(
    status: Literal["approval_required", "approved"] = "approval_required",
) -> WorkflowSnapshot:
    return WorkflowSnapshot(
        workflow_id="workflow-1", session_id="session-1", run_id="run-1",
        action="create", status=status,
        events=[WorkflowEvent(
            sequence=1, type="request_received",
            occurred_at=datetime.fromisoformat("2026-08-22T12:00:00+00:00"),
        )],
    )


@pytest.mark.asyncio
async def test_start_workflow_returns_serialized_persisted_snapshot() -> None:
    service = AgentRuntimeService(FakeWorkflow())
    response = await service.StartSchedulingWorkflow(
        agent_runtime_pb2.StartSchedulingWorkflowRequest(
            correlation_id="corr-1", request_text="Schedule Maya"
        ),
        None,  # type: ignore[arg-type]
    )
    assert response.run_id == "run-1"
    assert json.loads(response.snapshot_json)["status"] == "approval_required"


@pytest.mark.asyncio
async def test_respond_maps_approval_enum_and_payload() -> None:
    service = AgentRuntimeService(FakeWorkflow())
    response = await service.RespondToSchedulingRequirement(
        agent_runtime_pb2.RespondToSchedulingRequirementRequest(
            correlation_id="corr-1", run_id="run-1",
            response=agent_runtime_pb2.REQUIREMENT_RESPONSE_APPROVE,
            payload_json='{"candidate_id":"slot-1"}',
        ),
        None,  # type: ignore[arg-type]
    )
    assert response.status == "approved"
