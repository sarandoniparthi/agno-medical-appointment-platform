import argparse
import asyncio
import sys
from collections.abc import Sequence
from pathlib import Path

import grpc

from agent_runtime.grpc_service import AgentRuntimeService
from agent_runtime.scheduling.default_workflow import LazySchedulingWorkflow
from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2_grpc


def create_grpc_server(host: str, port: int) -> grpc.aio.Server:
    server = grpc.aio.server()
    agent_runtime_pb2_grpc.add_AgentRuntimeServiceServicer_to_server(
        AgentRuntimeService(LazySchedulingWorkflow()), server
    )
    bound_port = server.add_insecure_port(f"{host}:{port}")
    if bound_port == 0:
        raise RuntimeError(f"Failed to bind the agent runtime gRPC server to {host}:{port}")
    return server


async def serve_grpc(host: str, port: int) -> None:
    server = create_grpc_server(host, port)
    await server.start()

    try:
        await server.wait_for_termination()
    finally:
        await server.stop(grace=5)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the agent runtime gRPC server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=50051)
    parser.add_argument(
        "--app-dir",
        type=Path,
        help="Add the agent-runtime source directory to the import path.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> None:
    args = parse_args(argv)
    if args.app_dir is not None:
        sys.path.insert(0, str(args.app_dir.resolve()))
    asyncio.run(serve_grpc(args.host, args.port))


if __name__ == "__main__":
    main()
