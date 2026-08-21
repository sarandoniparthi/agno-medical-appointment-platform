import os
import pickle
import shutil
import subprocess
import tempfile
from pathlib import Path

from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2


def test_public_generated_messages_have_stable_module_identity() -> None:
    request = agent_runtime_pb2.HealthRequest(correlation_id="test-123")

    assert (
        agent_runtime_pb2.HealthRequest.__module__
        == "agno_platform.generated.agent_runtime.v1.agent_runtime_pb2"
    )
    assert pickle.loads(pickle.dumps(request)) == request


def test_proto_generation_preserves_unowned_generated_artifacts() -> None:
    repository_root = Path(__file__).resolve().parents[3]
    fixture_directory = (
        repository_root
        / "python"
        / "agno_platform"
        / "generated"
        / "other_contract_fixture"
    )
    fixture_file = fixture_directory / "artifact.bin"
    fixture_bytes = b"must-survive-agent-runtime-proto-generation"

    if fixture_directory.exists():
        raise RuntimeError(f"Test fixture path already exists: {fixture_directory}")

    try:
        fixture_directory.mkdir()
        (fixture_directory / "__init__.py").write_text('"""Test-only generated artifact."""\n')
        fixture_file.write_bytes(fixture_bytes)

        for _ in range(2):
            result = subprocess.run(
                ["npm.cmd", "run", "proto:generate"],
                cwd=repository_root,
                check=False,
                capture_output=True,
                text=True,
            )

            assert result.returncode == 0, result.stderr
            assert fixture_file.read_bytes() == fixture_bytes
    finally:
        shutil.rmtree(fixture_directory, ignore_errors=True)


def test_proto_generation_cleans_staging_directory_after_failure() -> None:
    repository_root = Path(__file__).resolve().parents[3]
    generated_parent = repository_root / "python" / "agno_platform"
    staging_before = set(generated_parent.glob(".agent-runtime-proto-*"))

    result = subprocess.run(
        ["node", "tools/generate-proto.mjs"],
        cwd=repository_root,
        check=False,
        capture_output=True,
        env=os.environ | {"PROTO_GENERATE_TEST_FORCE_FAILURE": "1"},
        text=True,
    )

    assert result.returncode != 0
    assert set(generated_parent.glob(".agent-runtime-proto-*")) == staging_before


def test_proto_generation_creates_idempotent_clean_output() -> None:
    repository_root = Path(__file__).resolve().parents[3]

    with tempfile.TemporaryDirectory() as temporary_directory:
        clean_output_root = Path(temporary_directory) / "agno_platform" / "generated"
        environment = os.environ | {
            "PROTO_GENERATE_OUTPUT_ROOT": str(clean_output_root),
        }

        result = subprocess.run(
            ["node", "tools/generate-proto.mjs"],
            cwd=repository_root,
            check=False,
            capture_output=True,
            env=environment,
            text=True,
        )

        assert result.returncode == 0, result.stderr
        assert (clean_output_root / "agent_runtime" / "v1" / "agent_runtime_pb2.py").is_file()
        generated_files = sorted(clean_output_root.rglob("*.py*"))
        first_contents = {
            file.relative_to(clean_output_root): file.read_bytes() for file in generated_files
        }

        result = subprocess.run(
            ["node", "tools/generate-proto.mjs"],
            cwd=repository_root,
            check=False,
            capture_output=True,
            env=environment,
            text=True,
        )

        assert result.returncode == 0, result.stderr
        assert {
            file.relative_to(clean_output_root): file.read_bytes()
            for file in sorted(clean_output_root.rglob("*.py*"))
        } == first_contents
