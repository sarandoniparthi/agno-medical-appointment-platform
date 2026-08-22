from typing import Any

import pytest

from agent_runtime.scheduling.models import CreateIntent
from agent_runtime.scheduling.workflow import SchedulingWorkflow


class FakeParser:
    async def parse(self, request: str) -> CreateIntent:
        del request
        return CreateIntent(action="create", patient_query="Maya", specialty="Cardiology")


class FakeTools:
    async def search_patients(self, query: str, correlation_id: str) -> list[dict[str, str]]:
        return [{"id": "patient-1", "scheduling_code": "PT-1001", "display_name": "Maya"}]

    async def find_open_slots(
        self, query: dict[str, str], correlation_id: str
    ) -> list[dict[str, Any]]:
        del query, correlation_id
        return [
            {"id": f"slot-{index}", "doctor_id": "doctor-1", "doctor_display_name": "Dr. Shah",
             "clinic_id": "clinic-1", "clinic_name": "North Loop Clinic",
             "clinic_timezone": "America/Chicago", "appointment_type_id": "type-1",
             "appointment_type_name": "Follow-up", "start_at": f"2026-08-2{index}T15:00:00Z",
             "end_at": f"2026-08-2{index}T15:30:00Z", "explanation": "Open slot",
             "availability_score": 50, "preference_score": 20-index, "continuity_score": 10}
            for index in range(4, 8)
        ]


class FakeStore:
    def __init__(self) -> None:
        self.snapshots: dict[str, dict[str, Any]] = {}
        self.approvals: dict[str, dict[str, Any]] = {}

    def save(self, snapshot: dict[str, Any]) -> None:
        self.snapshots[str(snapshot["run_id"])] = snapshot

    def load(self, run_id: str) -> dict[str, Any] | None:
        return self.snapshots.get(run_id)

    def create_approval(self, approval: dict[str, Any]) -> None:
        self.approvals[str(approval["id"])] = approval

    def resolve_approval(self, approval_id: str, status: str, resolution: dict[str, Any]) -> bool:
        approval = self.approvals.get(approval_id)
        if approval is None or approval["status"] != "pending":
            return False
        approval.update(status=status, resolution_data=resolution)
        return True


@pytest.mark.asyncio
async def test_create_persists_approval_before_returning_ranked_candidates() -> None:
    store = FakeStore()
    workflow = SchedulingWorkflow(FakeParser(), FakeTools(), store)

    snapshot = await workflow.start("Schedule Maya", "corr-1")

    assert snapshot.status == "approval_required"
    assert len(snapshot.candidates) == 3
    assert snapshot.candidates[0].total_score > snapshot.candidates[1].total_score
    assert snapshot.requirement is not None
    assert snapshot.requirement.id in store.approvals
    assert snapshot.run_id in store.snapshots


@pytest.mark.asyncio
async def test_reject_resumes_persisted_run_without_mutation() -> None:
    store = FakeStore()
    workflow = SchedulingWorkflow(FakeParser(), FakeTools(), store)
    started = await workflow.start("Schedule Maya", "corr-1")

    rejected = await workflow.respond(started.run_id, "reject", {})

    assert rejected.status == "rejected"
    assert rejected.events[-1].type == "rejected"
    assert workflow.get(started.run_id).status == "rejected"
