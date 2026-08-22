import { Injectable, NotFoundException } from '@nestjs/common';
import type { AppointmentView, CalendarQuery } from '@scheduler/contracts';
import { DataSource } from 'typeorm';

export const DEMO_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_ADMIN_ID = '00000000-0000-4000-8000-000000000002';

interface AppointmentRow {
  id: string; organization_id: string; patient_id: string; patient_display_name: string;
  doctor_id: string; doctor_display_name: string; clinic_id: string; clinic_name: string;
  clinic_timezone: string; appointment_type_id: string; appointment_type_name: string;
  start_at: Date; end_at: Date; status: AppointmentView['status']; version: number;
  cancellation_reason: string | null; scheduling_note: string | null;
}

@Injectable()
export class CalendarService {
  constructor(private readonly dataSource: DataSource) {}

  async getCalendar(query: CalendarQuery): Promise<AppointmentView[]> {
    const rows = await this.dataSource.query<AppointmentRow[]>(
      `${this.appointmentSelect()}
       WHERE a.organization_id = '${DEMO_ORGANIZATION_ID}'
         AND a.start_at < $2::timestamptz AND a.end_at > $1::timestamptz
         AND ($3::uuid IS NULL OR a.clinic_id = $3)
         AND ($4::uuid IS NULL OR a.doctor_id = $4)
         AND ($5::text IS NULL OR d.specialty = $5)
         AND ($6::text IS NULL OR a.status = $6)
       ORDER BY a.start_at, d.display_name`,
      [query.from, query.to, query.clinicId ?? null, query.doctorId ?? null,
        query.specialty ?? null, query.status ?? null],
    );
    return rows.map((row) => this.mapAppointment(row));
  }

  async getAppointment(id: string): Promise<AppointmentView> {
    const rows = await this.dataSource.query<AppointmentRow[]>(
      `${this.appointmentSelect()} WHERE a.id = $1 AND a.organization_id = $2`,
      [id, DEMO_ORGANIZATION_ID],
    );
    if (!rows[0]) throw new NotFoundException('Appointment not found');
    return this.mapAppointment(rows[0]);
  }

  async searchPatients(query: string): Promise<Array<{id: string; schedulingCode: string; displayName: string}>> {
    const rows = await this.dataSource.query<Array<{id: string; scheduling_code: string; display_name: string}>>(
      `SELECT id, scheduling_code, display_name FROM patients
       WHERE organization_id = $1 AND (scheduling_code ILIKE $2 OR display_name ILIKE $2)
       ORDER BY display_name LIMIT 10`,
      [DEMO_ORGANIZATION_ID, `%${query.trim()}%`],
    );
    return rows.map((row) => ({ id: row.id, schedulingCode: row.scheduling_code, displayName: row.display_name }));
  }

  async getCatalog(): Promise<Record<string, unknown[]>> {
    const [clinics, doctors, appointmentTypes] = await Promise.all([
      this.dataSource.query('SELECT id,name,timezone,address FROM clinics WHERE organization_id=$1 ORDER BY name', [DEMO_ORGANIZATION_ID]),
      this.dataSource.query('SELECT id,display_name AS "displayName",specialty FROM doctors WHERE organization_id=$1 ORDER BY display_name', [DEMO_ORGANIZATION_ID]),
      this.dataSource.query('SELECT id,name,duration_minutes AS "durationMinutes" FROM appointment_types WHERE organization_id=$1 ORDER BY name', [DEMO_ORGANIZATION_ID]),
    ]);
    return { clinics, doctors, appointmentTypes };
  }

  private appointmentSelect(): string {
    return `SELECT a.id,a.organization_id,a.patient_id,p.display_name patient_display_name,
      a.doctor_id,d.display_name doctor_display_name,a.clinic_id,c.name clinic_name,
      c.timezone clinic_timezone,a.appointment_type_id,t.name appointment_type_name,
      a.start_at,a.end_at,a.status,a.version,a.cancellation_reason,a.scheduling_note
      FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id
      JOIN clinics c ON c.id=a.clinic_id JOIN appointment_types t ON t.id=a.appointment_type_id`;
  }

  private mapAppointment(row: AppointmentRow): AppointmentView {
    return {
      id: row.id, organizationId: row.organization_id, patientId: row.patient_id,
      patientDisplayName: row.patient_display_name, doctorId: row.doctor_id,
      doctorDisplayName: row.doctor_display_name, clinicId: row.clinic_id,
      clinicName: row.clinic_name, clinicTimezone: row.clinic_timezone,
      appointmentTypeId: row.appointment_type_id, appointmentTypeName: row.appointment_type_name,
      startAt: row.start_at.toISOString(), endAt: row.end_at.toISOString(),
      status: row.status, version: row.version,
      ...(row.cancellation_reason ? { cancellationReason: row.cancellation_reason } : {}),
      ...(row.scheduling_note ? { schedulingNote: row.scheduling_note } : {}),
    };
  }
}
