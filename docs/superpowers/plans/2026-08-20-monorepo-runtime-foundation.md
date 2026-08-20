# Monorepo and Runtime Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a runnable Nx monorepo containing React, NestJS, Python FastAPI services, PostgreSQL/pgvector Docker infrastructure, TypeORM, protobuf/gRPC, Vitest/pytest, and AWS Bedrock model configuration.

**Architecture:** React communicates with NestJS through HTTP and later SSE/WebSocket. NestJS communicates with the Python Agno runtime through versioned protobuf/gRPC; the Python runtime communicates with the MCP gateway through MCP streamable HTTP. PostgreSQL in Docker is the authoritative local store, and Bedrock is model inference only.

**Tech Stack:** Nx, npm, TypeScript, React, Vite, NestJS, Vitest, Playwright, Python 3.12, uv, FastAPI, Agno, Pydantic v2, pytest, grpc-js, grpcio, protobuf, TypeORM, PostgreSQL, pgvector, Docker Compose, AWS Bedrock.

**Spec:** `docs/superpowers/specs/2026-08-20-agno-medical-appointment-platform-design.md`

## Global Constraints

- Bedrock is used only for LLM/model inference; Agno owns agents, teams, workflows, tools, memory, knowledge, HITL, guardrails, tracing, and evaluations.
- PostgreSQL and pgvector remain the application and vector-storage layer.
- TypeORM `synchronize` is `false`; migrations never run automatically on application startup.
- React never calls the Python runtime directly.
- Browser traffic uses HTTP plus SSE/WebSocket; NestJS-to-Python commands use protobuf/gRPC.
- Weather and maps are the only initial external MCP domains, but provider implementation is deferred to Plan 5.
- No secrets, AWS access keys, patient data, raw prompts, or raw tool payloads are committed or emitted by tests.
- TypeScript unit and integration tests use Vitest; Python tests use pytest; browser tests use Playwright.
- Python schemas use Pydantic v2.
- Package installers resolve current compatible releases once and commit `package-lock.json` and `uv.lock` for reproducibility.

---

## Target File Structure

```text
apps/
  web/                         React application
  api/                         NestJS application
  agent-runtime/               Python FastAPI + grpc.aio service
  mcp-gateway/                 Python FastAPI MCP gateway shell
libs/
  contracts/                   HTTP and browser-event TypeScript contracts
  ui/                          Shared React components
  auth/                        Shared authorization types
  database/                    TypeORM configuration and migrations
  observability/               Correlation and telemetry helpers
proto/
  agent_runtime/v1/            Versioned internal gRPC API
python/
  agno_platform/               Shared Python package
  tests/                       Shared Python tests
infra/
  postgres/init/               Database initialization scripts
compose.yaml                   Local PostgreSQL/pgvector
package.json                   npm and Nx commands
nx.json                        Nx project defaults
pyproject.toml                 Python workspace and tooling
uv.lock                        Locked Python dependencies
.env.example                   Non-secret local configuration names
```

### Task 1: Initialize the Nx and Python Workspaces

**Files:**
- Create: `package.json`
- Create: `nx.json`
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Create: `.gitignore`
- Create: `pyproject.toml`
- Create: `python/agno_platform/__init__.py`
- Create: `python/tests/test_package_import.py`
- Modify: `package-lock.json` after dependency installation
- Modify: `uv.lock` after dependency installation

**Interfaces:**
- Produces: Nx commands through `npm run nx -- <target>` and importable Python package `agno_platform`.
- Produces: Python quality commands `uv run pytest`, `uv run ruff check .`, and `uv run pyright`.

- [ ] **Step 1: Initialize npm and install the workspace toolchain**

Run:

```powershell
npm init -y
npm install --save-dev nx@latest @nx/js@latest @nx/react@latest @nx/vite@latest @nx/nest@latest @nx/node@latest @nx/playwright@latest typescript@latest vitest@latest @vitest/coverage-v8@latest
npm install @nestjs/common@latest @nestjs/core@latest @nestjs/platform-express@latest reflect-metadata rxjs react@latest react-dom@latest
```

