import { correlationId } from './correlation';

describe('correlationId', () => {
  it('preserves only canonical UUID correlation IDs', () => {
    const canonicalId = '0f8fad5b-d9cb-469f-a165-70867728950e';

    expect(correlationId(canonicalId)).toBe(canonicalId);
  });

  it.each([
    ' Bearer credential ',
    'eyJhbGciOiJIUzI1NiJ9.payload.signature',
    'sk_live_placeholder',
    ' 0f8fad5b-d9cb-469f-a165-70867728950e ',
    '0F8FAD5B-D9CB-469F-A165-70867728950E',
    'malformed-id',
    'x'.repeat(129),
  ])('replaces unsafe correlation value %j', (unsafeValue) => {
    expect(correlationId(unsafeValue)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
