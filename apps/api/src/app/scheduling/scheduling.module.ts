import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { schedulingEntities } from '@scheduler/database';
import { CalendarController, AppointmentReadController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature(schedulingEntities)],
  controllers: [CalendarController, AppointmentReadController, CatalogController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class SchedulingModule {}
