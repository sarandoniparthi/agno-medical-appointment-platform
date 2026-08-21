import { randomUUID } from 'node:crypto';

const safeCorrelationId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/**
 * Returns an authorization-safe correlation ID. Untrusted values are retained
 * only when they are short identifiers, never when they resemble header data.
 */
export function correlationId(value: unknown): string {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (safeCorrelationId.test(trimmedValue)) {
      return trimmedValue;
    }
  }

  return randomUUID();
}