Expected: `package-lock.json` exists and `npm exec nx -- --version` exits with code 0.

- [ ] **Step 2: Create the Nx workspace configuration**

Write `nx.json`:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "defaultBase": "main",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": ["default", "!{projectRoot}/**/*.spec.*", "!{projectRoot}/**/*.test.*"],
    "sharedGlobals": ["{workspaceRoot}/package-lock.json", "{workspaceRoot}/uv.lock"]
  },
  "targetDefaults": {
    "test": { "cache": true, "inputs": ["default", "^production"] },
    "build": { "cache": true, "inputs": ["production", "^production"] },
    "lint": { "cache": true, "inputs": ["default", "^default"] }
  }
}
```

Write `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "composite": false,
    "declarationMap": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "isolatedModules": true,
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noUncheckedIndexedAccess": true,
    "strict": true,
    "target": "ES2023"
  }
}
```

- [ ] **Step 3: Create the Python workspace configuration**

Run:

```powershell
uv init --bare --python 3.12
uv add fastapi "uvicorn[standard]" agno pydantic pydantic-settings grpcio protobuf boto3 psycopg sqlalchemy
uv add --dev pytest pytest-asyncio pytest-cov httpx ruff pyright grpcio-tools
```

Set the following sections in `pyproject.toml` while preserving the dependency versions written by `uv`:

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["python/agno_platform"]

[tool.pytest.ini_options]
pythonpath = ["python"]
testpaths = ["python/tests", "apps/agent-runtime/tests", "apps/mcp-gateway/tests"]
asyncio_mode = "auto"

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "ASYNC"]

[tool.pyright]
pythonVersion = "3.12"
include = ["python", "apps/agent-runtime", "apps/mcp-gateway"]
typeCheckingMode = "strict"
```

- [ ] **Step 4: Write the initial failing Python import test**

Create `python/tests/test_package_import.py`:

```python
def test_shared_package_exposes_version() -> None:
    from agno_platform import __version__

    assert __version__ == "0.1.0"
```

Run:

```powershell
uv run pytest python/tests/test_package_import.py -q
```

Expected: FAIL because `__version__` is not defined.

- [ ] **Step 5: Implement the package version and verify the workspace**

Create `python/agno_platform/__init__.py`:

```python
__version__ = "0.1.0"
```

Update `package.json` scripts:

```json
{
  "private": true,
  "scripts": {
    "nx": "nx",
    "build": "nx run-many -t build",
    "test": "nx run-many -t test && uv run pytest",
    "lint": "nx run-many -t lint && uv run ruff check . && uv run pyright",
    "verify": "npm run lint && npm run test && npm run build"
  }
}
```

Run:

```powershell
uv lock
uv run pytest python/tests/test_package_import.py -q
npm exec nx -- show projects
```

Expected: pytest PASS and Nx exits successfully even before projects are generated.

- [ ] **Step 6: Commit the workspace foundation**

```powershell
git add package.json package-lock.json nx.json tsconfig.base.json pyproject.toml uv.lock python .editorconfig .gitignore
git commit -m "chore: initialize nx and python workspaces"
```

### Task 2: Add PostgreSQL and pgvector with Docker Compose

**Files:**
- Create: `compose.yaml`
- Create: `.env.example`
- Create: `infra/postgres/init/001-extensions.sql`
- Create: `tools/check-postgres.mjs`
- Create: `tools/check-postgres.test.ts`

**Interfaces:**
- Produces: PostgreSQL at `${POSTGRES_HOST_PORT:-5432}` with database `scheduler`, user `scheduler`, and extension `vector`.
- Produces: local connection URL named `DATABASE_URL`.

- [ ] **Step 1: Write a failing configuration test**

Create `tools/check-postgres.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('postgres compose configuration', () => {
  const compose = readFileSync('compose.yaml', 'utf8');

  it('uses pgvector and a healthcheck', () => {
    expect(compose).toContain('pgvector/pgvector:pg17');
    expect(compose).toContain('pg_isready');
    expect(compose).toContain('./infra/postgres/init:/docker-entrypoint-initdb.d:ro');
  });
});
```

