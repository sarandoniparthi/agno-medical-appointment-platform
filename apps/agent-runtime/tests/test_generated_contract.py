import pickle

from agno_platform.generated.agent_runtime.v1 import agent_runtime_pb2


def test_public_generated_messages_have_stable_module_identity() -> None:
    request = agent_runtime_pb2.HealthRequest(correlation_id="test-123")

    assert (
        agent_runtime_pb2.HealthRequest.__module__
        == "agno_platform.generated.agent_runtime.v1.agent_runtime_pb2"
    )
    assert pickle.loads(pickle.dumps(request)) == request
