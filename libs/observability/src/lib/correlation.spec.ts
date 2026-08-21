import { correlationId } from './correlation';

describe('correlationId', () => {
  it('uses a trimmed safe request ID and replaces unsafe values', () => {
    expect(correlationId(' trace-123 ')).toBe('trace-123');
    expect(correlationId('Bearer confidential')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
