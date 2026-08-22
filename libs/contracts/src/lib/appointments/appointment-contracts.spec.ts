import {
  calculateCandidateScore,
  isCancelAppointmentCommand,
  isRescheduleAppointmentCommand,
  isWorkflowEventSequence,
  type SchedulingCandidateScore,
  type WorkflowEvent,
} from './appointment-contracts';

describe('appointment contracts', () => {
  it('rejects a cancellation without a non-empty reason', () => {
    expect(
      isCancelAppointmentCommand({
        appointmentId: 'appointment-1',
        reason: '   ',
        idempotencyKey: 'cancel-1',
      }),
    ).toBe(false);
  });

  it('requires the observed version for a reschedule', () => {
    expect(
      isRescheduleAppointmentCommand({
        appointmentId: 'appointment-1',
        startAt: '2026-08-24T14:00:00.000Z',
        idempotencyKey: 'reschedule-1',
      }),
    ).toBe(false);
  });

  it('accepts only strictly increasing workflow event sequences', () => {
    const events = [
      { sequence: 1, type: 'intent_parsed', occurredAt: '2026-08-22T12:00:00Z' },
      { sequence: 2, type: 'candidates_ready', occurredAt: '2026-08-22T12:00:01Z' },
    ] satisfies WorkflowEvent[];

    expect(isWorkflowEventSequence(events)).toBe(true);
    expect(isWorkflowEventSequence([events[1], events[0]])).toBe(false);
  });

  it('calculates the documented candidate score components', () => {
    const score: SchedulingCandidateScore = {
      availability: 50,
      preference: 25,
      continuity: 15,
    };

    expect(calculateCandidateScore(score)).toBe(90);
  });
});
