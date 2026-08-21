import {
  Controller,
  Get,
  Headers,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AgentRuntimeClient,
  AgentRuntimeUnavailableError,
} from './agent-runtime/agent-runtime.client';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly agentRuntimeClient: AgentRuntimeClient,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  health(): { service: 'api'; status: 'ok' } {
    return { service: 'api', status: 'ok' };
  }

  @Get('ready')
  async ready(
    @Headers('x-correlation-id') correlationId?: string | string[],
  ): Promise<{ api: 'ok'; agentRuntime: 'serving'; correlationId: string }> {
    const requestCorrelationId =
      typeof correlationId === 'string' &&
      correlationId.trim().length > 0 &&
      correlationId.trim().length <= 128
        ? correlationId.trim()
        : randomUUID();

    try {
      const health = await this.agentRuntimeClient.checkHealth(requestCorrelationId);
      if (health.status !== 'serving') {
        throw new ServiceUnavailableException({
          correlationId: requestCorrelationId,
          errorCode: 'agent_runtime_not_serving',
        });
      }

      return {
        api: 'ok',
        agentRuntime: 'serving',
        correlationId: requestCorrelationId,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      const errorCode =
        error instanceof AgentRuntimeUnavailableError
          ? error.code
          : 'agent_runtime_unavailable';
      throw new ServiceUnavailableException({
        correlationId: requestCorrelationId,
        errorCode,
      });
    }
  }
}
