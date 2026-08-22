import {
  RequirementResponse,
  toRequirementResponseNumber,
  type StartSchedulingWorkflowRequest,
} from './scheduling-runtime';

describe('scheduling runtime grpc contracts', () => {
  it('maps every approved HITL response to its stable protobuf value', () => {
    expect(toRequirementResponseNumber('approve')).toBe(RequirementResponse.Approve);
    expect(toRequirementResponseNumber('reject')).toBe(RequirementResponse.Reject);
    expect(toRequirementResponseNumber('edit')).toBe(RequirementResponse.Edit);
    expect(toRequirementResponseNumber('find_more')).toBe(RequirementResponse.FindMore);
  });

  it('uses correlation and request text at the workflow boundary', () => {
    const request: StartSchedulingWorkflowRequest = {
      correlationId: 'corr-1', requestText: 'Schedule Maya next week',
    };
    expect(request).toEqual({ correlationId: 'corr-1', requestText: 'Schedule Maya next week' });
  });
});
