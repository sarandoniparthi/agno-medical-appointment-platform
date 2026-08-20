import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('returns a structured health response', async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    expect(module.get(AppController).health()).toEqual({ service: 'api', status: 'ok' });
  });
});
