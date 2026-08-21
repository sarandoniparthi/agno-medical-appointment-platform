import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  createTypeOrmOptions,
  PlatformSettingEntity,
} from '@scheduler/database';
import { AgentRuntimeModule } from './agent-runtime/agent-runtime.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AgentRuntimeModule,
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
