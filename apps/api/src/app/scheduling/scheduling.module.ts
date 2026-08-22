import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { schedulingEntities } from '@scheduler/database';
import { CalendarController, AppointmentReadController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CatalogController } from './catalog.controller';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

@Module({
  imports: [TypeOrmModule.forFeature(schedulingEntities)],
  controllers: [CalendarController, AppointmentReadController, CatalogController, AppointmentController],
  providers: [CalendarService, AppointmentService],
  exports: [CalendarService, AppointmentService],
})
export class SchedulingModule {}
