from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class EventType(StrEnum):
    LINE = "LINE"
    CALL = "CALL"
    RETURN = "RETURN"
    ASSIGN = "ASSIGN"
    COMPARE = "COMPARE"
    READ = "READ"
    WRITE = "WRITE"
    LOOP_ENTER = "LOOP_ENTER"
    LOOP_EXIT = "LOOP_EXIT"
    RECURSION = "RECURSION"
    EXCEPTION = "EXCEPTION"
    PRINT = "PRINT"
    END = "END"


class ExecutionEvent(BaseModel):
    id: str = Field(..., description="Unique event identifier")
    timestamp: float = Field(..., description="Epoch timestamp of the event")
    type: EventType = Field(..., description="Type of the execution event")
    line: int = Field(
        ..., description="Source code line number associated with the event"
    )
    function: str = Field(..., description="Name of the function currently executing")
    locals: dict[str, Any] = Field(
        default_factory=dict, description="Local variables and their values"
    )
    globals: dict[str, Any] = Field(
        default_factory=dict, description="Global variables and their values"
    )
    memory: dict[str, Any] = Field(
        default_factory=dict, description="Object heap memory tracking"
    )
    stack: list[str] = Field(
        default_factory=list, description="Active function call stack"
    )
    payload: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Event-specific metadata (e.g. print output, comparative "
            "expression results)"
        ),
    )

    class Config:
        frozen = True  # Ensures events are immutable once created
