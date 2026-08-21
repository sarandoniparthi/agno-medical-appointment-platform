import { redactRecord } from './redact';

describe('redactRecord', () => {
  it('recursively redacts sensitive fields without changing the original input', () => {
    const input = {
      correlationId: 'correlation-123',
      authorization: 'Bearer confidential',
      metadata: {
        password: 'not-for-logs',
        rawPrompt: 'patient requests an appointment',
        patientAddress: '123 Main Street',
        toolPayload: { appointmentId: 'sensitive-tool-body' },
        safeValue: 'kept',
      },
      attempts: [
        { cookie: 'session-cookie', outcome: 'retry' },
        { nested: { apiToken: 'api-token', correlationId: 'correlation-456' } },
      ],
    };

    expect(redactRecord(input)).toEqual({
      correlationId: 'correlation-123',
      authorization: '[REDACTED]',
      metadata: {
        password: '[REDACTED]',
        rawPrompt: '[REDACTED]',
        patientAddress: '[REDACTED]',
        toolPayload: '[REDACTED]',
        safeValue: 'kept',
      },
      attempts: [
        { cookie: '[REDACTED]', outcome: 'retry' },
        { nested: { apiToken: '[REDACTED]', correlationId: 'correlation-456' } },
      ],
    });
    expect(input.metadata.password).toBe('not-for-logs');
    expect(input.attempts[1]?.nested.apiToken).toBe('api-token');
  });

  it('normalizes case, separators, and Unicode consistently with Python', () => {
    expect(
      redactRecord({
        API_ToKeN: 'sensitive',
        'patient-address': 'sensitive',
        toéken: 'sensitive',
        safe_id: 'kept',
      }),
    ).toEqual({
      API_ToKeN: '[REDACTED]',
      'patient-address': '[REDACTED]',
      toéken: '[REDACTED]',
      safe_id: 'kept',
    });
  });
});
