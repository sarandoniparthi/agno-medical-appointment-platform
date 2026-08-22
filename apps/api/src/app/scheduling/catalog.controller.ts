import { Controller, Get, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';

@Controller()
export class CatalogController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('catalog')
  getCatalog() { return this.calendar.getCatalog(); }

  @Get('patients')
  searchPatients(@Query('query') query = '') { return this.calendar.searchPatients(query); }
}
