# Appointment Scheduling Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PostgreSQL-backed administrator calendar that supports direct and Agno-assisted create, reschedule, and cancellation with persisted human approval.

**Architecture:** NestJS owns all appointment data and mutations in the TypeORM-managed `public` schema. React calls NestJS for direct actions and workflow commands; NestJS calls the Python Agno runtime over versioned gRPC, while Agno uses typed, read-only HTTP tools to query scheduling data and returns approval-gated mutation proposals. Initial workflow updates use two-second browser polling with stable event-shaped responses.

**Tech Stack:** Nx 23, TypeScript 5.9, React 19, NestJS 11, TypeORM 0.3/PostgreSQL 18 with pgvector, Python 3.12, FastAPI, Agno 2.9, Pydantic 2, gRPC/protobuf, Amazon Bedrock Nova Pro, Vitest, pytest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-22-appointment-workflow-design.md`

## Global Constraints

- Use the seeded development administrator only; production authentication is deferred.
- NestJS is the sole authority for appointment writes, conflict checks, idempotency, optimistic concurrency, and audit records.
- TypeORM manages only explicit migrations in `public`; `synchronize` and `migrationsRun` remain `false`.
- Agno owns its tables in schema `agno`; TypeORM must never discover or alter them.
- Agent-originated writes require a persisted approval; direct calendar actions use confirmation but not Agno approval.
- Prompts, tools, logs, traces, and audit payloads exclude diagnosis, treatment, clinical notes, credentials, and unrelated patient details.
- Every new behavior follows RED-GREEN-REFACTOR and preserves existing tests.
- `.env`, AWS credentials, and local PostgreSQL secrets are never committed.

---

### Task 1: Shared Appointment Contracts

**Files:**
- Create: `libs/contracts/src/lib/appointments/appointment-contracts.ts`
- Create: `libs/contracts/src/lib/appointments/appointment-contracts.spec.ts`
- Modify: `libs/contracts/src/index.ts`

**Interfaces:**
- Produces: `AppointmentStatus`, `AppointmentView`, `CalendarQuery`, `CreateAppointmentCommand`, `RescheduleAppointmentCommand`, `CancelAppointmentCommand`, `SchedulingCandidate`, `WorkflowEvent`, and `WorkflowSnapshot`.
- Consumes: no feature-specific code.

- [ ] **Step 1: Write failing contract tests**

  Add literal fixtures proving cancelled appointments require a reason, reschedules require an observed version, workflow events use stable `sequence` values, and candidate scores contain availability, preference, and continuity components.

- [ ] **Step 2: Verify RED**

  Run `npm.cmd exec vitest run libs/contracts/src/lib/appointments/appointment-contracts.spec.ts` and confirm imports fail because the appointment contract module does not exist.

- [ ] **Step 3: Implement minimal contracts**

  Define discriminated unions with exact action values `create | reschedule | cancel`, statuses `scheduled | completed | cancelled | no_show`, ISO timestamp strings, UUID identifiers, and mutation results containing `appointment` plus `replayed: boolean`. Export them from `libs/contracts/src/index.ts`.

- [ ] **Step 4: Verify GREEN**

  Run the focused contract suite, then `npm.cmd exec nx test contracts`.

- [ ] **Step 5: Commit**

  Commit as `feat: add scheduling contracts`.

### Task 2: Explicit Appointment Schema and Deterministic Seeds

**Files:**
- Create: `libs/database/src/lib/entities/scheduling.entities.ts`
- Create: `libs/database/src/lib/entities/scheduling.entities.spec.ts`
- Create: `libs/database/src/migrations/0000000000002-appointment-domain.ts`
- Create: `libs/database/src/migrations/0000000000003-seed-scheduling-demo.ts`
- Create: `libs/database/src/migrations/appointment-domain.integration.spec.ts`
- Modify: `libs/database/src/index.ts`
- Modify: `libs/database/src/lib/data-source.ts`

**Interfaces:**
- Produces: TypeORM `EntitySchema` exports for organization, user, clinic, doctor, doctor-clinic, patient, appointment-type, availability, leave, appointment, audit-event, and idempotency-record tables.
- Produces: deterministic IDs under the constant namespace `00000000-0000-4000-8000-*` for UI and workflow tests.
- Consumes: Task 1 status/action literals.

- [ ] **Step 1: Write failing entity and migration tests**

  Assert metadata maps to `public`, no entity maps to `agno`, appointments include a version column, cancellations retain rows, and the migration SQL installs `btree_gist` plus an exclusion constraint over doctor and active `tstzrange(start_at,end_at,'[)')`.

- [ ] **Step 2: Verify RED**

  Run `npm.cmd exec vitest run --config libs/database/vitest.config.mts libs/database/src/lib/entities/scheduling.entities.spec.ts` and confirm missing schemas fail.

- [ ] **Step 3: Implement entities and migrations**

  Use `EntitySchema` consistently with the existing database library. Create foreign keys, check constraints, indexes, unique idempotency scope, the active-overlap exclusion constraint, timezone-aware columns, optimistic `version`, and append-only audit columns. Add two clinics, three doctors, four synthetic patients, three appointment types, weekly availability, leave, and existing appointments using `INSERT ... ON CONFLICT DO NOTHING`.

- [ ] **Step 4: Verify GREEN and real PostgreSQL behavior**

  Run the focused metadata suite. With local `DATABASE_URL`, run `npm.cmd run db:migrate`, then the integration suite proving a conflicting insert fails and a non-overlapping insert succeeds.

- [ ] **Step 5: Commit**

  Commit as `feat: add appointment schema and demo data`.

### Task 3: NestJS Read Model and Calendar API

**Files:**
- Create: `apps/api/src/app/scheduling/scheduling.module.ts`
- Create: `apps/api/src/app/scheduling/calendar.controller.ts`
- Create: `apps/api/src/app/scheduling/calendar.service.ts`
- Create: `apps/api/src/app/scheduling/calendar.service.spec.ts`
- Create: `apps/api/src/app/scheduling/catalog.controller.ts`
- Create: `apps/api/src/app/scheduling/dto/calendar.dto.ts`
- Modify: `apps/api/src/app/app.module.ts`

**Interfaces:**
- Produces: `GET /api/calendar?from&to&clinicId&doctorId&specialty&status`, `GET /api/catalog`, `GET /api/patients?query`, and `GET /api/appointments/:id`.
- Consumes: Task 2 repositories and seeded administrator ID.

- [ ] **Step 1: Write failing service/controller tests**

  Use real service methods over controlled repository fakes to prove date-bound filtering, combined clinic/doctor/status filters, clinic timezone output, synthetic patient search minimization, and 404 behavior.

- [ ] **Step 2: Verify RED**

  Run `npm.cmd exec vitest run --config apps/api/vite.config.ts apps/api/src/app/scheduling/calendar.service.spec.ts` and confirm the module is absent.

- [ ] **Step 3: Implement the read boundary**

  Add DTO validation without leaking arbitrary fields, map entities into Task 1 views, register only scheduling entities with `TypeOrmModule.forFeature`, and expose catalog data needed by the forms.

- [ ] **Step 4: Verify GREEN**

  Run the focused suite and `npm.cmd exec nx test api`.

- [ ] **Step 5: Commit**

  Commit as `feat: expose scheduling calendar reads`.

### Task 4: Transactional Direct Mutations

**Files:**
- Create: `apps/api/src/app/scheduling/appointment.controller.ts`
- Create: `apps/api/src/app/scheduling/appointment.service.ts`
- Create: `apps/api/src/app/scheduling/appointment.service.spec.ts`
- Create: `apps/api/src/app/scheduling/dto/appointment.dto.ts`
- Create: `apps/api/src/app/scheduling/scheduling.errors.ts`
- Modify: `apps/api/src/app/scheduling/scheduling.module.ts`

**Interfaces:**
- Produces: `POST /api/appointments`, `PATCH /api/appointments/:id/reschedule`, and `PATCH /api/appointments/:id/cancel`.
- Produces: `AppointmentService.create`, `.reschedule`, and `.cancel`, each accepting actor, correlation, idempotency, and optional Agno linkage context.
- Consumes: Task 1 commands and Task 2 transaction-backed repositories.

- [ ] **Step 1: Write failing mutation tests**

  Prove create writes appointment plus audit atomically, reschedule rejects the wrong version, cancellation requires a reason and retains the row, duplicate idempotency returns the original result, and database conflict errors map to HTTP 409 without an audit success record.

- [ ] **Step 2: Verify RED**

  Run the focused service suite and confirm missing service/controller failures.

- [ ] **Step 3: Implement minimal transactional service**

  Use a TypeORM transaction, lock the target appointment for reschedule/cancel, validate seeded-admin organization scope, rely on the database exclusion constraint for the final conflict decision, increment the version, persist sanitized audit metadata, and save the serialized successful response in `idempotency_records`.

- [ ] **Step 4: Verify GREEN**

  Run focused tests, API tests, and a real PostgreSQL integration case for concurrent conflicting creates.

- [ ] **Step 5: Commit**

  Commit as `feat: add conflict-safe appointment mutations`.

### Task 5: Calendar-First React Workspace and Direct Flows

**Files:**
- Create: `apps/web/src/app/scheduling/api.ts`
- Create: `apps/web/src/app/scheduling/types.ts`
- Create: `apps/web/src/app/scheduling/admin-workspace.tsx`
- Create: `apps/web/src/app/scheduling/admin-workspace.spec.tsx`
- Create: `apps/web/src/app/scheduling/calendar-grid.tsx`
- Create: `apps/web/src/app/scheduling/appointment-dialog.tsx`
- Create: `apps/web/src/app/scheduling/assistant-panel.tsx`
- Create: `apps/web/src/app/scheduling/scheduling.css`
- Modify: `apps/web/src/app/app.tsx`
- Modify: `apps/web/src/styles.css`

**Interfaces:**
- Produces: desktop/tablet calendar-first admin UI with filters, week navigation, direct create/reschedule/cancel forms, and a reserved assistant panel.
- Consumes: Tasks 1, 3, and 4 HTTP contracts.

- [ ] **Step 1: Write failing UI tests**

  Render the real workspace with an injectable `SchedulingApi`; prove filters change the calendar request, an empty slot opens create, an appointment opens reschedule/cancel, confirmations send literal idempotency keys, and successful mutations refresh the visible week.

- [ ] **Step 2: Verify RED**

  Run `npm.cmd exec vitest run apps/web/src/app/scheduling/admin-workspace.spec.tsx` and confirm the workspace is missing.

- [ ] **Step 3: Implement the approved layout**

  Replace `NxWelcome`. Build an accessible semantic week grid without adding a calendar dependency, use `Intl.DateTimeFormat` for clinic timezone display, implement loading/empty/error states, and keep the assistant panel visible at desktop widths and below the calendar on tablet.

- [ ] **Step 4: Verify GREEN**

  Run the focused suite, `npm.cmd exec nx test web`, and `npm.cmd exec nx build web`.

- [ ] **Step 5: Commit**

  Commit as `feat: build administrator scheduling calendar`.

### Task 6: Versioned Scheduling gRPC Contract

**Files:**
- Modify: `proto/agent_runtime/v1/agent_runtime.proto`
- Modify: `tools/generate-proto.mjs`
- Create: `libs/contracts/src/lib/grpc/scheduling-runtime.ts`
- Create: `libs/contracts/src/lib/grpc/scheduling-runtime.spec.ts`
- Modify generated files under: `python/agno_platform/generated/agent_runtime/v1/`
- Modify: `apps/api/src/app/agent-runtime/agent-runtime.client.ts`
- Modify: `apps/api/src/app/agent-runtime/agent-runtime.client.spec.ts`

**Interfaces:**
- Produces unary RPCs `StartSchedulingWorkflow`, `GetSchedulingWorkflow`, and `RespondToSchedulingRequirement` alongside health.
- Produces workflow snapshots containing stable session/run/workflow IDs, ordered events, requirement state, candidates, and optional mutation result.
- Consumes: Task 1 workflow shapes.

- [ ] **Step 1: Write failing contract and adapter tests**

  Assert exact proto-to-TypeScript mappings, correlation propagation, all three action discriminators, and client deadline/error translation.

- [ ] **Step 2: Verify RED**

  Run contract and API client suites and confirm scheduling RPC members are absent.

- [ ] **Step 3: Extend proto and regenerate atomically**

  Add only the three approved unary RPCs and their typed messages, run `npm.cmd run proto:generate`, and update the NestJS adapter without weakening the generator's sibling-preservation/idempotence checks.

- [ ] **Step 4: Verify GREEN**

  Run proto generation twice, compare generated hashes, then run contract, generated Python, and Nest client suites.

- [ ] **Step 5: Commit**

  Commit as `feat: add scheduling workflow grpc contract`.

### Task 7: Python Scheduling Models and Read-Only NestJS Tools

**Files:**
- Create: `apps/agent-runtime/src/agent_runtime/scheduling/models.py`
- Create: `apps/agent-runtime/src/agent_runtime/scheduling/tools.py`
- Create: `apps/agent-runtime/src/agent_runtime/scheduling/tools_client.py`
- Create: `apps/agent-runtime/tests/scheduling/test_models.py`
- Create: `apps/agent-runtime/tests/scheduling/test_tools.py`
- Modify: `python/agno_platform/settings.py`

**Interfaces:**
- Produces: Pydantic `CreateIntent`, `RescheduleIntent`, `CancelIntent`, `SchedulingCandidate`, `ApprovalPayload`, and `WorkflowSnapshot`.
- Produces read-only functions `search_patients`, `search_doctors`, `get_catalog`, `get_appointment`, and `find_open_slots` backed by `NEST_INTERNAL_URL`.
- Consumes: Task 3 internal read endpoints and existing recursive redaction.

- [ ] **Step 1: Write failing Pydantic and privacy tests**

  Prove discriminated parsing, missing-field clarification, score bounds, cancellation reason requirement, outbound allowlists, deadline propagation, and rejection of diagnosis/clinical-note fields before HTTP execution.

- [ ] **Step 2: Verify RED**

  Run `uv run pytest apps/agent-runtime/tests/scheduling/test_models.py apps/agent-runtime/tests/scheduling/test_tools.py -q` and confirm modules are absent.

- [ ] **Step 3: Implement minimal models and tools**

  Use strict Pydantic models (`extra='forbid'`), a single configured async HTTP client, five-second deadlines, correlation headers, synthetic scheduling identifiers, and redaction before logging or error serialization.

- [ ] **Step 4: Verify GREEN**

  Run focused pytest, Ruff, and Pyright for the new package.

- [ ] **Step 5: Commit**

  Commit as `feat: add typed scheduling tools`.

### Task 8: Agno Workflow Persistence and HITL

**Files:**
- Create: `apps/agent-runtime/src/agent_runtime/scheduling/workflow.py`
- Create: `apps/agent-runtime/src/agent_runtime/scheduling/store.py`
- Create: `apps/agent-runtime/src/agent_runtime/scheduling/ranking.py`
- Create: `apps/agent-runtime/tests/scheduling/test_workflow.py`
- Create: `apps/agent-runtime/tests/scheduling/test_store.py`
- Modify: `apps/agent-runtime/src/agent_runtime/grpc_service.py`
- Modify: `apps/agent-runtime/src/agent_runtime/grpc_server.py`

**Interfaces:**
- Produces one scheduling workflow supporting start/get/respond for `create | reschedule | cancel`.
- Produces persisted Agno session/run/approval state in schema `agno` and ordered event snapshots.
- Consumes: Task 6 protobuf services, Task 7 models/tools, and `create_bedrock_model()`.

- [ ] **Step 1: Write failing workflow tests**

  Cover create/reschedule candidate ranking, cancel preview, clarification instead of guessing, maximum three candidates, persisted approval, reject, edit, find-more, expiration, refresh/resume, Bedrock timeout recovery, and prohibition of mutation calls before approval.

- [ ] **Step 2: Verify RED**

  Run the focused workflow suite and confirm workflow/store modules are absent.

- [ ] **Step 3: Implement workflow and persistence**

  Configure Agno `PostgresDb` with `db_schema='agno'`; use Nova Pro only for typed intent extraction and explanations. Keep slot validity and scores deterministic in Python. Persist the Agno requirement before returning `approval_required`; emit monotonically increasing events; never expose a mutation callable to the model.

- [ ] **Step 4: Verify GREEN**

  Run focused tests, all agent-runtime tests, Ruff, and Pyright. Run the opt-in synthetic Bedrock test only when exactly one model selector and valid AWS profile/role credentials are present.

- [ ] **Step 5: Commit**

  Commit as `feat: implement approval-gated agno scheduling workflow`.

### Task 9: NestJS Workflow Orchestration and Approved Write Boundary

**Files:**
- Create: `apps/api/src/app/scheduling/workflow.controller.ts`
- Create: `apps/api/src/app/scheduling/workflow.service.ts`
- Create: `apps/api/src/app/scheduling/workflow.service.spec.ts`
- Create: `apps/api/src/app/scheduling/internal-tools.controller.ts`
- Create: `apps/api/src/app/scheduling/internal-mutation.controller.ts`
- Modify: `apps/api/src/app/scheduling/scheduling.module.ts`

**Interfaces:**
- Produces: `POST /api/workflows`, `GET /api/workflows/:runId`, and `POST /api/workflows/:runId/responses` for React.
- Produces internal read endpoints for Task 7 and one scoped `POST /api/internal/workflow-mutations` endpoint.
- Consumes: Tasks 3, 4, 6, and 8.

- [ ] **Step 1: Write failing orchestration/security tests**

  Prove polling returns ordered event snapshots, approval responses preserve IDs, an unapproved mutation is rejected, approved payload hashes must match persisted requirement data, conflicts return candidate-selection state, idempotent approvals write once, and audit records contain identifiers but no prompts.

- [ ] **Step 2: Verify RED**

  Run the focused API workflow suite and confirm controllers/services do not exist.

- [ ] **Step 3: Implement orchestration**

  Translate HTTP commands to gRPC, validate seeded-admin scope at every boundary, use a short-lived signed internal approval token bound to run ID plus payload hash, and call Task 4's domain service for the final transaction. Return stable `WorkflowSnapshot` objects for polling.

- [ ] **Step 4: Verify GREEN**

  Run focused tests, full API tests, and a live Nest-to-Python synthetic create/reject flow with no appointment write.

- [ ] **Step 5: Commit**

  Commit as `feat: connect scheduling workflows to approved mutations`.

### Task 10: React Assistant, Polling, and HITL Controls

**Files:**
- Modify: `apps/web/src/app/scheduling/api.ts`
- Modify: `apps/web/src/app/scheduling/assistant-panel.tsx`
- Create: `apps/web/src/app/scheduling/assistant-panel.spec.tsx`
- Create: `apps/web/src/app/scheduling/use-workflow.ts`
- Create: `apps/web/src/app/scheduling/candidate-card.tsx`
- Modify: `apps/web/src/app/scheduling/admin-workspace.tsx`

**Interfaces:**
- Produces: natural-language request entry, clarification input, ranked candidate cards, approve/reject/edit/find-more controls, two-second polling, and local run-ID restoration after refresh.
- Consumes: Task 9 public workflow endpoints and Task 1 event snapshots.

- [ ] **Step 1: Write failing assistant tests**

  With fake timers and a real reducer, prove one active poll loop, ordered event deduplication, candidate selection, disabled duplicate approval, reject/edit/find-more commands, terminal polling stop, conflict recovery, and local-storage resume.

- [ ] **Step 2: Verify RED**

  Run the focused assistant suite and confirm missing hook/components.

- [ ] **Step 3: Implement assistant experience**

  Build accessible status regions and action buttons, show deterministic score explanations, preserve workflow IDs locally without storing prompts, refresh the calendar after a completed mutation, and expose retry for recoverable errors.

- [ ] **Step 4: Verify GREEN**

  Run focused tests, all web tests, and the web production build.

- [ ] **Step 5: Commit**

  Commit as `feat: add scheduling assistant hitl experience`.

### Task 11: End-to-End Scenarios and Operational Documentation

**Files:**
- Replace: `apps/web-e2e/src/example.spec.ts`
- Create: `apps/web-e2e/src/scheduling-direct.spec.ts`
- Create: `apps/web-e2e/src/scheduling-agent.spec.ts`
- Create: `apps/web-e2e/src/scheduling-recovery.spec.ts`
- Modify: `README.md`
- Modify: `docs/development.md`

**Interfaces:**
- Produces: executable proof of direct and agent create/reschedule/cancel plus recovery behavior.
- Consumes: all earlier tasks.

- [ ] **Step 1: Write failing Playwright flows**

  Cover direct create/reschedule/cancel, agent candidate approval, cancellation reason, rejection with no write, stale-slot recovery, duplicate approval idempotency, and page refresh resumption using deterministic seeds.

- [ ] **Step 2: Verify RED**

  Run each new Playwright file and confirm failures identify missing integrated behavior rather than selector/setup errors.

- [ ] **Step 3: Complete run instructions**

  Document local PostgreSQL creation for database `agnoagents`, required migration command, deterministic seed behavior, the four service commands, exact-one Bedrock selector rule, `AWS_PROFILE=dev_stg` as an example only, and that credentials come from an AWS profile/role rather than `.env`.

- [ ] **Step 4: Verify the full system**

  Run `npm.cmd run db:migrate`, `npm.cmd run verify`, the three Playwright suites, and an opt-in Bedrock smoke test. Inspect calendar, workflow refresh, audit redaction, `public`/`agno` schema separation, and absence of committed secrets.

- [ ] **Step 5: Commit**

  Commit as `test: verify appointment scheduling workflows`.

### Task 12: Final Review and Integration

**Files:**
- Review all files changed by Tasks 1-11.

**Interfaces:**
- Produces: merge-ready implementation with evidence against every acceptance criterion.
- Consumes: the complete feature.

- [ ] **Step 1: Review spec coverage**

  Map each acceptance criterion and each failure/recovery rule to a passing automated test or explicit live check.

- [ ] **Step 2: Run final safety checks**

  Run `git diff --check`, secret/PHI pattern scans, TypeORM metadata inspection, and protobuf regeneration idempotence.

- [ ] **Step 3: Run authoritative verification**

  Run migrations against local PostgreSQL, `npm.cmd run verify`, Playwright, Ruff, Pyright, and the scoped live runtime checks. Record environment-only skips exactly.

- [ ] **Step 4: Review and fix findings test-first**

  For each behavior defect, add a failing regression test, observe RED, apply the minimal fix, and rerun the affected plus full suites.

- [ ] **Step 5: Commit final integration fixes**

  Commit only verified fixes and leave user-owned `.env` or unrelated worktree changes untouched.
