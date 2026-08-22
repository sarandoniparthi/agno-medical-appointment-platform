# Agno Medical Appointment Platform

An administrator-first medical appointment scheduling platform and reference
architecture for building agentic applications with Agno. The target product
helps clinic administrators search calendars, compare suitable appointments,
review travel and weather context, approve an agent proposal, and schedule the
appointment safely.

The implemented slice includes a seeded administrator calendar, conflict-safe
create/reschedule/cancel operations, and an Agno workflow that proposes ranked
slots and pauses for explicit human approval before NestJS performs a write.
Weather/maps MCP tools, teams, and three-level memory remain future increments.

## Architecture

The project is an Nx monorepo containing:

- `apps/web`: React and Vite web application.
- `apps/api`: NestJS API, TypeORM integration, and private gRPC client.
- `apps/agent-runtime`: Python FastAPI and asynchronous gRPC runtime for Agno.
- `apps/mcp-gateway`: Python FastAPI boundary for approved external MCP tools.
- `libs/database`: PostgreSQL configuration, entities, and explicit migrations.
- `libs/contracts`: shared TypeScript contracts and privacy constants.
- `libs/observability`: correlation identifiers and recursive PII redaction.
- `libs/auth` and `libs/ui`: shared authentication and UI foundations.
- `proto`: versioned NestJS-to-Python gRPC contracts.
- `python/agno_platform`: shared Python settings, Bedrock model boundary,
  generated contracts, privacy, and observability utilities.

Runtime flow:

```text
React web -> NestJS API -> gRPC -> FastAPI/Agno runtime
                    |                    |
                    v                    v
          PostgreSQL + pgvector      MCP gateway
                                      |       |
                                   weather   maps
```

NestJS owns authoritative appointment writes. External MCP providers must not
access patient or appointment tables directly.

## Technology stack

- Nx, TypeScript, React 19, Vite, NestJS 11, and TypeORM 0.3
- Python 3.12, FastAPI, Pydantic 2, Agno, Ruff, Pyright, and pytest
- Protocol Buffers and gRPC between the NestJS and Python runtime boundaries
- PostgreSQL with pgvector and pgcrypto (local server for current development)
- Amazon Bedrock for model inference through Agno's Bedrock integration
- Vitest for TypeScript and React tests; pytest for Python tests

## Prerequisites

