# Agno Medical Appointment Platform Roadmap

**Spec:** `docs/superpowers/specs/2026-08-20-agno-medical-appointment-platform-design.md`

The platform is split into independently executable plans. Each plan must finish with working, tested software before the next begins.

## Plan 1: Monorepo and Runtime Foundation

- Nx workspace with npm workspaces.
- React, NestJS, and shared TypeScript libraries.
- Python FastAPI Agno runtime and MCP gateway.
- PostgreSQL with pgvector in Docker Compose.
- TypeORM with automatic schema synchronization disabled.
- Protobuf contracts and NestJS-to-Python gRPC health call.
- Vitest, Playwright foundation, pytest, linting, and build targets.
- AWS Bedrock model configuration through pod IAM credentials.

Exit: all applications build, unit tests pass, PostgreSQL is healthy, the vector extension exists, and NestJS reaches the Python runtime over gRPC.

## Plan 2: Appointment Domain

- Organizations, users, roles, clinics, doctors, patients, appointment types, availability, leave, and appointments.
- Explicit TypeORM migrations.
- Conflict exclusion and idempotency constraints.
- Administrator calendar with doctor, clinic, and status filters.
- Authorization, audit history, and synthetic seed data.

Exit: an authorized administrator can create, view, reschedule, and cancel conflict-safe appointments without an agent.

## Plan 3: Agno Scheduling Workflow

- Scheduling coordinator agent and specialist agents.
- Internal typed tools backed by NestJS APIs.
- Candidate generation, ranking, structured Pydantic output, and workflow persistence.
- AWS Bedrock inference through Agno `AwsBedrock` only.
- Level 1 workflow state and Level 2 session history.

Exit: an administrator request produces valid appointment candidates from stored availability without writing an appointment.

## Plan 4: HITL and Real-Time Experience

- Persisted Agno approval requirements.
- Approve, reject, modify, and find-more-slots paths.
- Pause, resume, timeout, and cancellation.
- gRPC server streaming from Python to NestJS.
- Reconnectable SSE or WebSocket stream from NestJS to React.
- Transactional appointment creation after approval.

Exit: no appointment write occurs before explicit approval, and the browser can reconnect to the same run.

## Plan 5: Weather and Maps MCP

- MCP gateway registration and policy model.
- Stable weather and maps contracts.
- Provider adapters, caching, deadlines, retry limits, and circuit breakers.
- Parallel route and weather enrichment.
- Privacy minimization and destination-specific redaction.
- Candidate ranking and UI presentation.

Exit: candidate slots show validated travel and available forecast context without exposing unrelated patient data.

## Plan 6: Memory, Knowledge, and Guardrails

- Level 3 approved long-term scheduling memory.
- Remember, use-once, inspect, correct, revoke, expire, and delete workflows.
- Clinic-policy knowledge in PostgreSQL/pgvector.
- Agno PII and prompt-injection guardrails.
- Custom healthcare, tool, output, and memory guardrails.
- Central PII/PHI classification, tokenization, redaction, and audit policy.

Exit: all three memory levels have enforced scope and retention; disallowed sensitive data is blocked at model, MCP, log, trace, memory, and evaluation boundaries.

## Plan 7: Evaluation and Production Hardening

- Agent, tool-choice, structured-output, HITL, workflow, privacy, and prompt-injection evaluations.
- OpenTelemetry traces and operational metrics.
- Accessibility, concurrency, load, recovery, and reconnect testing.
- Kubernetes deployment, secrets, pod IAM, health probes, backups, and runbooks.
- Security and privacy review evidence.

Exit: the deployment meets the design acceptance criteria and has measurable quality, recovery, and privacy behavior.

