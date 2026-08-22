"""Agno Agent adapter for Bedrock-backed structured scheduling intent extraction."""

from typing import Protocol, cast

from agno.agent import Agent
from agno.models.base import Model

from agent_runtime.scheduling.models import SchedulingIntent, StrictModel


class IntentEnvelope(StrictModel):
    intent: SchedulingIntent


class AgentOutput(Protocol):
    content: object


class AgentRunner(Protocol):
    async def arun(self, request: str) -> AgentOutput: ...


class BedrockIntentParser:
    def __init__(self, agent: AgentRunner) -> None:
        self._agent = agent

    async def parse(self, request: str) -> SchedulingIntent:
        output = await self._agent.arun(request)
        if isinstance(output.content, IntentEnvelope):
            return output.content.intent
        return IntentEnvelope.model_validate(output.content).intent


def create_intent_parser(model: Model) -> BedrockIntentParser:
    agent = Agent(
        name="Scheduling intent coordinator",
        model=model,
        output_schema=IntentEnvelope,
        parse_response=True,
        instructions=[
            "Extract only appointment scheduling intent.",
            "Never infer missing patient, appointment, clinic, doctor, date, or reason values.",
            "Never include diagnosis, treatment, clinical notes, credentials, "
            "or unrelated patient data.",
        ],
    )
    return BedrockIntentParser(cast(AgentRunner, agent))
