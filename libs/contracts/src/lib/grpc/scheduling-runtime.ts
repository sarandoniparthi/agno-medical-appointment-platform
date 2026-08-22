export enum RequirementResponse {
  Unspecified = 0,
  Approve = 1,
  Reject = 2,
  Edit = 3,
  FindMore = 4,
}

export interface StartSchedulingWorkflowRequest { correlationId: string; requestText: string }
export interface GetSchedulingWorkflowRequest { correlationId: string; runId: string }
export interface RespondToSchedulingRequirementRequest {
  correlationId: string;
  runId: string;
  response: 'approve' | 'reject' | 'edit' | 'find_more';
  payloadJson: string;
}
export interface WorkflowSnapshotResponse {
  correlationId: string; workflowId: string; sessionId: string;
  runId: string; status: string; snapshotJson: string;
}

const REQUIREMENT_RESPONSES = {
  approve: RequirementResponse.Approve,
  reject: RequirementResponse.Reject,
  edit: RequirementResponse.Edit,
  find_more: RequirementResponse.FindMore,
} as const;

export function toRequirementResponseNumber(
  response: RespondToSchedulingRequirementRequest['response'],
): RequirementResponse {
  return REQUIREMENT_RESPONSES[response];
}
