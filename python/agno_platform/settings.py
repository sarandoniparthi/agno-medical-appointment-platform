"""Application configuration loaded from the environment."""

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class BedrockSettings(BaseSettings):
    """Bedrock inference settings read only from process environment variables."""

    model_config = SettingsConfigDict(env_file=None, extra="forbid")

    aws_region: str = Field(alias="AWS_REGION")
    model_id: str | None = Field(default=None, alias="BEDROCK_MODEL_ID")
    inference_profile_arn: str | None = Field(
        default=None, alias="BEDROCK_INFERENCE_PROFILE_ARN"
    )

    @field_validator("model_id", "inference_profile_arn", mode="before")
    @classmethod
    def normalizes_model_references(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def requires_exactly_one_model_reference(self) -> "BedrockSettings":
        if (self.model_id is None) == (self.inference_profile_arn is None):
            raise ValueError(
                "exactly one of BEDROCK_MODEL_ID or BEDROCK_INFERENCE_PROFILE_ARN is required"
            )
        return self
