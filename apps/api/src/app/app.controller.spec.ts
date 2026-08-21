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

    await expect(controller.ready('0f8fad5b-d9cb-469f-a165-70867728950e')).resolves.toEqual({
      api: 'ok',
      agentRuntime: 'serving',
      correlationId: '0f8fad5b-d9cb-469f-a165-70867728950e',
    });
  });

  it('replaces an unsafe readiness correlation ID before echoing or forwarding it', async () => {
    let forwardedCorrelationId: string | undefined;
    const controller = new AppController(
      new AppService(),
      runtimeClientCapturingRequest((correlationId) => {
        forwardedCorrelationId = correlationId;
      }, {
        service: 'agent-runtime',
        status: 1,
        correlation_id: 'generated',
      }),
    );

    const rawCredential = 'Bearer credential';
    await expect(controller.ready(rawCredential)).resolves.toMatchObject({
      correlationId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
    });
    expect(forwardedCorrelationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(forwardedCorrelationId).not.toBe(rawCredential);
  });

  it('replaces an oversized readiness correlation ID', async () => {
    const controller = new AppController(
      new AppService(),
      runtimeClientRespondingWith({
        service: 'agent-runtime',
        status: 1,
        correlation_id: 'generated',
      }),
    );

    await expect(controller.ready('x'.repeat(129))).resolves.toMatchObject({
      correlationId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ),
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

    await expect(controller.ready('0f8fad5b-d9cb-469f-a165-70867728950e')).rejects.toMatchObject({
      status: 503,
      response: {
        correlationId: '0f8fad5b-d9cb-469f-a165-70867728950e',
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

function runtimeClientCapturingRequest(
  onRequest: (correlationId: string) => void,
  response: { service: string; status: number; correlation_id: string },
): AgentRuntimeClient {
  return new AgentRuntimeClient({
    CheckHealth: (request, _options, callback) => {
      onRequest(request.correlation_id);
      callback(null, response);
    },
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
