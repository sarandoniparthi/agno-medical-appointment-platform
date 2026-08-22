"""Strict structured inputs and outputs for scheduling workflows."""

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateIntent(StrictModel):
    action: Literal["create"]
    patient_query: str
    specialty: str | None = None
    doctor_query: str | None = None
    clinic_query: str | None = None
    appointment_type: str | None = None
    date_preference: str | None = None


class RescheduleIntent(StrictModel):
    action: Literal["reschedule"]
    appointment_id: str
    date_preference: str | None = None


class CancelIntent(StrictModel):
    action: Literal["cancel"]
    appointment_id: str
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("cancellation reason is required")
        return normalized


SchedulingIntent = Annotated[
    CreateIntent | RescheduleIntent | CancelIntent,
    Field(discriminator="action"),
]
_intent_adapter: TypeAdapter[SchedulingIntent] = TypeAdapter(SchedulingIntent)


def parse_scheduling_intent(value: object) -> SchedulingIntent:
    return _intent_adapter.validate_python(value)


class SchedulingCandidate(StrictModel):
    id: str
    doctor_id: str
    doctor_display_name: str
    clinic_id: str
    clinic_name: str
    clinic_timezone: str
    appointment_type_id: str
    appointment_type_name: str
    start_at: datetime
    end_at: datetime
    explanation: str
    availability_score: int = Field(ge=0, le=50)
    preference_score: int = Field(ge=0, le=30)
    continuity_score: int = Field(ge=0, le=20)
    observed_version: int | None = Field(default=None, ge=1)

    @property
    def total_score(self) -> int:
        return self.availability_score + self.preference_score + self.continuity_score


class ApprovalPayload(StrictModel):
    candidate_id: str | None = None
    edited_start_at: datetime | None = None
    reason: str | None = None


class WorkflowEvent(StrictModel):
    sequence: int = Field(ge=1)
    type: Literal[
        "request_received", "clarification_required", "intent_parsed",
        "candidates_ready", "approval_required", "approved", "rejected",
        "mutation_completed", "recoverable_error",
    ]
    occurred_at: datetime
    message: str | None = None


class WorkflowRequirement(StrictModel):
    id: str
    kind: Literal["input", "approval"]
    status: Literal["pending", "approved", "rejected", "expired"]
    expires_at: datetime


def _empty_candidates() -> list[SchedulingCandidate]:
    return []


class WorkflowSnapshot(StrictModel):
    workflow_id: str
    session_id: str
    run_id: str
    action: Literal["create", "reschedule", "cancel"] | None = None
    status: Literal[
        "running", "input_required", "approval_required", "approved",
        "completed", "rejected", "failed",
    ]
    events: list[WorkflowEvent]
    requirement: WorkflowRequirement | None = None
    candidates: list[SchedulingCandidate] = Field(
        default_factory=_empty_candidates, max_length=3
    )
    context: dict[str, Any] = Field(default_factory=dict)


class PatientSearchResult(StrictModel):
    id: str
    schedulingCode: str
    displayName: str
