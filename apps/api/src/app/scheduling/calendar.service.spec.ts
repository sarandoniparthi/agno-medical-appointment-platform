import { NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  it('passes bounded calendar filters and maps timezone-aware rows', async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: 'appointment-1', organization_id: 'org-1', patient_id: 'patient-1',
        patient_display_name: 'Maya Carter', doctor_id: 'doctor-1',
        doctor_display_name: 'Dr. Avery Shah', clinic_id: 'clinic-1',
        clinic_name: 'North Loop Clinic', clinic_timezone: 'America/Chicago',
        appointment_type_id: 'type-1', appointment_type_name: 'Follow-up',
        start_at: new Date('2026-08-24T14:00:00Z'), end_at: new Date('2026-08-24T14:30:00Z'),
        status: 'scheduled', version: 1, cancellation_reason: null, scheduling_note: null,
      },
    ]);
    const service = new CalendarService({ query } as unknown as DataSource);

    const result = await service.getCalendar({
      from: '2026-08-24T00:00:00Z', to: '2026-08-31T00:00:00Z',
      clinicId: 'clinic-1', doctorId: 'doctor-1', status: 'scheduled',
    });

    expect(result[0]).toMatchObject({
      clinicTimezone: 'America/Chicago',
      startAt: '2026-08-24T14:00:00.000Z',
    });
    expect(query.mock.calls[0][1]).toEqual([
      '2026-08-24T00:00:00Z', '2026-08-31T00:00:00Z',
      'clinic-1', 'doctor-1', null, 'scheduled',
    ]);
  });

  it('returns only minimized scheduling fields for patient search', async () => {
    const query = vi.fn().mockResolvedValue([
      { id: 'patient-1', scheduling_code: 'PT-1001', display_name: 'Maya Carter' },
    ]);
    const service = new CalendarService({ query } as unknown as DataSource);

    await expect(service.searchPatients('maya')).resolves.toEqual([
      { id: 'patient-1', schedulingCode: 'PT-1001', displayName: 'Maya Carter' },
    ]);
  });

  it('throws when the requested appointment is outside the seeded organization', async () => {
    const service = new CalendarService({
      query: vi.fn().mockResolvedValue([]),
    } as unknown as DataSource);

    await expect(service.getAppointment('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
