import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const result = spawnSync(
  'uv',
  [
    'run',
    'python',
    '-m',
    'grpc_tools.protoc',
    '-I',
    'proto',
    '--python_out=python/agno_platform/generated',
    '--pyi_out=python/agno_platform/generated',
    '--grpc_python_out=python/agno_platform/generated',
    'proto/agent_runtime/v1/agent_runtime.proto',
  ],
  { shell: process.platform === 'win32', stdio: 'inherit' },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const grpcModulePath =
  'python/agno_platform/generated/agent_runtime/v1/agent_runtime_pb2_grpc.py';
const grpcModule = readFileSync(grpcModulePath, 'utf8');
const packageRelativeModule = grpcModule.replace(
  'from agent_runtime.v1 import agent_runtime_pb2 as agent__runtime_dot_v1_dot_agent__runtime__pb2',
  'from . import agent_runtime_pb2 as agent__runtime_dot_v1_dot_agent__runtime__pb2',
);

if (packageRelativeModule === grpcModule) {
  throw new Error(`Unable to make generated import package-relative: ${grpcModulePath}`);
}

writeFileSync(grpcModulePath, packageRelativeModule);

writeFileSync(
  grpcModulePath.replace('.py', '.pyi'),
  `import grpc

from .agent_runtime_pb2 import HealthRequest, HealthResponse


class AgentRuntimeServiceStub:
    CheckHealth: grpc.aio.UnaryUnaryMultiCallable[HealthRequest, HealthResponse]

    def __init__(self, channel: grpc.aio.Channel) -> None: ...


class AgentRuntimeServiceServicer:
    async def CheckHealth(
        self,
        request: HealthRequest,
        context: grpc.aio.ServicerContext[HealthRequest, HealthResponse],
    ) -> HealthResponse: ...


def add_AgentRuntimeServiceServicer_to_server(
    servicer: AgentRuntimeServiceServicer,
    server: grpc.aio.Server,
) -> None: ...
`,
);
