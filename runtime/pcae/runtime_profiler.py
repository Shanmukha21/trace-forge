from collections.abc import Iterable
from runtime.pcae.models import RuntimeProfile
from shared.models import EventType, ExecutionEvent


def profile_runtime_execution(events: Iterable[ExecutionEvent]) -> RuntimeProfile:
    """Stage 4 Interface: Captures primitive operation counts from an execution trace."""
    comparisons = 0
    assignments = 0
    reads = 0
    writes = 0
    allocations = 0
    loop_iterations = 0
    function_calls = 0
    max_recursive_depth = 1
    dict_ops = 0
    set_ops = 0
    list_ops = 0

    for evt in events:
        if evt.type == EventType.COMPARE:
            comparisons += 1
        elif evt.type == EventType.ASSIGN:
            assignments += 1
            writes += 1
        elif evt.type == EventType.READ:
            reads += 1
        elif evt.type == EventType.WRITE:
            writes += 1
        elif evt.type == EventType.LOOP_ENTER:
            loop_iterations += 1
        elif evt.type == EventType.CALL:
            function_calls += 1

        if evt.stack and len(evt.stack) > max_recursive_depth:
            max_recursive_depth = len(evt.stack)

        # Inspect scope for dict/list/set primitive operations
        scope = {**evt.globals, **evt.locals}
        for val in scope.values():
            if isinstance(val, dict):
                dict_ops += 1
            elif isinstance(val, set):
                set_ops += 1
            elif isinstance(val, list):
                list_ops += 1

    return RuntimeProfile(
        comparisons=comparisons,
        assignments=assignments,
        reads=reads,
        writes=writes,
        allocations=allocations,
        loop_iterations=loop_iterations,
        function_calls=function_calls,
        max_recursive_depth=max_recursive_depth,
        dict_ops=dict_ops,
        set_ops=set_ops,
        list_ops=list_ops,
    )
