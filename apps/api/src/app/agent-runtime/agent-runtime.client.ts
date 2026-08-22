import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { resolve } from 'node:path';

export const AGENT_RUNTIME_GRPC_CLIENT = Symbol('AGENT_RUNTIME_GRPC_CLIENT');

const HEALTH_CHECK_TIMEOUT_MS = 2_000;
const SERVING_STATUS_SERVING = 1;
const SERVING_STATUS_NOT_SERVING = 2;
const AGENT_RUNTIME_PROTO_ASSET_PATH =
  'proto/agent_runtime/v1/agent_runtime.proto';

export type AgentRuntimeHealthStatus = 'serving' | 'not-serving' | 'unknown';

export interface AgentRuntimeHealth {
  service: string;
  status: AgentRuntimeHealthStatus;
  correlationId: string;
}

interface RawAgentRuntimeHealthResponse {
  service: string;
  status: number;
  correlation_id: string;
}

interface RawWorkflowSnapshotResponse {
  correlation_id: string;
  workflow_id: string;
  session_id: string;
  run_id: string;
  status: string;
  snapshot_json: string;
}

type WorkflowCallback = (
  error: grpc.ServiceError | null,
  response?: RawWorkflowSnapshotResponse,
) => void;

export interface RawAgentRuntimeGrpcClient {
  CheckHealth(
    request: { correlation_id: string },
    options: { deadline: Date },
    callback: (
      error: grpc.ServiceError | null,
      response?: RawAgentRuntimeHealthResponse,
    ) => void,
  ): void;
  StartSchedulingWorkflow(
    request: { correlation_id: string; request_text: string }, callback: WorkflowCallback,
  ): void;
  GetSchedulingWorkflow(
    request: { correlation_id: string; run_id: string }, callback: WorkflowCallback,
  ): void;
  RespondToSchedulingRequirement(
    request: { correlation_id: string; run_id: string; response: number; payload_json: string },
    callback: WorkflowCallback,
  ): void;
  close(): void;
}

export type AgentRuntimeErrorCode =
  | 'agent_runtime_deadline_exceeded'
  | 'agent_runtime_unavailable';

export class AgentRuntimeUnavailableError extends Error {
  constructor(public readonly code: AgentRuntimeErrorCode) {
    super(code);
    this.name = 'AgentRuntimeUnavailableError';
  }
}

interface AgentRuntimeGrpcConstructor {
  new (
    address: string,
    credentials: grpc.ChannelCredentials,
  ): RawAgentRuntimeGrpcClient;
}

interface AgentRuntimeGrpcPackage {
  scheduler: {
    agent_runtime: {
      v1: {
        AgentRuntimeService: AgentRuntimeGrpcConstructor;
      };
    };
  };
}

export function resolveAgentRuntimeProtoPath(
  runtimeDirectory = __dirname,
): string {
  return resolve(runtimeDirectory, AGENT_RUNTIME_PROTO_ASSET_PATH);
}

export function createAgentRuntimeGrpcClient(
  protoPath = resolveAgentRuntimeProtoPath(),
): RawAgentRuntimeGrpcClient {
  const packageDefinition = protoLoader.loadSync(
    protoPath,
    {
      keepCase: true,
      longs: String,
      enums: Number,
      defaults: true,
      oneofs: true,
    },
  );
  const grpcPackage = grpc.loadPackageDefinition(
    packageDefinition,
  ) as unknown as AgentRuntimeGrpcPackage;
  const address = process.env.AGENT_GRPC_URL ?? '127.0.0.1:50051';

  return new grpcPackage.scheduler.agent_runtime.v1.AgentRuntimeService(
    address,
    grpc.credentials.createInsecure(),
  );
}

@Injectable()
export class AgentRuntimeClient implements OnModuleDestroy {
  constructor(
    @Inject(AGENT_RUNTIME_GRPC_CLIENT)
    private readonly client: RawAgentRuntimeGrpcClient,
  ) {}

  checkHealth(correlationId: string): Promise<AgentRuntimeHealth> {
    return new Promise((resolveHealth, rejectHealth) => {
      this.client.CheckHealth(
        { correlation_id: correlationId },
        { deadline: new Date(Date.now() + HEALTH_CHECK_TIMEOUT_MS) },
        (error, response) => {
          if (error !== null) {
            rejectHealth(new AgentRuntimeUnavailableError(this.errorCode(error)));
            return;
          }

          if (response === undefined) {
            rejectHealth(
              new AgentRuntimeUnavailableError('agent_runtime_unavailable'),
            );
            return;
          }

          resolveHealth({
            service: response.service,
            status: this.healthStatus(response.status),
            correlationId: response.correlation_id,
          });
        },
      );
    });
  }

  startSchedulingWorkflow(requestText: string, correlationId: string): Promise<Record<string, unknown>> {
    return this.workflowCall((callback) => this.client.StartSchedulingWorkflow(
      { correlation_id: correlationId, request_text: requestText }, callback,
    ));
  }

  getSchedulingWorkflow(runId: string, correlationId: string): Promise<Record<string, unknown>> {
    return this.workflowCall((callback) => this.client.GetSchedulingWorkflow(
      { correlation_id: correlationId, run_id: runId }, callback,
    ));
  }

  respondToSchedulingRequirement(
    runId: string, response: number, payload: Record<string, unknown>, correlationId: string,
  ): Promise<Record<string, unknown>> {
    return this.workflowCall((callback) => this.client.RespondToSchedulingRequirement(
      { correlation_id: correlationId, run_id: runId, response, payload_json: JSON.stringify(payload) }, callback,
    ));
  }

  onModuleDestroy(): void {
    this.client.close();
  }

  private workflowCall(
    invoke: (callback: WorkflowCallback) => void,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolveWorkflow, rejectWorkflow) => {
      invoke((error, response) => {
        if (error !== null || response === undefined) {
          rejectWorkflow(new AgentRuntimeUnavailableError(
            error ? this.errorCode(error) : 'agent_runtime_unavailable',
          ));
          return;
        }
        try {
          resolveWorkflow(JSON.parse(response.snapshot_json) as Record<string, unknown>);
        } catch {
          rejectWorkflow(new AgentRuntimeUnavailableError('agent_runtime_unavailable'));
        }
      });
    });
  }

  private errorCode(error: grpc.ServiceError): AgentRuntimeErrorCode {
    return error.code === grpc.status.DEADLINE_EXCEEDED
      ? 'agent_runtime_deadline_exceeded'
      : 'agent_runtime_unavailable';
  }

  private healthStatus(status: number): AgentRuntimeHealthStatus {
    if (status === SERVING_STATUS_SERVING) {
      return 'serving';
    }

    if (status === SERVING_STATUS_NOT_SERVING) {
      return 'not-serving';
    }

    return 'unknown';
  }
}
