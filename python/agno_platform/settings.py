"""Application configuration loaded from the environment."""

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings


class BedrockSettings(BaseSettings):
    """Bedrock inference settings that rely on the ambient AWS credential chain."""

    aws_region: str = Field(alias="AWS_REGION")
    model_id: str | None = Field(default=None, alias="BEDROCK_MODEL_ID")
    inference_profile_arn: str | None = Field(
        default=None, alias="BEDROCK_INFERENCE_PROFILE_ARN"
    )

    @model_validator(mode="after")
    def requires_exactly_one_model_reference(self) -> "BedrockSettings":
        if (self.model_id is None) == (self.inference_profile_arn is None):
            raise ValueError(
                "exactly one of BEDROCK_MODEL_ID or BEDROCK_INFERENCE_PROFILE_ARN is required"
            )
        return self
