import traceback
import uuid
from collections.abc import Callable, Iterator

from runtime.instrumenter import instrument_code
from runtime.pcae import PCAEEngine
from runtime.tracer import Tracer, get_trace_helpers
from shared.models import EventType, ExecutionEvent


def mock_input(stdin_lines: list[str]) -> Callable[[str], str]:
    """Generates a replacement for Python's built-in input() function,

    feeding values sequentially from the provided stdin lines.
    """
    iterator = iter(stdin_lines)

    def _input(prompt: str = "") -> str:
        try:
            return next(iterator)
        except StopIteration:
            raise EOFError("EOF when reading a line") from None

    return _input


def run_program(
    source_code: str, stdin_val: str = "", skip_pcae: bool = False
) -> Iterator[ExecutionEvent]:
    """Orchestrates parsing, instrumenting, running, and capturing trace events.

    Streams events dynamically using an Iterator.
    """
    events: list[ExecutionEvent] = []

    def collect_event(event: ExecutionEvent) -> None:
        events.append(event)

    try:
        # 1. Run AST code instrumentation
        rewritten_code = instrument_code(source_code)

        # 2. Configure mock stdin inputs
        raw_lines = stdin_val.split("\n")
        if raw_lines and raw_lines[-1] == "":
            raw_lines.pop()
        stdin_lines = raw_lines

        # 3. Initialize trace session
        with Tracer(collect_event) as tracer:
            helpers = get_trace_helpers(tracer)

            builtins_copy = (
                dict(__builtins__)
                if isinstance(__builtins__, dict)
                else __builtins__.__dict__.copy()
            )
            builtins_copy["input"] = mock_input(stdin_lines)

            sandbox_globals = {
                **helpers,
                "__builtins__": builtins_copy,
            }

            compiled_code = compile(rewritten_code, "<string>", "exec")
            exec(compiled_code, sandbox_globals)

    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_num = 1
        if tb:
            for frame in reversed(tb):
                if frame.filename == "<string>":
                    line_num = frame.lineno or 1
                    break
        else:
            if hasattr(e, "lineno") and e.lineno is not None:
                line_num = e.lineno

        err_event = ExecutionEvent(
            id=f"evt_err_{uuid.uuid4().hex[:8]}",
            timestamp=0.0,
            type=EventType.EXCEPTION,
            line=line_num,
            function="<module>",
            locals={},
            globals={},
            memory={},
            stack=[],
            payload={"exception": f"{type(e).__name__}: {str(e)}"},
        )
        events.append(err_event)

    # 4. Stream trace events immediately to client
    yield from events

    # 5. Run Program Cost Analysis Engine (PCAE) multi-stage analysis (unless sub-run)
    pcae_result = {}
    if not skip_pcae:
        try:
            pcae_result = PCAEEngine.analyze(source_code, stdin_val, events)
        except Exception as err:
            pcae_result = {"error": str(err)}

    # Emit final END event with pcae_result payload
    yield ExecutionEvent(
        id=f"evt_end_{uuid.uuid4().hex[:8]}",
        timestamp=0.0,
        type=EventType.END,
        line=1,
        function="<module>",
        locals={},
        globals={},
        memory={},
        stack=[],
        payload={"status": "completed", "pcae_result": pcae_result},
    )
