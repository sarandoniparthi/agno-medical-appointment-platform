"""Application configuration loaded from the environment."""

from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class AgentRuntimeSettings(BaseSettings):
    """Local ports for the combined agent runtime HTTP and gRPC process."""

    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, extra="ignore")

    http_port: int = Field(default=8000, alias="AGENT_HTTP_PORT")
    grpc_port: int = Field(default=50051, alias="AGENT_GRPC_PORT")
    nest_internal_url: str = Field(default="http://127.0.0.1:3000", alias="NEST_INTERNAL_URL")
    database_url: str | None = Field(default=None, alias="DATABASE_URL")


class McpGatewaySettings(BaseSettings):
    """Local HTTP port for the MCP gateway process."""

    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, extra="ignore")

    http_port: int = Field(default=8010, alias="MCP_GATEWAY_PORT")


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
