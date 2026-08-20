# Agno Medical Appointment Platform Design

## 1. Purpose

Build a production-style web application that helps clinic administrators find and schedule doctor appointments while demonstrating a broad, meaningful set of Agno framework concepts.

The core product is an administrator-first appointment calendar. Agno supplies the conversational assistant, specialized agents, teams, deterministic workflows, human-in-the-loop controls, session state, memory, knowledge retrieval, real-time run events, tracing, and evaluations.

The first external MCP integrations are limited to weather and maps. They improve appointment recommendations without becoming authoritative sources for appointments.

## 2. Product Goals

- Let an administrator find and schedule an appointment quickly through chat or calendar controls.
- Rank slots using doctor availability, clinic rules, travel time, distance, and available weather forecasts.
- Require explicit human approval before an appointment is created or a sensitive operation is executed.
- Stream agent, workflow, tool, and approval state to the browser in real time.
- Demonstrate Agno concepts through realistic scheduling scenarios rather than unrelated examples.
- Keep PostgreSQL as the authoritative application data store.
- Isolate external MCP providers behind stable application-owned contracts.

## 3. Non-Goals for the First Release

- Clinical diagnosis or treatment recommendations.
- Autonomous cancellation or rescheduling without administrator approval.
- Full EHR, insurance, payment, SMS, email, or telehealth integration.
- Support for every model provider, database, or Agno toolkit.
- Treating long-range weather predictions as reliable daily forecasts.
- Allowing external MCP servers direct access to appointment or patient tables.

## 4. Users and Permissions

### Administrator

- Search and manage patients and doctors.
- View doctor calendars and availability.
- Ask the scheduling agent for suitable appointments.
- Approve, reject, or modify proposed appointments.
- Create, reschedule, and cancel appointments.
- Review workflow progress, tool calls, failures, and audit history.

### Doctor

- View their own calendar.
- View authorized appointment information.
- Define working hours, breaks, leave, and unavailable periods.

### Patient

- View their own upcoming and previous appointments.
- View appointment location and travel guidance.
- Receive weather-related advisories in later releases.

The first interactive workflow is administrator-first. Doctor and patient experiences are supporting views, not separate agent interfaces.

## 5. Primary Administrator Experience

The main screen combines:

- Day, week, and month calendar views.
- Doctor, specialty, clinic, status, and date filters.
- A conversational scheduling panel.
- A live workflow timeline.
- Proposed appointment cards with travel and weather context.
- An approval panel with approve, reject, edit, and find-more-slots actions.

Example request:

> Schedule Maya with a cardiologist next week in the afternoon at the easiest clinic to reach.

Expected flow:

1. Identify the patient and scheduling intent.
2. Resolve missing or ambiguous information through administrator input.
3. Find eligible doctors and candidate slots.
4. Check clinic rules, conflicts, and availability.
5. Evaluate distance, travel time, and available weather forecasts in parallel.
6. Rank and explain the best candidates.
7. Pause the workflow for administrator approval.
8. Create the selected appointment through the NestJS API.
9. Publish the appointment and workflow updates in real time.
10. Record the complete audit trail.

## 6. Technology Architecture

### Monorepo

Use Nx as the repository task orchestrator.

```text
apps/
  web/                    React administrator calendar and agent UI
  api/                    NestJS application API and real-time event gateway
  agent-runtime/          Python FastAPI and Agno runtime
  mcp-gateway/            Python FastAPI MCP policy and provider gateway

libs/
  contracts/              Shared TypeScript API and event contracts
  ui/                     Shared React UI components
  auth/                   Authentication and authorization utilities
  database/               NestJS PostgreSQL access
  observability/          Logging, tracing, and metrics utilities

python/
  agents/                 Agno agent definitions
  teams/                  Agno team definitions
  workflows/              Scheduling workflows
  tools/                  Internal application tools
  mcp/                    Weather and maps MCP contracts and clients
  schemas/                Pydantic request and response schemas
  knowledge/              Clinic policy knowledge and retrieval
  evals/                  Agent, tool, team, and workflow evaluations

proto/
  agent_runtime/v1/       Versioned NestJS-to-Python gRPC contracts

infra/
  docker/                 Container definitions
  postgres/               Local PostgreSQL and pgvector setup
  otel/                   Local observability configuration
```

Nx targets will run TypeScript and Python linting, tests, development servers, builds, and container tasks from one command surface.

