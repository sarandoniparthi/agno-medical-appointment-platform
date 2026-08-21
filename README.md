# Agno Medical Appointment Platform

An administrator-first medical appointment scheduling platform and reference
architecture for building agentic applications with Agno. The target product
helps clinic administrators search calendars, compare suitable appointments,
review travel and weather context, approve an agent proposal, and schedule the
appointment safely.

This repository currently contains the tested runtime foundation. The complete
calendar UI, scheduling workflows, Agno teams, three-level memory, HITL flows,
and weather/maps MCP integrations are planned next and are not yet implemented.

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
- PostgreSQL 17 with pgvector and pgcrypto in Docker
- Amazon Bedrock for model inference through Agno's Bedrock integration
- Vitest for TypeScript and React tests; pytest for Python tests

## Prerequisites

- Node.js 22.13 or newer in the Node 22 line, or Node 24
- npm
- Python 3.12
- [uv](https://docs.astral.sh/uv/)
- Docker Desktop with Docker Compose
- AWS CLI/profile, SSO, or an IAM role only when exercising Bedrock

The repository pins Node 22.13 in `.nvmrc` and enforces
`>=22.13.0 <23 || >=24.0.0`.

## Initial setup

Run these commands from the repository root. On Windows PowerShell, use
`npm.cmd` if the `npm.ps1` execution-policy shim is blocked.

```powershell
Copy-Item .env.example .env
npm.cmd install
uv sync
```

The root `.env` is local-only and must not be committed.

## Environment variables

The supplied `.env.example` configures these local endpoints:

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTGRES_HOST_PORT` | `55432` | PostgreSQL port exposed on the host |
| `POSTGRES_PASSWORD` | `scheduler-local-only` | Local Docker database password |
| `DATABASE_URL` | Port `55432` | NestJS and TypeORM connection URL |
| `API_PORT` | `3000` | NestJS HTTP API |
| `WEB_PORT` | `4200` | React development server |
| `AGENT_HTTP_PORT` | `8000` | Agent runtime FastAPI server |
| `AGENT_GRPC_PORT` | `50051` | Agent runtime gRPC server |
| `AGENT_GRPC_URL` | `127.0.0.1:50051` | NestJS gRPC destination |
| `MCP_GATEWAY_PORT` | `8010` | MCP gateway HTTP server |
| `AWS_REGION` | `us-east-1` | Bedrock AWS Region |

If `POSTGRES_HOST_PORT` changes, update the port in `DATABASE_URL` as well. If
`AGENT_GRPC_PORT` changes, update `AGENT_GRPC_URL` to match.

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

## PostgreSQL and pgvector

The application is designed to use PostgreSQL in Docker, not a separately
installed local PostgreSQL server.

```powershell
docker compose up -d postgres
docker compose ps
npm.cmd run db:migrate
```

The container listens on port `5432`, while Docker publishes it as host port
`55432` to avoid the PostgreSQL instance already using local port `5432`.
Database configuration fails closed when `POSTGRES_PASSWORD` or `DATABASE_URL`
is absent. TypeORM has `synchronize: false` and `migrationsRun: false`; schema
changes must use explicit migrations.

Useful database commands:

```powershell
npm.cmd run db:migrate
npm.cmd run db:revert
docker compose stop postgres
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

## Current foundation capabilities

- Nx task orchestration for TypeScript and Python projects
- React, NestJS, FastAPI, and MCP gateway application boundaries
- Unified FastAPI and asynchronous gRPC runtime lifecycle
- Versioned protobuf contract and deterministic generated Python bindings
- NestJS gRPC deadlines, error mapping, readiness, and shutdown cleanup
- Docker PostgreSQL 17 configuration with pgvector and pgcrypto initialization
- Explicit TypeORM migration boundary with fail-closed configuration
- Amazon Bedrock model construction through Agno without embedded credentials
- Cross-language PII-sensitive key redaction and correlation IDs
- Unit, integration, artifact, configuration, lint, type, and build checks

## Planned application capabilities

- Administrator calendar and conversational scheduling experience
- Doctor availability, clinic rules, conflicts, and appointment transactions
- Agno agents, teams, deterministic workflows, and structured outputs
- Human-in-the-loop approval before appointment mutations
- Session state plus short-term, user-level, and organizational memory
- PII/PHI redaction, policy guardrails, audit events, and authorization
- Real-time run, tool, workflow, approval, and appointment events
- Weather and maps MCP tools behind the policy gateway
- Knowledge retrieval, evaluations, tracing, and operational dashboards

See the detailed [platform design](docs/superpowers/specs/2026-08-20-agno-medical-appointment-platform-design.md)
and [local development guide](docs/development.md).

## Current environment limitation

The pgvector Docker image pull previously failed on this workstation because of
an upstream CloudFront EOF response. As a result, live PostgreSQL extension
checks, TypeORM migration execution, and complete `/api/ready` verification are
still pending a successful image pull. The static configuration and automated
repository checks are complete.
