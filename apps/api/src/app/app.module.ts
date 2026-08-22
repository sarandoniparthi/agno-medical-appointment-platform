import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  createTypeOrmOptions,
  PlatformSettingEntity,
} from '@scheduler/database';
import { AgentRuntimeModule } from './agent-runtime/agent-runtime.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SchedulingModule } from './scheduling/scheduling.module';

@Module({
  imports: [
    AgentRuntimeModule,
    SchedulingModule,
    TypeOrmModule.forRootAsync({
      useFactory: () =>
        createTypeOrmOptions(process.env.DATABASE_URL),
    }),
    TypeOrmModule.forFeature([PlatformSettingEntity]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