### React Web Application

Responsibilities:

- Calendar and appointment management interface.
- Conversational admin assistant.
- Streaming agent response display.
- Workflow step timeline.
- HITL approval and input controls.
- Weather, route, distance, and confidence presentation.
- Real-time calendar refresh.

### NestJS API

Responsibilities:

- Authentication and role-based authorization.
- Patient, doctor, clinic, availability, and appointment APIs.
- Conflict checks and transactional appointment writes.
- Workflow request coordination.
- Audit logging.
- WebSocket or SSE event delivery to React.
- Generated gRPC client calls to the Python Agno runtime.

NestJS is the only component authorized to perform core appointment writes.

### FastAPI Agno Runtime

Responsibilities:

- Register Agno agents, teams, workflows, knowledge, and tools.
- Start, pause, resume, cancel, and inspect agent runs.
- Stream Agno run and workflow events.
- Maintain typed workflow state.
- Call narrow NestJS APIs through authenticated tools.
- Invoke weather and maps tools through the MCP gateway.
- Serve a private `grpc.aio` endpoint for commands and run-event streaming from NestJS.

FastAPI remains available for health, operational, and AgentOS-compatible HTTP endpoints. The private gRPC server runs alongside it on a separate port in the same pod.

### MCP Gateway

Responsibilities:

- Register approved MCP servers and tools.
- Normalize provider-specific schemas.
- Apply tool allowlists and risk levels.
- Validate inputs and outputs.
- Remove unnecessary patient information.
- Enforce HITL policy for sensitive operations.
- Apply caching, rate limits, timeouts, retries, and circuit breakers.
- Record redacted tool audit events and traces.

### PostgreSQL and pgvector

PostgreSQL stores:

- Users, roles, doctors, patients, and clinics.
- Working hours, leave, availability, and appointments.
- Workflow runs, approvals, tool executions, and audit events.
- Agno sessions, state, memory, traces, and evaluation data.
- MCP server registrations and policies.

pgvector stores embeddings for clinic policies, scheduling instructions, and other approved non-clinical knowledge. Patient clinical data is not placed in the vector store by default.

### Internal Communication

The browser does not use gRPC directly. Communication boundaries are:

```text
React --HTTP + SSE/WebSocket--> NestJS
NestJS --protobuf/gRPC--> Python Agno runtime
Agno runtime --MCP streamable HTTP--> MCP gateway
MCP gateway --provider HTTPS APIs--> Weather and maps providers
```

gRPC is used between the NestJS and Python pods because that boundary benefits from generated cross-language contracts, compact streaming messages, deadlines, cancellation, and explicit service versioning. REST is retained for browser-facing APIs, where browser tooling and debugging are more important.

The initial protobuf services are:

- `StartSchedulingRun`
- `GetSchedulingRun`
- `StreamSchedulingRun`
- `SubmitHumanInput`
- `ResolveApproval`
- `CancelSchedulingRun`
- `HealthCheck`

All protobuf packages are versioned under `agent_runtime.v1`. Breaking changes require a new package version. Every request carries the authenticated actor, organization, correlation ID, and deadline metadata. The runtime independently validates authorization context and never trusts identity fields supplied by a browser.

### TypeScript Persistence and Testing

- TypeORM maps NestJS domain data to PostgreSQL and manages explicit reviewed migrations.
- TypeORM `synchronize` and automatic migration execution remain disabled.
- Vitest is the single TypeScript unit and integration test runner for React, NestJS, and shared libraries.
- Playwright covers browser end-to-end workflows.
- pytest covers FastAPI, Agno, MCP, and Python gRPC behavior.

### AWS Bedrock Model Runtime

Agno uses its native `AwsBedrock` model integration for scheduling-agent and team inference. The model or inference-profile identifier and AWS Region are deployment configuration rather than source-code constants.

Bedrock is used only as the LLM/model inference provider. Agno remains responsible for agents, teams, workflows, tools, sessions, memory, knowledge retrieval, HITL, guardrails, tracing, and evaluations. The application does not use Bedrock Agents, Bedrock Flows, Bedrock Knowledge Bases, Bedrock Guardrails, or Bedrock prompt orchestration.

PostgreSQL and pgvector remain the knowledge and vector-storage layer. Weather and maps remain external MCP integrations. Bedrock receives only the minimum prompt and tool context needed for the current Agno run.

