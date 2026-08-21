"""Sensitive field classifications shared with the TypeScript contracts library."""

SENSITIVE_FIELD_KEY_FRAGMENTS = (
    "authorization",
    "cookie",
    "token",
    "secret",
    "password",
    "prompt",
    "patientaddress",
    "toolpayload",
)


def is_sensitive_field_key(key: str) -> bool:
    normalized_key = "".join(character for character in key.lower() if character.isalnum())
    return any(fragment in normalized_key for fragment in SENSITIVE_FIELD_KEY_FRAGMENTS)