Run:

```powershell
npm exec vitest -- run tools/check-postgres.test.ts
```

Expected: FAIL because `compose.yaml` does not exist.

- [ ] **Step 2: Create the Docker Compose service**

Create `compose.yaml`:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_DB: scheduler
      POSTGRES_USER: scheduler
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-scheduler-local-only}
    ports:
      - "${POSTGRES_HOST_PORT:-5432}:5432"
    volumes:
      - scheduler-postgres:/var/lib/postgresql/data
      - ./infra/postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U scheduler -d scheduler"]
      interval: 5s
      timeout: 5s
      retries: 20
      start_period: 10s

volumes:
  scheduler-postgres:
```

Create `infra/postgres/init/001-extensions.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Create `.env.example`:

```dotenv
POSTGRES_HOST_PORT=5432
POSTGRES_PASSWORD=scheduler-local-only
DATABASE_URL=postgresql://scheduler:scheduler-local-only@localhost:5432/scheduler
API_PORT=3000
WEB_PORT=4200
AGENT_HTTP_PORT=8000
AGENT_GRPC_PORT=50051
MCP_GATEWAY_PORT=8010
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=
BEDROCK_INFERENCE_PROFILE_ARN=
```

- [ ] **Step 3: Validate the Compose file and unit test**

Run:

```powershell
npm exec vitest -- run tools/check-postgres.test.ts
docker compose --env-file .env.example config --quiet
```

Expected: both commands exit with code 0.

- [ ] **Step 4: Start PostgreSQL and verify pgvector**

Run:

```powershell
docker compose --env-file .env.example up -d postgres
docker compose --env-file .env.example exec postgres psql -U scheduler -d scheduler -c "SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgcrypto') ORDER BY extname;"
```

Expected: two rows, `pgcrypto` and `vector`.

- [ ] **Step 5: Commit the database runtime**

```powershell
git add compose.yaml .env.example infra/postgres tools/check-postgres.test.ts
git commit -m "chore: add postgres pgvector development service"
```

### Task 3: Generate React, NestJS, and Shared TypeScript Libraries

**Files:**
- Create: `apps/web/**`
- Create: `apps/api/**`
- Create: `libs/contracts/**`
- Create: `libs/ui/**`
- Create: `libs/auth/**`
- Create: `libs/observability/**`
- Modify: `tsconfig.base.json`

**Interfaces:**
- Produces: React project `web`, NestJS project `api`, and import aliases `@scheduler/contracts`, `@scheduler/ui`, `@scheduler/auth`, and `@scheduler/observability`.

- [ ] **Step 1: Generate the projects**

Run:

```powershell
npm exec nx -- g @nx/react:application apps/web --bundler=vite --unitTestRunner=vitest --e2eTestRunner=playwright --style=css --routing=true --strict=true --no-interactive
npm exec nx -- g @nx/nest:application apps/api --unitTestRunner=none --strict=true --no-interactive
npm exec nx -- g @nx/js:library libs/contracts --bundler=tsc --unitTestRunner=vitest --strict=true --no-interactive
npm exec nx -- g @nx/react:library libs/ui --bundler=vite --unitTestRunner=vitest --style=css --strict=true --no-interactive
npm exec nx -- g @nx/js:library libs/auth --bundler=tsc --unitTestRunner=vitest --strict=true --no-interactive
npm exec nx -- g @nx/js:library libs/observability --bundler=tsc --unitTestRunner=vitest --strict=true --no-interactive
```

Expected: `npm exec nx -- show projects` lists `web`, `api`, `contracts`, `ui`, `auth`, and `observability`.

- [ ] **Step 2: Configure Vitest for NestJS**

Create `apps/api/vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    coverage: { provider: 'v8', reportsDirectory: '../../coverage/apps/api' },
  },
});
```

Install the path plugin and add an Nx `test` target to `apps/api/project.json` that runs `vitest --config apps/api/vite.config.ts`:

