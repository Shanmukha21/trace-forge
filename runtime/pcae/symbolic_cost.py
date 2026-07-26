from runtime.pcae.models import ControlFlowGraph, StaticFacts, SymbolicCostModel


def build_symbolic_cost_model(
    cfg: ControlFlowGraph, static_facts: StaticFacts
) -> SymbolicCostModel:
    """Stage 3 Interface: Builds unsimplified SymbolicCostModel tree representation."""
    terms: list[str] = []

    depth = static_facts.max_nested_loop_depth
    if depth > 0:
        for d in range(1, depth + 1):
            terms.append(f"Loop(N^{d})")

    if static_facts.has_recursion:
        terms.append("RecursiveCall(N)")

    if "dict" in static_facts.allocations or "set" in static_facts.allocations:
        terms.append("HashLookup()")

    if "list" in static_facts.allocations:
        terms.append("ArrayAlloc(N)")

    terms.append("OpCost(1)")

    expression = " + ".join(terms) if terms else "OpCost(1)"

    return SymbolicCostModel(expression=expression, symbolic_terms=tuple(terms))
