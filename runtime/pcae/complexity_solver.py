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
    """Stage 6 Interface: Multi-evidence solver combining structural proof and empirical measurements."""
    static_depth = static_facts.max_nested_loop_depth
    scaling_model = scaling_profile.best_fit_model
    r2 = scaling_profile.r_squared

    # 1. Determine Time Complexity via Rigorous Structural Proof
    time_complexity = "O(N)"

    # Rule A: Factorial Complexity O(N!)
    if static_facts.has_recursive_loop or scaling_model == "O(N!)":
        time_complexity = "O(N!)"

    # Rule B: Exponential Complexity O(2^N)
    elif (
        static_facts.has_recursion
        and static_facts.recursive_branching_count >= 2
    ):
        time_complexity = "O(2^N)"

    # Rule C: Divide and Conquer / Linearithmic O(N log N)
    elif static_facts.has_recursion and (
        static_facts.has_subproblem_splitting or static_depth >= 1
    ):
        time_complexity = "O(N log N)"

    # Rule D: Logarithmic Complexity O(log N)
    elif static_facts.has_halving_operation and (
        static_depth >= 1 or static_facts.has_recursion
    ):
        time_complexity = "O(log N)"

    # Rule E: Polynomial Complexity O(N^k)
    elif static_depth >= 3:
        time_complexity = f"O(N^{static_depth})"
    elif static_depth == 2:
        time_complexity = "O(N²)"

    # Rule F: Linear Complexity O(N)
    elif static_depth == 1 or static_facts.has_recursion:
        time_complexity = "O(N)"

    # Rule G: Constant Complexity O(1)
    else:
        time_complexity = "O(1)"

    # 2. Validate against Scaling Regression if available with high R²
    if (
        scaling_profile.measurements
        and r2 >= 0.95
        and scaling_model != "O(1)"
        and time_complexity not in ("O(N!)", "O(2^N)")
    ):
        time_complexity = scaling_model

    # 3. Determine Space Complexity
    if (
        runtime_profile.dict_ops > 0
        or "dict" in static_facts.allocations
        or "set" in static_facts.allocations
        or "list" in static_facts.allocations
    ):
        space_complexity = "O(N)"
    elif (
        runtime_profile.max_recursive_depth > 3 or static_facts.has_recursion
    ):
        space_complexity = "O(N)"  # Call stack memory
    else:
        space_complexity = "O(1)"

    # 4. Determine Dominant Cost Factor
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

    # 5. Calculate Confidence Score (0.0 to 100.0)
    confidence = 85.0
    if r2 >= 0.90:
        confidence += 10.0

    confidence = round(min(99.0, max(60.0, confidence)), 1)

    return AnalysisResult(
        time_complexity=time_complexity,
        space_complexity=space_complexity,
        dominant_cost=dominant_cost,
        confidence_score=confidence,
    )
