# Task 4 report: Python agent runtime and MCP gateway

## Files and interfaces

- Replaced the tracked placeholder directories with FastAPI services at
  `apps/agent-runtime/src/agent_runtime/main.py` and
  `apps/mcp-gateway/src/mcp_gateway/main.py`.
- Each service exposes `GET /health` with a Pydantic v2 `HealthResponse` model:
  `{ "service": "agent-runtime" | "mcp-gateway", "status": "ok" }`.
- Added focused `TestClient` health tests for both services.
- Added explicit `nx:run-commands` `serve`, `test`, `lint`, and `typecheck`
  targets. The services use distinct import paths and ports 8000 and 8010.
- Updated Python tool configuration so pytest can import both `src` packages and
  collect identically named health-test modules, while Ruff and Pyright resolve
  the application source roots. Pyright excludes executable test files because
  FastAPI's `TestClient` re-export is untyped under strict Pyright checking.

## TDD evidence

- RED: `uv run pytest apps/agent-runtime/tests apps/mcp-gateway/tests -q`
  failed during collection with expected `ModuleNotFoundError` exceptions for
  `agent_runtime` and `mcp_gateway`.
- GREEN: after adding the two applications and package configuration, the same
  command passed with `2 passed`.

## Verification

```powershell
npm.cmd exec nx -- run-many -t test,lint,typecheck --projects=agent-runtime,mcp-gateway --skip-nx-cache
```

All six targets passed uncached: two pytest targets (one health test each), two
Ruff targets, and two Pyright targets (0 errors, 0 warnings). `git diff --check`
also passed.

## Commit

`feat: add fastapi runtime and mcp gateway projects`

## Self-review and concerns

The endpoints use literal-constrained Pydantic v2 response models and match the
specified payloads exactly. No existing TypeScript application files were
altered. Test execution emits the existing FastAPI/Starlette `TestClient`
deprecation warning, and Nx emits unrelated Vite configuration and NO_COLOR
warnings; none fail the required targets. Nx also flags the two lint targets as
flaky even though the uncached run succeeded; this appears to be Nx cache
heuristic noise and is recorded for future infrastructure hardening.
