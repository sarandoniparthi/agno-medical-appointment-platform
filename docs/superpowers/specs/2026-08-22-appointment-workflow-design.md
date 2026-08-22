# Appointment Scheduling Workflow Design

## 1. Purpose

Implement the first complete administrator scheduling experience on top of the
existing runtime foundation. The slice supports creating, rescheduling, and
cancelling appointments through both direct calendar controls and a natural
language Agno workflow.

The slice uses a seeded development administrator. Production authentication
and role provisioning remain a later phase.

## 2. Acceptance Criteria

The implementation is complete when an administrator can:

- View a real week calendar backed by PostgreSQL.
- Filter appointments by clinic, specialty, doctor, and status.
- Create, reschedule, and cancel through direct calendar actions.
- Request the same operations through the Agno scheduling assistant.
- Review ranked appointment candidates for create and reschedule intents.
- Approve, reject, edit, or request more candidates from a persisted workflow.
- Resume the same workflow after a page refresh.
- See the final appointment reflected on the calendar.
- Inspect a redacted audit trail linking the appointment mutation to Agno
  workflow identifiers.

No agent-originated appointment mutation may occur without persisted human
approval.

## 3. Administrator Workspace

Use the approved calendar-first command-center layout:

- Left rail: clinic, specialty, doctor, and status filters plus a new-request
  action.
- Center: week calendar with doctor appointments and available-slot context.
- Right rail: assistant conversation, workflow state, ranked candidates, and
  approval actions.

Clicking an empty calendar slot opens the direct-create form. Clicking an
appointment opens details with reschedule and cancel actions. The agent panel
accepts create, reschedule, and cancel requests in natural language.

The first responsive implementation prioritizes desktop clinic operations. It
must remain usable on a tablet, but a phone-specific scheduling experience is
not part of this slice.

## 4. Architecture and Ownership

### React

React owns calendar rendering, filters, direct mutation forms, the assistant
panel, candidate selection, and HITL controls. It never writes directly to the
database or Python runtime.

### NestJS

NestJS is the authoritative application API. It owns appointment-domain reads
and writes, conflict detection, idempotency, optimistic concurrency, audit
events, and the seeded development administrator context.

NestJS invokes the Python workflow boundary through versioned gRPC contracts.
The initial browser-to-Nest workflow status mechanism is two-second polling.
Responses are shaped as stable workflow events so polling can later be replaced
by SSE without redesigning React state.

### Agno runtime

One Agno workflow supports create, reschedule, and cancel intents. A coordinator
agent uses Amazon Nova Pro through the configured Bedrock application inference
profile. Typed read-only tools call NestJS scheduling APIs. The workflow owns
candidate ranking, clarification, pause/resume, and HITL requirements.

Agno may request a mutation only after approval. NestJS still repeats all
authorization, version, conflict, and idempotency checks inside the final
transaction.

## 5. PostgreSQL Schema Ownership

### TypeORM-owned `public` schema

TypeORM owns explicit migrations for:

- `organizations`
- `users`
- `clinics`
- `doctors`
- `doctor_clinics`
- `patients`
- `appointment_types`
- `doctor_availability`
- `doctor_leave`
- `appointments`
- `audit_events`
- `idempotency_records`

The existing `platform_settings` table remains TypeORM-owned.

### Agno-owned `agno` schema

Agno `PostgresDb` owns its persistence schema and table lifecycle, including
enabled tables such as:

- `agno_sessions`
- `agno_memories`
- `agno_approvals`
- `agno_metrics`
- `agno_eval_runs`
- `agno_knowledge`
- `agno_traces`
- `agno_spans`
- Agno schema-version and optional service tables

TypeORM must never discover, synchronize, migrate, or alter the `agno` schema.
Application tables must not duplicate Agno session, run, candidate-state, or
approval storage.

Nest audit records store only the Agno `workflow_id`, `session_id`, and `run_id`
needed for correlation.

## 6. Domain Rules

All timestamps are stored as timezone-aware values. Clinics define the display
timezone used for calendars and availability interpretation.

An active appointment must not overlap another active appointment for the same
doctor. PostgreSQL constraints and the transactional service enforce this rule;
an application-only precheck is insufficient.

Appointments use optimistic concurrency through a version field. A reschedule
must provide the version observed when the proposal was generated. Cancellation
is a status transition with a required reason and never deletes the record.

Every mutation accepts an idempotency key. Repeating an already completed
request returns the original result without a second write.

## 7. Seeded Development Data

Provide deterministic synthetic seed data for:

- One organization and development administrator.
- At least two clinics with explicit timezones and synthetic addresses.
- Several specialties, doctors, and doctor-clinic assignments.
- Synthetic patients without real PII or PHI.
- Appointment types with different durations.
- Working-hour availability, breaks, and leave periods.
- Existing appointments in several statuses.

