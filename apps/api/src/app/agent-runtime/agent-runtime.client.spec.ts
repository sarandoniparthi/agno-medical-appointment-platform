import { status as GrpcStatus } from '@grpc/grpc-js';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  AgentRuntimeClient,
  AgentRuntimeUnavailableError,
  resolveAgentRuntimeProtoPath,
  type RawAgentRuntimeGrpcClient,
} from './agent-runtime.client';

describe('AgentRuntimeClient', () => {
  it('resolves the proto from an explicit compiled runtime directory', () => {
    expect(resolveAgentRuntimeProtoPath('/deployment/api')).toBe(
      resolve(
        '/deployment/api',
        'proto/agent_runtime/v1/agent_runtime.proto',
      ),
    );
  });

  it('maps a serving gRPC health response to the public health contract', async () => {
    const rawClient: RawAgentRuntimeGrpcClient = {
      CheckHealth: (_request, _options, callback) =>
        callback(null, {
          service: 'agent-runtime',
          status: 1,
          correlation_id: 'test-123',
          internal_detail: 'must not be exposed',
        }),
      close: vi.fn(),
    };

    const adapter = new AgentRuntimeClient(rawClient);

    await expect(adapter.checkHealth('test-123')).resolves.toEqual({
      service: 'agent-runtime',
      status: 'serving',
      correlationId: 'test-123',
    });
  });

  it('uses a two-second deadline for the health RPC', async () => {
    const beforeCall = Date.now();
    let deadline: Date | undefined;
    const rawClient: RawAgentRuntimeGrpcClient = {
      CheckHealth: (_request, options, callback) => {
        deadline = options.deadline;
        callback(null, {
          service: 'agent-runtime',
          status: 1,
          correlation_id: 'deadline-123',
        });
      },
      close: vi.fn(),
    };

    await new AgentRuntimeClient(rawClient).checkHealth('deadline-123');

    expect(deadline?.getTime()).toBeGreaterThanOrEqual(beforeCall + 1_900);
    expect(deadline?.getTime()).toBeLessThanOrEqual(beforeCall + 2_100);
  });

  it('maps gRPC deadline errors to a non-sensitive error code', async () => {
    const rawClient: RawAgentRuntimeGrpcClient = {
      CheckHealth: (_request, _options, callback) =>
        callback({ code: GrpcStatus.DEADLINE_EXCEEDED, details: 'internal host detail' }),
      close: vi.fn(),
    };

    await expect(new AgentRuntimeClient(rawClient).checkHealth('timeout-123')).rejects.toEqual(
      new AgentRuntimeUnavailableError('agent_runtime_deadline_exceeded'),
    );
  });

  it('maps gRPC connectivity errors to a non-sensitive error code', async () => {
    const rawClient: RawAgentRuntimeGrpcClient = {
      CheckHealth: (_request, _options, callback) =>
        callback({ code: GrpcStatus.UNAVAILABLE, details: 'connection refused at 127.0.0.1' }),
      close: vi.fn(),
    };

    await expect(new AgentRuntimeClient(rawClient).checkHealth('offline-123')).rejects.toEqual(
      new AgentRuntimeUnavailableError('agent_runtime_unavailable'),
    );
  });

  it('closes its owned gRPC channel during module shutdown', () => {
    const close = vi.fn();
    const adapter = new AgentRuntimeClient({
      CheckHealth: vi.fn(),
      close,
    });

    adapter.onModuleDestroy();

    expect(close).toHaveBeenCalledOnce();
  });
});
