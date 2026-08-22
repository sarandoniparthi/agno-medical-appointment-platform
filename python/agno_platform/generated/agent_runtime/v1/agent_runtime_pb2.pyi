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

class RequirementResponse(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    REQUIREMENT_RESPONSE_UNSPECIFIED: _ClassVar[RequirementResponse]
    REQUIREMENT_RESPONSE_APPROVE: _ClassVar[RequirementResponse]
    REQUIREMENT_RESPONSE_REJECT: _ClassVar[RequirementResponse]
    REQUIREMENT_RESPONSE_EDIT: _ClassVar[RequirementResponse]
    REQUIREMENT_RESPONSE_FIND_MORE: _ClassVar[RequirementResponse]
SERVING_STATUS_UNSPECIFIED: ServingStatus
SERVING_STATUS_SERVING: ServingStatus
SERVING_STATUS_NOT_SERVING: ServingStatus
REQUIREMENT_RESPONSE_UNSPECIFIED: RequirementResponse
REQUIREMENT_RESPONSE_APPROVE: RequirementResponse
REQUIREMENT_RESPONSE_REJECT: RequirementResponse
REQUIREMENT_RESPONSE_EDIT: RequirementResponse
REQUIREMENT_RESPONSE_FIND_MORE: RequirementResponse

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

class StartSchedulingWorkflowRequest(_message.Message):
    __slots__ = ("correlation_id", "request_text")
    CORRELATION_ID_FIELD_NUMBER: _ClassVar[int]
    REQUEST_TEXT_FIELD_NUMBER: _ClassVar[int]
    correlation_id: str
    request_text: str
    def __init__(self, correlation_id: _Optional[str] = ..., request_text: _Optional[str] = ...) -> None: ...

class GetSchedulingWorkflowRequest(_message.Message):
    __slots__ = ("correlation_id", "run_id")
    CORRELATION_ID_FIELD_NUMBER: _ClassVar[int]
    RUN_ID_FIELD_NUMBER: _ClassVar[int]
    correlation_id: str
    run_id: str
    def __init__(self, correlation_id: _Optional[str] = ..., run_id: _Optional[str] = ...) -> None: ...

class RespondToSchedulingRequirementRequest(_message.Message):
    __slots__ = ("correlation_id", "run_id", "response", "payload_json")
    CORRELATION_ID_FIELD_NUMBER: _ClassVar[int]
    RUN_ID_FIELD_NUMBER: _ClassVar[int]
    RESPONSE_FIELD_NUMBER: _ClassVar[int]
    PAYLOAD_JSON_FIELD_NUMBER: _ClassVar[int]
    correlation_id: str
    run_id: str
    response: RequirementResponse
    payload_json: str
    def __init__(self, correlation_id: _Optional[str] = ..., run_id: _Optional[str] = ..., response: _Optional[_Union[RequirementResponse, str]] = ..., payload_json: _Optional[str] = ...) -> None: ...

class WorkflowSnapshotResponse(_message.Message):
    __slots__ = ("correlation_id", "workflow_id", "session_id", "run_id", "status", "snapshot_json")
    CORRELATION_ID_FIELD_NUMBER: _ClassVar[int]
    WORKFLOW_ID_FIELD_NUMBER: _ClassVar[int]
    SESSION_ID_FIELD_NUMBER: _ClassVar[int]
    RUN_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    SNAPSHOT_JSON_FIELD_NUMBER: _ClassVar[int]
    correlation_id: str
    workflow_id: str
    session_id: str
    run_id: str
    status: str
    snapshot_json: str
    def __init__(self, correlation_id: _Optional[str] = ..., workflow_id: _Optional[str] = ..., session_id: _Optional[str] = ..., run_id: _Optional[str] = ..., status: _Optional[str] = ..., snapshot_json: _Optional[str] = ...) -> None: ...
