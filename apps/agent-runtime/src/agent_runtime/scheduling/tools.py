"""Agno-compatible narrow read-only scheduling tool functions."""

from typing import Any

from agent_runtime.scheduling.tools_client import SchedulingToolsClient


def scheduling_tools(client: SchedulingToolsClient, correlation_id: str) -> list[Any]:
    async def search_patients(query: str) -> list[dict[str, str]]:
        """Search synthetic patients by scheduling code or display name."""
        return await client.search_patients(query, correlation_id)

    async def get_catalog() -> dict[str, Any]:
        """Read clinics, doctors, specialties, and appointment types."""
        return await client.get_catalog(correlation_id)

    async def get_appointment(appointment_id: str) -> dict[str, Any]:
        """Read the minimized scheduling view of one appointment."""
        return await client.get_appointment(appointment_id, correlation_id)

    async def find_open_slots(query: dict[str, str]) -> list[dict[str, Any]]:
        """Find conflict-free appointment candidates using NestJS rules."""
        return await client.find_open_slots(query, correlation_id)

    return [search_patients, get_catalog, get_appointment, find_open_slots]
