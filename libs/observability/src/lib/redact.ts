const redacted = '[REDACTED]';
// Keep in sync with libs/contracts/src/lib/privacy/sensitive-fields.ts and
// python/agno_platform/privacy/sensitive_fields.py. This library builds in
// isolation, so it cannot import another library's TypeScript source.
const sensitiveFieldKeyFragments = [
  'authorization',
  'cookie',
  'token',
  'secret',
  'password',
  'prompt',
  'patientaddress',
  'toolpayload',
] as const;

export function redactRecord(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(redactRecord);
  }

  if (isRecord(input)) {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        isSensitiveFieldKey(key) ? redacted : redactRecord(value),
      ]),
    );
  }

  return input;
}

function isSensitiveFieldKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return sensitiveFieldKeyFragments.some((fragment) => normalizedKey.includes(fragment));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && Object.prototype.toString.call(value) === '[object Object]';
}
