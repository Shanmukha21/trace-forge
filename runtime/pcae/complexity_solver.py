from runtime.pcae.models import (
    AnalysisResult,
    ControlFlowGraph,
    RuntimeProfile,
    ScalingProfile,
    StaticFacts,
    SymbolicCostModel,
)


def solve_complexity(
    static_facts: StaticFacts,
    cfg: ControlFlowGraph,
    symbolic_cost: SymbolicCostModel,
    runtime_profile: RuntimeProfile,
    scaling_profile: ScalingProfile,
) -> AnalysisResult:
    """Stage 6 Interface: Multi-evidence solver combining all 4 evidence streams."""
    # 1. Determine Time Complexity via Multi-Evidence Fusion
    static_depth = static_facts.max_nested_loop_depth
    scaling_model = scaling_profile.best_fit_model
    r2 = scaling_profile.r_squared

    time_complexity = "O(N)"

    # 1. Check for Factorial Recursive Loop Structure (loop calling recursive function)
    if static_facts.has_recursive_loop or scaling_model == "O(N!)":
        time_complexity = "O(N!)"
    # Detect flat scaling anomaly: if loops exist (static_depth >= 1) but scaling_model evaluated to O(1)
    elif static_depth >= 1 and scaling_model == "O(1)":
        if static_facts.has_recursion and static_facts.loop_count >= 1:
            time_complexity = "O(N log N)"
        elif static_depth >= 2:
            time_complexity = "O(N²)"
        else:
            time_complexity = "O(N)"
    elif scaling_profile.measurements and r2 >= 0.85:
        time_complexity = scaling_model
    else:
        # Fallback to Static Facts / CFG
        if static_facts.has_recursion and static_facts.loop_count >= 1:
            time_complexity = "O(N log N)"
        elif static_facts.has_recursion:
            time_complexity = "O(2^N)"
        elif static_depth >= 3:
            time_complexity = f"O(N^{static_depth})"
        elif static_depth == 2:
            time_complexity = "O(N²)"
        elif static_depth == 1:
            time_complexity = "O(N)"
        else:
            time_complexity = "O(1)"

    # 2. Determine Space Complexity
    if (
        runtime_profile.dict_ops > 0
        or "dict" in static_facts.allocations
        or "set" in static_facts.allocations
    ):
        space_complexity = "O(N)"
    elif (
        runtime_profile.list_ops > 0
        and "list" in static_facts.allocations
        and static_facts.has_recursion
    ):
        space_complexity = "O(N)"
    elif runtime_profile.max_recursive_depth > 3:
        space_complexity = "O(log N)"
    else:
        space_complexity = "O(1)"

    # 3. Determine Dominant Cost Factor
    ops_breakdown = {
        "Comparisons": runtime_profile.comparisons,
        "Assignments/Writes": runtime_profile.assignments
        + runtime_profile.writes,
        "HashLookupOperations": runtime_profile.dict_ops,
        "RecursiveStack": runtime_profile.max_recursive_depth,
        "LoopIterations": runtime_profile.loop_iterations,
    }

    dominant_cost = max(ops_breakdown, key=lambda k: ops_breakdown[k])
    if ops_breakdown[dominant_cost] == 0:
        dominant_cost = "InstructionExecution"

    # 4. Calculate Confidence Score (0.0 to 100.0)
    confidence = 75.0

    if r2 >= 0.95 and scaling_model != "O(1)":
        confidence += 15.0
    elif r2 >= 0.85:
        confidence += 10.0

    if (
        static_depth == 2
        and time_complexity == "O(N²)"
        or static_depth == 1
        and time_complexity in ("O(N)", "O(log N)")
        or static_depth == 0
        and time_complexity == "O(1)"
    ):
        confidence += 10.0

    confidence = round(min(99.0, max(50.0, confidence)), 1)

    return AnalysisResult(
        time_complexity=time_complexity,
        space_complexity=space_complexity,
        dominant_cost=dominant_cost,
        confidence_score=confidence,
    )
