import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const protoPath = join(
  workspaceRoot,
  'dist/apps/api/proto/agent_runtime/v1/agent_runtime.proto',
);

execFileSync(
  process.execPath,
  [join(workspaceRoot, 'node_modules/nx/dist/bin/nx.js'), 'build', 'api'],
  { cwd: workspaceRoot, stdio: 'inherit' },
);

assert.ok(existsSync(protoPath), `Missing packaged proto: ${protoPath}`);

const externalWorkingDirectory = mkdtempSync(join(tmpdir(), 'api-grpc-artifact-'));
process.chdir(externalWorkingDirectory);

const definition = protoLoader.loadSync(protoPath, { keepCase: true });
const grpcPackage = grpc.loadPackageDefinition(definition);
const RawAgentRuntimeClient =
  grpcPackage.scheduler.agent_runtime.v1.AgentRuntimeService;
const rawClient = new RawAgentRuntimeClient(
  '127.0.0.1:50051',
  grpc.credentials.createInsecure(),
);
rawClient.close();
