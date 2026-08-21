import os
from typing import Any, cast

import pytest
from agno.models.message import Message

from agno_platform.models.bedrock import create_bedrock_model
from agno_platform.settings import BedrockSettings

pytestmark = pytest.mark.bedrock_live


def test_bedrock_model_returns_a_non_empty_response_when_explicitly_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    if os.environ.get("RUN_BEDROCK_LIVE_TESTS") != "1":
        pytest.skip("set RUN_BEDROCK_LIVE_TESTS=1 to run the Bedrock smoke test")

    # Keep an opted-in local run from waiting on repeated instance-metadata probes.
    if "AWS_METADATA_SERVICE_TIMEOUT" not in os.environ:
        monkeypatch.setenv("AWS_METADATA_SERVICE_TIMEOUT", "1")
    if "AWS_METADATA_SERVICE_NUM_ATTEMPTS" not in os.environ:
        monkeypatch.setenv("AWS_METADATA_SERVICE_NUM_ATTEMPTS", "1")

    settings = BedrockSettings()  # pyright: ignore[reportCallIssue]
    model = cast(Any, create_bedrock_model(settings))
    response = model.response(messages=[Message(role="user", content="Reply with OK.")])

    assert isinstance(response.content, str)
    assert response.content.strip()
