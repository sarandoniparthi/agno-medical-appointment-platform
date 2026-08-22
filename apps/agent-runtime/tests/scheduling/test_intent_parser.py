from dataclasses import dataclass

import pytest

from agent_runtime.scheduling.intent_parser import BedrockIntentParser
from agent_runtime.scheduling.models import CreateIntent


class FakeAgent:
    async def arun(self, request: str) -> "FakeOutput":
        assert request == "Schedule Maya with cardiology"
        return FakeOutput(content={
            "intent": {
                "action": "create", "patient_query": "Maya", "specialty": "Cardiology"
            }
        })


@dataclass
class FakeOutput:
    content: object


@pytest.mark.asyncio
async def test_bedrock_parser_returns_strict_discriminated_intent() -> None:
    parser = BedrockIntentParser(FakeAgent())
    intent = await parser.parse("Schedule Maya with cardiology")
    assert isinstance(intent, CreateIntent)
