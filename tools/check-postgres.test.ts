import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('postgres compose configuration', () => {
  const compose = readFileSync('compose.yaml', 'utf8');

  it('uses pgvector and a healthcheck', () => {
    expect(compose).toContain('pgvector/pgvector:pg17');
    expect(compose).toContain('pg_isready');
    expect(compose).toContain('./infra/postgres/init:/docker-entrypoint-initdb.d:ro');
  });
});
