import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTypeOrmOptions } from '../../../../libs/database/src/lib/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () =>
        createTypeOrmOptions(
          process.env.DATABASE_URL ??
            'postgresql://scheduler:scheduler-local-only@localhost:5432/scheduler',
        ),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
