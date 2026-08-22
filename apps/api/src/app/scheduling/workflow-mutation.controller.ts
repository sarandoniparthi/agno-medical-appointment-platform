import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AgentRuntimeClient } from '../agent-runtime/agent-runtime.client';
import { AppointmentService } from './appointment.service';
import { CalendarService, DEMO_ADMIN_ID } from './calendar.service';

type Snapshot = Record<string, unknown> & {
  run_id?: string; workflow_id?: string; session_id?: string; action?: string;
  status?: string; context?: Record<string, unknown>; candidates?: Array<Record<string, unknown>>;
};

@Controller('internal')
export class WorkflowMutationController {
  constructor(
    private readonly runtime: AgentRuntimeClient,
    private readonly appointments: AppointmentService,
    private readonly calendar: CalendarService,
  ) {}

  @Get('open-slots')
  async openSlots(
    @Query('specialty') specialty?: string,
    @Query('appointmentId') appointmentId?: string,
  ) {
    const current = appointmentId ? await this.calendar.getAppointment(appointmentId) : undefined;
    return this.calendar.findOpenSlots({ specialty, current });
  }

  @Post('workflow-mutations')
  async mutate(
    @Body() body: { snapshot: Snapshot; payload: Record<string, unknown> },
    @Headers('x-correlation-id') correlationId = randomUUID(),
  ) {
    const supplied = body.snapshot;
    if (!supplied.run_id) throw new BadRequestException('Workflow run is required');
    const persisted = await this.runtime.getSchedulingWorkflow(supplied.run_id, correlationId) as Snapshot;
    if (persisted.status !== 'approved' || persisted.run_id !== supplied.run_id || persisted.action !== supplied.action) {
      throw new BadRequestException('Workflow approval is not valid');
    }
    const context = persisted.context ?? {};
    const key = createHash('sha256').update(`${persisted.run_id}:${persisted.action}`).digest('hex');
    const mutationContext = {
      correlationId, actorId: DEMO_ADMIN_ID, workflowId: String(persisted.workflow_id),
      sessionId: String(persisted.session_id), runId: persisted.run_id,
    };
    if (persisted.action === 'create' || persisted.action === 'reschedule') {
      const candidate = persisted.candidates?.find((item) => item['id'] === body.payload['candidate_id']);
      if (!candidate) throw new BadRequestException('Approved candidate is required');
      if (persisted.action === 'create') {
        const result = await this.appointments.create({
          patientId: String(context['patient_id']), doctorId: String(candidate['doctor_id']),
          clinicId: String(candidate['clinic_id']), appointmentTypeId: String(candidate['appointment_type_id']),
          startAt: String(candidate['start_at']), idempotencyKey: key,
        }, mutationContext);
        return result.appointment;
      }
      const current = await this.calendar.getAppointment(String(context['appointment_id']));
      const result = await this.appointments.reschedule({
        appointmentId: current.id, startAt: String(candidate['start_at']),
        observedVersion: Number(candidate['observed_version']), idempotencyKey: key,
      }, mutationContext);
      return result.appointment;
    }
    if (persisted.action === 'cancel') {
      const current = await this.calendar.getAppointment(String(context['appointment_id']));
      const approvedAppointment = context['appointment'] as Record<string, unknown> | undefined;
      const result = await this.appointments.cancel({
        appointmentId: current.id, reason: String(body.payload['reason'] ?? context['reason']),
        observedVersion: Number(approvedAppointment?.['version']), idempotencyKey: key,
      }, mutationContext);
      return result.appointment;
    }
    throw new BadRequestException('Unsupported scheduling action');
  }
}
