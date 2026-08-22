import pytest
from pydantic import ValidationError

from agent_runtime.scheduling.models import (
    CancelIntent,
    CreateIntent,
    SchedulingCandidate,
    parse_scheduling_intent,
)


def test_parses_discriminated_create_intent() -> None:
    intent = parse_scheduling_intent(
        {"action": "create", "patient_query": "PT-1001", "specialty": "Cardiology"}
    )
    assert isinstance(intent, CreateIntent)


def test_cancel_requires_a_reason() -> None:
    with pytest.raises(ValidationError):
        CancelIntent(action="cancel", appointment_id="appointment-1", reason=" ")


def test_candidate_rejects_unknown_or_sensitive_fields() -> None:
    with pytest.raises(ValidationError):
        SchedulingCandidate.model_validate(
            {
                "id": "candidate-1", "doctor_id": "doctor-1", "doctor_display_name": "Dr. Shah",
                "clinic_id": "clinic-1", "clinic_name": "North Loop Clinic",
                "clinic_timezone": "America/Chicago", "appointment_type_id": "type-1",
                "appointment_type_name": "Follow-up", "start_at": "2026-08-25T15:00:00Z",
                "end_at": "2026-08-25T15:30:00Z", "explanation": "First open option",
                "availability_score": 50, "preference_score": 25, "continuity_score": 15,
                "diagnosis": "must not cross tool boundary",
            }
        )
