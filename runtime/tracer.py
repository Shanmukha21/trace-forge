import io
import operator
import sys
import time
import uuid
from collections.abc import Callable
from typing import Any

from shared.models import EventType, ExecutionEvent


def safe_serialize(obj: Any, max_depth: int = 3) -> Any:
    """Recursively serializes python objects to basic JSON-compatible structures,

    preventing circular reference crashes.
    """
    if max_depth <= 0:
        return "<Max Depth Reached>"
    if isinstance(obj, (int, float, str, bool, type(None))):
        return obj
    if isinstance(obj, (list, tuple, set)):
        return [safe_serialize(x, max_depth - 1) for x in obj]
    if isinstance(obj, dict):
        return {str(k): safe_serialize(v, max_depth - 1) for k, v in obj.items()}
    if hasattr(obj, "__dict__"):
        return {
            k: safe_serialize(v, max_depth - 1)
            for k, v in obj.__dict__.items()
            if not k.startswith("_")
        }
    return str(obj)


class StdoutRedirector(io.StringIO):
    """Intercepts sys.stdout writes and buffers them until a newline
    is found to group print events.
    """

    def __init__(self, callback: Callable[[str], None]):
        super().__init__()
        self.callback = callback
        self.buffer = ""

    def write(self, s: str) -> int:
        if s:
            self.buffer += s
            if "\n" in self.buffer:
                parts = self.buffer.split("\n")
                for line in parts[:-1]:
                    self.callback(line)
                self.buffer = parts[-1]
        return len(s)

    def flush(self) -> None:
        if self.buffer:
            self.callback(self.buffer)
            self.buffer = ""


class Tracer:
    """Manages sys.settrace session, mapping code execution steps
    into ExecutionEvents.
    """

    def __init__(self, event_callback: Callable[[ExecutionEvent], None]):
        self.event_callback = event_callback
        self.stack: list[str] = ["<module>"]
        self.start_time = time.time()
        self._original_trace: Any | None = None
        self._original_stdout = sys.stdout
        self.redirector = StdoutRedirector(self._handle_print)

    def __enter__(self) -> "Tracer":
        self._original_trace = sys.gettrace()
        sys.settrace(self.trace_func)
        sys.stdout = self.redirector
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.redirector.flush()
        sys.settrace(self._original_trace)
        sys.stdout = self._original_stdout

    def _handle_print(self, text: str) -> None:
        """Called whenever a complete printed line is ready."""
        self.log_custom_event(
            EventType.PRINT, sys._getframe().f_back.f_lineno, {"text": text}
        )

    def log_custom_event(
        self, event_type: EventType, line: int, payload: dict[str, Any]
    ) -> None:
        """Constructs and fires a customized execution event."""
        # Retrieve caller frame info to inspect locals/globals
        frame = sys._getframe().f_back
        while frame and frame.f_code.co_filename != "<string>":
            frame = frame.f_back

        locals_dict = {}
        globals_dict = {}
        if frame:
            locals_dict = {
                k: safe_serialize(v)
                for k, v in frame.f_locals.items()
                if not k.startswith("__")
            }
            ignore_keys = (
                "__tf_compare__",
                "__tf_assign__",
                "__tf_loop__",
                "__tf_log_event__",
            )
            globals_dict = {
                k: safe_serialize(v)
                for k, v in frame.f_globals.items()
                if not k.startswith("__") and k not in ignore_keys
            }

        event = ExecutionEvent(
            id=f"evt_{uuid.uuid4().hex[:12]}",
            timestamp=time.time() - self.start_time,
            type=event_type,
            line=line,
            function=self.stack[-1] if self.stack else "<module>",
            locals=locals_dict,
            globals=globals_dict,
            memory={},  # Reserved for heap layout graphing in later phases
            stack=list(self.stack),
            payload=payload,
        )
        self.event_callback(event)

    def trace_func(self, frame: Any, event: str, arg: Any) -> Any:
        """Main sys.settrace callback hooks."""
        # Only trace user code ran inside eval/exec
        if frame.f_code.co_filename != "<string>":
            return self.trace_func

        func_name = frame.f_code.co_name
        # Skip tracer helpers
        if func_name in (
            "__tf_compare__",
            "__tf_assign__",
            "__tf_loop__",
            "__tf_log_event__",
            "_handle_print",
            "log_custom_event",
        ):
            return self.trace_func

        locals_dict = {
            k: safe_serialize(v)
            for k, v in frame.f_locals.items()
            if not k.startswith("__")
        }
        ignore_keys = (
            "__tf_compare__",
            "__tf_assign__",
            "__tf_loop__",
            "__tf_log_event__",
        )
        globals_dict = {
            k: safe_serialize(v)
            for k, v in frame.f_globals.items()
            if not k.startswith("__") and k not in ignore_keys
        }

        if event == "call":
            if func_name != "<module>":
                self.stack.append(func_name)
            evt_type = EventType.CALL
        elif event == "line":
            evt_type = EventType.LINE
        elif event == "return":
            evt_type = EventType.RETURN
        elif event == "exception":
            evt_type = EventType.EXCEPTION
        else:
            return self.trace_func

        payload = {}
        if event == "return":
            payload["return_value"] = safe_serialize(arg)
        elif event == "exception":
            payload["exception"] = str(arg)

        evt = ExecutionEvent(
            id=f"evt_{uuid.uuid4().hex[:12]}",
            timestamp=time.time() - self.start_time,
            type=evt_type,
            line=frame.f_lineno,
            function=func_name,
            locals=locals_dict,
            globals=globals_dict,
            memory={},
            stack=list(self.stack),
            payload=payload,
        )
        self.event_callback(evt)

        if event == "return" and len(self.stack) > 1:
            self.stack.pop()

        return self.trace_func


def get_trace_helpers(tracer: Tracer) -> dict[str, Any]:
    """Generates execution namespace globals for AST tracking functions."""

    def __tf_log_event__(  # noqa: N807
        event_type: str, line: int, payload: dict[str, Any]
    ) -> None:
        tracer.log_custom_event(EventType(event_type), line, payload)

    def __tf_compare__(  # noqa: N807
        left: Any, op: str, right: Any, line: int
    ) -> Any:
        ops = {
            "Lt": operator.lt,
            "LtE": operator.le,
            "Gt": operator.gt,
            "GtE": operator.ge,
            "Eq": operator.eq,
            "NotEq": operator.ne,
            "In": lambda a, b: a in b,
            "NotIn": lambda a, b: a not in b,
            "Is": lambda a, b: a is b,
            "IsNot": lambda a, b: a is not b,
        }
        res = False
        try:
            res = ops[op](left, right)
        except Exception as e:
            res = str(e)

        __tf_log_event__(
            "COMPARE",
            line,
            {
                "left": safe_serialize(left),
                "op": op,
                "right": safe_serialize(right),
                "result": res,
            },
        )
        return res

    def __tf_assign__(name: str, value: Any, line: int) -> Any:  # noqa: N807
        __tf_log_event__("ASSIGN", line, {"name": name, "value": safe_serialize(value)})
        return value

    def __tf_loop__(loop_type: str, line: int) -> None:  # noqa: N807
        __tf_log_event__(loop_type, line, {})

    return {
        "__tf_compare__": __tf_compare__,
        "__tf_assign__": __tf_assign__,
        "__tf_loop__": __tf_loop__,
        "__tf_log_event__": __tf_log_event__,
    }
