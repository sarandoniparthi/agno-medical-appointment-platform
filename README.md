# Agno Medical Appointment Scheduler

An administrator-first reference application for learning how to build a safe
agentic workflow with Agno, Amazon Bedrock, React, NestJS, and PostgreSQL.

The calendar is the product use case. The main technical lesson is how an LLM
can understand a request and propose an action while deterministic application
code, human approval, and database constraints retain control.

## Start with one simple example

Enter this in the **Scheduling agent** panel:

```text
Schedule Maya Carter with Cardiology
```

The application performs this sequence:

1. Amazon Bedrock converts the sentence into a strict Pydantic intent.
2. The Agno workflow searches for exactly one patient.
3. NestJS finds conflict-free cardiology openings.
4. Deterministic code ranks and returns at most three candidates.
5. The Agno-backed workflow pauses and persists an approval requirement.
6. The administrator selects **Approve this slot**.
7. NestJS re-reads and verifies the persisted approval over gRPC.
8. A PostgreSQL transaction creates the appointment and audit record.

The model never writes directly to the appointment database.

## What is implemented

| Capability | Status |
| --- | --- |
| Seeded administrator calendar | Implemented |
| Direct create, reschedule, and cancel dialogs | Implemented |
| Bedrock structured scheduling intent | Implemented |
| Conflict-free candidate generation | Implemented |
| Deterministic candidate ranking | Implemented |
| Persisted human approval | Implemented |
| Verified, idempotent appointment mutation | Implemented |
| Resumable workflow UI | Implemented |
| Formal Agno `Workflow` subclass | Planned |
| Doctor/date/clinic preference enforcement | Partial |
| Read-only natural-language schedule queries | Planned |
| Three-level memory | Planned |
| Weather and maps MCP tools | Planned |
| Agno Teams, knowledge, and evaluations | Planned |

`Show me Dr. Jordan Lee's schedule` is not supported yet. Use the calendar's
**Doctor** filter until the read-only `view_schedule` intent is added.

## Architecture and ownership

```text
Browser / React
      |
      | HTTP /api
      v
NestJS API ----------------------> PostgreSQL
      |                              appointments, rules,
      | private gRPC                 audit, idempotency
      v
Python Agno runtime -------------> Agno PostgreSQL tables
      |                              sessions, approvals
      |
      +----> Amazon Bedrock (model inference only)
      |
      +----> MCP gateway (weather/maps boundary; planned providers)
```

| Component | Responsibility |
| --- | --- |
| `apps/web` | Calendar, direct forms, workflow request and approval UI |
| `apps/api` | Authoritative business rules, reads, transactions, and gRPC client |
| `apps/agent-runtime` | Bedrock intent parsing and Agno workflow orchestration |
| `apps/mcp-gateway` | Policy boundary for external MCP providers |
| `libs/database` | TypeORM schemas, entities, and explicit migrations |
| `libs/contracts` | Shared TypeScript and gRPC contracts |
| `libs/observability` | Correlation identifiers and sensitive-field redaction |
| `python/agno_platform` | Shared Python settings, Bedrock boundary, and generated gRPC code |
| `proto` | Versioned NestJS-to-Python service contract |

### Why this separation is useful

- **Safer AI:** Bedrock interprets requests but cannot bypass business rules.
- **Reliable writes:** NestJS and PostgreSQL enforce conflicts and transactions.
- **Auditable HITL:** approval is durable before a mutation is attempted.
- **Retry safety:** idempotency prevents duplicate appointments.
- **Replaceable model:** business logic does not depend on one LLM provider.
- **Independent scaling:** React, NestJS, and Python can run as separate pods.
- **Typed boundaries:** Pydantic, TypeScript, and protobuf catch malformed data.

For concept-by-concept examples and source paths, read the
[feature learning guide](docs/feature-learning-guide.md).

## Technology

- Nx monorepo, TypeScript 5, React 19, Vite, NestJS 11
- TypeORM 0.3 with explicit PostgreSQL migrations
- Python 3.12, FastAPI, Pydantic 2, Agno, pytest, Ruff, and Pyright
- Protocol Buffers and asynchronous gRPC for NestJS/Python communication
- PostgreSQL with `pgcrypto`; pgvector is reserved for memory/knowledge work
- Amazon Bedrock for model inference
- Vitest for TypeScript/React and pytest for Python

## Prerequisites