```powershell
npm install --save-dev vite-tsconfig-paths@latest
```

- [ ] **Step 3: Write a failing API health test**

Create `apps/api/src/app/app.controller.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('returns a structured health response', async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    expect(module.get(AppController).health()).toEqual({ service: 'api', status: 'ok' });
  });
});
```

Run:

```powershell
npm exec nx -- test api
```

Expected: FAIL because `health()` does not return the required object.

- [ ] **Step 4: Implement the health endpoint and verify TypeScript projects**

Make `AppController.health()` return:

```ts
@Get('health')
health(): { service: 'api'; status: 'ok' } {
  return { service: 'api', status: 'ok' };
}
```

Run:

```powershell
npm exec nx -- run-many -t test --projects=web,api,contracts,ui,auth,observability
npm exec nx -- run-many -t build --projects=web,api,contracts,ui,auth,observability
```

Expected: all selected targets PASS.

- [ ] **Step 5: Commit the TypeScript applications**

```powershell
git add apps libs tsconfig.base.json package.json package-lock.json
git commit -m "feat: add react nest and shared nx projects"
```

### Task 4: Add the Python Agent Runtime and MCP Gateway Projects

**Files:**
- Create: `apps/agent-runtime/project.json`
- Create: `apps/agent-runtime/src/agent_runtime/main.py`
- Create: `apps/agent-runtime/tests/test_health.py`
- Create: `apps/mcp-gateway/project.json`
- Create: `apps/mcp-gateway/src/mcp_gateway/main.py`
- Create: `apps/mcp-gateway/tests/test_health.py`

**Interfaces:**
- Produces: FastAPI applications `agent_runtime.main:app` and `mcp_gateway.main:app`.
- Produces: Nx targets `serve`, `test`, `lint`, and `typecheck` for both Python projects.

- [ ] **Step 1: Write failing FastAPI health tests**

Create `apps/agent-runtime/tests/test_health.py`:

```python
from fastapi.testclient import TestClient
from agent_runtime.main import app


def test_agent_runtime_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"service": "agent-runtime", "status": "ok"}
```

Create `apps/mcp-gateway/tests/test_health.py`:

```python
from fastapi.testclient import TestClient
from mcp_gateway.main import app


def test_mcp_gateway_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"service": "mcp-gateway", "status": "ok"}
```

Run:

```powershell
uv run pytest apps/agent-runtime/tests apps/mcp-gateway/tests -q
```

Expected: FAIL because both application packages are missing.

- [ ] **Step 2: Implement the minimal FastAPI applications**

Create each `main.py` using this structure and the corresponding service name:

```python
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
```

- [ ] **Step 3: Add explicit Nx targets for Python**

Create each `project.json` with `nx:run-commands` targets. For `agent-runtime`, use:

```json
{
  "name": "agent-runtime",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/agent-runtime/src",
  "targets": {
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv run uvicorn agent_runtime.main:app --app-dir apps/agent-runtime/src --host 0.0.0.0 --port 8000"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": { "command": "uv run pytest apps/agent-runtime/tests -q" }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": { "command": "uv run ruff check apps/agent-runtime" }
    },
    "typecheck": {
      "executor": "nx:run-commands",
      "options": { "command": "uv run pyright apps/agent-runtime" }
    }
  }
}
```

Create `apps/mcp-gateway/project.json`:

```json
{
  "name": "mcp-gateway",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/mcp-gateway/src",
  "targets": {
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv run uvicorn mcp_gateway.main:app --app-dir apps/mcp-gateway/src --host 0.0.0.0 --port 8010"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": { "command": "uv run pytest apps/mcp-gateway/tests -q" }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": { "command": "uv run ruff check apps/mcp-gateway" }
    },
    "typecheck": {
      "executor": "nx:run-commands",
      "options": { "command": "uv run pyright apps/mcp-gateway" }
    }
  }
}
```

- [ ] **Step 4: Run all Python project checks**

Run:

```powershell
npm exec nx -- run-many -t test,lint,typecheck --projects=agent-runtime,mcp-gateway
```