Authentication uses the pod workload identity or IAM role. Static AWS access keys are not stored in the repository, database, prompts, or browser. IAM grants only the Bedrock inference actions needed by the configured model and streaming mode.

An application inference profile is preferred in deployed environments to attribute usage and cost to this application. A geographically constrained inference profile is required when data-residency policy prohibits global or unrestricted cross-Region routing.

The selected Bedrock model must support:

- Tool use compatible with the Agno tools in this application.
- Structured output behavior required by the Pydantic contracts.
- Streaming for the administrator experience.
- Sufficient context for the clinic-policy and scheduling workflow.

Model invocation metrics record model identifier, inference profile, token usage, latency, throttling, and errors without storing sensitive prompt bodies in general application logs. Bedrock failures are bounded by deadlines and retries and never bypass HITL or appointment validation.

## 7. Agno Concept Coverage

### Core Execution

- Agents with instructions, tools, context, and typed results.
- Teams using routing, coordination, and broadcast patterns where appropriate.
- Workflows composed from agents, teams, functions, and nested workflows.
- Sequential steps, parallel steps, conditions, routers, and bounded loops.
- Synchronous and asynchronous execution.
- Streaming lifecycle, content, reasoning, and tool events supported by the selected model.

### State and Intelligence

- User and session identity.
- Three explicit memory levels: workflow state, session history, and approved long-term scheduling memory.
- Knowledge retrieval for clinic scheduling policies.
- Reasoning for ranking and explaining candidate slots.
- Structured Pydantic input and output.
- Runtime context and dependency injection.

### Safety and Human Control

- HITL approval before appointment writes.
- HITL input for ambiguous patients, doctors, or constraints.
- Pause and resume from persisted workflow state.
- Tool confirmation for sensitive actions.
- Input and output guardrails.
- Pre-run, post-run, and tool hooks.
- Explicit cancellation and bounded retries.

### Production Operation

- Background execution.
- Resumable real-time streaming.
- PostgreSQL persistence.
- OpenTelemetry tracing.
- Run, tool, latency, token, and failure metrics.
- Agent, tool-choice, structured-output, and workflow evaluations.
- Context compression, session summaries, and safe development caching in later phases.
- Reusable Agno skills for scheduling and clinic policy in later phases.

### Deliberately Deferred Agno Areas

- A2A interfaces and remote agents, teams, and workflows.
- AgentOS gateway across multiple remote runtimes.
- Exposing the application as an MCP server.
- Broad model-provider routing and comparison.
- Audio and video agent experiences.
- Unrelated toolkits and database providers.

These can be added to an administrator-only Agno Scenario Lab after the core scheduling workflow is reliable.

## 7.1 Three-Level Memory Model

The application treats workflow state, conversational history, and durable memory as different data products. They have different schemas, permissions, retention, and deletion behavior.

### Level 1: Workflow State

Purpose: resume one active scheduling operation safely.

Examples:

- Resolved patient and appointment intent.
- Candidate doctors and slots.
- Weather and route enrichment.
- Current workflow step and completed step outputs.
- Pending HITL request and administrator response.
- Idempotency and correlation identifiers.

Workflow state is scoped to one run, encrypted at rest, excluded from general semantic retrieval, and deleted or reduced according to the operational retention policy after the run completes. Weather and route results are short-lived and are not promoted to long-term memory.

### Level 2: Session History

Purpose: preserve conversational continuity across turns in one administrator session.

Examples:

- The meaning of follow-up responses such as “yes” or “try Friday instead.”
- Constraints already provided during the conversation.
- Prior proposals and rejections in the same scheduling session.

Session history is stored in PostgreSQL under organization, user, and session scope. Long sessions use summaries and context compression. Raw messages have a defined retention period and are not automatically converted into durable preferences.

### Level 3: Approved Long-Term Memory

Purpose: retain stable operational scheduling preferences that improve future recommendations.

Examples:

- Preferred clinic or time of day.
- Preferred travel mode.
- Administrator preference for the number of candidate slots shown.
- Authorized doctor scheduling preferences.
- Authorized accessibility-related scheduling preferences.

Long-term memory requires an explicit source and approval decision. The interface offers “Remember,” “Use once,” and “Do not remember” choices when a proposed memory is derived from conversation. Every memory records organization scope, subject, source, approver, timestamps, expiration, and revocation status.

