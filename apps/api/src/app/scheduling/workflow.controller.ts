import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AgentRuntimeClient } from '../agent-runtime/agent-runtime.client';
import { randomUUID } from 'node:crypto';

const RESPONSES: Record<string, number> = { approve: 1, reject: 2, edit: 3, find_more: 4 };

@Controller('workflows')
export class WorkflowController {
  constructor(private readonly runtime: AgentRuntimeClient) {}

  @Post()
  start(
    @Body() body: { request: string },
    @Headers('x-correlation-id') correlationId = randomUUID(),
  ) {
    return this.runtime.startSchedulingWorkflow(body.request, correlationId);
  }

  @Get(':runId')
  get(
    @Param('runId') runId: string,
    @Headers('x-correlation-id') correlationId = randomUUID(),
  ) {
    return this.runtime.getSchedulingWorkflow(runId, correlationId);
  }

  @Post(':runId/responses')
  respond(
    @Param('runId') runId: string,
    @Body() body: { response: string; payload?: Record<string, unknown> },
    @Headers('x-correlation-id') correlationId = randomUUID(),
  ) {
    const response = RESPONSES[body.response];
    if (!response) throw new Error('Unsupported workflow response');
    return this.runtime.respondToSchedulingRequirement(
      runId, response, body.payload ?? {}, correlationId,
    );
  }
}
