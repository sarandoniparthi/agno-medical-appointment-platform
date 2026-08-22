export const APPOINTMENT_STATUSES = [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type SchedulingAction = 'create' | 'reschedule' | 'cancel';

export interface AppointmentView {
  id: string;
  organizationId: string;
  patientId: string;
  patientDisplayName: string;
  doctorId: string;
  doctorDisplayName: string;
  clinicId: string;
  clinicName: string;
  clinicTimezone: string;
  appointmentTypeId: string;
  appointmentTypeName: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  version: number;
  cancellationReason?: string;
  schedulingNote?: string;
}

export interface CalendarQuery {
  from: string;
  to: string;
  clinicId?: string;
  doctorId?: string;
  specialty?: string;
  status?: AppointmentStatus;
}

export interface CreateAppointmentCommand {
  patientId: string;
  doctorId: string;
  clinicId: string;
  appointmentTypeId: string;
  startAt: string;
  schedulingNote?: string;
  idempotencyKey: string;
}

export interface RescheduleAppointmentCommand {
  appointmentId: string;
  startAt: string;
  observedVersion: number;
  idempotencyKey: string;
}

export interface CancelAppointmentCommand {
  appointmentId: string;
  reason: string;
  observedVersion: number;
  idempotencyKey: string;
}

export interface SchedulingCandidateScore {
  availability: number;
  preference: number;
  continuity: number;
}

export interface SchedulingCandidate {
  id: string;
  doctorId: string;
  doctorDisplayName: string;
  clinicId: string;
  clinicName: string;
  clinicTimezone: string;
  appointmentTypeId: string;
  appointmentTypeName: string;
  startAt: string;
  endAt: string;
  explanation: string;
  score: SchedulingCandidateScore;
  totalScore: number;
  observedVersion?: number;
}

export type WorkflowEventType =
  | 'request_received'
  | 'clarification_required'
  | 'intent_parsed'
  | 'candidates_ready'
  | 'approval_required'
  | 'approved'
  | 'rejected'
  | 'mutation_completed'
  | 'recoverable_error';

export interface WorkflowEvent {
  sequence: number;
  type: WorkflowEventType;
  occurredAt: string;
  message?: string;
}

export interface WorkflowRequirement {
  id: string;
  kind: 'input' | 'approval';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expiresAt: string;
}

export interface WorkflowSnapshot {
  workflowId: string;
  sessionId: string;
  runId: string;
  action?: SchedulingAction;
  status:
    | 'running'
    | 'input_required'
    | 'approval_required'
    | 'completed'
    | 'rejected'
    | 'failed';
  events: WorkflowEvent[];
  requirement?: WorkflowRequirement;
  candidates: SchedulingCandidate[];
  appointment?: AppointmentView;
}

export interface AppointmentMutationResult {
  appointment: AppointmentView;
  replayed: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isCancelAppointmentCommand(
  value: unknown,
): value is CancelAppointmentCommand {
  return (
    isRecord(value) &&
    typeof value.appointmentId === 'string' &&
    typeof value.reason === 'string' &&
    value.reason.trim().length > 0 &&
    Number.isInteger(value.observedVersion) &&
    typeof value.idempotencyKey === 'string' &&
    value.idempotencyKey.trim().length > 0
  );
}

export function isRescheduleAppointmentCommand(
  value: unknown,
): value is RescheduleAppointmentCommand {
  return (
    isRecord(value) &&
    typeof value.appointmentId === 'string' &&
    typeof value.startAt === 'string' &&
    Number.isInteger(value.observedVersion) &&
    typeof value.idempotencyKey === 'string' &&
    value.idempotencyKey.trim().length > 0
  );
}

export function isWorkflowEventSequence(events: WorkflowEvent[]): boolean {
  return events.every(
    (event, index) => index === 0 || event.sequence > events[index - 1].sequence,
  );
}

export function calculateCandidateScore(
  score: SchedulingCandidateScore,
): number {
  return score.availability + score.preference + score.continuity;
}
