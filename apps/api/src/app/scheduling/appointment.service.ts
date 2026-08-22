import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type {
  AppointmentMutationResult,
  CancelAppointmentCommand,
  CreateAppointmentCommand,
  RescheduleAppointmentCommand,
} from '@scheduler/contracts';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { CalendarService, DEMO_ADMIN_ID, DEMO_ORGANIZATION_ID } from './calendar.service';
import { mapSchedulingDatabaseError } from './scheduling.errors';

export interface MutationContext {
  correlationId: string;
  actorId?: string;
  workflowId?: string;
  sessionId?: string;
  runId?: string;
}

@Injectable()
export class AppointmentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly calendar: CalendarService,
  ) {}

  async create(command: CreateAppointmentCommand, context: MutationContext): Promise<AppointmentMutationResult> {
    const replay = await this.runMutation('create', command.idempotencyKey, command, context,
      async (manager) => {
        const types = await manager.query<Array<{ duration_minutes: number }>>(
          'SELECT duration_minutes FROM appointment_types WHERE id=$1 AND organization_id=$2',
          [command.appointmentTypeId, DEMO_ORGANIZATION_ID],
        );
        if (!types[0]) throw new BadRequestException('Appointment type not found');
        const rows = await manager.query<Array<{ id: string }>>(
          `INSERT INTO appointments (id,organization_id,patient_id,doctor_id,clinic_id,appointment_type_id,start_at,end_at,status,scheduling_note)
           VALUES ($1,$2,$3,$4,$5,$6,$7::timestamptz,$7::timestamptz + ($8 || ' minutes')::interval,'scheduled',$9)
           RETURNING id`,
          [randomUUID(), DEMO_ORGANIZATION_ID, command.patientId, command.doctorId,
            command.clinicId, command.appointmentTypeId, command.startAt,
            types[0].duration_minutes, command.schedulingNote ?? null],
        );
        const inserted = rows[0];
        if (!inserted) throw new Error('Appointment insert returned no identifier');
        return inserted.id;
      });
    const appointment = await this.calendar.getAppointment(replay.appointmentId);
    return { appointment, replayed: replay.replayed };
  }

  async reschedule(command: RescheduleAppointmentCommand, context: MutationContext): Promise<AppointmentMutationResult> {
    return this.update('reschedule', command.idempotencyKey, command, context, async (manager) => {
      const rows = await manager.query<Array<{ id: string }>>(
        `UPDATE appointments SET end_at=$2::timestamptz + (end_at-start_at),start_at=$2::timestamptz,version=version+1,updated_at=now()
         WHERE id=$1 AND organization_id=$3 AND version=$4 AND status='scheduled' RETURNING id`,
        [command.appointmentId, command.startAt, DEMO_ORGANIZATION_ID, command.observedVersion],
      );
      if (!rows[0]) throw new ConflictException('Appointment changed; reload before rescheduling');
      return rows[0].id;
    });
  }

  async cancel(command: CancelAppointmentCommand, context: MutationContext): Promise<AppointmentMutationResult> {
    if (!command.reason.trim()) throw new BadRequestException('Cancellation reason is required');
    return this.update('cancel', command.idempotencyKey, command, context, async (manager) => {
      const rows = await manager.query<Array<{ id: string }>>(
        `UPDATE appointments SET status='cancelled',cancellation_reason=$2,version=version+1,updated_at=now()
         WHERE id=$1 AND organization_id=$3 AND version=$4 AND status='scheduled' RETURNING id`,
        [command.appointmentId, command.reason.trim(), DEMO_ORGANIZATION_ID, command.observedVersion],
      );
      if (!rows[0]) throw new ConflictException('Appointment changed; reload before cancelling');
      return rows[0].id;
    });
  }

  private async update(
    action: string, key: string, command: object, context: MutationContext,
    mutation: (manager: EntityManager) => Promise<string>,
  ): Promise<AppointmentMutationResult> {
    const replay = await this.runMutation(action, key, command, context, mutation);
    const appointment = await this.calendar.getAppointment(replay.appointmentId);
    return { appointment, replayed: replay.replayed };
  }

  private async runMutation(
    action: string, key: string, command: object, context: MutationContext,
    mutation: (manager: EntityManager) => Promise<string>,
  ): Promise<{ appointmentId: string; replayed: boolean }> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existing = await manager.query<Array<{ response: { appointmentId: string } }>>(
          'SELECT response FROM idempotency_records WHERE organization_id=$1 AND actor_id=$2 AND key=$3 AND action=$4',
          [DEMO_ORGANIZATION_ID, context.actorId ?? DEMO_ADMIN_ID, key, action],
        );
        if (existing[0]) return { appointmentId: existing[0].response.appointmentId, replayed: true };
        const appointmentId = await mutation(manager);
        await manager.query(
          `INSERT INTO audit_events (id,organization_id,actor_id,action,target_type,target_id,correlation_id,workflow_id,session_id,run_id,outcome,metadata)
           VALUES ($1,$2,$3,$4,'appointment',$5,$6,$7,$8,$9,'success','{}'::jsonb)`,
          [randomUUID(), DEMO_ORGANIZATION_ID, context.actorId ?? DEMO_ADMIN_ID, action,
            appointmentId, context.correlationId, context.workflowId ?? null,
            context.sessionId ?? null, context.runId ?? null],
        );
        await manager.query(
          `INSERT INTO idempotency_records (id,organization_id,actor_id,key,action,request_hash,response)
           VALUES ($1,$2,$3,$4,$5,$6,jsonb_build_object('appointmentId',$7::text))`,
          [randomUUID(), DEMO_ORGANIZATION_ID, context.actorId ?? DEMO_ADMIN_ID, key,
            action, createHash('sha256').update(JSON.stringify(command)).digest('hex'), appointmentId],
        );
        return { appointmentId, replayed: false };
      });
    } catch (error) { return mapSchedulingDatabaseError(error); }
  }
}
