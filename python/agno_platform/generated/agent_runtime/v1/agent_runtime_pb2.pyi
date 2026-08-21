from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ServingStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    SERVING_STATUS_UNSPECIFIED: _ClassVar[ServingStatus]
    SERVING_STATUS_SERVING: _ClassVar[ServingStatus]
    SERVING_STATUS_NOT_SERVING: _ClassVar[ServingStatus]
SERVING_STATUS_UNSPECIFIED: ServingStatus
SERVING_STATUS_SERVING: ServingStatus
SERVING_STATUS_NOT_SERVING: ServingStatus

class HealthRequest(_message.Message):
    __slots__ = ("correlation_id",)
    CORRELATION_ID_FIELD_NUMBER: _ClassVar[int]
    correlation_id: str
    def __init__(self, correlation_id: _Optional[str] = ...) -> None: ...

class HealthResponse(_message.Message):
    __slots__ = ("service", "status", "correlation_id")
    SERVICE_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    CORRELATION_ID_FIELD_NUMBER: _ClassVar[int]
    service: str
    status: ServingStatus
    correlation_id: str
    def __init__(self, service: _Optional[str] = ..., status: _Optional[_Union[ServingStatus, str]] = ..., correlation_id: _Optional[str] = ...) -> None: ...
