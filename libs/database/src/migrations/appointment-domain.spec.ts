import type { QueryRunner } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { AppointmentDomain0000000000002 } from './0000000000002-appointment-domain';
import { SeedSchedulingDemo0000000000003 } from './0000000000003-seed-scheduling-demo';

function recordingQueryRunner(statements: string[]): QueryRunner {
  return {
    query: async (sql: string) => {
      statements.push(sql);
      return [];
    },
  } as unknown as QueryRunner;
}

describe('appointment domain migrations', () => {
  it('creates a database-enforced active doctor overlap constraint', async () => {
    const statements: string[] = [];

    await new AppointmentDomain0000000000002().up(recordingQueryRunner(statements));
    const sql = statements.join('\n');

    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS btree_gist');
    expect(sql).toContain('appointments_doctor_active_no_overlap');
    expect(sql).toContain("tstzrange(start_at, end_at, '[)') WITH &&");
    expect(sql).toContain("WHERE (status = 'scheduled')");
  });

  it('uses deterministic rerunnable synthetic seed inserts', async () => {
    const statements: string[] = [];

    await new SeedSchedulingDemo0000000000003().up(recordingQueryRunner(statements));
    const sql = statements.join('\n');

    expect(sql).toContain('00000000-0000-4000-8000-000000000001');
    expect(sql).toContain('North Loop Clinic');
    expect(sql).toContain('Lakeside Clinic');
    expect(sql).toContain('ON CONFLICT DO NOTHING');
    expect(sql).not.toMatch(/diagnosis|treatment|clinical_note/i);
  });
});