Seeds must be rerunnable without duplicate records.

## 8. Direct Calendar Workflows

### Create

The administrator selects an empty time or opens the create form, chooses the
patient, doctor, clinic, appointment type, start time, and optional non-clinical
scheduling note, then confirms. NestJS validates and writes transactionally.

### Reschedule

The administrator opens an appointment, chooses a new slot, reviews the old and
new values, and confirms. NestJS verifies the appointment version and new-slot
availability before updating.

### Cancel

The administrator opens an appointment, selects cancel, supplies a reason, and
confirms. NestJS transitions the appointment to cancelled and records the audit
event.

Direct actions use conventional confirmation dialogs. They do not create Agno
approval requirements but use the same domain mutation service as agent actions.

## 9. Agent Workflow

### Intent and clarification

The coordinator produces a discriminated Pydantic intent for create,
reschedule, or cancel. Missing or ambiguous patient, doctor, clinic, date,
appointment type, or target appointment information produces a persisted input
requirement. The workflow must not guess.

### Read-only tools

Agno tools call narrow NestJS APIs to:

- Search patients using synthetic scheduling identifiers.
- Search doctors by specialty and clinic.
- Read appointment types and duration rules.
- Read doctor availability and leave.
- Read an existing appointment for reschedule or cancel.
- Find open slots and validate candidate conflicts.

Tools do not receive diagnosis, treatment, clinical notes, or unrelated patient
details.

### Candidate generation

Create and reschedule produce up to three structured candidates. Each candidate
contains identifiers, start and end time, clinic timezone, doctor, clinic,
appointment type, an explanation, and a deterministic score breakdown.

Cancel produces a sanitized preview of the target appointment and requires a
cancellation reason.

### Human approval

The workflow persists an Agno approval requirement. React supports approve,
reject, edit, and find-more-slots actions. Approval resumes the same workflow
session and run.

After approval, the workflow calls a narrowly scoped NestJS mutation endpoint
with the approved payload, observed version where applicable, Agno identifiers,
correlation ID, and idempotency key.

## 10. Failure and Recovery

- A conflict before approval removes the candidate and returns alternatives.
- A conflict during the final transaction performs no write and returns the
  workflow to candidate selection with a slot-taken message.
- A stale appointment version rejects rescheduling and reloads current data.
- A repeated approval or network retry returns the idempotent original result.
- A rejected requirement preserves the run and rejection reason with no write.
- An expired requirement requires fresh availability and a new approval.
- A Bedrock or tool timeout leaves the run recoverable and exposes retry.
- Invalid or ambiguous entities pause for administrator input.
- Refreshing the browser reloads workflow state by its stable session/run IDs.

## 11. Privacy, Guardrails, and Audit

Only synthetic data is used in this slice. Nevertheless, the implementation
must preserve production-shaped controls:

- No diagnosis or clinical notes in prompts, candidates, logs, traces, or MCP
  payloads.
- Existing recursive redaction applies at API, gRPC, model, and audit
  boundaries.
- Prompt inputs and tool outputs use allowlisted typed fields.
- Mutation tools are unavailable before the HITL approval state.
- Audit events are append-only and include correlation ID, seeded admin ID,
  action, target identifiers, outcome, and Agno linkage without model prompt
  bodies or credentials.

Weather and maps MCP enrichment remains outside this slice and follows after
the core scheduling workflow is reliable.

## 12. Testing

### Database and NestJS

- Explicit migration up/down and real PostgreSQL integration tests.
- Exclusion/conflict, timezone, optimistic-lock, cancellation, and idempotency
  tests.
- Domain-service, controller, validation, and audit tests.

### Python and Agno

- Pydantic intent and candidate-schema tests.
- Tool contract and privacy tests.
- Create, reschedule, cancel, clarification, pause, resume, reject, edit,
  expiration, and conflict-recovery workflow tests.
- Bedrock boundary unit tests and one opt-in synthetic live evaluation.

### React and end to end

- Calendar/filter, direct form, agent panel, candidate, and approval component
  tests.
- Playwright flows for direct and agent create, reschedule, and cancel.
- Playwright coverage for rejection, stale conflict, idempotent retry, and page
  refresh/reconnect.

## 13. Deferred Work

- Production authentication and authorization provider integration.
- Doctor and patient portals.
- Weather and maps MCP enrichment.
- SSE or WebSocket streaming after the polling contract is proven.
- Long-term approved memory, knowledge retrieval, and full guardrail suite.
- Notifications, insurance, payments, EHR, and telehealth integrations.
