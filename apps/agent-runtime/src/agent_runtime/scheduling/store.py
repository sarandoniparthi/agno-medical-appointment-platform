"""Agno-owned workflow session and approval persistence."""

from typing import Any, cast

from agno.db.postgres import PostgresDb
from agno.session import WorkflowSession


class AgnoSchedulingStore:
    def __init__(self, database: PostgresDb) -> None:
        self.database = database

    def save(self, snapshot: dict[str, Any]) -> None:
        session = WorkflowSession(
            session_id=str(snapshot["session_id"]),
            user_id="development-admin",
            workflow_id=str(snapshot["workflow_id"]),
            workflow_name="appointment-scheduling",
            session_data={"snapshot": snapshot},
        )
        self.database.upsert_session(session)

    def load(self, run_id: str) -> dict[str, Any] | None:
        sessions = self.database.get_sessions(limit=100)
        for session in sessions:
            if isinstance(session, WorkflowSession):
                data = session.session_data or {}
                snapshot_value = data.get("snapshot")
                if isinstance(snapshot_value, dict):
                    snapshot = cast(dict[str, Any], snapshot_value)
                    if snapshot.get("run_id") == run_id:
                        return snapshot
        return None

    def create_approval(self, approval: dict[str, Any]) -> None:
        self.database.create_approval(approval)

    def resolve_approval(self, approval_id: str, status: str, resolution: dict[str, Any]) -> bool:
        return self.database.update_approval(
            approval_id, expected_status="pending", status=status,
            resolution_data=resolution, resolved_by="development-admin",
        ) is not None


def create_agno_store(database_url: str) -> AgnoSchedulingStore:
    psycopg_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    database = PostgresDb(
        db_url=psycopg_url,
        db_schema="agno",
        session_table="agno_sessions",
        approvals_table="agno_approvals",
    )
    return AgnoSchedulingStore(database)