Long-term agent memory must not contain diagnoses, clinical notes, prescriptions, test results, insurance identifiers, raw home addresses, unverified conclusions, or complete patient records. Those remain in authorized structured systems.

Memory retrieval applies role, organization, subject, purpose, and expiration filters before any memory is supplied to an agent. Users with appropriate authority can inspect, correct, revoke, and delete stored preferences.

## 8. Agent and Team Design

### Scheduling Coordinator

The administrator-facing agent. It determines intent, gathers constraints, coordinates specialist work, and presents recommendations. It cannot write appointments directly.

### Specialists

- Patient Resolution Agent: resolves patient identity and ambiguity.
- Availability Agent: finds doctors and candidate slots.
- Clinic Policy Agent: retrieves and applies scheduling policies.
- Travel and Weather Agent: requests normalized maps and weather results.
- Appointment Action Agent: prepares a validated appointment command for approval.

Use a team only when dynamic coordination adds value. Deterministic booking rules remain workflow or application code rather than probabilistic team behavior.

## 9. Workflow Design

### Find and Schedule Appointment

```text
Parse request
  -> resolve patient
  -> route by appointment type
  -> parallel doctor, availability, and policy lookup
  -> generate candidate slots
  -> parallel maps and weather enrichment
  -> rank candidates
  -> HITL approval
  -> transactional appointment creation
  -> publish real-time result
```

### HITL Outcomes

- Approve: resume at appointment creation.
- Modify: update constraints and loop back to candidate generation.
- Find more: retain context and generate another bounded candidate set.
- Reject: end without writing an appointment.
- Timeout: remain pending for administrator action; do not auto-approve.

### Additional Workflows

- Reschedule appointment.
- Cancel appointment.
- Resolve scheduling conflict.
- Handle doctor leave.
- Re-evaluate weather near an appointment.

Reschedule, cancel, and override operations always require explicit administrator approval in the first release.

## 10. Weather MCP Contract

Application-owned tools:

- `get_current_weather`
- `get_hourly_forecast`
- `get_daily_forecast`
- `assess_appointment_weather_risk`
- `compare_weather_for_slots`

The normalized result includes forecast availability, forecast horizon, confidence, relevant risks, and a recommendation. Weather is advisory and never triggers autonomous cancellation.

Forecast policy:

- Near-term forecasts may influence slot ranking.
- Longer-range forecasts are labeled with reduced confidence.
- Dates beyond the provider forecast horizon return unavailable rather than invented weather.
- Rechecks occur near the appointment in later phases.

## 11. Maps MCP Contract

Application-owned tools:

- `geocode_address`
- `calculate_route`
- `calculate_route_matrix`
- `find_nearest_clinic`
- `compare_clinic_travel`
- `estimate_departure_time`

The normalized result includes distance, estimated duration, travel mode, traffic basis, route geometry when requested, and provider confidence or limitations.

Privacy policy:

- Transmit only the minimum location information required.
- Do not expose clinical information to the maps provider.
- Avoid long-term retention of exact patient coordinates.
- Audit access without logging raw sensitive request bodies.

## 12. Real-Time Event Model

NestJS provides one authenticated browser event stream. Events from Agno and the application use shared versioned contracts:

- `run.started`
- `agent.message.delta`
- `workflow.step.started`
- `workflow.step.completed`
- `tool.started`
- `tool.completed`
- `approval.requested`
- `approval.resolved`
- `appointment.created`
- `appointment.updated`
- `run.failed`
- `run.completed`

Every event contains a correlation ID, run ID, timestamp, event version, and an authorization-safe payload. Reconnection uses persisted event sequence numbers so a browser can resume without losing state.

## 13. Failure Handling

- Validate all agent outputs before application use.
- Reject unauthorized tools before execution.
- Use database transactions and conflict constraints for appointment writes.
- Use idempotency keys to prevent duplicate appointments.
- Bound all loops, retries, and tool execution times.
- Cache read-only weather and route results for short periods.
- Apply circuit breakers to unavailable MCP providers.
- Continue scheduling without weather enrichment when weather is unavailable.
- Clearly mark route/weather enrichment failures rather than inventing results.
- Surface partial failures to the administrator with retry or continue options.
- Persist paused and background runs so browser disconnection does not lose work.

## 14. Security and Privacy

