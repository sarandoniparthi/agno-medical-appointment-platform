from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    service: Literal["agent-runtime"]
    status: Literal["ok"]


app = FastAPI(title="Agent Runtime", version="0.1.0")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(service="agent-runtime", status="ok")