Expected: all six targets PASS.

- [ ] **Step 5: Commit the Python services**

```powershell
git add apps/agent-runtime apps/mcp-gateway pyproject.toml uv.lock
git commit -m "feat: add fastapi runtime and mcp gateway projects"
```

### Task 5: Add TypeORM with Explicit Migration Ownership

**Files:**
- Create: `libs/database/project.json`
- Create: `libs/database/src/lib/database.config.ts`
- Create: `libs/database/src/lib/data-source.ts`
- Create: `libs/database/src/lib/entities/platform-setting.entity.ts`
- Create: `libs/database/src/migrations/0000000000001-platform-settings.ts`
- Create: `libs/database/src/lib/database.config.spec.ts`
- Modify: `apps/api/src/app/app.module.ts`

**Interfaces:**
- Produces: `createTypeOrmOptions(databaseUrl: string): TypeOrmModuleOptions`.
- Produces: TypeORM CLI data source with explicit migrations and no startup migration execution.

- [ ] **Step 1: Install TypeORM dependencies**

```powershell
npm install typeorm@latest @nestjs/typeorm@latest pg@latest
npm install --save-dev tsx@latest
```

- [ ] **Step 2: Write the failing database safety test**

Create `libs/database/src/lib/database.config.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createTypeOrmOptions } from './database.config';

describe('createTypeOrmOptions', () => {
  it('never synchronizes or runs migrations on startup', () => {
    const options = createTypeOrmOptions('postgresql://user:pass@localhost:5432/db');
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.type).toBe('postgres');
  });
});
```

Run:

```powershell
npm exec vitest -- run libs/database/src/lib/database.config.spec.ts
```

Expected: FAIL because `createTypeOrmOptions` does not exist.

- [ ] **Step 3: Implement the safe TypeORM configuration**

Create `database.config.ts`:

```ts
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createTypeOrmOptions(databaseUrl: string): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}
```

Create a TypeORM `DataSource` in `data-source.ts` that imports the migration list explicitly and reads `DATABASE_URL`. Create `PlatformSettingEntity` with `key` as primary text, `value` as `jsonb`, and timestamps. Create migration `0000000000001-platform-settings.ts` to create and drop `platform_settings`.

- [ ] **Step 4: Register TypeORM without automatic schema changes**

In `AppModule`, use:

```ts
TypeOrmModule.forRootAsync({
  useFactory: () => createTypeOrmOptions(
    process.env.DATABASE_URL ?? 'postgresql://scheduler:scheduler-local-only@localhost:5432/scheduler',
  ),
})
```

Add package scripts:

```json
{
  "db:migrate": "tsx ./node_modules/typeorm/cli.js migration:run -d libs/database/src/lib/data-source.ts",
  "db:revert": "tsx ./node_modules/typeorm/cli.js migration:revert -d libs/database/src/lib/data-source.ts"
}
```

- [ ] **Step 5: Verify configuration and migration**

Run:

```powershell
npm exec vitest -- run libs/database/src/lib/database.config.spec.ts
npm run db:migrate
docker compose --env-file .env.example exec postgres psql -U scheduler -d scheduler -c "SELECT to_regclass('public.platform_settings');"
```

Expected: test PASS and query returns `platform_settings`.

- [ ] **Step 6: Commit the persistence foundation**

```powershell
git add libs/database apps/api package.json package-lock.json
git commit -m "feat: add explicit typeorm migration foundation"
```

### Task 6: Define and Generate the gRPC Runtime Contract

**Files:**
- Create: `proto/agent_runtime/v1/agent_runtime.proto`
- Create: `tools/generate-proto.mjs`
- Create: `libs/contracts/src/lib/grpc/agent-runtime.ts`
- Create: `python/agno_platform/generated/agent_runtime/v1/**`
- Create: `apps/agent-runtime/tests/test_grpc_health.py`
- Modify: `package.json`

**Interfaces:**
- Produces: protobuf package `scheduler.agent_runtime.v1`.
- Produces: RPC `CheckHealth(HealthRequest) returns (HealthResponse)`.
- Reserves future RPC names for start, get, stream, input, approval, and cancellation without implementing them in this foundation task.

