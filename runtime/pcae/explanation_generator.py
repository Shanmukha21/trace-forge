from runtime.pcae.models import (
    AnalysisResult,
    HumanReadableExplanation,
    RuntimeProfile,
    ScalingProfile,
    StaticFacts,
)


def generate_explanation(
    result: AnalysisResult,
    static_facts: StaticFacts,
    runtime_profile: RuntimeProfile,
    scaling_profile: ScalingProfile,
) -> HumanReadableExplanation:
    """Stage 7 Interface: Produces structured human-readable explanation rationale."""
    time_comp = result.time_complexity
    space_comp = result.space_complexity
    dominant = result.dominant_cost
    conf = result.confidence_score
    r2 = scaling_profile.r_squared

    # Time Reasoning
    if time_comp == "O(N!)":
        time_reasoning = f"Loop body contains recursive self-calls with shrinking parameter bounds, generating a factorial search space O(N!) (N={runtime_profile.max_recursive_depth} depth)."
    elif time_comp == "O(N²)":
        time_reasoning = f"Nested loop control flow structure (max depth {static_facts.max_nested_loop_depth}) combined with quadratic scaling regression (R² = {r2})."
    elif time_comp == "O(N log N)":
        time_reasoning = f"Divide-and-conquer recursion tree with linear merging operations confirmed via primitive scaling regression (R² = {r2})."
    elif time_comp == "O(log N)":
        time_reasoning = f"Logarithmic search control flow with input-halving conditionals confirmed by empirical scaling (R² = {r2})."
    elif time_comp == "O(N)":
        time_reasoning = f"Linear traversal over input elements (measured {runtime_profile.loop_iterations} loop iterations) matching O(N) scaling (R² = {r2})."
    elif time_comp == "O(2^N)":
        time_reasoning = f"Exponential branching recursive call tree (max stack depth {runtime_profile.max_recursive_depth})."
    else:
        time_reasoning = (
            f"Constant execution time O(1) with no input-dependent loops."
        )

    # Space Reasoning
    if space_comp == "O(N)":
        space_reasoning = f"Auxiliary data structure allocations ({', '.join(static_facts.allocations) if static_facts.allocations else 'hash table'}) scaling proportionally with input size N."
    elif space_comp == "O(log N)":
        space_reasoning = f"Auxiliary call stack frame memory depth O(log N) from recursive call tree (peak stack depth {runtime_profile.max_recursive_depth})."
    else:
        space_reasoning = "O(1) Auxiliary space - operations execute in-place without auxiliary heap allocation."

    evidence_breakdown = (
        f"Stage 1 AST: {static_facts.loop_count} loop(s), max depth {static_facts.max_nested_loop_depth}, {len(static_facts.allocations)} allocations",
        f"Stage 4 Profile: {runtime_profile.total_primitive_ops} total primitive ops ({runtime_profile.comparisons} comps, {runtime_profile.assignments} assignments)",
        f"Stage 5 Scaling: Best fit model {scaling_profile.best_fit_model} with R² = {r2} across N={list(m.input_size_n for m in scaling_profile.measurements)}",
        f"Stage 6 Solver: Dominant cost component '{dominant}' with {conf}% confidence",
    )

    return HumanReadableExplanation(
        time_reasoning=time_reasoning,
        space_reasoning=space_reasoning,
        evidence_breakdown=evidence_breakdown,
    )
