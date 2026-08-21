"""Bedrock model construction without credential configuration."""

from agno.models.aws import AwsBedrock

from agno_platform.settings import BedrockSettings


def create_bedrock_model(settings: BedrockSettings) -> AwsBedrock:
    """Create an Agno Bedrock model using ambient AWS credentials at invocation time."""

    model_reference = settings.inference_profile_arn or settings.model_id
    assert model_reference is not None
    return AwsBedrock(id=model_reference, aws_region=settings.aws_region)
