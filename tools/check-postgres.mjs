import { execFileSync } from 'node:child_process';

const composeArgs = [
  'compose',
  '--env-file',
  '.env.example',
  'exec',
  '-T',
  'postgres',
  'psql',
  '-U',
  'scheduler',
  '-d',
  'scheduler',
  '-At',
  '-c',
  "SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgcrypto') ORDER BY extname;",
];

const extensions = execFileSync('docker', composeArgs, { encoding: 'utf8' })
  .trim()
  .split('\n');

if (extensions.join(',') !== 'pgcrypto,vector') {
  throw new Error(`Expected pgcrypto and vector extensions, received: ${extensions.join(', ')}`);
}

console.log('PostgreSQL extensions verified: pgcrypto, vector');
