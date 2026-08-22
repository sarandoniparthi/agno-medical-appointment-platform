# Feature Learning Guide

This guide explains the project one small concept at a time. Each section uses
the same appointment example, identifies the relevant source files, and states
whether the feature is implemented, partial, or planned.

Start with the simple example. Read the architecture detail only after the
example makes sense.

## Learning path

| Order | Concept | Status |
| --- | --- | --- |
| 1 | Structured Bedrock intent | Implemented |
| 2 | Read-only scheduling tools | Implemented |
| 3 | Candidate generation | Implemented |
| 4 | Deterministic ranking | Implemented |
| 5 | Agno-backed workflow orchestration | Implemented |
| 6 | Workflow persistence | Implemented |
| 7 | Human-in-the-loop approval | Implemented |
| 8 | Verified appointment mutation | Implemented |
| 9 | Transactions, conflicts, and idempotency | Implemented |
| 10 | gRPC service boundary | Implemented |
| 11 | PII/PHI controls and guardrails | Partial |
| 12 | Three-level memory | Planned |
| 13 | Weather and maps MCP | Planned |
| 14 | Teams, knowledge, evaluations, and tracing | Planned |

## 1. Structured Bedrock intent

**Meaning:** The model translates a sentence into a validated object. It does
not return free-form instructions that the application executes blindly.

Simple request:

```text
Schedule Maya Carter with Cardiology
```

Expected conceptual output:

```json
{
  "action": "create",
  "patient_query": "Maya Carter",
  "specialty": "Cardiology"
}
```

Source:

- `apps/agent-runtime/src/agent_runtime/scheduling/models.py`
- `apps/agent-runtime/src/agent_runtime/scheduling/intent_parser.py`
- `python/agno_platform/models/bedrock.py`

Run the focused tests:

```powershell
uv run pytest apps/agent-runtime/tests/scheduling/test_intent_parser.py -q
uv run pytest python/tests/models/test_bedrock.py -q
```

**Advantage:** Pydantic rejects missing or unexpected fields before a workflow
can use them.

**Current boundary:** create, reschedule, and cancel are supported. A request
such as `Show me Dr. Jordan Lee's schedule` requires the planned
`view_schedule` intent.

## 2. Read-only scheduling tools

**Meaning:** A tool is a narrow application function the workflow can call to
obtain trusted data.

Tiny examples:

```text
search_patients("Maya Carter")
find_open_slots({"specialty": "Cardiology"})
get_appointment("<appointment-id>")
```

Source:

- `apps/agent-runtime/src/agent_runtime/scheduling/tools.py`
- `apps/agent-runtime/src/agent_runtime/scheduling/tools_client.py`
- `apps/api/src/app/scheduling/catalog.controller.ts`
- `apps/api/src/app/scheduling/calendar.controller.ts`

Run:

```powershell
uv run pytest apps/agent-runtime/tests/scheduling/test_tools.py -q
```

**Advantage:** Tools expose only scheduling fields. They do not give Bedrock
database credentials or unrestricted table access.

## 3. Candidate generation

**Meaning:** NestJS, not the LLM, generates slots that satisfy deterministic
database rules.

Example result:

```json
{
  "doctor": "Dr. Avery Shah",
  "clinic": "North Loop Clinic",
  "start": "2026-08-24T15:00:00Z",
  "explanation": "Conflict-free opening"
}
```

Source:

- `apps/api/src/app/scheduling/calendar.service.ts`
- `libs/database/src/migrations/0000000000002-appointment-domain.ts`

Run:

```powershell
npm.cmd exec nx -- run api:test
```

**Advantage:** The model cannot invent an unavailable time. PostgreSQL is
queried for conflict-free weekday business-hour openings.

**Current boundary:** patient and specialty are reliable constraints. Doctor,
clinic, appointment type, and natural-language date preferences are partial.

## 4. Deterministic ranking

**Meaning:** Code assigns repeatable scores after valid candidates are found.
The LLM does not decide the scoring formula.

```text
total = availability + preference + continuity
```

The workflow returns at most three candidates.

Source:

- `apps/agent-runtime/src/agent_runtime/scheduling/ranking.py`
- `apps/agent-runtime/src/agent_runtime/scheduling/models.py`

Run:

