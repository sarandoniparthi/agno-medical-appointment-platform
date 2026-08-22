import { Body, Controller, Headers, Param, Patch, Post } from '@nestjs/common';
import type { CancelAppointmentCommand, CreateAppointmentCommand, RescheduleAppointmentCommand } from '@scheduler/contracts';
import { AppointmentService } from './appointment.service';

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @Post()
  create(@Body() body: CreateAppointmentCommand, @Headers('x-correlation-id') correlationId = 'web') {
    return this.appointments.create(body, { correlationId });
  }

  @Patch(':id/reschedule')
  reschedule(@Param('id') id: string, @Body() body: Omit<RescheduleAppointmentCommand, 'appointmentId'>, @Headers('x-correlation-id') correlationId = 'web') {
    return this.appointments.reschedule({ ...body, appointmentId: id }, { correlationId });
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: Omit<CancelAppointmentCommand, 'appointmentId'>, @Headers('x-correlation-id') correlationId = 'web') {
    return this.appointments.cancel({ ...body, appointmentId: id }, { correlationId });
  }
}
