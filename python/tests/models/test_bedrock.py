import pytest
from agno.models.aws import AwsBedrock
from pydantic import ValidationError

from agno_platform.models.bedrock import create_bedrock_model
from agno_platform.settings import BedrockSettings


@pytest.fixture(autouse=True)
def clears_bedrock_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "AWS_REGION",
        "BEDROCK_MODEL_ID",
        "BEDROCK_INFERENCE_PROFILE_ARN",
    ):
        monkeypatch.delenv(name, raising=False)


def test_requires_exactly_one_non_empty_model_reference() -> None:
    with pytest.raises(ValidationError):
        BedrockSettings(AWS_REGION="us-east-1")

    with pytest.raises(ValidationError):
        BedrockSettings(
            AWS_REGION="us-east-1",
            BEDROCK_MODEL_ID="model-id",
            BEDROCK_INFERENCE_PROFILE_ARN="profile-arn",
        )


def test_rejects_empty_or_whitespace_only_model_references() -> None:
    with pytest.raises(ValidationError):
        BedrockSettings(AWS_REGION="us-east-1", BEDROCK_MODEL_ID="")

    with pytest.raises(ValidationError):
        BedrockSettings(AWS_REGION="us-east-1", BEDROCK_INFERENCE_PROFILE_ARN="   ")


def test_ignores_empty_model_reference_and_normalizes_whitespace() -> None:
    settings = BedrockSettings(
        AWS_REGION="us-east-1",
        BEDROCK_MODEL_ID="  ",
        BEDROCK_INFERENCE_PROFILE_ARN="  profile-id  ",
    )

    assert settings.model_id is None
    assert settings.inference_profile_arn == "profile-id"


def test_rejects_static_access_keys_in_application_settings() -> None:
    field_names = set(BedrockSettings.model_fields)

    assert "aws_access_key_id" not in field_names
    assert "aws_secret_access_key" not in field_names
    assert "aws_session_token" not in field_names


@pytest.mark.parametrize(
    "credential_field",
    ["aws_access_key_id", "aws_secret_access_key", "aws_session_token"],
)
def test_rejects_static_credential_fields_passed_to_constructor(credential_field: str) -> None:
    with pytest.raises(ValidationError):
        BedrockSettings(
            AWS_REGION="us-east-1",
            BEDROCK_MODEL_ID="test-model",
            **{credential_field: "test-value"},
        )


def test_loads_aliases_from_process_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("BEDROCK_MODEL_ID", "environment-model")
    monkeypatch.setenv("UNRELATED_AMBIENT_VARIABLE", "ignored")

    settings = BedrockSettings()  # pyright: ignore[reportCallIssue]

    assert settings.aws_region == "us-east-1"
    assert settings.model_id == "environment-model"
    assert settings.inference_profile_arn is None


def test_creates_agno_aws_bedrock_model_from_model_id() -> None:
    settings = BedrockSettings(
        AWS_REGION="us-east-1",
        BEDROCK_MODEL_ID="test-model",
    )

    model = create_bedrock_model(settings)

    assert isinstance(model, AwsBedrock)
    assert model.id == "test-model"
    assert model.aws_region == "us-east-1"


@pytest.mark.parametrize(
    "profile_reference",
    [
        "profile-id",
        "arn:aws:bedrock:us-east-1:123456789012:inference-profile/test",
    ],
)
def test_creates_agno_aws_bedrock_model_from_inference_profile_id_or_arn(
    profile_reference: str,
) -> None:
    settings = BedrockSettings(
        AWS_REGION="us-east-1",
        BEDROCK_INFERENCE_PROFILE_ARN=profile_reference,
    )

    model = create_bedrock_model(settings)

    assert model.id == profile_reference