```powershell
uv run pytest apps/agent-runtime/tests/scheduling/test_workflow.py -q
```

**Advantage:** Results are explainable, testable, and stable even when model
wording changes.

## 5. Agno-backed workflow orchestration

**Meaning:** The application-owned `SchedulingWorkflow` coordinates multiple
steps and records its state. It uses an Agno `Agent`, `PostgresDb`,
`WorkflowSession`, and approval persistence, but it is not currently a subclass
of Agno's formal `Workflow` class.

```text
request_received
  -> intent_parsed
  -> candidates_ready
  -> approval_required
  -> approved or rejected
  -> mutation_completed
```

Source:

- `apps/agent-runtime/src/agent_runtime/scheduling/workflow.py`
- `apps/agent-runtime/src/agent_runtime/scheduling/default_workflow.py`

Run:

```powershell
uv run pytest apps/agent-runtime/tests/scheduling/test_workflow.py -q
```

**Advantage:** The run can pause, be inspected, and resume after a human
decision. The workflow is not hidden inside one prompt.

**Current boundary:** Converting this orchestration to a formal Agno `Workflow`
subclass is planned. The current design first makes every scheduling and safety
step explicit and testable.

## 6. Workflow persistence

**Meaning:** Workflow state survives outside Python process memory.

Agno owns a separate PostgreSQL schema and tables for sessions and approvals.
NestJS still owns official appointment data.

Source:

- `apps/agent-runtime/src/agent_runtime/scheduling/store.py`
- `apps/agent-runtime/tests/scheduling/test_store.py`

Run:

```powershell
uv run pytest apps/agent-runtime/tests/scheduling/test_store.py -q
```

**Advantage:** A browser refresh or runtime restart does not have to turn a
durable approval into an untracked in-memory decision.

## 7. Human-in-the-loop approval

**Meaning:** The agent proposes; the administrator decides.

Simple UI sequence:

1. Enter `Schedule Maya Carter with Cardiology`.
2. Review the three candidates.
3. Select **Approve this slot** or **Reject**.
4. Only an approval can enter the mutation path.

Source:

- `apps/agent-runtime/src/agent_runtime/scheduling/workflow.py`
- `apps/web/src/app/scheduling/assistant-panel.tsx`
- `apps/api/src/app/scheduling/workflow.controller.ts`

Run:

```powershell
npm.cmd exec nx -- run web:test
uv run pytest apps/agent-runtime/tests/scheduling/test_workflow.py -q
```

**Advantage:** The administrator sees the concrete doctor, clinic, and time
before any appointment changes.

## 8. Verified appointment mutation

**Meaning:** Python cannot turn its own in-memory `approved` value directly
into a database write.

After approval:

1. Python persists the approved workflow snapshot.
2. Python calls the private NestJS mutation endpoint.
3. NestJS reads the workflow again over gRPC.
4. NestJS verifies run ID, action, approval, and selected candidate.
5. NestJS invokes the appointment service.

Source:

- `apps/agent-runtime/src/agent_runtime/scheduling/default_workflow.py`
- `apps/api/src/app/scheduling/workflow-mutation.controller.ts`
- `apps/api/src/app/agent-runtime/agent-runtime.client.ts`

**Advantage:** A forged HTTP mutation payload is insufficient without a
matching persisted approval.

## 9. Transactions, conflicts, and idempotency

**Meaning:** Database correctness does not depend on the model or on only one
request arriving at a time.

Source:

- `apps/api/src/app/scheduling/appointment.service.ts`
- `apps/api/src/app/scheduling/scheduling.errors.ts`
- `libs/database/src/migrations/0000000000002-appointment-domain.ts`

The implementation includes:

- PostgreSQL transaction boundaries
- exclusion constraint for overlapping active doctor appointments
- optimistic appointment versions for reschedule/cancel
- idempotency records for safe retries
- audit events with correlation, workflow, session, and run identifiers

Run:

```powershell
npm.cmd exec nx -- run api:test
npm.cmd exec nx -- run database:test
```

**Advantage:** Concurrent requests cannot rely on an LLM promise that a slot is
still free.

## 10. gRPC service boundary

**Meaning:** NestJS and Python communicate through a typed internal contract.

Implemented RPCs:

