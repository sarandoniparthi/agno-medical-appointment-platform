import { Test } from '@nestjs/testing';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { AppController } from './app.controller';
import {
  AgentRuntimeClient,
  type RawAgentRuntimeGrpcClient,
} from './agent-runtime/agent-runtime.client';
import { AppService } from './app.service';

describe('AppController', () => {
  it('returns a structured health response', async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AgentRuntimeClient,
          useValue: runtimeClientRespondingWith({
            service: 'agent-runtime',
            status: 1,
            correlation_id: 'health-123',
          }),
        },
      ],
    }).compile();

    expect(module.get(AppController).health()).toEqual({ service: 'api', status: 'ok' });
  });

  it('returns ready only when the agent runtime reports serving', async () => {
    const controller = new AppController(
      new AppService(),
      runtimeClientRespondingWith({
        service: 'agent-runtime',
        status: 1,
        correlation_id: 'ready-123',
      }),
    );

    await expect(controller.ready('ready-123')).resolves.toEqual({
      api: 'ok',
      agentRuntime: 'serving',
      correlationId: 'ready-123',
    });
  });

  it('returns a non-sensitive 503 code when the agent runtime is unavailable', async () => {
    const controller = new AppController(
      new AppService(),
      runtimeClientRespondingWithError({
        code: GrpcStatus.UNAVAILABLE,
        details: 'connection refused at 127.0.0.1',
      }),
    );

    await expect(controller.ready('offline-123')).rejects.toMatchObject({
      status: 503,
      response: {
        correlationId: 'offline-123',
        errorCode: 'agent_runtime_unavailable',
      },
    });
  });
});

function runtimeClientRespondingWith(response: {
  service: string;
  status: number;
  correlation_id: string;
}): AgentRuntimeClient {
  return new AgentRuntimeClient({
    CheckHealth: (_request, _options, callback) => callback(null, response),
    close: () => undefined,
  });
}

function runtimeClientRespondingWithError(
  error: { code: number; details: string },
): AgentRuntimeClient {
  const rawClient: RawAgentRuntimeGrpcClient = {
    CheckHealth: (_request, _options, callback) => callback(error as never),
    close: () => undefined,
  };

  return new AgentRuntimeClient(rawClient);
}