- Role-based access for administrator, doctor, and patient users.
- Organization and clinic scoping on every query.
- Short-lived service credentials between NestJS, Agno, and the MCP gateway.
- Secrets stored outside source control.
- Tool and endpoint allowlists.
- Redaction of sensitive fields from prompts, logs, traces, and MCP audit data.
- Explicit approval for write or override actions.
- Immutable audit history for scheduling changes and approvals.
- Rate limits and abuse controls on chat, agent, and MCP endpoints.

### PII and PHI Minimization Pipeline

The application classifies sensitive fields at their source and applies purpose-specific transformations at every outbound boundary.

```text
Authorized application data
  -> classify fields
  -> minimize for the operation
  -> tokenize or redact
  -> invoke Bedrock or MCP tool
  -> validate and sanitize the response
  -> write a redacted audit event
```

The shared classification vocabulary includes direct identifiers, contact information, precise location, appointment information, clinical information, credentials, and free text that may contain sensitive data.

Redaction behavior is destination-specific:

- Bedrock: send opaque patient and doctor references wherever names are unnecessary. Include only scheduling facts required for reasoning. Do not send clinical notes.
- Weather MCP: send clinic coordinates and appointment time, never patient identity.
- Maps MCP: send origin and destination only when route calculation requires them. Do not send patient ID, appointment reason, specialty, or clinical data. Prefer coarse origin or precomputed travel zones when exact origin is unnecessary.
- Logs and metrics: record identifiers as one-way keyed hashes or correlation IDs. Never log prompts, tool bodies, authorization headers, access tokens, precise addresses, or raw model responses by default.
- Traces: store operation names, timings, status, token counts, schema-safe attributes, and redacted errors. Sensitive payload capture is disabled by default.
- Evaluations: use synthetic or explicitly de-identified datasets. Production conversations are not automatically copied into evaluation datasets.
- Long-term memory and pgvector: reject disallowed sensitive categories before persistence or embedding.

Structured data is redacted using schema metadata rather than regular expressions alone. Free text passes through a dedicated PII/PHI detection layer, followed by deterministic policy rules. Detection findings include category and span but avoid copying the sensitive value into ordinary logs.

Where a later step needs the original value, tokenization uses short-lived opaque references resolved only inside an authorized service. Redaction is irreversible for logs and analytics; tokenization is narrowly reversible for an active workflow.

Inbound model and MCP results are treated as untrusted. They are schema-validated, scanned for unexpected sensitive data, and filtered before browser display, tracing, memory, or downstream tool use.

Redaction failures default to blocking the outbound model or MCP call. Administrators receive a safe error and correlation ID rather than the rejected sensitive payload.

### Layered Guardrail Enforcement

Agno guardrails are part of the protection model, but they are not the sole security boundary. The application applies independent controls before, during, and after every agent run:

1. **Authorization guard:** NestJS authenticates the actor, enforces role and organization scope, and loads only records the actor may access. Browser-supplied organization, patient, doctor, and role claims are never trusted directly.
2. **Input contract guard:** Pydantic and protobuf schemas reject unknown fields, invalid identifiers, excessive lengths, invalid dates, and unsupported scheduling intents before model execution.
3. **Agno input guardrails:** agents and teams use Agno pre-hooks for PII detection and prompt-injection defense. A custom healthcare scheduling guardrail blocks requests for diagnosis, clinical advice, bulk data disclosure, credential access, policy bypass, or unrelated tool use.
4. **Prompt minimization guard:** immediately before Bedrock invocation, an independent policy layer replaces unnecessary identifiers with short-lived tokens and verifies that disallowed sensitive categories are absent.
5. **Tool policy guard:** the runtime exposes an allowlist of typed tools. It validates every tool argument, overwrites security context from trusted server metadata, applies row-level authorization, limits result size, and rejects attempts to select arbitrary URLs, SQL, files, or MCP servers.
6. **HITL guard:** appointment create, update, reschedule, cancel, override, memory write, and other sensitive tools pause for explicit approval. Read-only weather and route tools may run automatically after their inputs pass policy.
7. **External boundary guard:** the MCP gateway repeats destination-specific minimization and validation. An agent cannot bypass it by constructing a raw provider request.
8. **Output guard:** Pydantic schemas, custom output checks, and sensitive-data scanning reject or redact unexpected model and MCP output before it reaches the browser, memory, logs, another tool, or an appointment command.
9. **Transactional write guard:** NestJS re-authorizes the action and independently rechecks availability, conflicts, clinic rules, idempotency, and approval state inside the database transaction. Model output is never treated as authorization.
10. **Observability guard:** logging and tracing processors remove sensitive attributes centrally. Application code cannot opt into raw prompt or tool-payload capture in production.