- [ ] **Step 1: Define the health contract**

Create `agent_runtime.proto`:

```proto
syntax = "proto3";

package scheduler.agent_runtime.v1;

service AgentRuntimeService {
  rpc CheckHealth(HealthRequest) returns (HealthResponse);
}

message HealthRequest {
  string correlation_id = 1;
}

message HealthResponse {
  string service = 1;
  ServingStatus status = 2;
  string correlation_id = 3;
}

enum ServingStatus {
  SERVING_STATUS_UNSPECIFIED = 0;
  SERVING_STATUS_SERVING = 1;
  SERVING_STATUS_NOT_SERVING = 2;
}
```

- [ ] **Step 2: Install generators and generate both languages**

Run:

```powershell
npm install @grpc/grpc-js@latest @grpc/proto-loader@latest
uv run python -m grpc_tools.protoc -I proto --python_out=python/agno_platform/generated --grpc_python_out=python/agno_platform/generated proto/agent_runtime/v1/agent_runtime.proto
```

Create `tools/generate-proto.mjs`:

```js
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'uv',
  [
    'run',
    'python',
    '-m',
    'grpc_tools.protoc',
    '-I',
    'proto',
    '--python_out=python/agno_platform/generated',
    '--grpc_python_out=python/agno_platform/generated',
    'proto/agent_runtime/v1/agent_runtime.proto',
  ],
  { shell: process.platform === 'win32', stdio: 'inherit' },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
```

Add `"proto:generate": "node tools/generate-proto.mjs"` to `package.json`.

- [ ] **Step 3: Write the failing Python gRPC health test**

Create a test that starts `grpc.aio.server()` on an ephemeral port, registers `AgentRuntimeService`, calls `CheckHealth(correlation_id="test-123")`, and asserts:

```python
assert response.service == "agent-runtime"
assert response.status == ServingStatus.SERVING_STATUS_SERVING
assert response.correlation_id == "test-123"
```

Run:

```powershell
uv run pytest apps/agent-runtime/tests/test_grpc_health.py -q
```

Expected: FAIL because the service implementation is missing.

- [ ] **Step 4: Implement the Python gRPC health service**

Create `apps/agent-runtime/src/agent_runtime/grpc_service.py` with an async `CheckHealth` implementation that copies the request correlation ID and returns `SERVING`. Add `grpc_server.py` with `serve_grpc(host: str, port: int)` and graceful shutdown.

- [ ] **Step 5: Verify generated files and Python service**

Run:

```powershell
npm run proto:generate
uv run pytest apps/agent-runtime/tests/test_grpc_health.py -q
uv run pyright apps/agent-runtime python/agno_platform/generated
```

Expected: all commands PASS.

- [ ] **Step 6: Commit the protobuf contract**

```powershell
git add proto tools/generate-proto.mjs libs/contracts python/agno_platform/generated apps/agent-runtime package.json package-lock.json
git commit -m "feat: add versioned agent runtime grpc contract"
```

### Task 7: Connect NestJS to the Python gRPC Health Service

**Files:**
- Create: `apps/api/src/app/agent-runtime/agent-runtime.module.ts`
- Create: `apps/api/src/app/agent-runtime/agent-runtime.client.ts`
- Create: `apps/api/src/app/agent-runtime/agent-runtime.client.spec.ts`
- Modify: `apps/api/src/app/app.controller.ts`
- Modify: `apps/api/src/app/app.module.ts`

**Interfaces:**
- Consumes: `scheduler.agent_runtime.v1.AgentRuntimeService.CheckHealth`.
- Produces: `AgentRuntimeClient.checkHealth(correlationId: string): Promise<AgentRuntimeHealth>`.

- [ ] **Step 1: Write the failing client adapter test**

Create `agent-runtime.client.spec.ts` with a fake gRPC client whose `CheckHealth` callback returns `SERVING`. Assert:

