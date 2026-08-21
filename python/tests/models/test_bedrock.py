import pytest
from agno.models.aws import AwsBedrock
from pydantic import ValidationError

from agno_platform.models.bedrock import create_bedrock_model
from agno_platform.settings import BedrockSettings


def test_requires_exactly_one_model_reference() -> None:
    with pytest.raises(ValidationError):
        BedrockSettings(AWS_REGION="us-east-1")

    with pytest.raises(ValidationError):
        BedrockSettings(
            AWS_REGION="us-east-1",
            BEDROCK_MODEL_ID="model-id",
            BEDROCK_INFERENCE_PROFILE_ARN="profile-arn",
        )


def test_rejects_static_access_keys_in_application_settings() -> None:
    field_names = set(BedrockSettings.model_fields)

    assert "aws_access_key_id" not in field_names
    assert "aws_secret_access_key" not in field_names
    assert "aws_session_token" not in field_names


def test_creates_agno_aws_bedrock_model_from_model_id() -> None:
    settings = BedrockSettings(
        AWS_REGION="us-east-1",
        BEDROCK_MODEL_ID="test-model",
    )

    model = create_bedrock_model(settings)

    assert isinstance(model, AwsBedrock)
    assert model.id == "test-model"
    assert model.aws_region == "us-east-1"


def test_creates_agno_aws_bedrock_model_from_inference_profile_arn() -> None:
    settings = BedrockSettings(
        AWS_REGION="us-east-1",
        BEDROCK_INFERENCE_PROFILE_ARN="arn:aws:bedrock:us-east-1:123456789012:inference-profile/test",
    )

    model = create_bedrock_model(settings)

    assert model.id == "arn:aws:bedrock:us-east-1:123456789012:inference-profile/test"
