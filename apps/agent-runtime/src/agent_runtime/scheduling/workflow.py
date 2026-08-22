"""Approval-gated scheduling orchestration with Agno-owned persistence."""

from datetime import UTC, datetime, timedelta
from typing import Any, Literal, Protocol
from uuid import uuid4

from agent_runtime.scheduling.models import (
    CancelIntent,
    CreateIntent,
    SchedulingCandidate,
    SchedulingIntent,
    WorkflowEvent,
    WorkflowRequirement,
    WorkflowSnapshot,
)
from agent_runtime.scheduling.ranking import rank_candidates


class IntentParser(Protocol):
    async def parse(self, request: str) -> SchedulingIntent: ...


class WorkflowTools(Protocol):
    async def search_patients(self, query: str, correlation_id: str) -> list[dict[str, str]]: ...
    async def find_open_slots(
        self, query: dict[str, str], correlation_id: str
    ) -> list[dict[str, Any]]: ...


class WorkflowStore(Protocol):
    def save(self, snapshot: dict[str, Any]) -> None: ...
    def load(self, run_id: str) -> dict[str, Any] | None: ...
    def create_approval(self, approval: dict[str, Any]) -> None: ...
    def resolve_approval(
        self, approval_id: str, status: str, resolution: dict[str, Any]
    ) -> bool: ...


class SchedulingWorkflow:
    def __init__(self, parser: IntentParser, tools: WorkflowTools, store: WorkflowStore) -> None:
        self._parser = parser
        self._tools = tools
        self._store = store

    async def start(self, request: str, correlation_id: str) -> WorkflowSnapshot:
        now = datetime.now(UTC)
        intent = await self._parser.parse(request)
        snapshot = WorkflowSnapshot(
            workflow_id="appointment-scheduling-v1", session_id=str(uuid4()), run_id=str(uuid4()),
            action=intent.action, status="running",
            events=[WorkflowEvent(sequence=1, type="request_received", occurred_at=now),
                    WorkflowEvent(sequence=2, type="intent_parsed", occurred_at=now)],
            context={"correlation_id": correlation_id},
        )
        if isinstance(intent, CreateIntent):
            patients = await self._tools.search_patients(intent.patient_query, correlation_id)
            if len(patients) != 1:
                snapshot.status = "input_required"
                snapshot.events.append(
                    WorkflowEvent(
                        sequence=3, type="clarification_required",
                        occurred_at=now, message="Select one patient",
                    )
                )
                self._store.save(snapshot.model_dump(mode="json"))
                return snapshot
            slots = await self._tools.find_open_slots(
                {"patientId": patients[0]["id"], "specialty": intent.specialty or ""},
                correlation_id,
            )
            snapshot.candidates = rank_candidates(
                [SchedulingCandidate.model_validate(slot) for slot in slots]
            )
            snapshot.context["patient_id"] = patients[0]["id"]
        else:
            snapshot.context["appointment_id"] = intent.appointment_id
            if isinstance(intent, CancelIntent):
                snapshot.context["reason"] = intent.reason

        approval_id = str(uuid4())
        expires_at = now + timedelta(minutes=15)
        snapshot.requirement = WorkflowRequirement(
            id=approval_id, kind="approval", status="pending", expires_at=expires_at,
        )
        snapshot.status = "approval_required"
        snapshot.events.extend([
            WorkflowEvent(sequence=3, type="candidates_ready", occurred_at=now),
            WorkflowEvent(sequence=4, type="approval_required", occurred_at=now),
        ])
        self._store.create_approval({
            "id": approval_id, "run_id": snapshot.run_id,
            "session_id": snapshot.session_id, "status": "pending",
            "source_type": "workflow", "approval_type": "appointment_mutation",
            "pause_type": "confirmation", "workflow_id": snapshot.workflow_id,
            "user_id": "development-admin", "requirements": snapshot.model_dump(mode="json"),
            "expires_at": int(expires_at.timestamp()), "run_status": "PAUSED",
        })
        self._store.save(snapshot.model_dump(mode="json"))
        return snapshot

    def get(self, run_id: str) -> WorkflowSnapshot:
        stored = self._store.load(run_id)
        if stored is None:
            raise KeyError(run_id)
        return WorkflowSnapshot.model_validate(stored)

    async def respond(
        self, run_id: str, response: Literal["approve", "reject", "edit", "find_more"],
        payload: dict[str, Any],
    ) -> WorkflowSnapshot:
        snapshot = self.get(run_id)
        requirement = snapshot.requirement
        if requirement is None or requirement.status != "pending":
            raise ValueError("workflow has no pending requirement")
        status = "approved" if response in {"approve", "edit"} else "rejected"
        if response == "find_more":
            status = "rejected"
        if not self._store.resolve_approval(requirement.id, status, payload):
            raise ValueError("requirement was already resolved")
        requirement.status = "approved" if status == "approved" else "rejected"
        snapshot.status = "approved" if status == "approved" else "rejected"
        snapshot.events.append(WorkflowEvent(
            sequence=len(snapshot.events) + 1,
            type="approved" if status == "approved" else "rejected",
            occurred_at=datetime.now(UTC),
        ))
        self._store.save(snapshot.model_dump(mode="json"))
        return snapshot
