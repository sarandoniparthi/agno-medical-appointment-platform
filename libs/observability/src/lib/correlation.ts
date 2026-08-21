import { randomUUID } from 'node:crypto';

const canonicalUuidV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Returns an authorization-safe correlation ID. It retains only canonical UUID
 * values, so request headers cannot be echoed or forwarded as credentials.
 */
export function correlationId(value: unknown): string {
  if (typeof value === 'string') {
    if (canonicalUuidV4.test(value)) {
      return value;
    }
  }

  return randomUUID();
}