```ts
await expect(adapter.checkHealth('test-123')).resolves.toEqual({
  service: 'agent-runtime',
  status: 'serving',
  correlationId: 'test-123',
});
```

Run:

```powershell
npm exec nx -- test api
```

Expected: FAIL because the adapter is missing.

- [ ] **Step 2: Implement the gRPC adapter**

Implement `AgentRuntimeClient` as a NestJS provider. Load the versioned proto using `@grpc/proto-loader`, create a `@grpc/grpc-js` client for `AGENT_GRPC_URL`, wrap the callback in a Promise, apply a two-second deadline, and map only the three allowed response fields.

- [ ] **Step 3: Add a composite readiness endpoint**

Add `GET /ready` that returns HTTP 200 only when the API is running and the agent runtime reports `serving`. Return HTTP 503 with correlation ID and a non-sensitive error code for deadline or connectivity failure.

- [ ] **Step 4: Run unit and live interoperability tests**

In two terminals run:

```powershell
uv run python -m agent_runtime.grpc_server --app-dir apps/agent-runtime/src --port 50051
npm exec nx -- serve api
```

Then run:

```powershell
Invoke-RestMethod http://localhost:3000/api/ready
```

Expected: `{ api: 'ok', agentRuntime: 'serving' }` with a correlation ID.

- [ ] **Step 5: Commit the NestJS gRPC integration**

```powershell
git add apps/api libs/contracts
git commit -m "feat: connect api to agent runtime over grpc"
```

### Task 8: Add Bedrock-Only Agno Model Configuration

**Files:**
- Create: `python/agno_platform/settings.py`
- Create: `python/agno_platform/models/bedrock.py`
- Create: `python/tests/models/test_bedrock.py`
- Modify: `.env.example`

**Interfaces:**
- Produces: `BedrockSettings` loaded from environment.
- Produces: `create_bedrock_model(settings: BedrockSettings) -> AwsBedrock`.
- Does not perform a live model call in the default test suite.

- [ ] **Step 1: Write failing configuration tests**

Create `python/tests/models/test_bedrock.py`:

```python
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


def test_creates_agno_aws_bedrock_model() -> None:
    settings = BedrockSettings(
        AWS_REGION="us-east-1",
        BEDROCK_MODEL_ID="test-model",
    )

    model = create_bedrock_model(settings)

    assert isinstance(model, AwsBedrock)
    assert model.id == "test-model"
    assert model.aws_region == "us-east-1"
```

Assertions:

- either `BEDROCK_MODEL_ID` or `BEDROCK_INFERENCE_PROFILE_ARN` is required;
- setting both is rejected;
- application settings contain no access-key or secret-key fields;
- the factory returns `agno.models.aws.AwsBedrock` with the selected identifier and Region.

Run:

```powershell
uv run pytest python/tests/models/test_bedrock.py -q
```

Expected: FAIL because settings and factory are missing.

- [ ] **Step 2: Implement Pydantic settings**

Create a `BedrockSettings(BaseSettings)` with aliases `AWS_REGION`, `BEDROCK_MODEL_ID`, and `BEDROCK_INFERENCE_PROFILE_ARN`. Use an `after` model validator to enforce exactly one model reference. Do not define AWS access-key fields.

- [ ] **Step 3: Implement the Agno model factory**

Create:

```python
def create_bedrock_model(settings: BedrockSettings) -> AwsBedrock:
    model_reference = settings.inference_profile_arn or settings.model_id
    assert model_reference is not None
    return AwsBedrock(id=model_reference, aws_region=settings.aws_region)
```

- [ ] **Step 4: Verify configuration without AWS credentials**

Run:

```powershell
uv run pytest python/tests/models/test_bedrock.py -q
uv run ruff check python/agno_platform/settings.py python/agno_platform/models/bedrock.py python/tests/models/test_bedrock.py
uv run pyright python/agno_platform/settings.py python/agno_platform/models/bedrock.py
```

Expected: all commands PASS without contacting AWS.

- [ ] **Step 5: Add an opt-in Bedrock smoke test command**

