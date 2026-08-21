from collections.abc import Mapping
from typing import cast

from agno_platform.privacy.sensitive_fields import is_sensitive_field_key

REDACTED = "[REDACTED]"


def redact_mapping(value: Mapping[str, object]) -> dict[str, object]:
    """Return a recursively redacted copy suitable for logs and traces."""
    return {
        key: REDACTED if is_sensitive_field_key(key) else _redact_value(item)
        for key, item in value.items()
    }


def _redact_value(value: object) -> object:
    if isinstance(value, Mapping):
        return redact_mapping(cast(Mapping[str, object], value))
    if isinstance(value, list):
        return [_redact_value(item) for item in cast(list[object], value)]
    if isinstance(value, tuple):
        return tuple(_redact_value(item) for item in cast(tuple[object, ...], value))
    return value
