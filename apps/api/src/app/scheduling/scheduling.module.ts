import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { schedulingEntities } from '@scheduler/database';
import { CalendarController, AppointmentReadController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CatalogController } from './catalog.controller';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowMutationController } from './workflow-mutation.controller';

@Module({
  imports: [TypeOrmModule.forFeature(schedulingEntities), AgentRuntimeModule],
  controllers: [CalendarController, AppointmentReadController, CatalogController, AppointmentController, WorkflowController, WorkflowMutationController],
  providers: [CalendarService, AppointmentService],
  exports: [CalendarService, AppointmentService],
})
export class SchedulingModule {}
