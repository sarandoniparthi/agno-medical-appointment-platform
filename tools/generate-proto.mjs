import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const contract = {
  packageName: 'scheduler.agent_runtime.v1',
  generatedModule: 'agno_platform.generated.agent_runtime.v1.agent_runtime_pb2',
  protoFile: 'proto/agent_runtime/v1/agent_runtime.proto',
  requestType: 'HealthRequest',
  responseType: 'HealthResponse',
  serviceName: 'AgentRuntimeService',
  methodName: 'CheckHealth',
};

const outputRoot = resolve('python/agno_platform/generated');
const stagingRoot = mkdtempSync(join(dirname(outputRoot), '.agent-runtime-proto-'));
const stagedOutputRoot = join(stagingRoot, 'generated');
const stagedVersionDirectory = join(stagedOutputRoot, 'agent_runtime', 'v1');
const grpcModulePath = join(stagedVersionDirectory, 'agent_runtime_pb2_grpc.py');
const protobufModulePath = join(stagedVersionDirectory, 'agent_runtime_pb2.py');

function replaceExactly(source, expected, replacement, filePath) {
  const occurrences = source.split(expected).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected exactly one occurrence in ${filePath}, found ${occurrences}: ${expected}`,
    );
  }

  return source.replace(expected, replacement);
}

function renameWithRetry(source, destination) {
  let lastError;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      renameSync(source, destination);
      return;
    } catch (error) {
      lastError = error;
      if (error.code !== 'EPERM' || attempt === 4) {
        throw error;
      }

      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25 * (attempt + 1));
    }
  }

  throw lastError;
}

function renderGrpcTypeStub() {
  const { methodName, requestType, responseType, serviceName } = contract;

  return `from __future__ import annotations

from typing import Protocol, overload

import grpc

from .agent_runtime_pb2 import ${requestType}, ${responseType}


class _Sync${methodName}Callable(Protocol):
    def __call__(self, request: ${requestType}, /, **kwargs: object) -> ${responseType}: ...


class _Aio${methodName}Callable(Protocol):
    def __call__(
        self, request: ${requestType}, /, **kwargs: object
    ) -> grpc.aio.UnaryUnaryCall[${requestType}, ${responseType}]: ...


class ${serviceName}SyncStub(Protocol):
    ${methodName}: _Sync${methodName}Callable


class ${serviceName}AioStub(Protocol):
    ${methodName}: _Aio${methodName}Callable


class ${serviceName}Stub:
    ${methodName}: _Sync${methodName}Callable | _Aio${methodName}Callable

    @overload
    def __init__(self, channel: grpc.aio.Channel) -> None: ...

    @overload
    def __init__(self, channel: grpc.Channel) -> None: ...


class ${serviceName}SyncServicer(Protocol):
    def ${methodName}(
        self, request: ${requestType}, context: grpc.ServicerContext
    ) -> ${responseType}: ...


class ${serviceName}Servicer:
    async def ${methodName}(
        self,
        request: ${requestType},
        context: grpc.aio.ServicerContext[${requestType}, ${responseType}],
    ) -> ${responseType}: ...


def add_${serviceName}Servicer_to_server(
    servicer: ${serviceName}SyncServicer | ${serviceName}Servicer,
    server: grpc.Server | grpc.aio.Server,
) -> None: ...


class ${serviceName}:
    @staticmethod
    def ${methodName}(
        request: ${requestType},
        target: str,
        options: object = ...,
        channel_credentials: grpc.ChannelCredentials | None = ...,
        call_credentials: grpc.CallCredentials | None = ...,
        insecure: bool = ...,
        compression: grpc.Compression | None = ...,
        wait_for_ready: bool | None = ...,
        timeout: float | None = ...,
        metadata: object = ...,
    ) -> ${responseType}: ...
`;
}

function writePackageInitializers() {
  writeFileSync(join(stagedOutputRoot, '__init__.py'), '"""Generated protocol buffer modules for platform service contracts."""\n');
  writeFileSync(
    join(stagedOutputRoot, 'agent_runtime', '__init__.py'),
    '"""Versioned agent runtime protocol buffer modules."""\n',
  );
  writeFileSync(
    join(stagedVersionDirectory, '__init__.py'),
    '"""Version 1 agent runtime protocol buffer modules."""\n',
  );
}

function generateIntoStagingDirectory() {
  mkdirSync(stagedVersionDirectory, { recursive: true });

  const result = spawnSync(
    'uv',
    [
      'run',
      'python',
      '-m',
      'grpc_tools.protoc',
      '-I',
      'proto',
      `--python_out=${stagedOutputRoot}`,
      `--pyi_out=${stagedOutputRoot}`,
      `--grpc_python_out=${stagedOutputRoot}`,
      contract.protoFile,
    ],
    { shell: process.platform === 'win32', stdio: 'inherit' },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  writePackageInitializers();
}

function validateAndPostprocessStagedFiles() {
  const protobufModule = readFileSync(protobufModulePath, 'utf8');
  const grpcModule = readFileSync(grpcModulePath, 'utf8');
  const protobufIdentity = `agent_runtime.v1.agent_runtime_pb2`;
  const protobufBuilderIdentity = `BuildTopDescriptorsAndMessages(DESCRIPTOR, '${protobufIdentity}', _globals)`;
  const publicBuilderIdentity = `BuildTopDescriptorsAndMessages(DESCRIPTOR, '${contract.generatedModule}', _globals)`;
  const generatedImport =
    'from agent_runtime.v1 import agent_runtime_pb2 as agent__runtime_dot_v1_dot_agent__runtime__pb2';
  const packageRelativeImport =
    'from . import agent_runtime_pb2 as agent__runtime_dot_v1_dot_agent__runtime__pb2';

  const publicProtobufModule = replaceExactly(
    protobufModule,
    protobufBuilderIdentity,
    publicBuilderIdentity,
    protobufModulePath,
  );
  const packageRelativeGrpcModule = replaceExactly(
    grpcModule,
    generatedImport,
    packageRelativeImport,
    grpcModulePath,
  );
  const pyrightCompatibleGrpcModule = replaceExactly(
    `# pyright: basic\n${packageRelativeGrpcModule}`,
    'return grpc.experimental.unary_unary(',
    'return grpc.experimental.unary_unary(  # pyright: ignore[reportAttributeAccessIssue]',
    grpcModulePath,
  );

  writeFileSync(protobufModulePath, `# pyright: basic\n${publicProtobufModule}`);
  writeFileSync(grpcModulePath, pyrightCompatibleGrpcModule);
  writeFileSync(grpcModulePath.replace('.py', '.pyi'), renderGrpcTypeStub());
}

function promoteStagedFiles() {
  const backupRoot = `${outputRoot}.backup-${process.pid}`;
  const hasExistingOutput = existsSync(outputRoot);

  try {
    if (hasExistingOutput) {
      renameWithRetry(outputRoot, backupRoot);
    }
    renameWithRetry(stagedOutputRoot, outputRoot);
  } catch (error) {
    if (hasExistingOutput && !existsSync(outputRoot) && existsSync(backupRoot)) {
      try {
        renameWithRetry(backupRoot, outputRoot);
      } catch {
        // Preserve the original promotion error; manual recovery can use the backup directory.
      }
    }
    throw error;
  } finally {
    rmSync(stagingRoot, { force: true, recursive: true });
  }

  if (hasExistingOutput) {
    rmSync(backupRoot, { force: true, recursive: true });
  }
}

try {
  generateIntoStagingDirectory();
  validateAndPostprocessStagedFiles();
  promoteStagedFiles();
} catch (error) {
  rmSync(stagingRoot, { force: true, recursive: true });
  throw error;
}
