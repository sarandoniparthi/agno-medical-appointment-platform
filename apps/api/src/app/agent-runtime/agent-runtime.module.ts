import { Module } from '@nestjs/common';
import {
  AGENT_RUNTIME_GRPC_CLIENT,
  AgentRuntimeClient,
  createAgentRuntimeGrpcClient,
} from './agent-runtime.client';

@Module({
  providers: [
    AgentRuntimeClient,
    {
      provide: AGENT_RUNTIME_GRPC_CLIENT,
      useFactory: createAgentRuntimeGrpcClient,
    },
  ],
  exports: [AgentRuntimeClient],
})
export class AgentRuntimeModule {}
