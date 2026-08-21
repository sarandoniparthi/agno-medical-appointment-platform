/**
 * Case-insensitive key fragments that must never be emitted to logs or traces.
 * This list is mirrored by python/agno_platform/privacy/sensitive_fields.py.
 */
export const sensitiveFieldKeyFragments = [
  'authorization',
  'cookie',
  'token',
  'secret',
  'password',
  'prompt',
  'patientaddress',
  'toolpayload',
] as const;

export function isSensitiveFieldKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return sensitiveFieldKeyFragments.some((fragment) => normalizedKey.includes(fragment));
}
