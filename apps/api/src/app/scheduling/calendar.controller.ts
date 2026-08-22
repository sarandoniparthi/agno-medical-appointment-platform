import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { parseCalendarQuery } from './dto/calendar.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get()
  getCalendar(@Query() query: Record<string, unknown>) {
    try { return this.calendar.getCalendar(parseCalendarQuery(query)); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid query'); }
  }
}

@Controller('appointments')
export class AppointmentReadController {
  constructor(private readonly calendar: CalendarService) {}

  @Get(':id')
  getAppointment(@Param('id') id: string) { return this.calendar.getAppointment(id); }
}
