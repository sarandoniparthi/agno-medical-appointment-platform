from agent_runtime.scheduling.store import create_agno_store


def test_agno_store_owns_only_the_agno_schema() -> None:
    store = create_agno_store("postgresql://user:pass@localhost:5432/test")
    try:
        assert store.database.db_schema == "agno"
        assert store.database.session_table_name == "agno_sessions"
        assert store.database.approvals_table_name == "agno_approvals"
    finally:
        store.database.close()
