"""Privacy-minimized HTTP client for NestJS scheduling read tools."""

from typing import Any

import httpx
from pydantic import TypeAdapter

from agent_runtime.scheduling.models import PatientSearchResult

_patients_adapter: TypeAdapter[list[PatientSearchResult]] = TypeAdapter(list[PatientSearchResult])
_object_adapter: TypeAdapter[dict[str, Any]] = TypeAdapter(dict[str, Any])
_object_list_adapter: TypeAdapter[list[dict[str, Any]]] = TypeAdapter(list[dict[str, Any]])


class SchedulingToolsClient:
    def __init__(self, base_url: str, client: httpx.AsyncClient) -> None:
        self._base_url = base_url.rstrip("/")
        self._client = client

    async def search_patients(self, query: str, correlation_id: str) -> list[dict[str, str]]:
        response = await self._get(
            "/api/patients", correlation_id, params={"query": query},
        )
        try:
            patients = _patients_adapter.validate_python(response)
        except ValueError as error:
            raise ValueError("scheduling tool response contains unexpected fields") from error
        return [
            {
                "id": patient.id,
                "scheduling_code": patient.schedulingCode,
                "display_name": patient.displayName,
            }
            for patient in patients
        ]

    async def get_catalog(self, correlation_id: str) -> dict[str, Any]:
        return _object_adapter.validate_python(await self._get("/api/catalog", correlation_id))

    async def get_appointment(self, appointment_id: str, correlation_id: str) -> dict[str, Any]:
        value = _object_adapter.validate_python(
            await self._get(f"/api/appointments/{appointment_id}", correlation_id)
        )
        disallowed = {"diagnosis", "treatment", "clinical_note"}.intersection(value)
        if disallowed:
            raise ValueError("appointment response contains unexpected fields")
        return value

    async def find_open_slots(
        self, query: dict[str, str], correlation_id: str
    ) -> list[dict[str, Any]]:
        return _object_list_adapter.validate_python(
            await self._get("/api/internal/open-slots", correlation_id, params=query)
        )

    async def _get(
        self, path: str, correlation_id: str, params: dict[str, str] | None = None,
    ) -> object:
        response = await self._client.get(
            f"{self._base_url}{path}", params=params,
            headers={"x-correlation-id": correlation_id}, timeout=5.0,
        )
        response.raise_for_status()
        return response.json()
