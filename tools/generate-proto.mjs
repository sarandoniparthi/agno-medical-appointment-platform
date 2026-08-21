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

const outputRoot = resolve(
  process.env.PROTO_GENERATE_OUTPUT_ROOT ?? 'python/agno_platform/generated',
);
const outputPackageDirectory = join(outputRoot, 'agent_runtime');
const outputVersionDirectory = join(outputPackageDirectory, 'v1');
const outputParentDirectory = dirname(outputRoot);
mkdirSync(outputParentDirectory, { recursive: true });
const stagingRoot = mkdtempSync(join(outputParentDirectory, '.agent-runtime-proto-'));
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

function writeStagedPackageInitializer() {
  writeFileSync(
    join(stagedVersionDirectory, '__init__.py'),
    '"""Version 1 agent runtime protocol buffer modules."""\n',
  );
}

function writePackageInitializerIfMissing(filePath, contents) {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, contents);
  }
}

function prepareOwnedPackageDirectories() {
  mkdirSync(outputPackageDirectory, { recursive: true });
  writePackageInitializerIfMissing(
    join(outputRoot, '__init__.py'),
    '"""Generated protocol buffer modules for platform service contracts."""\n',
  );
  writePackageInitializerIfMissing(
    join(outputPackageDirectory, '__init__.py'),
    '"""Versioned agent runtime protocol buffer modules."""\n',
  );
}

function generateIntoStagingDirectory() {
  mkdirSync(stagedVersionDirectory, { recursive: true });

  if (process.env.PROTO_GENERATE_TEST_FORCE_FAILURE === '1') {
    throw new Error('Forced generation failure for staging cleanup regression test.');
  }

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

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`grpc_tools.protoc exited with status ${result.status ?? 1}.`);
  }

  writeStagedPackageInitializer();
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
  const backupVersionDirectory = `${outputVersionDirectory}.backup-${process.pid}`;
  const hasExistingVersion = existsSync(outputVersionDirectory);

  prepareOwnedPackageDirectories();

  try {
    if (hasExistingVersion) {
      renameWithRetry(outputVersionDirectory, backupVersionDirectory);
    }
    renameWithRetry(stagedVersionDirectory, outputVersionDirectory);
  } catch (error) {
    if (
      hasExistingVersion &&
      !existsSync(outputVersionDirectory) &&
      existsSync(backupVersionDirectory)
    ) {
      try {
        renameWithRetry(backupVersionDirectory, outputVersionDirectory);
      } catch {
        // Preserve the original promotion error; manual recovery can use the backup directory.
      }
    }
    throw error;
  } finally {
    rmSync(stagingRoot, { force: true, recursive: true });
  }

  if (hasExistingVersion) {
    rmSync(backupVersionDirectory, { force: true, recursive: true });
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
