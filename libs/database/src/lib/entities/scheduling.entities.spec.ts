import { EntitySchema } from 'typeorm';
import { describe, expect, it } from 'vitest';
import {
  AppointmentEntity,
  AuditEventEntity,
  IdempotencyRecordEntity,
  schedulingEntities,
} from './scheduling.entities';

describe('scheduling entities', () => {
  it('uses EntitySchema objects owned only by the public schema', () => {
    expect(schedulingEntities.length).toBe(12);
    expect(schedulingEntities.every((entity) => entity instanceof EntitySchema)).toBe(true);
    expect(
      schedulingEntities.every(
        (entity) => (entity.options.schema ?? 'public') === 'public',
      ),
    ).toBe(true);
  });

  it('maps appointment concurrency and cancellation fields', () => {
    expect(AppointmentEntity.options.columns.version).toMatchObject({
      type: 'integer',
      version: true,
    });
    expect(AppointmentEntity.options.columns.cancellationReason).toMatchObject({
      name: 'cancellation_reason',
      nullable: true,
    });
  });

  it('keeps idempotency and audit records as separate append-only entities', () => {
    expect(IdempotencyRecordEntity.options.name).toBe('idempotency_records');
    expect(AuditEventEntity.options.name).toBe('audit_events');
    expect(AuditEventEntity.options.columns).not.toHaveProperty('updatedAt');
  });
});
