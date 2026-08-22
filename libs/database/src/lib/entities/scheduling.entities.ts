import { EntitySchema } from 'typeorm';

type Id = string;

export interface OrganizationEntity { id: Id; name: string; createdAt: Date }
export interface UserEntity { id: Id; organizationId: Id; displayName: string; role: string; createdAt: Date }
export interface ClinicEntity { id: Id; organizationId: Id; name: string; timezone: string; address: string; createdAt: Date }
export interface DoctorEntity { id: Id; organizationId: Id; displayName: string; specialty: string; createdAt: Date }
export interface DoctorClinicEntity { doctorId: Id; clinicId: Id }
export interface PatientEntity { id: Id; organizationId: Id; schedulingCode: string; displayName: string; createdAt: Date }
export interface AppointmentTypeEntity { id: Id; organizationId: Id; name: string; durationMinutes: number; createdAt: Date }
export interface DoctorAvailabilityEntity { id: Id; doctorId: Id; clinicId: Id; dayOfWeek: number; startTime: string; endTime: string }
export interface DoctorLeaveEntity { id: Id; doctorId: Id; startAt: Date; endAt: Date; reason: string }
export interface AppointmentEntity { id: Id; organizationId: Id; patientId: Id; doctorId: Id; clinicId: Id; appointmentTypeId: Id; startAt: Date; endAt: Date; status: string; schedulingNote?: string; cancellationReason?: string; version: number; createdAt: Date; updatedAt: Date }
export interface AuditEventEntity { id: Id; organizationId: Id; actorId: Id; action: string; targetType: string; targetId: Id; correlationId: string; workflowId?: string; sessionId?: string; runId?: string; outcome: string; metadata: Record<string, unknown>; createdAt: Date }
export interface IdempotencyRecordEntity { id: Id; organizationId: Id; actorId: Id; key: string; action: string; requestHash: string; response: Record<string, unknown>; createdAt: Date }

const uuidPrimary = { type: 'uuid' as const, primary: true };
const createdAt = { name: 'created_at', type: 'timestamptz' as const, createDate: true };

export const OrganizationEntity = new EntitySchema<OrganizationEntity>({
  name: 'organizations', schema: 'public',
  columns: { id: uuidPrimary, name: { type: 'text' }, createdAt },
});
export const UserEntity = new EntitySchema<UserEntity>({
  name: 'users', schema: 'public',
  columns: { id: uuidPrimary, organizationId: { name: 'organization_id', type: 'uuid' }, displayName: { name: 'display_name', type: 'text' }, role: { type: 'text' }, createdAt },
});
export const ClinicEntity = new EntitySchema<ClinicEntity>({
  name: 'clinics', schema: 'public',
  columns: { id: uuidPrimary, organizationId: { name: 'organization_id', type: 'uuid' }, name: { type: 'text' }, timezone: { type: 'text' }, address: { type: 'text' }, createdAt },
});
export const DoctorEntity = new EntitySchema<DoctorEntity>({
  name: 'doctors', schema: 'public',
  columns: { id: uuidPrimary, organizationId: { name: 'organization_id', type: 'uuid' }, displayName: { name: 'display_name', type: 'text' }, specialty: { type: 'text' }, createdAt },
});
export const DoctorClinicEntity = new EntitySchema<DoctorClinicEntity>({
  name: 'doctor_clinics', schema: 'public',
  columns: { doctorId: { name: 'doctor_id', type: 'uuid', primary: true }, clinicId: { name: 'clinic_id', type: 'uuid', primary: true } },
});
export const PatientEntity = new EntitySchema<PatientEntity>({
  name: 'patients', schema: 'public',
  columns: { id: uuidPrimary, organizationId: { name: 'organization_id', type: 'uuid' }, schedulingCode: { name: 'scheduling_code', type: 'text' }, displayName: { name: 'display_name', type: 'text' }, createdAt },
});
export const AppointmentTypeEntity = new EntitySchema<AppointmentTypeEntity>({
  name: 'appointment_types', schema: 'public',
  columns: { id: uuidPrimary, organizationId: { name: 'organization_id', type: 'uuid' }, name: { type: 'text' }, durationMinutes: { name: 'duration_minutes', type: 'integer' }, createdAt },
});
export const DoctorAvailabilityEntity = new EntitySchema<DoctorAvailabilityEntity>({
  name: 'doctor_availability', schema: 'public',
  columns: { id: uuidPrimary, doctorId: { name: 'doctor_id', type: 'uuid' }, clinicId: { name: 'clinic_id', type: 'uuid' }, dayOfWeek: { name: 'day_of_week', type: 'smallint' }, startTime: { name: 'start_time', type: 'time' }, endTime: { name: 'end_time', type: 'time' } },
});
export const DoctorLeaveEntity = new EntitySchema<DoctorLeaveEntity>({
  name: 'doctor_leave', schema: 'public',
  columns: { id: uuidPrimary, doctorId: { name: 'doctor_id', type: 'uuid' }, startAt: { name: 'start_at', type: 'timestamptz' }, endAt: { name: 'end_at', type: 'timestamptz' }, reason: { type: 'text' } },
});
export const AppointmentEntity = new EntitySchema<AppointmentEntity>({
  name: 'appointments', schema: 'public',
  columns: {
    id: uuidPrimary, organizationId: { name: 'organization_id', type: 'uuid' }, patientId: { name: 'patient_id', type: 'uuid' }, doctorId: { name: 'doctor_id', type: 'uuid' }, clinicId: { name: 'clinic_id', type: 'uuid' }, appointmentTypeId: { name: 'appointment_type_id', type: 'uuid' }, startAt: { name: 'start_at', type: 'timestamptz' }, endAt: { name: 'end_at', type: 'timestamptz' }, status: { type: 'text' }, schedulingNote: { name: 'scheduling_note', type: 'text', nullable: true }, cancellationReason: { name: 'cancellation_reason', type: 'text', nullable: true }, version: { type: 'integer', version: true, default: 1 }, createdAt, updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
});
export const AuditEventEntity = new EntitySchema<AuditEventEntity>({
  name: 'audit_events', schema: 'public',
  columns: { id: uuidPrimary, organizationId: { name: 'organization_id', type: 'uuid' }, actorId: { name: 'actor_id', type: 'uuid' }, action: { type: 'text' }, targetType: { name: 'target_type', type: 'text' }, targetId: { name: 'target_id', type: 'uuid' }, correlationId: { name: 'correlation_id', type: 'text' }, workflowId: { name: 'workflow_id', type: 'text', nullable: true }, sessionId: { name: 'session_id', type: 'text', nullable: true }, runId: { name: 'run_id', type: 'text', nullable: true }, outcome: { type: 'text' }, metadata: { type: 'jsonb' }, createdAt },
});
export const IdempotencyRecordEntity = new EntitySchema<IdempotencyRecordEntity>({
  name: 'idempotency_records', schema: 'public',
  columns: { id: uuidPrimary, organizationId: { name: 'organization_id', type: 'uuid' }, actorId: { name: 'actor_id', type: 'uuid' }, key: { type: 'text' }, action: { type: 'text' }, requestHash: { name: 'request_hash', type: 'text' }, response: { type: 'jsonb' }, createdAt },
  uniques: [{ columns: ['organizationId', 'actorId', 'key', 'action'] }],
});

export const schedulingEntities = [
  OrganizationEntity, UserEntity, ClinicEntity, DoctorEntity,
  DoctorClinicEntity, PatientEntity, AppointmentTypeEntity,
  DoctorAvailabilityEntity, DoctorLeaveEntity, AppointmentEntity,
  AuditEventEntity, IdempotencyRecordEntity,
];