Agno's built-in PII detection is defense in depth for common identifiers; it is not considered a complete PHI detector. The custom policy layer uses the application's field classification, structured schemas, free-text detection, purpose rules, and destination rules. A model is never asked to decide whether its own input or output is safe.

Guardrail decisions are `allow`, `transform`, `require_approval`, or `block`. Every non-allow decision produces a redacted audit record with rule identifier, data category, destination, actor, run, and correlation ID. The audit record does not contain the detected sensitive value.

This design supports privacy-conscious engineering but does not itself claim regulatory certification. Deployment, contracts, operational controls, and formal compliance review remain required.

## 15. Testing and Evaluation

### Application Tests

- Unit tests for scheduling rules, rankings, permissions, and transformations.
- Integration tests against PostgreSQL and pgvector.
- Contract tests between React, NestJS, Agno, and the MCP gateway.
- End-to-end tests for create, approve, reject, modify, reschedule, and cancel flows.
- Concurrency tests proving that conflicting bookings cannot both succeed.
- Reconnection tests for event streaming and paused workflows.

### Agent Evaluations

- Correct intent detection.
- Correct patient and doctor resolution.
- Appropriate tool selection.
- Valid structured outputs.
- No write before approval.
- Correct handling of missing forecasts.
- Correct distance and weather ranking explanation.
- Resistance to prompt injection through tool or knowledge results.
- Memory isolation, consent, expiration, correction, and revocation behavior.
- PII/PHI minimization for Bedrock, weather MCP, maps MCP, logs, traces, and evaluations.
- Blocking behavior when redaction or sensitive-data validation fails.
- Stable behavior over a curated scheduling dataset.

Provider-dependent tests use recorded or fake MCP responses. A smaller opt-in test suite exercises live providers.

## 16. Delivery Boundaries

### Milestone 1: Foundation

Nx workspace, React, NestJS, Python services, PostgreSQL, pgvector, protobuf and HTTP contracts, local containers, authentication skeleton, AWS Bedrock configuration, and CI targets.

### Milestone 2: Appointment Core

Doctors, patients, clinics, availability, appointments, calendar UI, roles, conflict prevention, and audit history.

### Milestone 3: Agno Scheduling Workflow

Scheduling coordinator, internal tools, typed state, streaming, candidate generation, ranking, and persisted runs.

### Milestone 4: HITL and Real Time

Approval inbox, pause/resume, live workflow timeline, reconnectable events, appointment creation, and idempotency.

### Milestone 5: Weather and Maps MCP

MCP gateway, normalized contracts, provider adapters, parallel enrichment, caching, resilience, privacy controls, and administrator presentation.

### Milestone 6: Advanced Agno Coverage

Teams, nested workflows, knowledge, memory, guardrails, hooks, skills, context management, tracing, metrics, and evaluations.

### Milestone 7: Production Hardening

Security review, accessibility, load testing, operational dashboards, deployment manifests, backups, recovery testing, and documentation.

## 17. Acceptance Criteria

- An administrator can request an appointment conversationally.
- NestJS starts and streams Agno runs through the versioned gRPC contract.
- The Agno runtime invokes the configured AWS Bedrock model through workload IAM credentials.
- The system produces valid candidate slots from real stored availability.
- Candidate evaluation invokes weather and maps through normalized MCP contracts.
- Weather outside the provider horizon is marked unavailable.
- The UI streams workflow and tool progress in real time.
- No appointment is created before explicit administrator approval.
- Approval resumes the same persisted workflow run.
- Appointment creation is transactional, authorized, audited, and idempotent.
- The calendar updates immediately after creation.
- MCP failure cannot corrupt or duplicate an appointment.
- Workflow state, session history, and approved long-term memory have independently enforced scopes and retention policies.
- Bedrock, MCP, logging, tracing, memory, and evaluation boundaries enforce destination-specific PII/PHI minimization.
- Automated tests cover the primary success, ambiguity, rejection, conflict, provider failure, and reconnection scenarios.
- Contract tests detect incompatible protobuf changes and validate NestJS/Python interoperability.