Add an Nx target `bedrock-smoke` to `agent-runtime` that runs a test marked `bedrock_live`. The test skips unless `RUN_BEDROCK_LIVE_TESTS=1`, sends a non-sensitive fixed prompt, and asserts a non-empty response. Document that CI does not enable it by default.

- [ ] **Step 6: Commit the Bedrock model boundary**

```powershell
git add python apps/agent-runtime .env.example
git commit -m "feat: configure bedrock as agno model provider"
```

### Task 9: Add Correlation, Redaction-Safe Logging, and Final Verification

**Files:**
- Create: `libs/observability/src/lib/correlation.ts`
- Create: `libs/observability/src/lib/redact.ts`
- Create: `libs/observability/src/lib/redact.spec.ts`
- Create: `python/agno_platform/observability/redact.py`
- Create: `python/tests/observability/test_redact.py`
- Create: `docs/development.md`
- Modify: `README.md`

**Interfaces:**
- Produces: TypeScript `redactRecord(input: unknown): unknown`.
- Produces: Python `redact_mapping(value: Mapping[str, object]) -> dict[str, object]`.
- Redacts keys matching authorization, cookie, token, secret, password, prompt, patient address, and raw tool payload classifications.

- [ ] **Step 1: Write failing redaction tests in both languages**

Use nested input containing safe correlation data plus `authorization`, `password`, `rawPrompt`, `patientAddress`, and `toolPayload`. Assert sensitive values become `[REDACTED]`, safe keys remain, arrays are traversed, and the original input is not mutated.

Run:

```powershell
npm exec vitest -- run libs/observability/src/lib/redact.spec.ts
uv run pytest python/tests/observability/test_redact.py -q
```

Expected: both FAIL because the redactors are missing.

- [ ] **Step 2: Implement deterministic recursive redactors**

Implement allowlist-independent recursive traversal with a shared case-insensitive sensitive-key list documented in `libs/contracts/src/lib/privacy/sensitive-fields.ts` and mirrored in `python/agno_platform/privacy/sensitive_fields.py`. Return new objects rather than mutating inputs.

- [ ] **Step 3: Document local startup**

In `docs/development.md`, provide these exact steps:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
npm run db:migrate
npm exec nx -- serve agent-runtime
npm exec nx -- serve mcp-gateway
npm exec nx -- serve api
npm exec nx -- serve web
```

State that `.env` is local-only, Bedrock uses the ambient AWS credential chain, and the model identifier must be selected for the configured Region.

- [ ] **Step 4: Run the complete foundation verification**

Run:

```powershell
docker compose config --quiet
npm run verify
uv run pytest
uv run ruff check .
uv run pyright
docker compose exec postgres psql -U scheduler -d scheduler -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

Expected: every command exits with code 0 and the SQL query returns `vector`.

- [ ] **Step 5: Verify repository safety**

Run:

```powershell
git status --short
git grep -n -I -E "AKIA[0-9A-Z]{16}|aws_secret_access_key|scheduler-local-only" -- ':!package-lock.json' ':!.env.example' ':!docs/development.md'
```

Expected: only intended foundation changes are listed and the credential-pattern search returns no secret-bearing source files.

- [ ] **Step 6: Commit the verified foundation**

```powershell
git add README.md docs/development.md libs/observability libs/contracts python
git commit -m "chore: verify runtime foundation"
```

## Foundation Completion Criteria

- `docker compose up -d postgres` reaches healthy state.
- PostgreSQL contains `vector` and `pgcrypto` extensions.
- TypeORM has `synchronize: false` and `migrationsRun: false` under test.
- Explicit migration creates `platform_settings`.
- React, NestJS, shared TypeScript projects, and both Python projects are visible to Nx.
- Vitest and pytest suites pass.
- NestJS calls the Python health service through versioned gRPC.
- Bedrock factory is configured through Pydantic settings and ambient IAM credentials only.
- No default test contacts AWS or an external MCP provider.
- Redaction-safe logging helpers pass nested-data tests.
- `npm run verify`, `uv run pytest`, `uv run ruff check .`, and `uv run pyright` pass.