- Node.js `>=22.13 <23` or Node.js 24
- npm
- Python 3.12 and [uv](https://docs.astral.sh/uv/)
- PostgreSQL running locally
- AWS CLI profile, SSO session, or IAM role with Bedrock access

On Windows PowerShell, use `npm.cmd` if the `npm.ps1` execution-policy shim is
blocked.

## Install dependencies

From the repository root:

```powershell
npm.cmd install
uv sync
```

## Configure `.env`

Create a root `.env`. It is local-only and must never be committed.

```dotenv
DATABASE_URL=postgresql://postgres:123@localhost:5432/agnoagents
API_PORT=3000
WEB_PORT=4200
AGENT_HTTP_PORT=8000
AGENT_GRPC_PORT=50051
AGENT_GRPC_URL=127.0.0.1:50051
NEST_INTERNAL_URL=http://127.0.0.1:3000
MCP_GATEWAY_PORT=8010
AWS_REGION=us-east-1
AWS_PROFILE=dev_stg

# Set exactly one of these two values.
BEDROCK_MODEL_ID=
BEDROCK_INFERENCE_PROFILE_ARN=
```

Use exactly one of `BEDROCK_MODEL_ID` or
`BEDROCK_INFERENCE_PROFILE_ARN`. AWS credentials must come from the ambient AWS
profile, SSO session, workload identity, or IAM role. Never put access keys,
secret keys, or session tokens in `.env`.

Example profile authentication:

```powershell
aws sso login --profile dev_stg
aws sts get-caller-identity --profile dev_stg
```

## Prepare local PostgreSQL

This checkout currently uses PostgreSQL on `localhost:5432`; Docker Compose is
not required.

Create the database and extensions once:

```powershell
psql -U postgres -c "CREATE DATABASE agnoagents;"
psql -U postgres -d agnoagents -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

Run the explicit TypeORM migrations and deterministic demo seed:

```powershell
npm.cmd run db:migrate
```

TypeORM uses `synchronize: false` and `migrationsRun: false`. Application startup
does not change the schema automatically.

## Run the application

Open three terminals at the repository root and start them in this order.

Terminal 1 — FastAPI and gRPC Agno runtime:

```powershell
npm.cmd exec nx -- serve agent-runtime
```

Terminal 2 — NestJS API:

```powershell
npm.cmd exec nx -- serve api
```

Terminal 3 — React UI:

```powershell
npm.cmd exec nx -- serve web
```

The MCP gateway is optional until weather/maps providers are connected:

```powershell
npm.cmd exec nx -- serve mcp-gateway
```

## Verify the running services

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/ready
```

Expected readiness includes `"agentRuntime":"serving"`.

Open [http://localhost:4200](http://localhost:4200). If Vite reports that 4200
is already occupied, use the URL it prints, such as `http://localhost:4201`.

## Prompts that work now

Create appointment candidates:

```text
Schedule Maya Carter with Cardiology
Schedule Noah Williams with Family Medicine
Schedule PT-1001 with Dermatology
```

Reschedule or cancel requires the appointment UUID:

```text
Reschedule appointment <appointment-id> to next week
Cancel appointment <appointment-id> because the patient requested it
```

Current seeded reference data:

- Patients: Maya Carter (`PT-1001`) and Noah Williams (`PT-1002`)
- Dr. Avery Shah — Cardiology
- Dr. Jordan Lee — Family Medicine
- Dr. Morgan Diaz — Dermatology

Patient and specialty are the most reliable natural-language constraints today.
Doctor, clinic, appointment type, and date preferences are only partially
enforced. Unsupported read-only requests should be treated as planned work, not
as a capability of the current agent.

## Run automated verification

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run verify
```

Useful focused commands:

```powershell
npm.cmd exec nx -- run api:test
npm.cmd exec nx -- run web:test
uv run pytest apps/agent-runtime/tests -q
npm.cmd exec nx -- run agent-runtime:bedrock-smoke
```

The Bedrock smoke test invokes AWS and is intentionally excluded from the
normal verification suite.

## Troubleshooting

### The UI returns HTTP 500 for a prompt

Check the Python runtime terminal first. A Pydantic validation error commonly
means the request is not one of the currently supported intents. For example,
`Show me Dr. Jordan Lee's schedule` needs the planned read-only intent.

### Bedrock says `aioboto3` is missing

Run `uv sync` and restart the Python runtime. Agno's asynchronous Bedrock path
requires the locked `aioboto3` dependency.

### `/api/ready` reports the runtime unavailable

Confirm the Python runtime is running on `AGENT_GRPC_PORT` and that
`AGENT_GRPC_URL` points to the same port.

### PostgreSQL authentication fails

Confirm the username, password, port, and `agnoagents` database in
`DATABASE_URL`, then rerun `npm.cmd run db:migrate`.

## More documentation

- [Feature learning guide](docs/feature-learning-guide.md)
- [Local development guide](docs/development.md)
- [Appointment workflow design](docs/superpowers/specs/2026-08-22-appointment-workflow-design.md)
- [Platform design](docs/superpowers/specs/2026-08-20-agno-medical-appointment-platform-design.md)
