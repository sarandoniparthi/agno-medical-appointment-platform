import httpx
import pytest

from agent_runtime.scheduling.tools_client import SchedulingToolsClient


@pytest.mark.asyncio
async def test_patient_search_returns_only_allowlisted_scheduling_fields() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-correlation-id"] == "corr-1"
        return httpx.Response(200, json=[{
            "id": "patient-1", "schedulingCode": "PT-1001", "displayName": "Maya Carter"
        }])

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        tools = SchedulingToolsClient("http://nest", client)
        result = await tools.search_patients("maya", "corr-1")

    assert result == [{
        "id": "patient-1", "scheduling_code": "PT-1001", "display_name": "Maya Carter"
    }]


@pytest.mark.asyncio
async def test_tool_rejects_sensitive_response_before_returning_it() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[{
            "id": "patient-1", "schedulingCode": "PT-1001", "displayName": "Maya",
            "clinical_note": "not allowed",
        }])

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        tools = SchedulingToolsClient("http://nest", client)
        with pytest.raises(ValueError, match="unexpected fields"):
            await tools.search_patients("maya", "corr-1")