- Node.js 22.13 or newer in the Node 22 line, or Node 24
- npm
- Python 3.12
- [uv](https://docs.astral.sh/uv/)
- A local PostgreSQL server with the `vector` and `pgcrypto` extensions
- AWS CLI/profile, SSO, or an IAM role only when exercising Bedrock

The repository pins Node 22.13 in `.nvmrc` and enforces
`>=22.13.0 <23 || >=24.0.0`.

## Initial setup

Run these commands from the repository root. On Windows PowerShell, use
`npm.cmd` if the `npm.ps1` execution-policy shim is blocked.

```powershell
npm.cmd install
uv sync
```

Create a root `.env` (local-only; never commit it) with at least:

```dotenv
DATABASE_URL=postgresql://postgres:123@localhost:5432/agnoagents
API_PORT=3000
WEB_PORT=4200
AGENT_HTTP_PORT=8000
AGENT_GRPC_PORT=50051
AGENT_GRPC_URL=127.0.0.1:50051
NEST_INTERNAL_URL=http://127.0.0.1:3000
AWS_REGION=us-east-1
AWS_PROFILE=dev_stg
BEDROCK_MODEL_ID=
BEDROCK_INFERENCE_PROFILE_ARN=
```

## Environment variables

The local `.env` configures these endpoints:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `localhost:5432/agnoagents` | NestJS, TypeORM, and Agno persistence |
| `API_PORT` | `3000` | NestJS HTTP API |
| `WEB_PORT` | `4200` | React development server |
| `AGENT_HTTP_PORT` | `8000` | Agent runtime FastAPI server |
| `AGENT_GRPC_PORT` | `50051` | Agent runtime gRPC server |
| `AGENT_GRPC_URL` | `127.0.0.1:50051` | NestJS gRPC destination |
| `MCP_GATEWAY_PORT` | `8010` | MCP gateway HTTP server |
| `AWS_REGION` | `us-east-1` | Bedrock AWS Region |

If `AGENT_GRPC_PORT` changes, update `AGENT_GRPC_URL` to match.

### Bedrock configuration

Set exactly one model reference in `.env`:

```dotenv
BEDROCK_MODEL_ID=your-enabled-model-id
BEDROCK_INFERENCE_PROFILE_ARN=
```

or:

```dotenv
BEDROCK_MODEL_ID=
BEDROCK_INFERENCE_PROFILE_ARN=your-inference-profile-id-or-arn
```

Never store AWS access keys, secret keys, or session tokens in `.env`. The
runtime uses the ambient AWS provider chain, such as an AWS CLI profile or SSO
session, an IAM role, or workload identity.

For local AWS SSO usage:

```powershell
aws sso login --profile YOUR_PROFILE
$env:AWS_PROFILE = "YOUR_PROFILE"
```

## Local PostgreSQL and pgvector

Current development uses PostgreSQL installed on localhost. Create the
`agnoagents` database and enable the required extensions once:

```powershell
psql -U postgres -c "CREATE DATABASE agnoagents;"
psql -U postgres -d agnoagents -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pgcrypto;"
npm.cmd run db:migrate
```

The migration command loads the root `.env`. Configuration fails closed when
`DATABASE_URL` is absent. TypeORM has `synchronize: false` and `migrationsRun:
false`; schema changes use explicit migrations.

Useful database commands:

```powershell
npm.cmd run db:migrate
npm.cmd run db:revert
```

## Run the platform

Start each long-running service in a separate terminal from the repository
root.

Agent runtime — starts FastAPI and gRPC together:

```powershell
npm.cmd exec nx -- serve agent-runtime
```

MCP gateway:

```powershell
npm.cmd exec nx -- serve mcp-gateway
```

NestJS API:

```powershell
npm.cmd exec nx -- serve api
```

React web application:

```powershell
npm.cmd exec nx -- serve web
```

## Local endpoints

| Service | URL |
| --- | --- |
| React | http://localhost:4200 |
| NestJS health | http://localhost:3000/api/health |
| NestJS readiness through Python gRPC | http://localhost:3000/api/ready |
| Agent runtime health | http://localhost:8000/health |
| MCP gateway health | http://localhost:8010/health |

PowerShell health checks:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8010/health
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/ready
```

`/api/ready` succeeds only when the NestJS API can reach the Python gRPC
runtime.

## Test the appointment workflow

1. Open `http://localhost:4200` and confirm the seeded weekly calendar loads.
2. In **Scheduling agent**, enter `Schedule Maya with cardiology next week`.
3. Review the ranked candidates and choose **Approve this slot**. Approval is
   persisted before NestJS revalidates it and performs the transaction.
4. To modify an existing booking, ask `Reschedule appointment <id> next week`
   or `Cancel appointment <id> because patient requested it`, then approve.

Direct create, reschedule, and cancellation dialogs remain available as an
administrative fallback.

## Development and verification

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run verify
npm.cmd run verify:compose
```

Additional commands:

```powershell
npm.cmd run proto:generate
npm.cmd exec nx -- run api:test-artifact
npm.cmd exec nx -- run agent-runtime:bedrock-smoke
```

The Bedrock smoke test is opt-in and requires valid ambient AWS authentication
and an enabled model or inference profile. It is not part of the standard test
suite.

## Current capabilities

- Nx task orchestration for TypeScript and Python projects
- React, NestJS, FastAPI, and MCP gateway application boundaries
- Unified FastAPI and asynchronous gRPC runtime lifecycle
- Versioned protobuf contract and deterministic generated Python bindings
- NestJS gRPC deadlines, error mapping, readiness, and shutdown cleanup
- Explicit TypeORM migration boundary with fail-closed configuration
- Amazon Bedrock model construction through Agno without embedded credentials
- Cross-language PII-sensitive key redaction and correlation IDs
- Unit, integration, artifact, configuration, lint, type, and build checks
- Seeded calendar, catalog, patient lookup, and appointment detail APIs
- Transactional/idempotent create, reschedule, and cancellation operations
- Bedrock-backed Agno intent parsing and ranked conflict-free candidates
- Durable human approval and verified appointment mutation handoff
- Resumable workflow controls in the administrator assistant panel

## Planned application capabilities

- Agno agents, teams, deterministic workflows, and structured outputs
- Session state plus short-term, user-level, and organizational memory
- PII/PHI redaction, policy guardrails, audit events, and authorization
- Real-time run, tool, workflow, approval, and appointment events
- Weather and maps MCP tools behind the policy gateway
- Knowledge retrieval, evaluations, tracing, and operational dashboards

See the detailed [platform design](docs/superpowers/specs/2026-08-20-agno-medical-appointment-platform-design.md)
and [local development guide](docs/development.md).