```text
CheckHealth
StartSchedulingWorkflow
GetSchedulingWorkflow
RespondToSchedulingRequirement
```

Source:

- `proto/agent_runtime/v1/agent_runtime.proto`
- `libs/contracts/src/lib/grpc/scheduling-runtime.ts`
- `apps/agent-runtime/src/agent_runtime/grpc_service.py`
- `apps/api/src/app/agent-runtime/agent-runtime.client.ts`

Run:

```powershell
npm.cmd run proto:generate
uv run pytest apps/agent-runtime/tests/test_generated_contract.py -q
npm.cmd exec nx -- run api:test-artifact
```

**Advantage:** The services can be deployed as separate pods while retaining a
versioned, language-neutral contract.

## 11. PII/PHI controls and guardrails

**Status: Partial.**

Implemented now:

- strict Pydantic models with extra fields forbidden
- minimized patient search results
- rejection of unexpected clinical fields at the Python tool boundary
- recursive sensitive-key redaction utilities
- Bedrock instructions that prohibit diagnosis, treatment, notes, and credentials
- no AWS credentials in `.env`

Source:

- `apps/agent-runtime/src/agent_runtime/scheduling/models.py`
- `apps/agent-runtime/src/agent_runtime/scheduling/tools_client.py`
- `libs/observability/src/lib/redact.ts`
- `python/agno_platform/observability/redact.py`
- `libs/contracts/src/lib/privacy/sensitive-fields.ts`

Still planned:

- centralized pre-model and post-model policy enforcement
- role-based authorization for every scheduling endpoint
- prompt-injection and tool-policy checks
- retention and consent policies
- Bedrock Guardrails integration

**Advantage:** Data minimization is already a code boundary, while the planned
guardrail layer will add policy enforcement around every model interaction.

## 12. Three-level memory

**Status: Planned.**

The intended levels are:

1. **Run/session memory:** current request, candidates, and pending approval.
2. **User memory:** administrator preferences such as usual clinic or view.
3. **Organization memory:** approved scheduling policies and clinic knowledge.

Small future example:

```text
Admin preference: show North Loop Clinic first
Organization rule: follow-ups are 30 minutes
Current run: Maya needs Cardiology
```

PHI must not be promoted into durable user or organization memory merely
because it appeared in a conversation.

**Advantage:** Each lifetime and privacy boundary is explicit instead of using
one unlimited chat history.

## 13. Weather and maps MCP

**Status: Planned provider integration; gateway foundation implemented.**

Future example:

```text
Candidate A: 5 miles away, heavy snow expected
Candidate B: 7 miles away, normal travel conditions
```

The MCP gateway may enrich candidate explanations, but it must receive only a
clinic location and relevant time. It must never receive patient identity or
appointment-table access.

Source:

- `apps/mcp-gateway`
- `python/agno_platform/settings.py`

Run the current gateway foundation:

```powershell
npm.cmd exec nx -- serve mcp-gateway
Invoke-RestMethod http://localhost:8010/health
```

**Advantage:** External tools remain behind an allowlisted policy boundary and
can be replaced without changing appointment ownership.

## 14. Teams, knowledge, evaluations, and tracing

**Status: Planned.**

These concepts should be added only when the simpler workflow demonstrates a
real need:

- **Team:** separate specialist agents coordinate on genuinely independent tasks.
- **Knowledge/RAG:** retrieve approved policies or clinic documentation.
- **Evaluations:** measure intent accuracy, safe tool use, candidate quality,
  and approval outcomes.
- **Tracing:** correlate the browser request, NestJS call, gRPC run, Bedrock
  inference, tools, approval, and appointment mutation.

**Advantage:** They provide specialization and operational evidence without
putting all behavior into one large prompt.

## End-to-end exercise

After learning the individual concepts:

1. Start PostgreSQL and run `npm.cmd run db:migrate`.
2. Start agent runtime, API, and web services.
3. Enter `Schedule Maya Carter with Cardiology`.
4. Inspect the candidate explanations.
5. Reject once and confirm no appointment is created.
6. Start a new run, approve one candidate, and confirm the calendar refreshes.
7. Inspect the appointment, workflow approval, idempotency record, and audit event.

That exercise demonstrates the project's main principle:

> The model interprets and proposes; deterministic services, human approval,
> and PostgreSQL enforce the decision.
