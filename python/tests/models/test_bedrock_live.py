import os
from importlib import import_module
from typing import Any, cast

import pytest
from agno.models.message import Message

from agno_platform.models.bedrock import create_bedrock_model
from agno_platform.settings import BedrockSettings

pytestmark = pytest.mark.bedrock_live


def test_bedrock_model_returns_a_non_empty_response_when_explicitly_enabled() -> None:
    if os.environ.get("RUN_BEDROCK_LIVE_TESTS") != "1":
        pytest.skip("set RUN_BEDROCK_LIVE_TESTS=1 to run the Bedrock smoke test")

    boto3_module = cast(Any, import_module("boto3"))
    if boto3_module.Session().get_credentials() is None:
        pytest.skip("no ambient AWS credentials are available")

    settings = BedrockSettings()  # pyright: ignore[reportCallIssue]
    model = cast(Any, create_bedrock_model(settings))
    response = model.response(messages=[Message(role="user", content="Reply with OK.")])

    assert isinstance(response.content, str)
    assert response.content.strip()
