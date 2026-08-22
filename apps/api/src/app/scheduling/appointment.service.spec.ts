import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import type { AppointmentView } from '@scheduler/contracts';
import { AppointmentService } from './appointment.service';

const appointment: AppointmentView = {
  id: 'appointment-1', organizationId: 'org-1', patientId: 'patient-1',
  patientDisplayName: 'Maya Carter', doctorId: 'doctor-1',
  doctorDisplayName: 'Dr. Avery Shah', clinicId: 'clinic-1',
  clinicName: 'North Loop Clinic', clinicTimezone: 'America/Chicago',
  appointmentTypeId: 'type-1', appointmentTypeName: 'Follow-up',
  startAt: '2026-08-24T14:00:00.000Z', endAt: '2026-08-24T14:30:00.000Z',
  status: 'scheduled', version: 1,
};

function createService(query: ReturnType<typeof vi.fn>) {
  const manager = { query } as unknown as EntityManager;
  const dataSource = {
    transaction: vi.fn(async (work: (manager: EntityManager) => unknown) => work(manager)),
  } as unknown as DataSource;
  const calendar = { getAppointment: vi.fn().mockResolvedValue(appointment) };
  return { service: new AppointmentService(dataSource, calendar as never), calendar };
}

describe('AppointmentService', () => {
  it('creates an appointment and audit record in one transaction', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ duration_minutes: 30 }])
      .mockResolvedValueOnce([{ id: 'appointment-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const { service } = createService(query);

    const result = await service.create({
      patientId: 'patient-1', doctorId: 'doctor-1', clinicId: 'clinic-1',
      appointmentTypeId: 'type-1', startAt: '2026-08-24T14:00:00Z',
      idempotencyKey: 'create-1',
    }, { correlationId: 'corr-1' });

    expect(result).toEqual({ appointment, replayed: false });
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO audit_events'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO idempotency_records'))).toBe(true);
  });

  it('returns the original result for an idempotent replay', async () => {
    const query = vi.fn().mockResolvedValue([{ response: { appointmentId: 'appointment-1' } }]);
    const { service } = createService(query);

    await expect(service.cancel({
      appointmentId: 'appointment-1', reason: 'Patient request', observedVersion: 1,
      idempotencyKey: 'cancel-1',
    }, { correlationId: 'corr-1' })).resolves.toEqual({ appointment, replayed: true });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects cancellation without a reason before opening a transaction', async () => {
    const query = vi.fn();
    const { service } = createService(query);

    await expect(service.cancel({
      appointmentId: 'appointment-1', reason: ' ', observedVersion: 1,
      idempotencyKey: 'cancel-1',
    }, { correlationId: 'corr-1' })).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a stale reschedule version without writing audit success', async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const { service } = createService(query);

    await expect(service.reschedule({
      appointmentId: 'appointment-1', startAt: '2026-08-25T14:00:00Z',
      observedVersion: 0, idempotencyKey: 'move-1',
    }, { correlationId: 'corr-1' })).rejects.toBeInstanceOf(ConflictException);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO audit_events'))).toBe(false);
  });
});
