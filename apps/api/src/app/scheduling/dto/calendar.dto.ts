import type { AppointmentStatus, CalendarQuery } from '@scheduler/contracts';

const STATUSES = new Set<AppointmentStatus>([
  'scheduled', 'completed', 'cancelled', 'no_show',
]);

export function parseCalendarQuery(query: Record<string, unknown>): CalendarQuery {
  const from = requiredIsoDate(query.from, 'from');
  const to = requiredIsoDate(query.to, 'to');
  if (new Date(from) >= new Date(to)) throw new Error('from must be before to');
  const status = optionalString(query.status);
  if (status && !STATUSES.has(status as AppointmentStatus)) {
    throw new Error('invalid appointment status');
  }
  return {
    from, to,
    clinicId: optionalString(query.clinicId),
    doctorId: optionalString(query.doctorId),
    specialty: optionalString(query.specialty),
    status: status as AppointmentStatus | undefined,
  };
}

function requiredIsoDate(value: unknown, field: string): string {
  const normalized = optionalString(value);
  if (!normalized || Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${field} must be an ISO timestamp`);
  }
  return normalized;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
