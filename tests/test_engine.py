from runtime.coordinator import run_program
from runtime.instrumenter import instrument_code
from shared.models import EventType


def test_ast_instrumentation() -> None:
    """Verifies that the AST instrumenter correctly injects assignment

    and comparison tracing function wrappers.
    """
    code = "a = 10\nb = 20\nres = a < b"
    instrumented = instrument_code(code)
    assert "__tf_assign__" in instrumented
    assert "__tf_compare__" in instrumented


def test_execution_tracing() -> None:
    """Verifies that running a custom function generates line steps,

    assignment events, call-returns, and print outputs.
    """
    code = (
        "def test_func(x):\n"
        "    y = x + 10\n"
        "    return y\n"
        "res = test_func(5)\n"
        "print('Result is', res)\n"
    )
    events = list(run_program(code))

    event_types = [e.type for e in events]
    assert EventType.LINE in event_types
    assert EventType.CALL in event_types
    assert EventType.RETURN in event_types
    assert EventType.ASSIGN in event_types
    assert EventType.PRINT in event_types
    assert EventType.END in event_types

    # Check return values and prints are captured in payloads
    return_evts = [e for e in events if e.type == EventType.RETURN]
    assert len(return_evts) > 0
    assert return_evts[0].payload.get("return_value") == 15

    print_evts = [e for e in events if e.type == EventType.PRINT]
    assert len(print_evts) > 0
    assert "Result is 15" in print_evts[0].payload.get("text")


def test_stdin_mocking() -> None:
    """Verifies that custom mock stdin inputs are parsed sequentially
    by input() statements.
    """
    code = "name = input()\nage = int(input())\nprint(name, 'is', age)\n"
    events = list(run_program(code, stdin_val="Alice\n25"))
    print_evts = [e for e in events if e.type == EventType.PRINT]
    assert len(print_evts) > 0
    assert "Alice is 25" in print_evts[0].payload.get("text")
