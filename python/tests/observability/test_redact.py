from agno_platform.observability.redact import redact_mapping


def test_redact_mapping_recursively_redacts_sensitive_fields_without_mutation() -> None:
    input_value: dict[str, object] = {
        "correlationId": "correlation-123",
        "authorization": "Bearer confidential",
        "metadata": {
            "password": "not-for-logs",
            "rawPrompt": "patient requests an appointment",
            "patientAddress": "123 Main Street",
            "toolPayload": {"appointmentId": "sensitive-tool-body"},
            "safeValue": "kept",
        },
        "attempts": [
            {"cookie": "session-cookie", "outcome": "retry"},
            {"nested": {"apiToken": "api-token", "correlationId": "correlation-456"}},
        ],
    }

    assert redact_mapping(input_value) == {
        "correlationId": "correlation-123",
        "authorization": "[REDACTED]",
        "metadata": {
            "password": "[REDACTED]",
            "rawPrompt": "[REDACTED]",
            "patientAddress": "[REDACTED]",
            "toolPayload": "[REDACTED]",
            "safeValue": "kept",
        },
        "attempts": [
            {"cookie": "[REDACTED]", "outcome": "retry"},
            {"nested": {"apiToken": "[REDACTED]", "correlationId": "correlation-456"}},
        ],
    }
    metadata = input_value["metadata"]
    attempts = input_value["attempts"]
    assert isinstance(metadata, dict)
    assert isinstance(attempts, list)
    assert metadata["password"] == "not-for-logs"
    assert attempts[1]["nested"]["apiToken"] == "api-token"
